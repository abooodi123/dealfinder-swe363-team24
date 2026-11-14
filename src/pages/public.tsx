/**
 * Public pages - Member 1 (Public UI and Design Lead).
 * Home (W02), Explore (W03), Store details (W04) and the 404 page.
 * Placeholders: the real pages arrive on the feature/member1-public-ui branch.
 */
import { PlannedPage } from "../ui/shared";

const MEMBER = "Member 1 (Public UI and Design Lead)";
const FILE = "src/pages/public.tsx";

export const HomePage = () => (
  <PlannedPage
    title="Home"
    member={MEMBER}
    file={FILE}
    requirements="W02-1, FR02"
    tasks={["Search box and suggested searches", "Category tiles with store counts", "Featured stores and coupons"]}
  />
);

export const ExplorePage = () => (
  <PlannedPage
    title="Explore stores"
    member={MEMBER}
    file={FILE}
    requirements="W03-1, W03-2, FR02-FR04"
    tasks={["Search, category and price filters", "Sort by rating, grid and list views", "Featured today and the no-results state"]}
  />
);

export const StoreDetailsPage = () => (
  <PlannedPage
    title="Store details"
    member={MEMBER}
    file={FILE}
    requirements="W04-1 to W04-4, FR05-FR08"
    tasks={["Store profile, coupons and reviews", "Save to favorites with the guest log in prompt", "Visit official website with the leaving notice"]}
  />
);

export const NotFoundPage = () => (
  <PlannedPage title="Page not found" member={MEMBER} file={FILE} tasks={["Friendly 404 page with search and links"]} />
);
