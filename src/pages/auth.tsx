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
import { CircleCheck, Clock, KeyRound, LogIn, MailCheck, TriangleAlert, UserPlus } from "lucide-react";
import type { User } from "../lib/types";
import { getData, homeFor, login, update, useCurrentUser } from "../lib/store";
import { DEMO_ACCOUNTS } from "../lib/seed";
import { cn, isStrongPassword, isValidEmail, passwordChecks } from "../lib/format";
import { useDocumentTitle } from "../lib/hooks";
import { Alert, Button, Card, Checkbox, Field, Input, Spinner, useToast } from "../ui/kit";

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
export function makeLinkToken(kind: LinkKind, email: string, createdAt = Date.now()): string {
  return btoa(JSON.stringify({ k: kind, e: email.trim().toLowerCase(), t: createdAt }));
}

/** Reads a link token. Returns null when the token is damaged or for another kind of link. */
function readLinkToken(token: string | null, kind: LinkKind): { email: string; ageMs: number } | null {
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
export function PasswordInput({
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

/* ============================== Sign up ============================= */

/** Live checklist of the password rules (turns green as each rule is met). */
export function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="mt-1 grid gap-1 text-xs sm:grid-cols-2" aria-label="Password rules">
      {passwordChecks(value).map((rule) => (
        <li key={rule.label} className={cn("flex items-center gap-1.5", rule.ok ? "text-ok" : "text-subtle")}>
          <CircleCheck className={cn("size-3.5 shrink-0", !rule.ok && "opacity-40")} aria-hidden />
          {rule.label}
          <span className="sr-only">{rule.ok ? "(met)" : "(not met yet)"}</span>
        </li>
      ))}
    </ul>
  );
}

/** 9 to 15 digits; spaces, dashes, brackets and a leading + are allowed. */
export const isValidPhone = (phone: string): boolean => /^\+?[\d\s()-]+$/.test(phone.trim()) && /^\d{9,15}$/.test(phone.replace(/\D/g, ""));

interface SignUpValues {
  name: string;
  email: string;
  businessName: string;
  phone: string;
  password: string;
  confirm: string;
  terms: boolean;
}

/** Returns one message per invalid field (empty object = everything is valid). */
function validateSignUp(v: SignUpValues, owner: boolean): Partial<Record<keyof SignUpValues, string>> {
  const e: Partial<Record<keyof SignUpValues, string>> = {};
  if (!v.name.trim()) e.name = "Enter your full name.";
  else if (v.name.trim().length < 2) e.name = "Use at least 2 characters.";
  if (!v.email.trim()) e.email = "Enter your email address.";
  else if (!isValidEmail(v.email)) e.email = "Enter a valid email address, like name@example.com.";
  else if (getData().users.some((u) => u.email.toLowerCase() === v.email.trim().toLowerCase()))
    e.email = "An account with this email already exists. Log in or reset your password instead.";
  if (owner) {
    if (v.businessName.trim().length < 2) e.businessName = "Enter your business name.";
    if (!v.phone.trim()) e.phone = "Enter a phone number.";
    else if (!isValidPhone(v.phone)) e.phone = "Use 9 to 15 digits, for example +966 50 123 4567.";
  }
  if (!v.password) e.password = "Choose a password.";
  else if (!isStrongPassword(v.password)) e.password = "Choose a stronger password: every rule below must be met.";
  if (!v.confirm) e.confirm = "Type the password again.";
  else if (v.confirm !== v.password) e.confirm = "The two passwords do not match.";
  if (!v.terms) e.terms = "Please accept the Terms of Use to continue.";
  return e;
}

/** Shown after sign up: the account exists but must be activated from the email link. */
function CheckYourEmail({ email }: { email: string }) {
  const [link, setLink] = useState(() => activationLink(email));
  const [resent, setResent] = useState(false);
  return (
    <AuthCard title="Check your email" icon={<MailCheck />} subtitle={<>We sent an activation link to <strong className="text-fg">{email}</strong>. Open it to activate your account, then log in.</>}>
      <p className="text-sm text-muted">Nothing there after a few minutes? Check your spam folder or send it again. Only the newest link works and it expires after 24 hours.</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          variant="secondary"
          onClick={() => {
            setLink(activationLink(email));
            setResent(true);
          }}
        >
          Send the email again
        </Button>
        <Button variant="ghost" to={`/login?email=${encodeURIComponent(email)}`}>
          Go to log in
        </Button>
      </div>
      {resent && (
        <p role="status" className="mt-3 text-sm font-semibold text-ok">
          A new email is on its way.
        </p>
      )}
      <PrototypeMail>
        The activation email contains this link:{" "}
        <Link to={link} className="font-semibold text-brand-text underline">
          Activate my account
        </Link>
        <span className="mt-1 block text-xs text-muted">
          To test the error screen, open{" "}
          <Link to={`/activate?token=${encodeURIComponent(makeLinkToken("activate", email, Date.now() - 2 * 86_400_000))}`} className="underline">
            an expired link
          </Link>
          .
        </span>
      </PrototypeMail>
    </AuthCard>
  );
}

/** W01-1, W01-2 (shopper) and W01-7 (store owner, FR09). */
function SignUpForm({ owner }: { owner: boolean }) {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [params] = useSearchParams();
  const next = params.get("next");
  const [v, setV] = useState<SignUpValues>({ name: "", email: "", businessName: "", phone: "", password: "", confirm: "", terms: false });
  const [errors, setErrors] = useState<Partial<Record<keyof SignUpValues, string>>>({});
  const [busy, setBusy] = useState(false);
  const [doneEmail, setDoneEmail] = useState<string | null>(null);

  // Signed-in users do not need a new account.
  useEffect(() => {
    if (user && !doneEmail) navigate(homeFor(user.role), { replace: true });
  }, [user, doneEmail, navigate]);

  const set = (key: keyof SignUpValues) => (value: string) => setV((s) => ({ ...s, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const found = validateSignUp(v, owner);
    setErrors(found);
    if (Object.keys(found).length) {
      // Move keyboard focus to the first field with a problem.
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setBusy(true);
    await wait(700);
    const email = v.email.trim();
    update((d) => {
      d.users.push({
        id: `u-${Date.now()}`,
        name: v.name.trim(),
        email,
        password: v.password,
        role: owner ? "owner" : "shopper",
        activated: false,
        suspended: false,
        createdAt: Date.now(),
        favorites: [],
        ...(owner ? { businessName: v.businessName.trim(), phone: v.phone.trim() } : {}),
      });
    });
    setBusy(false);
    setDoneEmail(email);
  };

  if (doneEmail) return <CheckYourEmail email={doneEmail} />;

  const loginQuery = next ? `?next=${encodeURIComponent(next)}` : "";
  const field = (key: keyof SignUpValues) => ({ invalid: !!errors[key], "aria-describedby": errors[key] ? `su-${key}-error` : undefined, disabled: busy });

  return (
    <AuthCard
      title={owner ? "Register as a store owner" : "Create your account"}
      icon={owner ? <KeyRound /> : <UserPlus />}
      subtitle={
        owner
          ? "Manage your store's listing, coupons and replies to reviews."
          : "Save your favorite stores and share honest reviews. It takes a minute."
      }
      footer={
        <>
          Already have an account?{" "}
          <Link to={`/login${loginQuery}`} className="font-semibold whitespace-nowrap text-brand-text hover:underline">
            Log in
          </Link>
          <span className="mx-2" aria-hidden>
            &middot;
          </span>
          <Link to={owner ? "/signup" : "/signup/owner"} className="font-semibold whitespace-nowrap text-brand-text hover:underline">
            {owner ? "I am a shopper" : "I own a store"}
          </Link>
        </>
      }
    >
      {owner && (
        <Alert className="mb-5" title="Your store is not published automatically">
          After activating this account you submit your store (or claim an existing listing). Our team checks the ownership evidence before it goes live.
        </Alert>
      )}
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Full name" htmlFor="su-name" required error={errors.name}>
          <Input id="su-name" autoComplete="name" maxLength={60} value={v.name} onChange={(e) => set("name")(e.target.value)} {...field("name")} />
        </Field>
        <Field label="Email" htmlFor="su-email" required error={errors.email} hint="We send a link here to activate your account.">
          <Input id="su-email" type="email" autoComplete="email" placeholder="you@example.com" value={v.email} onChange={(e) => set("email")(e.target.value)} {...field("email")} />
        </Field>
        {owner && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name" htmlFor="su-businessName" required error={errors.businessName}>
              <Input id="su-businessName" autoComplete="organization" maxLength={80} value={v.businessName} onChange={(e) => set("businessName")(e.target.value)} {...field("businessName")} />
            </Field>
            <Field label="Phone" htmlFor="su-phone" required error={errors.phone} hint="Used by our team to verify your store.">
              <Input id="su-phone" type="tel" autoComplete="tel" placeholder="+966 50 123 4567" value={v.phone} onChange={(e) => set("phone")(e.target.value)} {...field("phone")} />
            </Field>
          </div>
        )}
        <Field label="Password" htmlFor="su-password" required error={errors.password}>
          <PasswordInput id="su-password" autoComplete="new-password" value={v.password} onChange={set("password")} invalid={!!errors.password} disabled={busy} />
          <PasswordRules value={v.password} />
        </Field>
        <Field label="Confirm password" htmlFor="su-confirm" required error={errors.confirm}>
          <PasswordInput id="su-confirm" autoComplete="new-password" value={v.confirm} onChange={set("confirm")} invalid={!!errors.confirm} disabled={busy} />
        </Field>
        <div>
          <Checkbox id="su-terms" checked={v.terms} onChange={(terms) => setV((s) => ({ ...s, terms }))} label="I agree to the Terms of Use and the Privacy Policy." />
          {errors.terms && (
            <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm text-bad">
              <TriangleAlert className="size-4 shrink-0" aria-hidden />
              {errors.terms}
            </p>
          )}
        </div>
        <Button type="submit" variant="primary" size="lg" fullWidth loading={busy}>
          {busy ? "Creating account…" : owner ? "Create store owner account" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}

export const SignUpPage = () => <SignUpForm owner={false} />;
export const OwnerSignUpPage = () => <SignUpForm owner />;

/* ========================= Forgot / reset password ======================== */

const RESET_LIFETIME_MS = 30 * 60_000;

/** Small fingerprint of the current password, so a reset link stops working once it was used. */
function fingerprint(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (h * 33) ^ text.charCodeAt(i);
  return (h >>> 0).toString(36);
}

/** The page a password reset email links to (only accounts that exist get a working link). */
function resetLink(email: string): string {
  const account = getData().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  const token = btoa(JSON.stringify({ k: "reset", e: email.trim().toLowerCase(), t: Date.now(), v: account ? fingerprint(account.password) : "" }));
  return `/forgot-password?token=${encodeURIComponent(token)}`;
}

/** W01-6: ask for the email; the page with `?token=` shows the new password form. */
export function ForgotPasswordPage() {
  const [params] = useSearchParams();
  return params.get("token") ? <ResetPasswordForm token={params.get("token")!} /> : <ForgotPasswordForm initialEmail={params.get("email") ?? ""} />;
}

function ForgotPasswordForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [link, setLink] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!email.trim()) return setError("Enter your email address.");
    if (!isValidEmail(email)) return setError("Enter a valid email address, like name@example.com.");
    setError("");
    setBusy(true);
    await wait();
    setBusy(false);
    setLink(resetLink(email));
    setSentTo(email.trim());
  };

  if (sentTo) {
    // Same message whether or not the account exists, so the page does not reveal who has an account.
    return (
      <AuthCard
        title="Check your email"
        icon={<MailCheck />}
        subtitle={
          <>
            If an account uses <strong className="text-fg">{sentTo}</strong>, we sent it a link to choose a new password. The link works for 30 minutes.
          </>
        }
        footer={
          <Link to="/login" className="font-semibold text-brand-text hover:underline">
            Back to log in
          </Link>
        }
      >
        <Button variant="secondary" fullWidth onClick={() => setLink(resetLink(sentTo))}>
          Send the email again
        </Button>
        <PrototypeMail>
          The reset email contains this link:{" "}
          <Link to={link} className="font-semibold text-brand-text underline">
            Choose a new password
          </Link>
        </PrototypeMail>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      icon={<KeyRound />}
      subtitle="Enter the email address you signed up with. We will send you a link to choose a new password."
      footer={
        <Link to="/login" className="font-semibold text-brand-text hover:underline">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Email" htmlFor="fp-email" error={error}>
          <Input
            id="fp-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={!!error}
            aria-describedby={error ? "fp-email-error" : undefined}
            disabled={busy}
          />
        </Field>
        <Button type="submit" variant="primary" size="lg" fullWidth loading={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}

function ResetPasswordForm({ token }: { token: string }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [busy, setBusy] = useState(false);

  // Decide once whether the link can be used.
  const [check] = useState(() => {
    let v = "";
    try {
      v = (JSON.parse(atob(token)) as { v?: string }).v ?? "";
    } catch {
      /* handled below */
    }
    const info = readLinkToken(token, "reset");
    const account = info && getData().users.find((u) => u.email.toLowerCase() === info.email);
    if (!info || !account) return { state: "invalid" as const };
    if (fingerprint(account.password) !== v) return { state: "used" as const };
    if (info.ageMs > RESET_LIFETIME_MS) return { state: "expired" as const };
    return { state: "ok" as const, account };
  });

  if (check.state !== "ok") {
    const text =
      check.state === "expired"
        ? "Reset links work for 30 minutes. Ask for a new one and use it soon after it arrives."
        : check.state === "used"
          ? "This link was already used and your password has been changed. Log in with the new password, or ask for a new link if that was not you."
          : "This link is not valid. It may have been copied incompletely.";
    return (
      <AuthCard
        title={check.state === "expired" ? "This link has expired" : check.state === "used" ? "This link was already used" : "This link is not valid"}
        icon={check.state === "expired" ? <Clock /> : <TriangleAlert />}
        subtitle={text}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" to="/forgot-password">
            Get a new link
          </Button>
          <Button to="/login">Back to log in</Button>
        </div>
      </AuthCard>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const found: typeof errors = {};
    if (!isStrongPassword(password)) found.password = "Choose a stronger password: every rule below must be met.";
    else if (password === check.account.password) found.password = "Choose a password you have not used for this account.";
    if (!confirm) found.confirm = "Type the password again.";
    else if (confirm !== password) found.confirm = "The two passwords do not match.";
    setErrors(found);
    if (found.password || found.confirm) return;
    setBusy(true);
    await wait();
    update((d) => {
      const u = d.users.find((x) => x.id === check.account.id);
      if (u) u.password = password;
    });
    navigate(`/login?reason=reset&email=${encodeURIComponent(check.account.email)}`, { replace: true });
  };

  return (
    <AuthCard title="Choose a new password" icon={<KeyRound />} subtitle={<>For {check.account.email}. Pick something you have not used on DealFinder before.</>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="New password" htmlFor="rp-password" error={errors.password}>
          <PasswordInput id="rp-password" autoComplete="new-password" value={password} onChange={setPassword} invalid={!!errors.password} disabled={busy} />
          <PasswordRules value={password} />
        </Field>
        <Field label="Confirm new password" htmlFor="rp-confirm" error={errors.confirm}>
          <PasswordInput id="rp-confirm" autoComplete="new-password" value={confirm} onChange={setConfirm} invalid={!!errors.confirm} disabled={busy} />
        </Field>
        <Button type="submit" variant="primary" size="lg" fullWidth loading={busy}>
          {busy ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </AuthCard>
  );
}

/* ============================ Activation ============================ */

const DAY_MS = 86_400_000;

type ActivationState = "checking" | "activated" | "already" | "expired" | "invalid";

/** W01-3: the page the activation email links to. */
export function ActivatePage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<ActivationState>("checking");
  const [email, setEmail] = useState("");
  const [newLink, setNewLink] = useState<string | null>(null);
  useDocumentTitle("Activate your account");

  useEffect(() => {
    let cancelled = false;
    setState("checking");
    setNewLink(null);
    wait(700).then(() => {
      if (cancelled) return;
      const info = readLinkToken(token, "activate");
      const account = info && getData().users.find((u) => u.email.toLowerCase() === info.email);
      if (!info || !account) return setState("invalid");
      setEmail(account.email);
      if (account.activated) return setState("already");
      if (info.ageMs > DAY_MS) return setState("expired");
      update((d) => {
        const u = d.users.find((x) => x.id === account.id);
        if (u) u.activated = true;
      });
      setState("activated");
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const box = (tone: "brand" | "ok" | "warn" | "bad", icon: ReactNode, title: string, body: ReactNode, actions: ReactNode) => (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-4 py-10">
      <Card className="w-full p-8 text-center shadow-xl shadow-black/5">
        <div
          className={cn(
            "mx-auto mb-5 flex size-16 items-center justify-center rounded-full [&>svg]:size-8",
            tone === "ok" ? "bg-ok-soft text-ok" : tone === "warn" ? "bg-warn-soft text-warn" : tone === "bad" ? "bg-bad-soft text-bad" : "bg-brand-soft text-brand-text",
          )}
        >
          {icon}
        </div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="mt-2 text-sm leading-relaxed text-muted">{body}</div>
        {actions && <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">{actions}</div>}
      </Card>
    </div>
  );

  if (state === "checking") return box("brand", <Spinner className="text-brand-text" label="Checking your link" />, "Activating your account…", "This only takes a moment.", null);

  if (state === "activated")
    return box(
      "ok",
      <CircleCheck />,
      "Your account is active",
      <>Thanks for confirming {email}. You can log in now.</>,
      <Button variant="primary" to={`/login?reason=activated&email=${encodeURIComponent(email)}`}>
        Log in
      </Button>,
    );

  if (state === "already")
    return box(
      "brand",
      <CircleCheck />,
      "Already activated",
      "This link was already used, so your account is active. Just log in.",
      <Button variant="primary" to={`/login?email=${encodeURIComponent(email)}`}>
        Log in
      </Button>,
    );

  if (state === "expired")
    return box(
      "warn",
      <Clock />,
      "This link has expired",
      <>
        Activation links work for 24 hours. We can send a fresh one to {email}.
        {newLink && (
          <PrototypeMail>
            The new email contains this link:{" "}
            <Link to={newLink} className="font-semibold text-brand-text underline">
              Activate my account
            </Link>
          </PrototypeMail>
        )}
      </>,
      !newLink && (
        <Button variant="primary" icon={<MailCheck className="size-4" />} onClick={() => setNewLink(activationLink(email))}>
          Send me a new link
        </Button>
      ),
    );

  return box(
    "bad",
    <TriangleAlert />,
    "This link is not valid",
    "The link may have been copied incompletely. If you already created an account, log in and we will help you from there.",
    <>
      <Button variant="primary" to="/login">
        Log in
      </Button>
      <Button to="/signup">Create an account</Button>
    </>,
  );
}


