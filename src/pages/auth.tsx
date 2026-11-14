/**
 * Authentication pages - Member 2 (Authentication and Shopper Features).
 * Wireframes: W01-1 to W01-7. Requirements: FR01, FR09.
 *
 * The prototype has no mail server, so the links that would arrive by email
 * (activation and password reset) are shown in a "Prototype" box on screen.
 * A link carries a small token: the email address and the time it was created,
 * so the pages can tell valid, expired and unknown links apart.
 */
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LogIn, MailCheck } from "lucide-react";
import type { User } from "../lib/types";
import { getData, homeFor, login, useCurrentUser } from "../lib/store";
import { DEMO_ACCOUNTS } from "../lib/seed";
import { isValidEmail } from "../lib/format";
import { useDocumentTitle } from "../lib/hooks";
import { Alert, Button, Card, Field, Input, useToast } from "../ui/kit";
import { PlannedPage } from "../ui/shared";

const MEMBER = "Member 2 (Authentication and Shopper Features)";
const FILE = "src/pages/auth.tsx";

/* ============================== Helpers ============================= */

/** Wait a little so loading states are visible, like a real network request. */
export const wait = (ms = 600) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** Only follow `?next=` when it is a page inside this app (never another website). */
function safeNext(next: string | null, user: User): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return homeFor(user.role);
  if (next.startsWith("/portal") && user.role !== "owner") return homeFor(user.role);
  if (next.startsWith("/admin") && user.role !== "admin") return homeFor(user.role);
  if (/^\/(login|signup|forgot-password|activate)/.test(next)) return homeFor(user.role);
  return next;
}

type LinkKind = "activate" | "reset";

/** Builds the token placed in an emailed link: { kind, email, created time } in base64. */
export function makeLinkToken(kind: LinkKind, email: string): string {
  return btoa(JSON.stringify({ k: kind, e: email.trim().toLowerCase(), t: Date.now() }));
}

/** Reads a link token. Returns null when the token is damaged or for another kind of link. */
export function readLinkToken(token: string | null, kind: LinkKind): { email: string; ageMs: number } | null {
  if (!token) return null;
  try {
    const value = JSON.parse(atob(token)) as { k?: string; e?: string; t?: number };
    if (value.k !== kind || typeof value.e !== "string" || typeof value.t !== "number") return null;
    return { email: value.e, ageMs: Date.now() - value.t };
  } catch {
    return null;
  }
}

/** The page an activation email would link to. */
export const activationLink = (email: string) => `/activate?token=${encodeURIComponent(makeLinkToken("activate", email))}`;

