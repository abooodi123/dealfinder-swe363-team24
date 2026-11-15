/**
 * System pages - Member 4 (Administrator Portal and Quality).
 *
 *   AccessDeniedPage  Shown by the route guard in App.tsx when a signed-in user opens another role's page
 *   GuidePage         Requirements guide: FR01-FR24, the screen for each one, steps to try, demo accounts
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FlaskConical, LogIn, SearchX, ShieldAlert } from "lucide-react";
import type { Role } from "../lib/types";
import { useDebouncedValue, useDocumentTitle } from "../lib/hooks";
import { homeFor, loginAsDemo, logout, useCurrentUser } from "../lib/store";
import { DEMO_ACCOUNTS } from "../lib/seed";
import { Badge, Button, Card, Container, EmptyState, PageHeader, SearchInput, Segmented, useToast } from "../ui/kit";

const ROLE_NAME: Record<Role, string> = { shopper: "shopper", owner: "store owner", admin: "administrator" };

/** Shown when a signed-in user opens a page meant for another role (NFR: role-based access control). */
export function AccessDeniedPage({ need }: { need: Role }) {
  useDocumentTitle("Access denied");
  const user = useCurrentUser();
  const navigate = useNavigate();
  const switchAccount = () => {
    const next = window.location.pathname + window.location.search;
    logout();
    navigate(`/login?next=${encodeURIComponent(next)}`);
  };
  return (
    <Container className="py-20">
      <EmptyState
        icon={<ShieldAlert />}
        title="You do not have access to this page"
        action={
          <>
            <Button to={user ? homeFor(user.role) : "/"} variant="primary">
              Go to my home page
            </Button>
            {user && (
              <Button icon={<LogIn className="size-4" />} onClick={switchAccount}>
                Log in as a {ROLE_NAME[need]}
              </Button>
            )}
          </>
        }
      >
        This page is only for {ROLE_NAME[need]} accounts.
        {user && <> You are signed in as a {ROLE_NAME[user.role]}.</>}
      </EmptyState>
    </Container>
  );
}

/* ===================================================================== */
/* Requirements guide                                                     */
/* ===================================================================== */

type Audience = "public" | Role;

interface Requirement {
  id: string;
  title: string;
  audience: Audience;
  member: 1 | 2 | 3 | 4;
  to: string;
  steps: string[];
}

