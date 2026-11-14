/**
 * Administrator portal - Member 4 (Administrator Portal and Quality).
 * Dashboard, submission queue and catalog management. Wireframes: W14, W15. Requirements: FR17-FR20.
 * TODO (Member 4): replace the placeholder and add nested routes under /admin in src/App.tsx.
 */
import { PlannedPage } from "../ui/shared";

export const AdminDashboardPage = () => (
  <PlannedPage
    title="Admin dashboard"
    member="Member 4 (Administrator Portal and Quality)"
    file="src/pages/admin.tsx"
    requirements="W14, W15, FR17-FR20"
    tasks={[
      "Platform overview: pending submissions, live stores, reviews, categories",
      "Submission queue with Approve, Request changes and Reject",
      "Store catalog: create, edit, disable with reason, delete with confirmation",
    ]}
  />
);
