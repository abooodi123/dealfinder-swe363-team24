# Team guide (Milestone 4)

This guide explains how Members 2, 3 and 4 add their screens on top of the shared foundation
(layout, UI kit, data store and routes) built by Member 1.

## 1. Get started

```bash
git clone https://github.com/<owner>/<repository>.git
cd <repository>
npm install
git checkout main
git pull
git checkout -b feature/member2-auth-shopper     # use your own branch name (see below)
npm run dev
```

| Member | Branch | Your files |
|---|---|---|
| Member 1 | `feature/member1-public-ui` | `src/pages/public.tsx`, `src/ui/*`, `src/index.css` |
| Member 2 | `feature/member2-auth-shopper` | `src/pages/auth.tsx`, `src/pages/shopper.tsx` |
| Member 3 | `feature/member3-owner-portal` | `src/pages/owner.tsx`, `src/pages/ownerParts.tsx`, `src/pages/ownerTools.tsx` |
| Member 4 | `feature/member4-admin-quality` | `src/pages/admin.tsx`, `src/pages/admin2.tsx`, `src/pages/system.tsx`, `tests/`, `README.md`, `AI_USAGE.md` |

Each of your files already exists with **placeholder pages** (`PlannedPage`) that list what to build.
Replace a placeholder with your real component and keep the same exported name, so `App.tsx` does not need to change.

## 2. Commit and pull request rules

- Commit from **your own GitHub account**, in small steps with clear messages, e.g. `feat(owner): add coupon form validation`.
- Before opening a pull request: `npm run build` must pass, and you checked your pages on desktop **and** mobile, in dark **and** light mode.
- Pull `main` often (`git pull origin main`) to get the others' work and avoid big conflicts.
- Do not commit `node_modules/`, `dist/` or `.env` files (they are in `.gitignore`).
- **AI tools:** if you use any AI tool (ChatGPT, Copilot, Claude, Cursor, autocomplete ...), add it to `AI_USAGE.md` and keep the full conversations for the evidence ZIP. You must be able to explain every line you commit.

## 3. Routes

All routes are in `src/App.tsx`, grouped by member. Ask in the group before changing someone else's section.

- Protect a page by role with `RequireRole`:

  ```tsx
  <Route path="portal/coupons" element={<RequireRole role="owner"><CouponsPage /></RequireRole>} />
  ```

  Guests are sent to `/login?next=<the page>`; other roles see Access denied.
- Member 3 and Member 4 currently have catch-all routes (`/portal/*`, `/admin/*`). Add your specific routes **above** the catch-all.

## 4. Reading and changing data

The prototype has no server yet. All data is one object (`AppData` in `src/lib/types.ts`) saved in localStorage.
Demo data is in `src/lib/seed.ts` (stores, users, reviews, coupons, applications, tickets, notifications, clicks).

```tsx
import { useData, useCurrentUser, update } from "../lib/store";
import { storeRating, visibleReviews, isPublicStore } from "../lib/selectors";

export function MyPage() {
  const data = useData();              // whole database, re-renders on every change
  const user = useCurrentUser();       // signed-in user or null

  const myStores = data.stores.filter((s) => s.ownerId === user?.id);

  const hideStore = (id: string) =>
    update((d) => {                    // copy -> change -> save -> re-render
      const store = d.stores.find((s) => s.id === id);
      if (store) store.listing = "hidden";
    });
  ...
}
```

Rules that keep every page consistent:

- **Use the selectors** in `src/lib/selectors.ts` instead of re-writing the logic:
  `isPublicStore`, `storeRating` (average rating), `visibleReviews`, `activeCoupons`, `featuredStores`, `sortStores` ...
- A new review must be saved with `inBase: false` and `status: "visible"`, so `storeRating` includes it.
- Hiding something (store, review, coupon) must remove it from public pages immediately; the selectors already do this.
- Put small named actions (e.g. `approveApplication(id)`) at the top of your page file or in `src/lib/store.ts` if several pages need them.
- After you change `seed.ts` or the data shape, press **Prototype tools → Reset demo data**. If you change the shape of
  existing data, increase `DATA_VERSION` in `seed.ts` so old browser copies are replaced.

Already available helpers:

| Helper | File | Use |
|---|---|---|
| `login`, `logout`, `loginAsDemo`, `homeFor` | `lib/store.ts` | Member 2 login form, redirects by role |
| `toggleFavorite` | `lib/store.ts` | Favorites page (Member 2) |
| `nextNumber()` | `lib/store.ts` | Readable ids such as `APP-1051`, `SUP-1052` |
| `isValidEmail`, `passwordChecks`, `isStrongPassword` | `lib/format.ts` | Sign up and profile forms |
| `isValidWebsite`, `hostname` | `lib/format.ts` | Store submission and editing |
| `containsContactDetails` | `lib/format.ts` | Review text rule (no links / emails / phones) |
| `formatDate`, `timeAgo`, `plural`, `compactNumber` | `lib/format.ts` | Display |
| `useSimulatedLoading`, `useDocumentTitle` | `lib/hooks.ts` | Loading skeletons, browser tab title |

## 5. Building screens

Use the shared components instead of styling raw HTML, so every screen matches the Figma file and both themes:

| Need | Component (import from) |
|---|---|
| Page width and title | `Container`, `PageHeader` (`ui/kit`) |
| Buttons | `Button` (`variant`: primary, secondary, ghost, danger, soft, soft-danger; `to` for links), `IconButton` |
| Forms | `Field` + `Input` / `TextArea` / `Select` / `Checkbox`, `Segmented`, `SearchInput` |
| Messages | `Alert`, `useToast()` for confirmations, `EmptyState` for empty lists |
| Loading | `Skeleton`, `Spinner`, `useSimulatedLoading()` |
| Dialogs and confirmations | `Modal` (accessible: Escape, focus trap) |
| Ratings and price | `Stars`, `PriceLevel`, `RatingInline` |
| Store visuals | `StoreLogo`, `StoreCard`, `StoreRow`, `StoreMiniLink`, `CouponCard`, `ReviewItem`, badges (`ui/shared`) |
| Guest needs an account | `LoginPrompt` (`ui/shared`) |

Colours: use the theme classes (`bg-surface`, `text-muted`, `border-line`, `text-brand-text`, `text-ok`, `text-bad` ...)
listed in [docs/DESIGN.md](docs/DESIGN.md). **Do not hard-code hex colours**, or light mode will break.

## 6. Checklist for every screen

- [ ] Works on mobile (375 px), tablet and desktop, with no sideways scrolling
- [ ] Works in dark and light mode
- [ ] Every form shows validation errors next to the field, a loading state on submit, and a success message
- [ ] Empty lists show an `EmptyState` with a next step
- [ ] Destructive actions (delete, disable, reject) ask for confirmation in a `Modal`
- [ ] Page title set with `useDocumentTitle`
- [ ] `npm run build` passes