/** FR01-FR24 from the Milestone 3 requirements document, plus the two extras. */
const REQUIREMENTS: Requirement[] = [
  { id: "FR01", title: "Account management", audience: "public", member: 2, to: "/signup", steps: ["Sign up with a weak password and see each rule that fails.", "Log in as pending@example.com (not activated) or blocked@example.com (suspended) to see the error.", "Edit your name and password under Profile settings."] },
  { id: "FR02", title: "Store discovery", audience: "public", member: 1, to: "/explore", steps: ["Search for skincare from Home.", "Search for parfume and accept the Did you mean perfume suggestion.", "Pick a category tile on Home."] },
  { id: "FR03", title: "Price filtering", audience: "public", member: 1, to: "/explore", steps: ["On Explore choose $, $$ or $$$.", "Combine the price filter with a category and remove it from the filter chips."] },
  { id: "FR04", title: "Rating sort", audience: "public", member: 1, to: "/explore?sort=rating-asc", steps: ["Sort by Lowest rating; stores without ratings stay at the end.", "Switch to Most reviews."] },
  { id: "FR05", title: "Store details", audience: "public", member: 1, to: "/stores/urban-nest", steps: ["Only the active coupon is shown; the expired and paused ones are hidden.", "The hidden review is not listed and does not count toward the rating."] },
  { id: "FR06", title: "Favorites", audience: "shopper", member: 2, to: "/favorites", steps: ["As a guest press the heart on a store, log in, and the store is saved for you.", "Remove a store from Favorites and press Undo."] },
  { id: "FR07", title: "Ratings and reviews", audience: "shopper", member: 2, to: "/stores/urban-nest/review", steps: ["Try to post a review with a link or phone number.", "Post a valid review and watch the store's average change."] },
  { id: "FR08", title: "Official site access", audience: "public", member: 1, to: "/stores/palm-pine", steps: ["Press Visit official website to see the leaving notice.", "Palm & Pine's website is down: report the broken link."] },
  { id: "FR09", title: "Store owner account", audience: "public", member: 2, to: "/signup/owner", steps: ["Register as a store owner with a business name and phone number."] },
  { id: "FR10", title: "Verified store submission", audience: "owner", member: 3, to: "/portal/stores/new", steps: ["Submit a store with proof of ownership; it waits in the admin queue."] },
  { id: "FR11", title: "Listing claim", audience: "owner", member: 3, to: "/portal/claim/desert-rose", steps: ["Claim an unclaimed listing such as Desert Rose Boutique."] },
  { id: "FR12", title: "Application follow up", audience: "owner", member: 3, to: "/portal", steps: ["Open Aroma Lane (APP-1038) and read the 2 requested changes."] },
  { id: "FR13", title: "Store profile management", audience: "owner", member: 3, to: "/portal", steps: ["Edit Urban Nest's description and keywords."] },
  { id: "FR14", title: "Coupon management", audience: "owner", member: 3, to: "/portal", steps: ["Add, pause and delete a coupon for Urban Nest."] },
  { id: "FR15", title: "Listing status", audience: "owner", member: 3, to: "/portal", steps: ["Set a store to Hidden or Closed and check Explore."] },
  { id: "FR16", title: "Platform support", audience: "owner", member: 3, to: "/portal/support", steps: ["As an owner, send a support request.", "As an administrator, answer it under Admin → Support; the owner gets a notification."] },
  {
    id: "FR17",
    title: "Submission review",
    audience: "admin",
    member: 4,
    to: "/admin/queue",
    steps: [
      "Open Henna House (APP-1047) and approve it: it appears on Explore with the Verified badge.",
      "Open Loom & Linen: two owners claim it. Approve one claim and the other is rejected automatically.",
      "Request changes on Nest Kids (APP-1042); an empty or short item shows an error.",
      "Reject a submission: the reason needs at least 20 characters.",
    ],
  },
  { id: "FR18", title: "Store creation", audience: "admin", member: 4, to: "/admin/catalog/new", steps: ["Save an empty form to see every error.", "Use the website of an existing store (https://urbannest.sa) to see the duplicate error.", "Add a valid store; it is live right away."] },
  { id: "FR19", title: "Store updates", audience: "admin", member: 4, to: "/admin/catalog/urban-nest", steps: ["Change the description or price level and save.", "Change something, press Cancel, and confirm discarding."] },
  { id: "FR20", title: "Store removal", audience: "admin", member: 4, to: "/admin/catalog", steps: ["Disable a store with a reason; it disappears from Explore. Press Undo or Restore.", "Delete a store: you must type its name, and its reviews, coupons and featured slots are removed with it."] },
  { id: "FR21", title: "Category management", audience: "admin", member: 4, to: "/admin/categories", steps: ["Add a category with an icon; a duplicate name shows an error.", "Move a category up and check the order on Home.", "Hide a category, or delete one that has stores (you choose where they move)."] },
  { id: "FR22", title: "Review moderation", audience: "admin", member: 4, to: "/admin/moderation", steps: ["Hide the Promo Bot spam review on BlueSky Domains; the dialog shows how the rating changes.", "Keep Mona Q.'s review to dismiss the report (Undo is available).", "Restore the hidden review on Urban Nest from the Hidden tab."] },
  { id: "FR23", title: "Featured content", audience: "admin", member: 4, to: "/admin/featured", steps: ["Schedule a store for Home starting today and check the Home page.", "Pick a coupon and an end date after it expires to see the error.", "End a running slot now."] },
  { id: "FR24", title: "Analytics", audience: "admin", member: 4, to: "/admin/analytics", steps: ["Switch between 7, 30 and 90 days, or set a custom range (a start after the end shows an error).", "Filter by category, hover the columns, and show the data as a table.", "Export the CSV."] },
  { id: "X1", title: "Owner replies to reviews (extra)", audience: "owner", member: 3, to: "/portal", steps: ["Reply to the 3-star review on Urban Nest; the reply shows on the store page."] },
  { id: "X2", title: "Owner analytics (extra)", audience: "owner", member: 3, to: "/portal", steps: ["Check referral visits and coupon copies for your own stores."] },
];

