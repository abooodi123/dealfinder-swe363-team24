/**
 * Shopper pages - Member 2 (Authentication and Shopper Features).
 *
 * TODO (Member 2): replace each placeholder with the real screen.
 * Wireframes: W05 (review), W06 (favorites), W07 (profile). Requirements: FR01, FR06, FR07.
 * Ready to use: toggleFavorite() in src/lib/store.ts, StoreCard / StoreRow / FavoriteButton /
 * ReviewItem / LoginPrompt in src/ui/shared.tsx, containsContactDetails() in src/lib/format.ts,
 * storeRating() / visibleReviews() in src/lib/selectors.ts.
 */
import type { Review, Store } from "../lib/types";
import { PlannedPage } from "../ui/shared";

const MEMBER = "Member 2 (Authentication and Shopper Features)";
const FILE = "src/pages/shopper.tsx";

export const FavoritesPage = () => (
  <PlannedPage
    title="My favorites"
    member={MEMBER}
    file={FILE}
    requirements="W06-1, FR06"
    tasks={["List saved stores (reuse StoreCard)", "Filter and sort the saved list", "Remove with an Undo toast", "Empty state with a link to Explore"]}
  />
);

export const ProfilePage = () => (
  <PlannedPage
    title="Profile settings"
    member={MEMBER}
    file={FILE}
    requirements="W07-1, W07-2, FR01"
    tasks={["Edit name and contact details", "Change email and password", "Delete account with password and DELETE confirmation"]}
  />
);

export const WriteReviewPage = () => (
  <PlannedPage
    title="Write a review"
    member={MEMBER}
    file={FILE}
    requirements="W05-1, W05-2, FR07"
    tasks={[
      "Star selector (1-5) and review text with a 1,000 character counter",
      "Reject links, emails and phone numbers; one review per shopper per store",
      "Save with inBase: false so the store's average rating updates immediately",
      "Edit an existing review",
    ]}
  />
);

/**
 * Buttons shown under each review on the Store details page (Report, Edit).
 * TODO (Member 2): return a Report button (one report per review per user; guests get the
 * LoginPrompt) and an Edit button on the shopper's own review.
 */
export function ReviewActions(_props: { review: Review; store: Store }) {
  return null;
}
