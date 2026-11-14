# DealFinder design system

This document describes the visual language used in the React code and in the
[Figma reference file](https://www.figma.com/design/ePDnxHj04TxolovVtfESJi).
The source of truth for the values is `src/index.css` (tokens) and `src/ui/kit.tsx` / `src/ui/shared.tsx` (components).

## Themes

DealFinder ships with a **dark theme (default)** and a **light theme**. The user switches with the sun / moon
button in the navbar; the choice is saved in the browser. Components only use semantic tokens, so both themes
work automatically.

## Colour tokens

| Token (Tailwind class) | Purpose | Dark | Light |
|---|---|---|---|
| `bg` | Page background | `#050816` | `#F6F7FB` |
| `surface` | Cards, panels, dialogs | `#0B1224` | `#FFFFFF` |
| `surface-2` | Inputs, hover states | `#101A33` | `#F1F4F9` |
| `surface-3` | Skeletons, empty stars, chips | `#16223F` | `#E8EDF5` |
| `line` / `line-strong` | Borders | `#1C2846` / `#2A3A60` | `#E2E8F0` / `#CBD5E1` |
| `fg` | Main text | `#F1F5F9` | `#0F172A` |
| `muted` | Secondary text | `#A3B1C6` | `#475569` |
| `subtle` | Hints, captions | `#6B7A93` | `#7B8AA0` |
| `brand` | Primary buttons, selected states | `#2563EB` | `#2563EB` |
| `brand-text` | Links, accents on dark/light surfaces | `#60A5FA` | `#1D4ED8` |
| `ok` | Verified badge, price level, success | `#34D399` | `#047857` |
| `warn` | Featured badge, warnings | `#FBBF24` | `#B45309` |
| `bad` | Errors, Closed badge, favorites heart | `#F87171` | `#DC2626` |
| `star` | Rating stars | `#FBBF24` | `#F59E0B` |
| Prototype tools | Testing helper only | `#F97316` (orange) | same |

Each colour also has a `-soft` version (low-opacity background) for badges and alerts, e.g. `bg-ok-soft text-ok`.

## Typography

| Use | Font | Weight | Size (desktop) |
|---|---|---|---|
| Hero title | Outfit | 700 | 72 px (48 px tablet, 36 px mobile) |
| Page title (`h1`) | Outfit | 700 | 36 px (30 px mobile) |
| Section title (`h2`) | Outfit | 700 | 24–30 px |
| Card title | Outfit | 600 | 18 px |
| Body | Inter | 400 / 500 | 16 px (14 px in cards and forms) |
| Labels, buttons | Inter | 600 | 14 px |
| Eyebrow / caps labels | Inter | 600–700 | 12 px, letter-spacing 0.14em, uppercase |

## Spacing, radius and layout

- Base unit 4 px (Tailwind spacing). Cards use 20–32 px padding.
- Radius: 12 px for buttons and inputs, 16 px for cards, 24 px for dialogs and large panels; pills are fully rounded.
- Max content width 1280 px, side padding 16 px (mobile) / 24 px (tablet) / 32 px (desktop).
- Breakpoints: `sm` 640 px, `md` 768 px (navbar switches to the menu below this), `lg` 1024 px (Explore filter sidebar
  and Store details sidebar appear), `xl` 1280 px (three-column store grid).

## Components

| Component | Description |
|---|---|
| Button | Heights 36 / 44 / 52 px. Variants: primary (blue), secondary (bordered), ghost, danger, soft (blue tint), soft-danger (red tint). Optional icon and loading spinner. |
| Input / Select / TextArea | 44 px high, `surface-2` background, blue focus ring, red border + message when invalid. |
| Segmented control | Row of equal buttons, the selected one is filled blue (price filter). |
| Badge | Pill with icon: Verified (green), Not verified (grey), Featured (amber caps), Closed (red). |
| Store logo | Rounded square with the store's initials on a two-tone gradient generated from the store's hue. |
| Store card | Logo, heart button, name, two-line description, rating, price level, category, badges. The whole card is a link. |
| Store row | Horizontal version of the card for list view. |
| Coupon card | Value badge, title, conditions, dashed code button that copies on click, expiry. |
| Review | Avatar initials, name, relative date, stars, text, owner reply in a tinted block with a blue left border. |
| Modal | Centered dialog on desktop, bottom sheet on mobile; icon tile, title, description, actions right-aligned. |
| Toast | Bottom-right (bottom-center on mobile), auto-dismiss after 4.5 s, optional Undo / View action. |
| Empty state | Dashed border, icon tile, title, explanation and next-step buttons. |
| Skeleton | Pulsing `surface-3` blocks shaped like the content being loaded. |

## Accessibility

- Visible focus ring on every interactive element (keyboard users), skip link to the main content.
- Icon-only buttons have text labels; toggles use `aria-pressed`; result counts use `aria-live`.
- Dialogs trap focus, close on Escape and return focus to the button that opened them.
- Colour is never the only signal: badges have icons and text; price levels have a text label for screen readers.
- Animations are turned off for users who prefer reduced motion.
