/**
 * Public pages - Member 1 (Public UI and Design Lead).
 *
 *   HomePage          W02  FR02        search, suggested searches, categories, featured stores and coupons
 *   ExplorePage       W03  FR02-FR04   search, category / price / verified filters, rating sort, grid or list
 *   StoreDetailsPage  W04  FR05-FR08   profile, coupons, reviews, favorites, official website with leaving notice
 *   NotFoundPage           404 screen
 *
 * No login is needed for any of these pages. Actions that need an account
 * (save, review, claim) show the log in prompt to guests.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CircleCheck,
  ExternalLink,
  Globe,
  LayoutGrid,
  List,
  MessageSquareText,
  MousePointerClick,
  PenLine,
  RefreshCw,
  Search,
  SearchX,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store as StoreIcon,
  Tag,
  Ticket,
  TriangleAlert,
  Unplug,
  X,
} from "lucide-react";
import type { Store } from "../lib/types";
import { cn, formatDate, hostname, isValidWebsite, plural } from "../lib/format";
import { useDebouncedValue, useDocumentTitle, useSimulatedLoading } from "../lib/hooks";
import { recordReferralClick, reportBrokenLink, useCurrentUser, useData } from "../lib/store";
import {
  activeCoupons,
  communityReviewCount,
  featuredCoupons,
  featuredStoreIds,
  featuredStores,
  getCategory,
  getStore,
  isActiveStore,
  isPublicStore,
  matchesQuery,
  ratingDistribution,
  SORT_LABELS,
  sortStores,
  storeCountByCategory,
  storeRating,
  suggestQuery,
  visibleCategories,
  visibleReviews,
  type SortOption,
} from "../lib/selectors";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Container,
  EmptyState,
  Field,
  IconButton,
  Modal,
  PageHeader,
  PriceLevel,
  SearchInput,
  Segmented,
  Select,
  Skeleton,
  Spinner,
  Stars,
} from "../ui/kit";
import {
  CategoryIcon,
  CategoryTile,
  ClosedBadge,
  CouponCard,
  FavoriteButton,
  FeaturedBadge,
  LoginPrompt,
  ReviewItem,
  StoreCard,
  StoreCardSkeleton,
  StoreLogo,
  StoreMiniLink,
  StoreRow,
  StoreRowSkeleton,
  UnverifiedBadge,
  VerifiedBadge,
} from "../ui/shared";
import { ReviewActions } from "./shopper";

/** Section title used on the Home page. */
function SectionHeading({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1.5 text-xs font-semibold tracking-[0.14em] text-brand-text uppercase">{eyebrow}</p>}
        <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const SUGGESTED_SEARCHES = ["lamp", "hosting", "perfume"];

/* ===================================================================== */
/* Home (W02)                                                             */
/* ===================================================================== */

export function HomePage() {
  useDocumentTitle("");
  const data = useData();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [query, setQuery] = useState("");

  const verifiedCount = data.stores.filter((s) => isActiveStore(s) && s.verified).length;
  const categories = visibleCategories(data);
  const counts = storeCountByCategory(data);
  const homeStores = featuredStores(data, "home");
  const homeCoupons = featuredCoupons(data, "home");
  const reviewCount = communityReviewCount(data);

  /** Search opens Explore with the text applied; an empty search opens every store (W02-1 #2, #3). */
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="hero-glow absolute inset-0" aria-hidden />
        <div className="bg-dots absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)] opacity-60" aria-hidden />
        <Container className="relative py-20 text-center sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-soft px-3.5 py-1.5 text-sm font-semibold text-brand-text">
            <BadgeCheck className="size-4" aria-hidden />
            {plural(verifiedCount, "verified store")} and counting
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl leading-[1.05] font-bold sm:text-6xl lg:text-7xl">
            Find trusted online stores <span className="text-brand-text">by category.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted sm:text-xl">
            Compare retailers by rating and price, read honest reviews, then go straight to the official website. Nothing is sold here.
          </p>

          <form role="search" onSubmit={onSearch} className="mx-auto mt-10 flex max-w-2xl flex-col gap-2 rounded-2xl border border-line bg-surface/80 p-2 shadow-2xl shadow-black/10 backdrop-blur sm:flex-row">
            <label htmlFor="home-search" className="sr-only">
              Search stores
            </label>
            <SearchInput
              id="home-search"
              size="lg"
              value={query}
              onValueChange={setQuery}
              placeholder="Search by store name, keyword or category..."
              className="flex-1 [&_input]:border-transparent [&_input]:bg-transparent"
              autoComplete="off"
            />
            <Button type="submit" variant="primary" size="lg" className="sm:px-8">
              Search
            </Button>
          </form>

          <p className="mt-5 text-sm text-muted">
            Try{" "}
            {SUGGESTED_SEARCHES.map((s, i) => (
              <span key={s}>
                <Link to={`/explore?q=${encodeURIComponent(s)}`} className="font-semibold text-brand-text hover:underline">
                  {s}
                </Link>
                {i < SUGGESTED_SEARCHES.length - 2 ? ", " : i === SUGGESTED_SEARCHES.length - 2 ? " or " : ""}
              </span>
            ))}{" "}
            &middot; {plural(reviewCount, "community review")}
          </p>
        </Container>
      </section>

      {/* How it works */}
      <Container className="py-16">
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            { icon: <Search />, title: "Search and filter", text: "Browse by category, then narrow the list to the price level that fits your budget." },
            { icon: <ShieldCheck />, title: "Compare trusted stores", text: "Sort by community rating and look for the Verified badge our team grants after checking ownership." },
            { icon: <MousePointerClick />, title: "Shop on the official site", text: "Copy a coupon and continue to the retailer’s own website. Payment happens there, not here." },
          ].map((step, i) => (
            <li key={step.title} className="flex gap-4 rounded-2xl border border-line bg-surface p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text [&>svg]:size-5" aria-hidden>
                {step.icon}
              </span>
              <div>
                <p className="text-xs font-semibold text-subtle">Step {i + 1}</p>
                <h2 className="mt-0.5 text-lg font-semibold">{step.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>

      {/* Categories (W02-1 #5, #6) */}
      <Container className="pb-16">
        <SectionHeading
          eyebrow="Browse"
          title="Top categories"
          action={
            <Button to="/explore" variant="ghost" iconRight={<ArrowRight className="size-4" />} className="self-start sm:self-auto">
              Explore all stores
            </Button>
          }
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <CategoryTile key={c.id} category={c} count={counts[c.id] ?? 0} />
          ))}
        </div>
      </Container>

      {/* Featured stores (scheduled by administrators, W18) */}
      {homeStores.length > 0 && (
        <Container className="pb-16">
          <SectionHeading title="Featured stores" subtitle="Hand-picked retailers, verified by our team and loved by shoppers." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {homeStores.map((s) => (
              <StoreCard key={s.id} store={s} />
            ))}
          </div>
        </Container>
      )}

      {/* Featured coupons */}
      {homeCoupons.length > 0 && (
        <Container className="pb-16">
          <SectionHeading eyebrow="Deals" title="Featured coupons" subtitle="Tap a code to copy it, then use it on the store's website." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {homeCoupons.map(({ coupon, store }) => (
              <CouponCard key={coupon.id} coupon={coupon} store={store} />
            ))}
          </div>
        </Container>
      )}

      {/* Store owner call to action */}
      {user?.role !== "owner" && user?.role !== "admin" && (
        <Container>
          <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-8 sm:p-12">
            <div className="hero-glow absolute inset-0 opacity-80" aria-hidden />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand text-white">
                  <StoreIcon className="size-6" aria-hidden />
                </span>
                <h2 className="mt-5 text-2xl font-bold sm:text-3xl">Run an online store?</h2>
                <p className="mt-2 text-muted">Get listed with the Verified badge, publish coupons and see exactly how many shoppers you send to your site.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button to="/signup/owner" variant="primary" size="lg" iconRight={<ArrowRight className="size-4" />}>
                  Register as a store owner
                </Button>
              </div>
            </div>
          </div>
        </Container>
      )}
    </>
  );
}

