/**
 * Store owner portal - Member 3 (Store Owner Portal).
 *
 * TODO (Member 3): replace the placeholders. Split your screens across owner.tsx,
 * ownerParts.tsx and ownerTools.tsx, and add nested routes under /portal in src/App.tsx.
 * Wireframes: W08-W13. Requirements: FR09-FR16.
 * Seed data ready in src/lib/seed.ts: Faisal's stores (urban-nest, nest-kids, aroma-lane,
 * dune-popup), applications APP-1001/1038/1042/1031, support tickets, notifications and click history.
 */
import { PlannedPage } from "../ui/shared";

const MEMBER = "Member 3 (Store Owner Portal)";

export const OwnerDashboardPage = () => (
  <PlannedPage
    title="Store Portal"
    member={MEMBER}
    file="src/pages/owner.tsx"
    requirements="W08, FR12, FR15"
    tasks={[
      "My listings and applications with their status",
      "Listing status control: Active, Hidden, Closed (with confirmation)",
      "Shortcuts to Add store, Coupons, Reviews, Analytics and Support",
    ]}
  />
);

/** Catch-all for /portal/* routes until each screen has its own route. */
export const OwnerPortalPage = () => (
  <PlannedPage
    title="Store Portal"
    member={MEMBER}
    file="src/pages/owner.tsx"
    requirements="W08-W13"
    tasks={["My Applications (W10)", "Edit store profile (W11)", "Coupons (W12)", "Reviews and replies, owner analytics"]}
  />
);
