/**
 * Administrator tools - Member 4 (Administrator Portal and Quality).
 * Categories (W16), review moderation (W17), featured content (W18), analytics (W19), admin support.
 * Requirements: FR21-FR24.
 * TODO (Member 4): replace the placeholder.
 */
import { PlannedPage } from "../ui/shared";

/** Catch-all for /admin/* routes until each screen has its own route. */
export const AdminSectionPage = () => (
  <PlannedPage
    title="Administration"
    member="Member 4 (Administrator Portal and Quality)"
    file="src/pages/admin2.tsx"
    requirements="W16-W19, FR21-FR24"
    tasks={[
      "Category management",
      "Review moderation: Keep, Hide with a reason, Delete",
      "Featured stores and coupons schedule",
      "Analytics with date range and CSV export",
      "Reply to owner support requests",
    ]}
  />
);