/* ===================================================================== */
/* Explore (W03)                                                          */
/* ===================================================================== */

const PAGE_SIZE = 6;
const PRICE_OPTIONS: Array<{ value: "" | "1" | "2" | "3"; label: string; title: string }> = [
  { value: "", label: "Any", title: "Any price level" },
  { value: "1", label: "$", title: "Low price level" },
  { value: "2", label: "$$", title: "Medium price level" },
  { value: "3", label: "$$$", title: "High price level" },
];
const isSort = (v: string | null): v is SortOption => v === "rating-desc" || v === "rating-asc" || v === "reviews";
const isPrice = (v: string | null): v is "1" | "2" | "3" => v === "1" || v === "2" || v === "3";

export function ExplorePage() {
  useDocumentTitle("Explore stores");
  const data = useData();
  const loading = useSimulatedLoading(500);
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // ---- Filter state lives in the URL, so results can be shared and the Back button works.
  const q = (params.get("q") ?? "").trim();
  const categoryParam = params.get("category") ?? "";
  const priceParam = params.get("price");
  const price = isPrice(priceParam) ? priceParam : "";
  const verifiedOnly = params.get("verified") === "1";
  const includeClosed = params.get("closed") === "1";
  const sortParam = params.get("sort");
  const sort: SortOption = isSort(sortParam) ? sortParam : "rating-desc";
  const view = params.get("view") === "list" ? "list" : "grid";

  const categories = visibleCategories(data);
  const category = categories.find((c) => c.id === categoryParam);
  const unknownCategory = categoryParam !== "" && !category; // FR02: the selected category must exist.

  const setParam = (changes: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );

  // ---- Search as you type (debounced), kept in sync with the URL.
  const [input, setInput] = useState(q);
  const debounced = useDebouncedValue(input, 250);
  // Typing updates the URL after a short pause; an outside change to the URL (Reset, a chip,
  // "Did you mean") updates the box. Each effect intentionally watches only one value.
  useEffect(() => {
    if (debounced.trim() !== q) setParam({ q: debounced.trim() || null });
  }, [debounced]);
  useEffect(() => {
    if (q !== input.trim()) setInput(q);
  }, [q]);

  // ---- Results
  const counts = storeCountByCategory(data);
  const results = useMemo(() => {
    const list = data.stores.filter(
      (s) =>
        isPublicStore(s) &&
        (includeClosed || s.listing === "active") &&
        (!category || s.categoryId === category.id) &&
        (!price || s.priceLevel === Number(price)) &&
        (!verifiedOnly || s.verified) &&
        matchesQuery(data, s, q),
    );
    return sortStores(data, list, sort);
  }, [data, includeClosed, category, price, verifiedOnly, q, sort]);
  const totalPublic = data.stores.filter((s) => isPublicStore(s) && (includeClosed || s.listing === "active")).length;

  // ---- Load more
  const filterKey = [q, category?.id, price, verifiedOnly, includeClosed, sort].join("|");
  const [visible, setVisible] = useState(PAGE_SIZE);
  useEffect(() => setVisible(PAGE_SIZE), [filterKey]);
  const shown = results.slice(0, visible);
  const remaining = results.length - shown.length;

  const noFilters = !q && !category && !price && !verifiedOnly && !includeClosed;
  const activeFilterCount = [category, price, verifiedOnly, includeClosed].filter(Boolean).length;
  const featuredToday = noFilters ? featuredStores(data, "explore") : [];
  const suggestion = results.length === 0 && q ? suggestQuery(data, q) : null;

  const resetAll = () => {
    setInput("");
    setParams(view === "list" ? { view: "list" } : {}, { replace: true });
  };

  const chips: Array<{ key: string; label: ReactNode; clear: () => void }> = [];
  if (q) chips.push({ key: "q", label: <>&ldquo;{q}&rdquo;</>, clear: () => { setInput(""); setParam({ q: null }); } });
  if (category) chips.push({ key: "category", label: category.name, clear: () => setParam({ category: null }) });
  if (price) chips.push({ key: "price", label: "$".repeat(Number(price)), clear: () => setParam({ price: null }) });
  if (verifiedOnly) chips.push({ key: "verified", label: "Verified only", clear: () => setParam({ verified: null }) });
  if (includeClosed) chips.push({ key: "closed", label: "Including closed", clear: () => setParam({ closed: null }) });

  const filters = (
    <Card className="p-5 lg:sticky lg:top-24">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <SlidersHorizontal className="size-4 text-brand-text" aria-hidden />
          Filters
        </h2>
        <IconButton label="Close filters" size="sm" className="lg:hidden" onClick={() => setFiltersOpen(false)}>
          <X className="size-4" />
        </IconButton>
      </div>

      <Field label="Category" htmlFor="filter-category" className="mt-5">
        <Select id="filter-category" value={category?.id ?? ""} onChange={(e) => setParam({ category: e.target.value || null })}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({counts[c.id] ?? 0})
            </option>
          ))}
        </Select>
      </Field>

      <div className="mt-5">
        <p id="price-label" className="mb-1.5 text-sm font-semibold">
          Price
        </p>
        <Segmented label="Price level" options={PRICE_OPTIONS} value={price} onChange={(v) => setParam({ price: v || null })} />
        <p className="mt-2 text-xs leading-relaxed text-subtle">$ is low, $$ medium and $$$ high. These are general price levels, not exact prices.</p>
      </div>

      <div className="mt-5 space-y-3.5">
        <Checkbox label="Verified stores only" description="Ownership checked by our team" checked={verifiedOnly} onChange={(v) => setParam({ verified: v ? "1" : null })} />
        <Checkbox label="Include closed stores" description="Stores that stopped taking orders" checked={includeClosed} onChange={(v) => setParam({ closed: v ? "1" : null })} />
      </div>

      <Button variant="ghost" fullWidth className="mt-5" onClick={resetAll} disabled={noFilters && sort === "rating-desc"}>
        Reset all filters
      </Button>
    </Card>
  );

  return (
    <Container className="py-10 sm:py-14">
      <PageHeader title="Explore stores" subtitle="Filter by category and price, then sort by rating or number of reviews." />

      <div className="mt-8 grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Filters: sidebar on desktop, collapsible panel on mobile */}
        <aside aria-label="Filters" className={cn(filtersOpen ? "block" : "hidden", "lg:block")}>
          {filters}
        </aside>

        <div ref={resultsRef} className="min-w-0">
          <div className="flex gap-2">
            <label htmlFor="explore-search" className="sr-only">
              Search stores
            </label>
            <SearchInput
              id="explore-search"
              value={input}
              onValueChange={setInput}
              placeholder="Search by store name, keyword or product..."
              className="flex-1"
              autoComplete="off"
            />
            <Button
              variant="secondary"
              className="h-12 lg:hidden"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              icon={<SlidersHorizontal className="size-4" />}
            >
              Filters{activeFilterCount > 0 && <Badge tone="brand">{activeFilterCount}</Badge>}
            </Button>
          </div>

          {unknownCategory && (
            <Alert tone="warn" className="mt-4" title="That category is not available">
              It may have been renamed or removed, so we are showing every category instead.
            </Alert>
          )}

          {/* Toolbar */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              {loading ? (
                "Loading stores..."
              ) : results.length === 0 ? (
                <>No matching stores ({totalPublic} in total)</>
              ) : (
                <>
                  Showing <strong className="text-fg">{shown.length}</strong> of <strong className="text-fg">{results.length}</strong>{" "}
                  {results.length === totalPublic ? (results.length === 1 ? "store" : "stores") : `matching ${results.length === 1 ? "store" : "stores"} (${totalPublic} in total)`}
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-sm text-muted">
                Sort by
              </label>
              <Select id="sort" value={sort} onChange={(e) => setParam({ sort: e.target.value === "rating-desc" ? null : e.target.value })} className="h-10 w-44">
                {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                  <option key={key} value={key}>
                    {SORT_LABELS[key]}
                  </option>
                ))}
              </Select>
              <div className="flex rounded-xl border border-line p-0.5" role="group" aria-label="Layout">
                <IconButton label="Grid view" size="sm" active={view === "grid"} aria-pressed={view === "grid"} onClick={() => setParam({ view: null })}>
                  <LayoutGrid className="size-4" />
                </IconButton>
                <IconButton label="List view" size="sm" active={view === "list"} aria-pressed={view === "list"} onClick={() => setParam({ view: "list" })}>
                  <List className="size-4" />
                </IconButton>
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {chips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.clear}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 py-1 pr-2 pl-3 text-sm hover:border-line-strong"
                  aria-label={`Remove filter ${typeof chip.label === "string" ? chip.label : q}`}
                >
                  {chip.label}
                  <X className="size-3.5 text-muted" aria-hidden />
                </button>
              ))}
              <button type="button" onClick={resetAll} className="px-2 text-sm font-semibold text-brand-text hover:underline">
                Clear all
              </button>
            </div>
          )}

          {/* Featured today (W03-1 #7) - only when no filter is applied */}
          {!loading && featuredToday.length > 0 && (
            <section aria-labelledby="featured-today" className="mt-5 rounded-2xl border border-warn/25 bg-warn-soft/40 p-4">
              <h2 id="featured-today" className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-warn uppercase">
                <Sparkles className="size-4" aria-hidden />
                Featured today
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {featuredToday.map((s) => (
                  <StoreMiniLink key={s.id} store={s} />
                ))}
              </div>
            </section>
          )}

          {/* Results */}
          <div className="mt-5">
            {loading ? (
              <div className={cn("grid grid-cols-1 gap-4", view === "grid" && "sm:grid-cols-2 xl:grid-cols-3")}>
                {Array.from({ length: PAGE_SIZE }, (_, i) => (view === "grid" ? <StoreCardSkeleton key={i} /> : <StoreRowSkeleton key={i} />))}
              </div>
            ) : results.length === 0 ? (
              <EmptyState
                icon={<SearchX />}
                title="No stores found"
                action={
                  <>
                    {suggestion && (
                      <Button variant="soft" onClick={() => { setInput(suggestion); setParam({ q: suggestion }); }}>
                        Search for &ldquo;{suggestion}&rdquo;
                      </Button>
                    )}
                    <Button variant="primary" onClick={resetAll}>
                      Clear filters
                    </Button>
                  </>
                }
              >
                {q ? (
                  <>
                    Nothing matches <strong className="text-fg">&ldquo;{q}&rdquo;</strong>
                    {activeFilterCount > 0 && " with the current filters"}. {suggestion ? <>Did you mean <strong className="text-fg">{suggestion}</strong>?</> : "Try a shorter word, a store name, or remove a filter."}
                  </>
                ) : (
                  "No store matches these filters. Try another category or price level, or clear the filters to see every store."
                )}
              </EmptyState>
            ) : (
              <>
                <ul className={cn("grid grid-cols-1 gap-4", view === "grid" && "sm:grid-cols-2 xl:grid-cols-3")}>
                  {shown.map((s) => (
                    <li key={s.id} className="min-w-0 animate-fade-in">
                      {view === "grid" ? <StoreCard store={s} /> : <StoreRow store={s} />}
                    </li>
                  ))}
                </ul>
                {remaining > 0 && (
                  <div className="mt-8 flex justify-center">
                    <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                      Load more stores ({remaining} left)
                    </Button>
                  </div>
                )}
                {remaining === 0 && results.length > PAGE_SIZE && <p className="mt-8 text-center text-sm text-subtle">You have seen all {results.length} stores.</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}

/* ===================================================================== */
/* Store details (W04)                                                    */
/* ===================================================================== */

type ReviewSort = "newest" | "highest" | "lowest";

export function StoreDetailsPage() {
  const { storeId } = useParams();
  const data = useData();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const loading = useSimulatedLoading(350, storeId);
  const store = getStore(data, storeId);
  useDocumentTitle(store && isPublicStore(store) ? store.name : "Store not available");

  const [visitOpen, setVisitOpen] = useState(false);
  const [prompt, setPrompt] = useState<null | "review" | "claim">(null);
  const [reviewSort, setReviewSort] = useState<ReviewSort>("newest");

  if (loading) return <StoreDetailsSkeleton />;

  // FR05: only approved, public listings can be opened.
  if (!store || !isPublicStore(store)) {
    return (
      <Container className="py-20">
        <EmptyState
          icon={<Unplug />}
          title={store ? "This store is not available" : "Store not found"}
          action={
            <>
              <Button to="/explore" variant="primary">
                Explore other stores
              </Button>
              <Button to="/">Go home</Button>
            </>
          }
        >
          {store
            ? "The listing is waiting for review, hidden by its owner, or was removed by our team. It cannot be opened right now."
            : "We could not find a store at this address. The link may be wrong or the store may have been removed."}
        </EmptyState>
      </Container>
    );
  }

  const rating = storeRating(data, store);
  const category = getCategory(data, store.categoryId);
  const coupons = activeCoupons(data, store.id);
  const reviews = visibleReviews(data, store.id);
  const distribution = ratingDistribution(reviews);
  const featured = featuredStoreIds(data).has(store.id);
  const myReview = user ? reviews.find((r) => r.userId === user.id) : undefined;
  const related = sortStores(
    data,
    data.stores.filter((s) => s.id !== store.id && s.categoryId === store.categoryId && isActiveStore(s)),
    "rating-desc",
  ).slice(0, 4);

  const sortedReviews = [...reviews].sort((a, b) =>
    reviewSort === "highest" ? b.rating - a.rating || b.createdAt - a.createdAt : reviewSort === "lowest" ? a.rating - b.rating || b.createdAt - a.createdAt : b.createdAt - a.createdAt,
  );

  const onWriteReview = () => {
    if (!user) setPrompt("review");
    else navigate(`/stores/${store.id}/review`);
  };
  const onClaim = () => {
    if (!user) setPrompt("claim");
    else navigate(`/portal/claim/${store.id}`);
  };

  return (
    <Container className="py-8 sm:py-12">
      <Link to="/explore" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden />
        Back to Explore
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-10">
          {/* Header (W04-1 #1-#3) */}
          <Card as="section" aria-labelledby="store-name" className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row">
              <StoreLogo store={store} size="xl" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 id="store-name" className="text-3xl font-bold sm:text-4xl">
                    {store.name}
                  </h1>
                  {store.verified ? <VerifiedBadge /> : <UnverifiedBadge />}
                  {featured && <FeaturedBadge />}
                  {store.listing === "closed" && <ClosedBadge />}
                </div>
                <p className="mt-3 text-lg leading-relaxed text-muted">{store.description}</p>
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm">
                  {rating.average !== null ? (
                    <span className="inline-flex items-center gap-2">
                      <Stars value={rating.average} />
                      <strong className="text-base">{rating.average.toFixed(1)}</strong>
                      <span className="text-muted">({plural(rating.count, "rating")})</span>
                    </span>
                  ) : (
                    <span className="text-muted">No ratings yet</span>
                  )}
                  {category && (
                    <Link to={`/explore?category=${category.id}`} className="inline-flex items-center gap-1.5 font-medium hover:text-brand-text">
                      <Tag className="size-4 text-muted" aria-hidden />
                      {category.name}
                    </Link>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <PriceLevel level={store.priceLevel} className="text-base" />
                    <span className="text-muted">price level</span>
                  </span>
                </div>
              </div>
            </div>

            {store.listing === "closed" && (
              <Alert tone="warn" className="mt-6" title="This store is closed">
                The owner marked this listing as closed. Its website may not be taking orders right now.
              </Alert>
            )}

            <div className="mt-6 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:flex-wrap">
              <Button variant="primary" size="lg" iconRight={<ExternalLink className="size-4" />} onClick={() => setVisitOpen(true)}>
                Visit official website
              </Button>
              <FavoriteButton store={store} variant="button" />
            </div>
            {!store.ownerId && (!user || user.role === "owner") && (
              <p className="mt-4 text-sm text-muted">
                Own this store?{" "}
                <button type="button" onClick={onClaim} className="font-semibold text-brand-text hover:underline">
                  Claim this listing
                </button>{" "}
                to manage its profile and coupons.
              </p>
            )}
          </Card>

          {/* Coupons (W04-1 #4) */}
          <section aria-labelledby="coupons-heading">
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 id="coupons-heading" className="text-2xl font-bold">
                Coupons
              </h2>
              <span className="text-sm text-muted">{coupons.length ? `${coupons.length} active` : ""}</span>
            </div>
            {coupons.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {coupons.map((c) => (
                  <CouponCard key={c.id} coupon={c} />
                ))}
              </div>
            ) : (
              <Card className="flex items-center gap-4 p-5 text-sm text-muted">
                <Ticket className="size-5 shrink-0" aria-hidden />
                {store.name} has no active coupons right now. Saved stores are a quick way to check back later.
              </Card>
            )}
          </section>

          {/* Reviews (W04-1 #5-#7) */}
          <section aria-labelledby="reviews-heading">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2 id="reviews-heading" className="text-2xl font-bold">
                Customer reviews
              </h2>
              {(!user || user.role === "shopper") && (
                <Button variant="primary" icon={<PenLine className="size-4" />} onClick={onWriteReview}>
                  {myReview ? "Edit your review" : "Write a review"}
                </Button>
              )}
            </div>

            <Card className="p-6">
              <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
                <div className="text-center sm:pr-6 sm:text-left">
                  <p className="font-display text-5xl font-bold">{rating.average !== null ? rating.average.toFixed(1) : "–"}</p>
                  {rating.average !== null && <Stars value={rating.average} className="mt-2" />}
                  <p className="mt-2 max-w-48 text-xs leading-relaxed text-subtle">
                    {rating.average !== null ? `Average from ${plural(rating.count, "rating")}.` : "No ratings yet."}
                  </p>
                </div>
                {reviews.length > 0 && (
                  <div className="space-y-1.5" aria-label="Written reviews by star rating">
                    {([5, 4, 3, 2, 1] as const).map((stars) => {
                      const n = distribution[stars];
                      const pct = reviews.length ? (n / reviews.length) * 100 : 0;
                      return (
                        <div key={stars} className="flex items-center gap-3 text-sm">
                          <span className="inline-flex w-8 items-center gap-0.5 text-muted">
                            {stars}
                            <Star className="size-3 fill-star text-star" aria-hidden />
                          </span>
                          <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                            <span className="block h-full rounded-full bg-star" style={{ width: `${pct}%` }} />
                          </span>
                          <span className="w-6 text-right text-muted">{n}</span>
                        </div>
                      );
                    })}
                    <p className="pt-1 text-xs text-subtle">The bars show the {plural(reviews.length, "written review")} below.</p>
                  </div>
                )}
              </div>
            </Card>

            {reviews.length > 0 ? (
              <Card className="mt-4 px-6">
                <div className="flex items-center justify-between gap-3 border-b border-line py-4">
                  <p className="text-sm text-muted">{plural(reviews.length, "review")}</p>
                  <div className="flex items-center gap-2">
                    <label htmlFor="review-sort" className="text-sm text-muted">
                      Sort
                    </label>
                    <Select id="review-sort" value={reviewSort} onChange={(e) => setReviewSort(e.target.value as ReviewSort)} className="h-9 w-40">
                      <option value="newest">Newest</option>
                      <option value="highest">Highest rated</option>
                      <option value="lowest">Lowest rated</option>
                    </Select>
                  </div>
                </div>
                {sortedReviews.map((r) => (
                  <ReviewItem key={r.id} review={r} storeName={store.name} actions={<ReviewActions review={r} store={store} />} />
                ))}
              </Card>
            ) : (
              <EmptyState
                className="mt-4 py-10"
                icon={<MessageSquareText />}
                title="No written reviews yet"
                action={
                  (!user || user.role === "shopper") && (
                    <Button variant="primary" onClick={onWriteReview}>
                      Be the first to review
                    </Button>
                  )
                }
              >
                Shopped at {store.name}? Your review helps the next shopper decide.
              </EmptyState>
            )}
          </section>
        </div>

        {/* Sidebar (W04-1 #8, #9) */}
        <aside className="space-y-8">
          <Card className="p-6">
            <h2 className="text-lg font-semibold">About this listing</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Verified status</dt>
                <dd className={cn("inline-flex items-center gap-1.5 font-semibold", store.verified ? "text-ok" : "text-muted")}>
                  {store.verified ? <ShieldCheck className="size-4" aria-hidden /> : null}
                  {store.verified ? "Verified" : "Not verified yet"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Website</dt>
                <dd className="inline-flex min-w-0 items-center gap-1.5 font-semibold">
                  <Globe className="size-4 shrink-0 text-muted" aria-hidden />
                  <span className="truncate">{hostname(store.websiteUrl) || "Unavailable"}</span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Listed since</dt>
                <dd className="inline-flex items-center gap-1.5 font-semibold">
                  <CalendarDays className="size-4 text-muted" aria-hidden />
                  {formatDate(store.createdAt)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Managed by</dt>
                <dd className="inline-flex items-center gap-1.5 font-semibold">
                  <Building2 className="size-4 text-muted" aria-hidden />
                  {store.ownerId ? "Store owner" : "DealFinder team"}
                </dd>
              </div>
            </dl>
            <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-subtle">
              DealFinder lists stores and sends you to their own website. Shopping, payment and delivery happen there.
              {!store.verified && " This listing was added by our team from public information and its owner has not been verified yet."}
            </p>
          </Card>

          {related.length > 0 && (
            <section aria-labelledby="related-heading">
              <h2 id="related-heading" className="mb-3 text-lg font-semibold">
                Related stores
              </h2>
              <div className="space-y-3">
                {related.map((s) => (
                  <StoreMiniLink key={s.id} store={s} />
                ))}
              </div>
              {category && (
                <Link to={`/explore?category=${category.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-text hover:underline">
                  More in {category.name}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              )}
            </section>
          )}
        </aside>
      </div>

      <VisitWebsiteModal store={store} open={visitOpen} onClose={() => setVisitOpen(false)} />
      <LoginPrompt
        open={prompt === "review"}
        onClose={() => setPrompt(null)}
        title="Log in to write a review"
        reason="Reviews come from signed-in shoppers, so every rating on DealFinder belongs to a real account. It only takes a minute."
      />
      <LoginPrompt
        open={prompt === "claim"}
        onClose={() => setPrompt(null)}
        title="Log in as a store owner"
        reason="Claiming a listing needs a store owner account so our team can check your ownership evidence."
      />
    </Container>
  );
}

function StoreDetailsSkeleton() {
  return (
    <Container className="py-8 sm:py-12" aria-busy="true">
      <Skeleton className="h-4 w-32" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="p-8">
          <div className="flex gap-6">
            <Skeleton className="size-24 rounded-2xl" />
            <div className="flex-1">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="mt-4 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-4/5" />
              <Skeleton className="mt-5 h-4 w-2/5" />
            </div>
          </div>
          <div className="mt-8 flex gap-3">
            <Skeleton className="h-13 w-52 rounded-xl" />
            <Skeleton className="h-13 w-44 rounded-xl" />
          </div>
        </Card>
        <Card className="p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-5 h-4 w-full" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-3 h-4 w-full" />
        </Card>
      </div>
      <Spinner className="sr-only" label="Loading store" />
    </Container>
  );
}

/* --------------------- Visit official website (W04-3, W04-4) --------------------- */

type VisitPhase = "checking" | "ready" | "opened" | "down" | "invalid";
const reportedKey = (storeId: string) => `dealfinder.brokenReported.${storeId}`;

/**
 * "You are leaving DealFinder" flow:
 * short reachability check -> leaving notice -> new tab + one referral click.
 * If the website does not respond twice, the shopper is told clearly and can report the broken link.
 */
function VisitWebsiteModal({ store, open, onClose }: { store: Store; open: boolean; onClose: () => void }) {
  const [phase, setPhase] = useState<VisitPhase>("checking");
  const [attempt, setAttempt] = useState(0);
  const [reported, setReported] = useState(() => sessionStorage.getItem(reportedKey(store.id)) === "1");
  const host = hostname(store.websiteUrl);

  // Run the (simulated) reachability check whenever the dialog opens or "Try again" is pressed.
  useEffect(() => {
    if (!open) return;
    if (!isValidWebsite(store.websiteUrl)) {
      setPhase("invalid");
      return;
    }
    setPhase("checking");
    const timer = window.setTimeout(() => setPhase(store.websiteDown ? "down" : "ready"), 900);
    return () => window.clearTimeout(timer);
  }, [open, attempt, store.websiteUrl, store.websiteDown]);

  const onContinue = () => {
    window.open(store.websiteUrl, "_blank", "noopener,noreferrer");
    recordReferralClick(store.id);
    setPhase("opened");
  };

  const onReport = () => {
    reportBrokenLink(store.id);
    sessionStorage.setItem(reportedKey(store.id), "1");
    setReported(true);
  };

  const backButton = (
    <Button variant={phase === "opened" ? "primary" : "ghost"} onClick={onClose}>
      Back to the store
    </Button>
  );

  if (phase === "checking") {
    return (
      <Modal open={open} onClose={onClose} size="sm" icon={<Globe />} title="Checking the website" description={`Making sure ${host} is reachable before we send you there...`}>
        <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-4 text-sm text-muted">
          <Spinner />
          {attempt > 0 ? "Trying again..." : "This takes a moment."}
        </div>
      </Modal>
    );
  }

  if (phase === "invalid") {
    return (
      <Modal
        open={open}
        onClose={onClose}
        size="sm"
        icon={<TriangleAlert />}
        title="Website link unavailable"
        description="This store does not have a valid website address at the moment, so we cannot open it. Our team has been notified."
        footer={backButton}
      />
    );
  }

  if (phase === "down") {
    return (
      <Modal
        open={open}
        onClose={onClose}
        icon={<Unplug />}
        title={`${host} is not responding`}
        description="We tried twice and could not reach the store's website. It may be down for maintenance. We did not send you to a broken page."
        footer={
          <>
            {backButton}
            <Button onClick={onReport} disabled={reported} icon={reported ? <CircleCheck className="size-4" /> : <TriangleAlert className="size-4" />}>
              {reported ? "Report sent" : "Report broken link"}
            </Button>
            <Button variant="primary" icon={<RefreshCw className="size-4" />} onClick={() => setAttempt((a) => a + 1)}>
              Try again
            </Button>
          </>
        }
      >
        {reported && (
          <Alert tone="ok" title="Thanks, report sent">
            We let the store and our team know. You can report this link again later if it is still broken.
          </Alert>
        )}
      </Modal>
    );
  }

  if (phase === "opened") {
    return (
      <Modal
        open={open}
        onClose={onClose}
        size="sm"
        icon={<CircleCheck />}
        title={`${store.name} opened in a new tab`}
        description="Enjoy your shopping. If nothing opened, your browser may have blocked the pop-up."
        footer={backButton}
      >
        <a href={store.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-text hover:underline">
          Open {host} directly
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<ExternalLink />}
      title="You are leaving DealFinder"
      description={
        <>
          You are going to <strong className="text-fg">{store.name}</strong>&rsquo;s official website, <strong className="text-fg">{host}</strong>. Shopping, payment and delivery happen on the
          store&rsquo;s own site. DealFinder does not sell products or handle payments.
        </>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Stay on DealFinder
          </Button>
          <Button variant="primary" iconRight={<ExternalLink className="size-4" />} onClick={onContinue} data-autofocus>
            Continue to website
          </Button>
        </>
      }
    >
      {store.listing === "closed" && (
        <Alert tone="warn" title="This store is marked as closed">
          It may not be taking orders right now.
        </Alert>
      )}
    </Modal>
  );
}

/* ===================================================================== */
/* 404                                                                    */
/* ===================================================================== */

export function NotFoundPage() {
  useDocumentTitle("Page not found");
  const data = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const categories = visibleCategories(data).slice(0, 6);

  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-display text-7xl font-bold text-brand-text sm:text-8xl">404</p>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">We couldn&rsquo;t find that page</h1>
        <p className="mt-3 text-muted">
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm break-all">{location.pathname}</code> does not exist. It may have moved, or the link may be mistyped.
        </p>

        <form
          role="search"
          className="mx-auto mt-8 flex max-w-lg gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(query.trim() ? `/explore?q=${encodeURIComponent(query.trim())}` : "/explore");
          }}
        >
          <label htmlFor="notfound-search" className="sr-only">
            Search stores
          </label>
          <SearchInput id="notfound-search" value={query} onValueChange={setQuery} placeholder="Search for a store instead..." className="flex-1" />
          <Button type="submit" variant="primary" className="h-12">
            Search
          </Button>
        </form>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button to="/" icon={<ArrowLeft className="size-4" />}>
            Back to Home
          </Button>
          <Button to="/explore">Explore all stores</Button>
        </div>

        <div className="mt-12 border-t border-line pt-8">
          <p className="text-sm font-semibold text-subtle">Or browse a category</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/explore?category=${c.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm hover:border-line-strong hover:bg-surface-2"
              >
                <CategoryIcon name={c.icon} className="size-4 text-brand-text" />
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}