/** Narrow centered card used by every authentication page. */
function AuthCard({ title, subtitle, icon, children, footer }: { title: string; subtitle?: ReactNode; icon?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useDocumentTitle(title);
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-4 py-10 sm:py-14">
      <Card className="w-full p-6 shadow-xl shadow-black/5 sm:p-8">
        {icon && <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-text [&>svg]:size-6">{icon}</div>}
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-6 border-t border-line pt-5 text-center text-sm text-muted">{footer}</div>}
      </Card>
    </div>
  );
}

/** Box that stands in for an email the prototype cannot send. */
function PrototypeMail({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-warn/50 bg-warn-soft px-4 py-3 text-sm text-warn">
      <p className="font-semibold">Prototype: no real email is sent</p>
      <div className="mt-2 text-fg">{children}</div>
    </div>
  );
}

/* =============================== Log in ============================= */

type LoginProblem = { kind: "error"; text: string } | { kind: "inactive"; email: string };

/** W01-4, W01-5: email + password, clear errors, then back to `?next=` or the role's home. */
export function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const user = useCurrentUser();
  const next = params.get("next");
  const reason = params.get("reason");

  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [problem, setProblem] = useState<LoginProblem | null>(null);
  const [busy, setBusy] = useState(false);
  const [mailLink, setMailLink] = useState<string | null>(null);

  // Already signed in (for example after pressing Back): go straight on.
  useEffect(() => {
    if (user && !busy) navigate(safeNext(next, user), { replace: true });
  }, [user, busy, next, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const found: typeof errors = {};
    if (!email.trim()) found.email = "Enter your email address.";
    else if (!isValidEmail(email)) found.email = "Enter a valid email address, like name@example.com.";
    if (!password) found.password = "Enter your password.";
    setErrors(found);
    setProblem(null);
    setMailLink(null);
    if (found.email || found.password) return;

    setBusy(true);
    await wait();
    const result = login(email, password);
    if (result.ok) {
      toast({ title: `Welcome back, ${result.user.name.split(" ")[0]}` });
      navigate(safeNext(next, result.user), { replace: true });
      setBusy(false);
      return;
    }
    setBusy(false);
    setPassword("");
    // A correct password on an account that is not activated gets its own message with a resend button.
    const account = getData().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (account && !account.activated && account.password === password) setProblem({ kind: "inactive", email: account.email });
    else setProblem({ kind: "error", text: result.error });
  };

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrors({});
    setProblem(null);
  };

  const signupQuery = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to save stores, write reviews or manage your store."
      icon={<LogIn />}
      footer={
        <>
          New to DealFinder?{" "}
          <Link to={`/signup${signupQuery}`} className="font-semibold whitespace-nowrap text-brand-text hover:underline">
            Create an account
          </Link>
          <span className="mx-2" aria-hidden>
            &middot;
          </span>
          <Link to="/signup/owner" className="font-semibold whitespace-nowrap text-brand-text hover:underline">
            Register a store
          </Link>
        </>
      }
    >
      {reason === "login" && !problem && (
        <Alert className="mb-5">Log in to continue. We will bring you back to the page you were on.</Alert>
      )}
      {reason === "activated" && !problem && (
        <Alert tone="ok" className="mb-5">
          Your account is active. Log in to get started.
        </Alert>
      )}
      {reason === "reset" && !problem && (
        <Alert tone="ok" className="mb-5">
          Your password was changed. Log in with the new password.
        </Alert>
      )}
      {problem?.kind === "error" && (
        <Alert tone="bad" title="We could not log you in" className="mb-5">
          {problem.text}
        </Alert>
      )}
      {problem?.kind === "inactive" && (
        <Alert tone="warn" title="Your account is not active yet" className="mb-5">
          Open the activation email we sent to <strong>{problem.email}</strong> and press the link inside.
          <div className="mt-3">
            <Button size="sm" variant="secondary" icon={<MailCheck className="size-4" />} onClick={() => setMailLink(activationLink(problem.email))}>
              Send the email again
            </Button>
          </div>
          {mailLink && (
            <PrototypeMail>
              The new activation email contains this link:{" "}
              <Link to={mailLink} className="font-semibold text-brand-text underline">
                Activate my account
              </Link>
            </PrototypeMail>
          )}
        </Alert>
      )}

      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Email" htmlFor="login-email" error={errors.email}>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={!!errors.email}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            disabled={busy}
          />
        </Field>
        <Field label="Password" htmlFor="login-password" error={errors.password}>
          <PasswordInput id="login-password" autoComplete="current-password" value={password} onChange={setPassword} invalid={!!errors.password} disabled={busy} />
        </Field>
        <div className="flex justify-end">
          <Link to={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="text-sm font-semibold text-brand-text hover:underline">
            Forgot your password?
          </Link>
        </div>
        <Button type="submit" variant="primary" size="lg" fullWidth loading={busy}>
          {busy ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <details className="mt-6 rounded-xl border border-dashed border-line-strong p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Prototype: demo accounts</summary>
        <ul className="mt-3 space-y-2">
          {[
            ...Object.values(DEMO_ACCOUNTS).map((a) => [a.label, a.email, a.password] as const),
            ["Not activated yet", "pending@example.com", "Shopper#2026"] as const,
            ["Suspended", "blocked@example.com", "Shopper#2026"] as const,
          ].map(([label, demoEmail, demoPassword]) => (
            <li key={demoEmail} className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block font-medium">{label}</span>
                <span className="block truncate font-mono text-xs text-subtle">{demoEmail}</span>
              </span>
              <Button size="sm" variant="soft" onClick={() => fillDemo(demoEmail, demoPassword)}>
                Fill in
              </Button>
            </li>
          ))}
        </ul>
      </details>
    </AuthCard>
  );
}

/** Password field with a Show / Hide button. */
function PasswordInput({
  id,
  value,
  onChange,
  invalid,
  disabled,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        disabled={disabled}
        className="pr-16"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-surface-3 hover:text-fg"
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

/* ====================== Screens still to be built ====================== */

export const SignUpPage = () => (
  <PlannedPage
    title="Create a shopper account"
    member={MEMBER}
    file={FILE}
    requirements="W01-1, W01-2, FR01"
    tasks={[
      "Name, email and password fields with live password rules",
      "Validation errors (required fields, email format, email already used)",
      "Success screen: Check your email for the activation link",
    ]}
  />
);

export const OwnerSignUpPage = () => (
  <PlannedPage
    title="Register as a store owner"
    member={MEMBER}
    file={FILE}
    requirements="W01-7, FR09"
    tasks={[
      "Account details plus business name and phone number",
      "Same validation as shopper sign up",
      "Explain that an owner account does not publish a store automatically",
    ]}
  />
);

export const ForgotPasswordPage = () => (
  <PlannedPage
    title="Reset your password"
    member={MEMBER}
    file={FILE}
    requirements="W01-6, FR01"
    tasks={[
      "Ask for the account email",
      "Always show the same confirmation message (do not reveal whether the email exists)",
      "Reset form with the password rules",
    ]}
  />
);

export const ActivatePage = () => (
  <PlannedPage
    title="Activate your account"
    member={MEMBER}
    file={FILE}
    requirements="W01-3, FR01"
    tasks={["Activation link landing page", "Expired or already-used link states", "Continue to Log in"]}
  />
);

