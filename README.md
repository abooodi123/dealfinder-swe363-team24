# DealFinder

**SWE 363 Web Engineering · Team 24 (Section 02) · Milestone 4: Front-End Prototype**

DealFinder is an online store directory that helps shoppers **find, compare and visit trusted online stores**.
Shoppers browse verified stores by category, filter by price level, sort by community rating, read reviews,
copy coupons and continue to the store's official website. Store owners submit and manage their listings,
and administrators verify stores and moderate content so the "Verified" badge keeps its meaning.

DealFinder does **not** sell products or process payments. It links to each retailer's own website.

> This milestone is a fully interactive **front-end prototype** built with React. All data is fictional and
> kept in the browser (localStorage). The Node.js back end is planned for Milestone 5.

---

## Table of contents

- [Features](#features)
- [Tech stack and dependencies](#tech-stack-and-dependencies)
- [Getting started](#getting-started)
- [Usage](#usage)
- [Project structure](#project-structure)
- [Routes](#routes)
- [Team members and roles](#team-members-and-roles)
- [Git workflow](#git-workflow)
- [Design reference (Figma)](#design-reference-figma)
- [AI usage](#ai-usage)

---

## Features

DealFinder has 24 functional requirements (FR01–FR24) across three roles, defined in the Milestone 3 requirements document.

| Area | Requirements | Screens | Owner | Status |
|---|---|---|---|---|
| Public browsing | FR02 discovery, FR03 price filter, FR04 rating sort, FR05 store details, FR08 official website | Home, Explore, Store details, 404 | Member 1 | Done |
| Shared UI | Navbar, footer, UI kit, store cards, loading / empty / error states, dark and light theme, responsive layout | All pages | Member 1 | Done |
| Accounts and shopper | FR01 accounts, FR06 favorites, FR07 reviews | Log in, Sign up, Profile, Favorites, Write a review | Member 2 | In progress |
| Store owner portal | FR10–FR16 | Dashboard, Manage store, Add / Claim store, Applications, Coupons, Reviews, Analytics, Support | Member 3 | Done |
| Administrator portal | FR17–FR24 (+ admin side of FR16) | Overview, Submissions, Catalog, Add / Edit store, Categories, Moderation, Featured, Analytics, Support | Member 4 | Done |
| Quality | Requirements guide, Access denied, browser tests (`tests/`) | Guide, Access denied | Member 4 | Done |

### Public pages (Member 1)

- **Home** – search box, suggested searches, category tiles with live store counts, featured stores and coupons scheduled by administrators, and a store-owner call to action.
- **Explore** – search as you type (name, description, keywords, category), category filter, price filter ($ / $$ / $$$), *Verified only* and *Include closed* options, sort by highest rating / lowest rating / most reviews (stores without ratings always last), grid or list view, *Featured today*, removable filter chips, *Load more*, and a helpful empty state with a *Did you mean …?* suggestion. Filters are kept in the URL, so results can be shared and the Back button works.
- **Store details** – profile, Verified / Featured / Closed badges, star rating, active coupons only (click to copy), visible reviews with rating breakdown and sorting, owner replies, related stores and an *About this listing* panel.
- **Visit official website** – a short reachability check, the *You are leaving DealFinder* notice, then the store opens in a new tab and one referral click is recorded. If the website is down, the shopper is told clearly and can report the broken link (once).
- **Guest actions** – saving a store as a guest opens a *Log in to save* prompt; after logging in the user returns to the same store and it is saved automatically.
- **404 and error screens** – a friendly not-found page with search and category links, an error boundary that shows *This page hit a problem* instead of a blank screen, and an *Access denied* page for the wrong role.

### Store owner portal (Member 3)

All owner pages share one tab bar (Overview, Applications, Coupons, Reviews, Analytics, Support) with counts of what needs attention.
Owners can only open their own stores, applications and support requests; anything else shows a *not found* message.

- **Dashboard (W08)** – summary of live listings, pending applications, website visits for the last 30 days (with the change from the previous 30 days) and live coupons; a *Needs your attention* list (changes requested, disabled stores, broken-link reports, support replies, reviews without a reply); every listing with its status and actions; recent applications; shortcuts.
- **Listing status (FR15)** – *Active*, *Hidden* or *Closed*, each with a confirmation dialog and *Undo*. Hidden stores disappear from search right away; closed stores stay visible with a Closed badge.
- **Manage store (W11, FR12)** – edit description, category, price level, keywords and contact email with validation. The name and website of a verified store are locked because they are part of the ownership check. Broken-link reports can be cleared once the website works again.
- **Add a store (W09, FR10)** – three steps: store details, proof of ownership, review and submit. The website and name are checked for duplicates; if the website already belongs to an unclaimed listing, the owner is offered to claim it instead. The new store is saved as *Pending review* and administrators are notified.
- **Proof of ownership** – a 10-digit commercial registration number with the certificate (PDF, PNG or JPG up to 5 MB), a 6-digit code sent to an email on the store's domain (the prototype shows the code in a message), or a DNS TXT record check.
- **Claim a listing (FR11)** – contact details, role and proof of ownership. Blocked when the owner already manages the store, when it already has an owner, or when the owner's earlier claim is still being reviewed.
- **My applications (W10, FR13)** – filters (In review, Needs changes, Approved, Rejected / withdrawn), a status timeline, the administrator's requested changes as a checklist, *Fix and resubmit* (enabled once every change is ticked), resubmission after a rejection (creates a new APP number), *Withdraw* with confirmation and the full history.
- **Coupons (W12, FR14)** – create, edit, pause / activate and delete (with confirmation and Undo). Codes are 4–15 letters or numbers and unique per store; percentage discounts up to 90%, fixed discounts up to 10,000 SAR; the last valid day must be within one year. Paused and expired coupons are hidden from shoppers.
- **Reviews and replies** – filter by store, stars and *Needs reply*; reply, edit or delete a reply (5–500 characters, no links, emails or phone numbers); report a review to the moderators once.
- **Analytics** – daily website visits for 7, 30 or 90 days (bar chart with a table view for screen readers), best day, coupon copies, new reviews, visits per store and coupons ranked by copies.
- **Platform support (W13, FR16)** – requests with status filters, a new request form (topic, optional store, subject, message of 20+ characters) and the conversation with the DealFinder team; opening a request marks the reply as read; *Close request*, and replying reopens it.

### Administrator portal (Member 4)

All admin pages share one sub-navigation (Overview, Submissions, Catalog, Categories, Moderation, Featured, Analytics, Support) with live counts of what is waiting.
Every decision is written to the activity log, and the affected store owner gets a notification.

- **Overview** – six live numbers (submissions waiting, reported reviews, open support requests, live stores, referral visits in 30 days, featured today), a *Needs a decision* list ordered by priority and age, and recent administrator activity.
- **Submissions (FR17)** – Waiting / With owner / Decided tabs, search by store, owner or APP number, type filter, and a *Competing claim* warning when two owners claim the same store. The submission page shows the store, the proof of ownership (with warnings such as a 9-digit registration number or a missing DNS record), the owner and the history. *Approve*, *Request changes* (1–5 items, each 10+ characters) and *Reject* (reason of 20+ characters, with quick reasons). Approving a claim gives the owner the listing and rejects the competing claim automatically. If another admin already decided, nothing is changed and a clear message is shown.
- **Catalog (FR19, FR20)** – every store with its status (Live, Closed, Hidden by owner, Disabled, Waiting for review, Changes requested, Rejected), search, status and category filters. *Disable* asks for a reason and hides the store everywhere immediately (with Undo); *Restore* brings it back; *Delete* lists what will be removed (reviews, coupons, featured slots, submissions, favorites) and requires typing the store name.
- **Add / edit a store (FR18, FR19)** – name, https website, category, price level, description (20–300 characters), up to 10 keywords, contact email and the Verified badge, with a live preview. Duplicate names and websites are rejected. Leaving with unsaved changes asks for confirmation.
- **Categories (FR21)** – add with an icon picker, rename, move up / down (this is the order on Home and Explore), hide / show (with Undo), and delete; deleting a category that still has stores asks where to move them.
- **Review moderation (FR22)** – Reported / Hidden / All tabs with search. *Keep* dismisses the reports (with Undo), *Hide* needs a reason and shows how the store's rating will change, *Restore* and *Delete* (with confirmation). Hidden and deleted reviews stop counting toward the rating immediately, including reviews that were part of the imported rating history.
- **Featured content (FR23)** – Showing now / Scheduled / Ended. Schedule a store (Home or Explore) or a coupon (Home) with a first and last day. Rules: live stores and active coupons only, no past start dates, at most 60 days, a coupon slot cannot outlast the coupon, no duplicate slot for the same item, and at most 6 stores and 6 coupons on Home (4 stores on Explore) on any day. Running slots warn when their store or coupon is no longer shown; *End now* or *Remove*.
- **Analytics (FR24)** – 7 / 30 / 90 days or a custom range (validated), category filter, totals with the change against the previous period, a referral-visits chart (daily, weekly for long ranges) with hover / keyboard values and a table view, stores ranked by visits with share and change, and **Export CSV** of exactly what is shown.
- **Support (admin side of FR16)** – owners' requests with Open / Answered / Closed filters and search; opening a request marks it read; replying notifies the owner; close and reopen.
- **Requirements guide** (`/guide`) – FR01–FR24 and the two extras, each with its screen, its owner and the steps to try (including error cases), filterable by role; *Open as …* signs in with the matching demo account.
- **Access denied** – shown when a signed-in user opens another role's page, with a button to log in with the right account.

---

## Tech stack and dependencies

| Purpose | Package | Version |
|---|---|---|
| UI framework | [React](https://react.dev) + React DOM | 19 |
| Language | [TypeScript](https://www.typescriptlang.org) | 5.9 |
| Build tool / dev server | [Vite](https://vite.dev) + `@vitejs/plugin-react` | 6 |
| Styling | [Tailwind CSS](https://tailwindcss.com) + `@tailwindcss/vite` | 4 |
| Routing | [React Router](https://reactrouter.com) (`react-router-dom`) | 7 |
| Icons | [Lucide React](https://lucide.dev) | 1.x |
| Fonts | Inter (body) and Outfit (headings) from Google Fonts | – |

No API keys or environment variables are needed for this milestone (see `.env.example`).

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) **20 or newer** (includes npm)
- Git

### Installation

```bash
git clone https://github.com/abooodi123/dealfinder-swe363-team24.git
cd dealfinder-swe363-team24
npm install
```

### Run the development server

```bash
npm run dev
```

Open <http://localhost:5173> in your browser.

### Other scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Type-check and build the production files into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Run the TypeScript compiler without building |

### Browser tests (Member 4)

`tests/test_admin.py` checks the administrator portal end to end in a real browser (20 checks: access control, FR16–FR24 normal and error cases, no page wider than a 375 px phone, no JavaScript errors).

```bash
pip install playwright
python -m playwright install chromium
npm run dev                                                      # terminal 1
DEALFINDER_URL=http://localhost:5173 python tests/test_admin.py  # terminal 2
```

See [tests/README.md](tests/README.md).

---

## Usage

### Demo accounts

Use the orange **Prototype tools** button (bottom-left of every page) to sign in with one click, or use these accounts once the login form is ready:

| Role | Email | Password |
|---|---|---|
| Shopper | `noura@example.com` | `Shopper#2026` |
| Store owner | `faisal@example.com` | `Owner#2026` |
| Administrator | `admin@dealfinder.app` | `Admin#2026` |

Prototype tools can also switch between dark and light mode and **reset the demo data** to its original state.

### Things to try (public pages)

1. **Search from Home** – type `skincare` and press Search, or click a suggestion such as *lamp*.
2. **Filter and sort** – on Explore choose *Home & Garden*, price `$$`, then sort by *Lowest rating*. Switch to the list view.
3. **Empty state** – search for `parfume`; DealFinder suggests *perfume*.
4. **Store details** – open *Urban Nest*: only the active coupon is shown (expired and paused ones are hidden), and a moderated review is not displayed.
5. **Leaving notice** – press *Visit official website*, then *Stay on DealFinder* or *Continue to website*.
6. **Website down** – open *Palm & Pine Decor* and press *Visit official website*, then *Report broken link*.
7. **Guest save** – as a guest press *Save to favorites*, choose *Log in*, sign in as the shopper and you return to the store with it saved.
8. **Store owner** – sign in as the store owner. Open *Aroma Lane needs changes*: the resubmit form rejects the 9-digit registration number until it has 10 digits, and every requested change must be ticked. Try *Hidden* on *Urban Nest*, create a coupon, reply to the 3-star review, and add a store using the website `https://loomlinen.sa` to see the duplicate check suggest a claim.
9. **Administrator** – sign in as the administrator, open *Submissions* and approve *Henna House*; it appears on Explore with the Verified badge. The [requirements guide](http://localhost:5173/guide) lists what to try for FR17–FR24.
10. **Responsive** – resize the window or use the browser's device toolbar; the filters collapse behind a *Filters* button and the navbar becomes a menu on mobile.

---

## Project structure

```
.
├── index.html               # HTML entry (fonts, theme bootstrap)
├── public/                  # Static files served as-is (favicon)
├── src/
│   ├── main.tsx             # React entry: router + toast provider
│   ├── App.tsx              # All routes and the role guard (RequireRole)
│   ├── index.css            # Tailwind import + design tokens (dark and light theme)
│   ├── lib/                 # Data and logic (no UI)
│   │   ├── types.ts         # Data model shared by every page
│   │   ├── seed.ts          # Fictional demo data and demo accounts
│   │   ├── store.ts         # In-browser database: useData(), update(), login(), actions
│   │   ├── selectors.ts     # Queries: public stores, ratings, coupons, featured, search, sort
│   │   ├── format.ts        # Formatting and validation helpers
│   │   ├── hooks.ts         # Reusable React hooks
│   │   └── theme.ts         # Dark / light theme
│   ├── ui/                  # Shared components
│   │   ├── kit.tsx          # Generic UI kit: Button, Field, Input, Select, Modal, Toast, Stars ...
│   │   ├── shared.tsx       # DealFinder components: StoreCard, CouponCard, ReviewItem, FavoriteButton ...
│   │   └── layout.tsx       # Navbar, footer, error boundary, Prototype tools
│   └── pages/               # One file (or more) per team member
│       ├── public.tsx       # Member 1: Home, Explore, Store details, 404
│       ├── auth.tsx         # Member 2: Log in, Sign up, password reset, activation
│       ├── shopper.tsx      # Member 2: Favorites, Profile, Write a review
│       ├── owner.tsx        # Member 3: Owner dashboard, manage store, shared portal parts
│       ├── ownerParts.tsx   # Member 3: Store submission, claim, applications
│       ├── ownerTools.tsx   # Member 3: Coupons, replies, analytics, support
│       ├── admin.tsx        # Member 4: Admin overview, submissions, catalog, add / edit store
│       ├── admin2.tsx       # Member 4: Categories, moderation, featured, analytics, admin support
│       └── system.tsx       # Member 4: Access denied, requirements guide
├── tests/                   # Member 4: browser tests (Playwright, Python)
├── docs/
│   └── DESIGN.md            # Design system: colours, type, components (matches Figma)
├── CONTRIBUTING.md          # How the team adds pages, uses the kit and the data store
├── AI_USAGE.md              # AI usage declaration (required)
└── .env.example             # No variables needed in Milestone 4
```

---

## Routes

| Path | Page | Access | Owner |
|---|---|---|---|
| `/` | Home | Everyone | Member 1 |
| `/explore` | Explore stores (query: `q`, `category`, `price`, `verified`, `closed`, `sort`, `view`) | Everyone | Member 1 |
| `/stores/:storeId` | Store details | Everyone | Member 1 |
| `/login`, `/signup`, `/signup/owner`, `/forgot-password`, `/activate` | Authentication | Everyone | Member 2 |
| `/favorites`, `/stores/:storeId/review` | Favorites, Write a review | Shopper | Member 2 |
| `/profile` | Profile settings | Signed in | Member 2 |
| `/portal` | Owner dashboard and listings | Store owner | Member 3 |
| `/portal/stores/new` | Add a store (FR10) | Store owner | Member 3 |
| `/portal/stores/:storeId` | Manage store: profile and listing status (FR12, FR15) | Store owner | Member 3 |
| `/portal/claim/:storeId` | Claim a listing (FR11) | Store owner | Member 3 |
| `/portal/applications`, `/portal/applications/:appId` | My applications, follow-up and resubmission (FR13); `?status=` filter | Store owner | Member 3 |
| `/portal/coupons` | Coupons (FR14); `?store=` filter | Store owner | Member 3 |
| `/portal/reviews` | Reviews and replies; `?store=`, `?filter=unanswered` | Store owner | Member 3 |
| `/portal/analytics` | Owner analytics; `?store=` filter | Store owner | Member 3 |
| `/portal/support`, `/portal/support/new`, `/portal/support/:ticketId` | Platform support (FR16) | Store owner | Member 3 |
| `/admin` | Admin overview | Administrator | Member 4 |
| `/admin/queue`, `/admin/queue/:appId` | Submissions and one submission (FR17) | Administrator | Member 4 |
| `/admin/catalog`, `/admin/catalog/new`, `/admin/catalog/:storeId` | Catalog, add store, edit store (FR18–FR20) | Administrator | Member 4 |
| `/admin/categories` | Categories (FR21) | Administrator | Member 4 |
| `/admin/moderation` | Review moderation (FR22); `?review=<id>` highlights one review | Administrator | Member 4 |
| `/admin/featured` | Featured content (FR23) | Administrator | Member 4 |
| `/admin/analytics` | Analytics and CSV export (FR24) | Administrator | Member 4 |
| `/admin/support`, `/admin/support/:ticketId` | Support requests, admin side (FR16) | Administrator | Member 4 |
| `/guide` | Requirements guide | Everyone | Member 4 |
| `*` | 404 Not found | Everyone | Member 1 |

Guests who open a protected page are sent to Log in and brought back afterwards; signed-in users with the wrong role see *Access denied*.

---

## Team members and roles

| Member | Name | Role | Main files |
|---|---|---|---|
| Member 1 | Abdullah Ewidah | Public UI and Design Lead: Figma reference, shared layout and UI kit, Home, Explore, Store details, 404 | `src/pages/public.tsx`, `src/ui/*`, `src/index.css`, `src/App.tsx` |
| Member 2 | _to be confirmed_ | Authentication and Shopper Features | `src/pages/auth.tsx`, `src/pages/shopper.tsx` |
| Member 3 | Turki Andous | Store Owner Portal: owner dashboard, listing status, store profile, store submission and ownership verification, listing claims, applications and resubmission, coupons, review replies, owner analytics, platform support | `src/pages/owner.tsx`, `ownerParts.tsx`, `ownerTools.tsx`, owner routes in `src/App.tsx` |
| Member 4 | Mahdi Al Hashem | Administrator Portal and Quality: admin overview, submissions, catalog, categories, moderation, featured content, analytics, admin support, requirements guide, browser tests, documentation | `src/pages/admin.tsx`, `admin2.tsx`, `system.tsx`, admin routes in `src/App.tsx`, `tests/`, `README.md`, `AI_USAGE.md` |

Team 24: Mahdi Al Hashem, Naser Almasoud, Abdullah Ewidah, Turki Andous.

---

## Git workflow

- `main` always builds and runs. Nobody pushes unfinished work to `main`.
- Each member works on their own branch, for example `feature/member2-auth-shopper`, commits from **their own GitHub account**, and opens a pull request.
- Merge only after `npm run build` passes and the pages were checked on desktop and mobile.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full team guide.

---

## Design reference (Figma)

The Figma reference file is maintained by Member 1:
**[DealFinder – Milestone 4 Figma Reference](https://www.figma.com/design/ePDnxHj04TxolovVtfESJi)** (view only).

The page *Member 1 – Public UI* has 16 frames made of editable layers, captured from this prototype:

| Row | Frames |
|---|---|
| Desktop 1440 px, dark theme (default) | 01 Home · 02 Explore · 03 Explore filtered, list view · 04 Explore no results · 05 Store details · 06 404 |
| Desktop 1440 px, light theme | 07 Home · 08 Store details |
| Dialogs | 09 Log in to save · 10 You are leaving DealFinder · 11 Website not responding |
| Mobile 375 px | 12 Home · 13 Explore · 14 Store details · 15 Navigation menu · 16 Explore with filters open |

Members 2–4 can add a page for their own screens once Member 1 invites them to the file as editors.
The colours, typography and components it uses are documented in [docs/DESIGN.md](docs/DESIGN.md).

---

## AI usage

AI tools used in this milestone are declared in [AI_USAGE.md](AI_USAGE.md), as required by the course AI Usage Guidelines.
