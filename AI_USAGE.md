# AI Usage Declaration

This file lists the AI tools used in each phase of the DealFinder project, as required by the
SWE 363 AI Usage Guidelines. Full copies of the AI conversations and intermediate artifacts are
submitted separately in `Team 24 SWE 363-02 - Phase 4 - AI Evidence.zip`.

Every member must add their own entry below, including "I did not use any AI tools" if that applies.

## Phase 4 – Front-End

### Member 1 – Abdullah Ewidah (Public UI and Design Lead)

| Tool | How it was used | Files affected |
|---|---|---|
| Claude Code (Anthropic, Claude Opus 5.5 model) | Read the course brief, the team task plan and the Milestone 2–3 documents; set up the Vite + React + TypeScript + Tailwind project; generated the shared data layer, UI kit, layout and the public pages; tested the pages in a browser (desktop, mobile, dark and light mode) and fixed the issues found; drafted the documentation; created the Figma reference file by capturing the prototype's screens and importing them through the Figma MCP connector. All output was reviewed by the member. | `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `public/favicon.svg`, `.gitignore`, `.env.example`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/lib/*`, `src/ui/kit.tsx`, `src/ui/shared.tsx`, `src/ui/layout.tsx`, `src/pages/public.tsx`, placeholder pages in `src/pages/*` (for the other members), `README.md`, `CONTRIBUTING.md`, `docs/DESIGN.md`, `AI_USAGE.md`, Figma reference file (16 screens) |

### Member 2 – _name_ (Authentication and Shopper Features)

_To be completed by Member 2._

### Member 3 – _name_ (Store Owner Portal)

_To be completed by Member 3._

### Member 4 – Mahdi Al Hashem (Administrator Portal and Quality)

| Tool | How it was used | Files affected |
|---|---|---|
| ChatGPT (OpenAI) | Split Milestone 4 into the four member roles and planned the order of work. | Team task plan (not in the repository) |
| Claude (Anthropic, Claude Opus 5.5 model) | Read the course brief, the team task plan, Member 1's foundation and CONTRIBUTING.md; generated the administrator pages (overview, submissions, catalog, add / edit store, categories, moderation, featured content, analytics with CSV export, admin support), the requirements guide and the Access denied improvement; added the admin routes in `App.tsx`; wrote the browser tests; type-checked, built and tested the pages in a browser (desktop and 375 px mobile, dark and light mode) and fixed the issues found; drafted the README sections and this entry. I reviewed, tested and can explain all of it. | `src/pages/admin.tsx`, `src/pages/admin2.tsx`, `src/pages/system.tsx`, Member 4 routes in `src/App.tsx`, `tests/test_admin.py`, `tests/README.md`, `README.md`, `AI_USAGE.md` |
