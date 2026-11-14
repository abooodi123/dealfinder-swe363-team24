/**
 * Owner tools - Member 3 (Store Owner Portal).
 * Coupons (W12), review replies, owner analytics and Platform Support (W13). Requirements: FR14, FR16.
 * TODO (Member 3): replace the placeholder.
 */
import { PlannedPage } from "../ui/shared";

export const SupportPage = () => (
  <PlannedPage
    title="Platform support"
    member="Member 3 (Store Owner Portal)"
    file="src/pages/ownerTools.tsx"
    requirements="W13, FR16"
    tasks={["List of support requests with status", "New request form with validation", "Conversation view with replies from administrators"]}
  />
);
