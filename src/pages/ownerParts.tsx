/**
 * Store submission and claim - Member 3 (Store Owner Portal).
 * Wireframes: W09, W10, W11. Requirements: FR10-FR13.
 * TODO (Member 3): replace the placeholders.
 */
import { PlannedPage } from "../ui/shared";

const MEMBER = "Member 3 (Store Owner Portal)";
const FILE = "src/pages/ownerParts.tsx";

export const AddStorePage = () => (
  <PlannedPage
    title="Add a new store"
    member={MEMBER}
    file={FILE}
    requirements="W09-1 to W09-4, FR10"
    tasks={[
      "Three-step form: store details, ownership evidence, review and submit",
      "Validation (website format, duplicate listings, evidence)",
      "Saved as Pending Review and sent to the admin queue",
    ]}
  />
);

export const ClaimStorePage = () => (
  <PlannedPage
    title="Claim this listing"
    member={MEMBER}
    file={FILE}
    requirements="W09-5, W09-6, FR11"
    tasks={[
      "Contact details and ownership evidence",
      "Block duplicate pending claims and already-assigned listings",
      "Show the claim status afterwards",
    ]}
  />
);
