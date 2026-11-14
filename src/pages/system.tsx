/**
 * System pages - Member 4 (Administrator Portal and Quality).
 * Access denied (used by the route guard in App.tsx) and the requirements guide.
 * TODO (Member 4): improve AccessDeniedPage if needed and build the guide page.
 */
import { ShieldAlert } from "lucide-react";
import type { Role } from "../lib/types";
import { useDocumentTitle } from "../lib/hooks";
import { homeFor, useCurrentUser } from "../lib/store";
import { Button, Container, EmptyState } from "../ui/kit";
import { PlannedPage } from "../ui/shared";

const ROLE_NAME: Record<Role, string> = { shopper: "shopper", owner: "store owner", admin: "administrator" };

/** Shown when a signed-in user opens a page meant for another role (NFR: role-based access control). */
export function AccessDeniedPage({ need }: { need: Role }) {
  useDocumentTitle("Access denied");
  const user = useCurrentUser();
  return (
    <Container className="py-20">
      <EmptyState
        icon={<ShieldAlert />}
        title="You do not have access to this page"
        action={
          <>
            <Button to={user ? homeFor(user.role) : "/"} variant="primary">
              Go to my home page
            </Button>
            <Button to="/">Back to Home</Button>
          </>
        }
      >
        This page is only for {ROLE_NAME[need]} accounts.
        {user && <> You are signed in as a {ROLE_NAME[user.role]}.</>}
      </EmptyState>
    </Container>
  );
}

export const GuidePage = () => (
  <PlannedPage
    title="Requirements guide"
    member="Member 4 (Administrator Portal and Quality)"
    file="src/pages/system.tsx"
    tasks={[
      "List FR01-FR24 with the steps to try each one in the prototype",
      "Demo accounts and how to use Prototype tools",
      "Link each requirement to its screen",
    ]}
  />
);
