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
| Store owner portal | FR09–FR16 | Dashboard, Add / Claim store, Applications, Edit profile, Coupons, Support | Member 3 | In progress |
| Administrator portal | FR17–FR24 | Review queue, Catalog, Categories, Moderation, Featured, Analytics | Member 4 | In progress |

### Public pages (Member 1)

- **Home** – search box, suggested searches, category tiles with live store counts, featured stores and coupons scheduled by administrators, and a store-owner call to action.
- **Explore** – search as you type (name, description, keywords, category), category filter, price filter ($ / $$ / $$$), *Verified only* and *Include closed* options, sort by highest rating / lowest rating / most reviews (stores without ratings always last), grid or list view, *Featured today*, removable filter chips, *Load more*, and a helpful empty state with a *Did you mean …?* suggestion. Filters are kept in the URL, so results can be shared and the Back button works.
- **Store details** – profile, Verified / Featured / Closed badges, star rating, active coupons only (click to copy), visible reviews with rating breakdown and sorting, owner replies, related stores and an *About this listing* panel.
- **Visit official website** – a short reachability check, the *You are leaving DealFinder* notice, then the store opens in a new tab and one referral click is recorded. If the website is down, the shopper is told clearly and can report the broken link (once).
- **Guest actions** – saving a store as a guest opens a *Log in to save* prompt; after logging in the user returns to the same store and it is saved automatically.
- **404 and error screens** – a friendly not-found page with search and category links, an error boundary that shows *This page hit a problem* instead of a blank screen, and an *Access denied* page for the wrong role.

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
8. **Responsive** – resize the window or use the browser's device toolbar; the filters collapse behind a *Filters* button and the navbar becomes a menu on mobile.

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
│       ├── owner.tsx        # Member 3: Owner dashboard and listings
│       ├── ownerParts.tsx   # Member 3: Store submission and claim
│       ├── ownerTools.tsx   # Member 3: Coupons, replies, analytics, support
│       ├── admin.tsx        # Member 4: Admin dashboard, queue, catalog
│       ├── admin2.tsx       # Member 4: Categories, moderation, featured, analytics
│       └── system.tsx       # Member 4: Access denied, requirements guide
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
| `/portal/*` | Store owner portal | Store owner | Member 3 |
| `/admin/*` | Administrator portal | Administrator | Member 4 |
| `/guide` | Requirements guide | Everyone | Member 4 |
| `*` | 404 Not found | Everyone | Member 1 |

Guests who open a protected page are sent to Log in and brought back afterwards; signed-in users with the wrong role see *Access denied*.

---

## Team members and roles

| Member | Name | Role | Main files |
|---|---|---|---|
| Member 1 | Abdullah Ewidah | Public UI and Design Lead: Figma reference, shared layout and UI kit, Home, Explore, Store details, 404 | `src/pages/public.tsx`, `src/ui/*`, `src/index.css`, `src/App.tsx` |
| Member 2 | _to be confirmed_ | Authentication and Shopper Features | `src/pages/auth.tsx`, `src/pages/shopper.tsx` |
| Member 3 | _to be confirmed_ | Store Owner Portal | `src/pages/owner.tsx`, `ownerParts.tsx`, `ownerTools.tsx` |
| Member 4 | _to be confirmed_ | Administrator Portal and Quality | `src/pages/admin.tsx`, `admin2.tsx`, `system.tsx`, `README.md`, `AI_USAGE.md` |

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
