/**
 * Authentication pages - Member 2 (Authentication and Shopper Features).
 *
 * TODO (Member 2): replace each placeholder with the real screen.
 * Wireframes: W01-1 to W01-7. Requirements: FR01, FR09.
 * Helpers you can use: login(), logout(), homeFor() in src/lib/store.ts,
 * isValidEmail(), passwordChecks(), isStrongPassword() in src/lib/format.ts,
 * Field / Input / Button / Alert in src/ui/kit.tsx.
 *
 * After a successful login, send the user to the `next` query parameter if present
 * (pages that need an account link here as /login?next=/the/page).
 */
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Role } from "../lib/types";
import { homeFor, loginAsDemo } from "../lib/store";
import { DEMO_ACCOUNTS } from "../lib/seed";
import { Button, Card } from "../ui/kit";
import { PlannedPage } from "../ui/shared";

const MEMBER = "Member 2 (Authentication and Shopper Features)";
const FILE = "src/pages/auth.tsx";

export function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get("next");

  // Temporary helper so the rest of the team can test signed-in flows until the real form exists.
  const demoLogin = (role: Role) => {
    const result = loginAsDemo(role);
    if (result.ok) navigate(next && next.startsWith("/") ? next : homeFor(role), { replace: true });
  };

  return (
    <>
      <PlannedPage
        title="Log in"
        member={MEMBER}
        file={FILE}
        requirements="W01-4, W01-5, FR01, FR09"
        tasks={[
          "Email and password form with validation (empty fields, email format)",
          "Clear error for a wrong password, inactive or suspended account",
          "Loading state on submit, then redirect to ?next= or the role's home page",
          "Links to Sign up, Store owner sign up and Forgot password",
        ]}
      />
      <div className="mx-auto -mt-10 w-full max-w-3xl px-4 pb-16 sm:px-6">
        <Card className="p-6">
          <p className="text-sm font-semibold">Temporary: sign in as a demo user</p>
          <p className="mt-1 text-xs text-muted">Member 2 removes this box when the real login form is ready.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(DEMO_ACCOUNTS) as Role[]).map((role) => (
              <Button key={role} variant="soft" onClick={() => demoLogin(role)}>
                {DEMO_ACCOUNTS[role].label}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

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