const AUDIENCE_LABEL: Record<Audience, string> = { public: "Everyone", shopper: "Shopper", owner: "Store owner", admin: "Administrator" };

export function GuidePage() {
  useDocumentTitle("Requirements guide");
  const user = useCurrentUser();
  const navigate = useNavigate();
  const toast = useToast();
  const [audience, setAudience] = useState<"all" | Audience>("all");
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query.trim().toLowerCase(), 150);

  const rows = REQUIREMENTS.filter((r) => audience === "all" || r.audience === audience).filter(
    (r) => !q || [r.id, r.title, ...r.steps].some((v) => v.toLowerCase().includes(q)),
  );

  /** Signs in with the right demo account when needed, then opens the screen. */
  const open = (r: Requirement) => {
    if (r.audience !== "public" && user?.role !== r.audience) {
      const result = loginAsDemo(r.audience);
      if (result.ok) toast({ title: `Signed in as ${result.user.name}`, description: AUDIENCE_LABEL[r.audience] });
    }
    navigate(r.to);
  };

  return (
    <Container className="py-10">
      <PageHeader
        eyebrow="Prototype"
        title="Requirements guide"
        subtitle="Every functional requirement, the screen that implements it and what to try, including the error cases. Opening a screen signs you in with the matching demo account."
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Demo accounts</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(Object.keys(DEMO_ACCOUNTS) as Role[]).map((role) => (
              <li key={role} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
                <span>
                  <span className="font-semibold">{DEMO_ACCOUNTS[role].label}</span>
                  <span className="text-muted"> · {DEMO_ACCOUNTS[role].email}</span>
                </span>
                <code className="text-xs text-muted">{DEMO_ACCOUNTS[role].password}</code>
              </li>
            ))}
            <li className="px-3 text-xs text-subtle">Also: pending@example.com (not activated) and blocked@example.com (suspended), password Shopper#2026.</li>
          </ul>
        </Card>
        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FlaskConical className="size-5 text-muted" aria-hidden />
            Prototype tools
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            The orange button at the bottom left of every page signs you in as any demo account with one click, switches between dark and light mode, and resets the demo data. All data is
            fictional and stays in this browser.
          </p>
        </Card>
      </div>

      <div className="mt-8 flex flex-col gap-3 lg:flex-row">
        <Segmented<"all" | Audience>
          label="Who uses it"
          value={audience}
          onChange={setAudience}
          className="flex-wrap lg:max-w-2xl lg:flex-1 [&>button]:flex-none sm:[&>button]:flex-1"
          options={[
            { value: "all", label: "All" },
            { value: "public", label: "Everyone" },
            { value: "shopper", label: "Shopper" },
            { value: "owner", label: "Owner" },
            { value: "admin", label: "Admin" },
          ]}
        />
        <SearchInput value={query} onValueChange={setQuery} placeholder="Search FR number or feature" aria-label="Search requirements" className="flex-1" />
      </div>

      <p className="mt-3 text-sm text-muted" aria-live="polite">
        {rows.length} of {REQUIREMENTS.length} requirements
      </p>

      {rows.length === 0 ? (
        <EmptyState icon={<SearchX />} title="No requirement matches" className="mt-4" action={<Button onClick={() => (setQuery(""), setAudience("all"))}>Show all</Button>}>
          Try a number such as FR17 or a word such as coupon.
        </EmptyState>
      ) : (
        <ol className="mt-4 grid gap-4 md:grid-cols-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Card as="article" className="flex h-full flex-col p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand" className="font-mono">
                    {r.id}
                  </Badge>
                  <Badge>{AUDIENCE_LABEL[r.audience]}</Badge>
                  <span className="ml-auto text-xs text-subtle">Member {r.member}</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold">{r.title}</h3>
                <ul className="mt-2 flex-1 space-y-1.5 text-sm text-muted">
                  {r.steps.map((s) => (
                    <li key={s} className="flex gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-text" aria-hidden />
                      {s}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <code className="truncate text-xs text-subtle">{r.to}</code>
                  <Button size="sm" variant="soft" iconRight={<ArrowRight className="size-4" />} onClick={() => open(r)}>
                    {r.audience !== "public" && user?.role !== r.audience ? `Open as ${AUDIENCE_LABEL[r.audience].toLowerCase()}` : "Open screen"}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </Container>
  );
}
