/**
 * Store owner portal - Member 3 (Store Owner Portal).
 *
 * This file holds the portal frame (tabs, status badges, ownership guard), the shared
 * store-details form, the Owner Dashboard (W08) and the Manage store page (W11).
 * Requirements: FR12 (edit profile), FR15 (listing status), owner-only access (NFR).
 *
 * Other owner screens:
 *   ownerParts.tsx  Add store, Claim listing, My applications, resubmission (FR10, FR11, FR13)
 *   ownerTools.tsx  Coupons, Reviews and replies, Analytics, Platform support (FR14, FR16)
 */
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, useLocation, useParams } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  Ban,
  ClipboardList,
  ExternalLink,
  EyeOff,
  FilePlus2,
  Flag,
  LifeBuoy,
  Lock,
  MessageSquare,
  MousePointerClick,
  Pencil,
  Plus,
  Search,
  Star,
  Store as StoreIcon,
  Ticket,
  Unlock,
} from "lucide-react";
import type { AppData, Application, ApprovalStatus, ListingStatus, PriceLevel as PriceLevelValue, Store, User } from "../lib/types";
import { getData, update, useCurrentUser, useData } from "../lib/store";
import { getCategory, isPublicStore, storeRating, visibleCategories } from "../lib/selectors";
import { addDaysISO, cn, compactNumber, formatNumber, hostname, isValidEmail, isValidWebsite, plural, timeAgo, todayISO } from "../lib/format";
import { useDocumentTitle, useSimulatedLoading } from "../lib/hooks";
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Segmented,
  Select,
  Skeleton,
  TextArea,
  useToast,
} from "../ui/kit";
import { ClosedBadge, RatingInline, StoreLogo, UnverifiedBadge, VerifiedBadge } from "../ui/shared";

/* ==================================================================== */
/* Shared helpers (also used by ownerParts.tsx and ownerTools.tsx)       */
/* ==================================================================== */

/** The signed-in owner. Portal routes are wrapped in RequireRole("owner"), so this is never null there. */
export function useOwner(): User {
  return useCurrentUser() as User;
}

/** Stores the owner manages, newest first. */
export const ownedStores = (data: AppData, ownerId: string): Store[] =>
  data.stores.filter((s) => s.ownerId === ownerId).sort((a, b) => b.createdAt - a.createdAt);

/** Approved stores the owner manages (the ones that can have coupons, reviews and visits). */
export const approvedOwnedStores = (data: AppData, ownerId: string): Store[] =>
  ownedStores(data, ownerId).filter((s) => s.approval === "approved");

/** Applications (new stores and claims) sent by the owner, newest first. */
export const ownerApplications = (data: AppData, ownerId: string): Application[] =>
  data.applications.filter((a) => a.ownerId === ownerId).sort((a, b) => b.updatedAt - a.updatedAt);

/** Total referral visits for a store over the last `days` days (today included). */
export function visitsInRange(data: AppData, storeId: string, days: number, endOffset = 0): number {
  const table = data.clicks[storeId] ?? {};
  const today = todayISO();
  let total = 0;
  for (let i = endOffset; i < endOffset + days; i++) total += table[addDaysISO(today, -i)] ?? 0;
  return total;
}

/** Send a notification to every administrator (new submission, support message ...). */
export function notifyAdmins(d: AppData, text: string, sub: string, link: string): void {
  for (const admin of d.users.filter((u) => u.role === "admin")) {
    d.notifications.unshift({ id: `n-${Date.now()}-${admin.id}`, userId: admin.id, text, sub, link, at: Date.now(), read: false });
  }
}

/** Short wait so loading states can be seen in the prototype (replaced by API calls in Milestone 5). */
export const fakeRequest = (ms = 600) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const APPROVAL_LABEL: Record<ApprovalStatus | "withdrawn", { label: string; tone: "neutral" | "brand" | "ok" | "warn" | "bad" }> = {
  pending: { label: "Pending review", tone: "brand" },
  needs_changes: { label: "Needs changes", tone: "warn" },
  approved: { label: "Approved", tone: "ok" },
  rejected: { label: "Rejected", tone: "bad" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
};

/** Status pill for an application or a store's approval. */
export function ApprovalBadge({ status }: { status: ApprovalStatus | "withdrawn" }) {
  const s = APPROVAL_LABEL[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

const LISTING_INFO: Record<ListingStatus, { label: string; tone: "ok" | "neutral" | "bad"; help: string }> = {
  active: { label: "Active", tone: "ok", help: "Shoppers can find the store, read reviews and visit the website." },
  hidden: { label: "Hidden", tone: "neutral", help: "The store disappears from search, categories and featured spots until you show it again." },
  closed: { label: "Closed", tone: "bad", help: "The store stays visible with a Closed badge, so shoppers know it is not taking orders." },
};

/** What shoppers see for one of the owner's stores, as one badge. */
export function StoreStatusBadge({ store }: { store: Store }) {
  if (store.disabled) return <Badge tone="bad" icon={<Ban className="size-3" aria-hidden />}>Disabled by DealFinder</Badge>;
  if (store.approval !== "approved") return <ApprovalBadge status={store.approval} />;
  if (store.listing === "closed") return <ClosedBadge />;
  const info = LISTING_INFO[store.listing];
  return <Badge tone={info.tone}>{info.label === "Active" ? "Live" : info.label}</Badge>;
}

/** Tabs at the top of every portal page. Scrolls sideways on small screens instead of wrapping. */
function PortalNav() {
  const data = useData();
  const user = useOwner();
  const openTickets = data.tickets.filter((t) => t.ownerId === user.id && t.ownerUnread).length;
  const changes = ownerApplications(data, user.id).filter((a) => a.status === "needs_changes").length;
  const tabs: Array<{ to: string; label: string; icon: ReactNode; end?: boolean; count?: number }> = [
    { to: "/portal", label: "Overview", icon: <StoreIcon className="size-4" aria-hidden />, end: true },
    { to: "/portal/applications", label: "Applications", icon: <ClipboardList className="size-4" aria-hidden />, count: changes },
    { to: "/portal/coupons", label: "Coupons", icon: <Ticket className="size-4" aria-hidden /> },
    { to: "/portal/reviews", label: "Reviews", icon: <MessageSquare className="size-4" aria-hidden /> },
    { to: "/portal/analytics", label: "Analytics", icon: <BarChart3 className="size-4" aria-hidden /> },
    { to: "/portal/support", label: "Support", icon: <LifeBuoy className="size-4" aria-hidden />, count: openTickets },
  ];
  // On small screens the tab row scrolls sideways: keep the current tab visible.
  const navRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && current) nav.scrollLeft = current.offsetLeft - nav.clientWidth / 2 + current.clientWidth / 2;
  }, [pathname]);
  return (
    <nav ref={navRef} aria-label="Store portal" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {tabs.map((t) => (
          <li key={t.to}>
            <NavLink
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors",
                  isActive ? "border-brand-text text-fg" : "border-transparent text-muted hover:text-fg",
                )
              }
            >
              {t.icon}
              {t.label}
              {!!t.count && (
                <span className="rounded-full bg-brand px-1.5 text-xs text-white" aria-label={`${t.count} need attention`}>
                  {t.count}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Page frame for every portal screen: tabs, title, actions. */
export function PortalPage({
  title,
  subtitle,
  actions,
  eyebrow = "Store Portal",
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Container className="py-8 sm:py-10">
      <PortalNav />
      <PageHeader className="mt-8" eyebrow={eyebrow} title={title} subtitle={subtitle} actions={actions} />
      <div className="mt-8">{children}</div>
    </Container>
  );
}

/** Shown when an owner opens a store, application or ticket that belongs to someone else (or does not exist). */
export function NotYoursState({ what, back, backLabel }: { what: string; back: string; backLabel: string }) {
  useDocumentTitle(`${what} not found`);
  return (
    <Container className="py-16">
      <EmptyState
        icon={<Lock />}
        title={`We could not find this ${what.toLowerCase()}`}
        action={
          <Button to={back} variant="primary">
            {backLabel}
          </Button>
        }
      >
        It does not exist or it is managed by another account. Owners can only open their own listings, applications and support requests.
      </EmptyState>
    </Container>
  );
}

/** Simple stat tile for dashboards. */
export function StatTile({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: ReactNode; icon: ReactNode }) {
  return (
    <Card className="flex items-start gap-4 p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text [&>svg]:size-5">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-0.5 font-display text-2xl font-bold">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-subtle">{sub}</p>}
      </div>
    </Card>
  );
}

/* ==================================================================== */
/* Store details form (shared by Add store, Manage store and resubmit)  */
/* ==================================================================== */

export interface StoreDetailsValues {
  name: string;
  websiteUrl: string;
  description: string;
  categoryId: string;
  priceLevel: PriceLevelValue;
  keywords: string;
  contactEmail: string;
}

export type StoreDetailsErrors = Partial<Record<keyof StoreDetailsValues, string>>;

export const emptyStoreDetails = (): StoreDetailsValues => ({
  name: "",
  websiteUrl: "https://",
  description: "",
  categoryId: "",
  priceLevel: 2,
  keywords: "",
  contactEmail: "",
});

export const storeToValues = (s: Store): StoreDetailsValues => ({
  name: s.name,
  websiteUrl: s.websiteUrl,
  description: s.description,
  categoryId: s.categoryId,
  priceLevel: s.priceLevel,
  keywords: s.keywords.join(", "),
  contactEmail: s.contactEmail ?? "",
});

/** "lamps, Home decor ,, lamps" -> ["lamps", "home decor"] */
export const parseKeywords = (text: string): string[] =>
  Array.from(new Set(text.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean)));

/** A store that already uses this website or name (the duplicate-listing rule of FR10). */
export function findDuplicate(data: AppData, values: Pick<StoreDetailsValues, "name" | "websiteUrl">, ignoreStoreId?: string) {
  const host = hostname(values.websiteUrl);
  const name = values.name.trim().toLowerCase();
  const others = data.stores.filter((s) => s.id !== ignoreStoreId && s.approval !== "rejected");
  const byHost = host ? others.find((s) => hostname(s.websiteUrl) === host) : undefined;
  const byName = name ? others.find((s) => s.name.trim().toLowerCase() === name) : undefined;
  return { byHost, byName };
}

/** Validates the store details. `ignoreStoreId` skips the store being edited in the duplicate check. */
export function validateStoreDetails(data: AppData, v: StoreDetailsValues, ignoreStoreId?: string): StoreDetailsErrors {
  const e: StoreDetailsErrors = {};
  const name = v.name.trim();
  if (name.length < 2) e.name = "Enter the store name (at least 2 characters).";
  else if (name.length > 60) e.name = "Keep the name under 60 characters.";
  if (!isValidWebsite(v.websiteUrl)) e.websiteUrl = "Enter the full website address starting with https://, e.g. https://mystore.sa";
  const desc = v.description.trim();
  if (desc.length < 20) e.description = `Describe what you sell in at least 20 characters (${desc.length}/20).`;
  else if (desc.length > 400) e.description = "Keep the description under 400 characters.";
  if (!v.categoryId) e.categoryId = "Choose the category that fits the store best.";
  const keywords = parseKeywords(v.keywords);
  if (!keywords.length) e.keywords = "Add at least one keyword shoppers might search for.";
  else if (keywords.length > 10) e.keywords = "Use at most 10 keywords.";
  else if (keywords.some((k) => k.length > 30)) e.keywords = "Each keyword must be under 30 characters.";
  if (v.contactEmail.trim() && !isValidEmail(v.contactEmail)) e.contactEmail = "Enter a valid email address or leave it empty.";

  if (!e.name || !e.websiteUrl) {
    const { byHost, byName } = findDuplicate(data, v, ignoreStoreId);
    if (byHost && !e.websiteUrl) e.websiteUrl = `${hostname(v.websiteUrl)} is already listed as “${byHost.name}”. If it is yours, claim that listing instead.`;
    if (byName && !e.name) e.name = `A store called “${byName.name}” is already listed. Use your store’s exact public name.`;
  }
  return e;
}

/** The fields of a store profile. `locked` fields are shown read-only with an explanation. */
export function StoreDetailsFields({
  values,
  errors,
  onChange,
  locked = [],
  idPrefix = "store",
}: {
  values: StoreDetailsValues;
  errors: StoreDetailsErrors;
  onChange: (patch: Partial<StoreDetailsValues>) => void;
  locked?: Array<keyof StoreDetailsValues>;
  idPrefix?: string;
}) {
  const data = useData();
  const categories = visibleCategories(data);
  const id = (k: string) => `${idPrefix}-${k}`;
  const lockedHint = "Changing this needs a new ownership check. Contact Platform support to change it.";
  const keywordCount = parseKeywords(values.keywords).length;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Store name" htmlFor={id("name")} required error={errors.name} hint={locked.includes("name") ? lockedHint : undefined}>
        <Input
          id={id("name")}
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          invalid={!!errors.name}
          disabled={locked.includes("name")}
          maxLength={60}
          autoComplete="organization"
        />
      </Field>
      <Field
        label="Official website"
        htmlFor={id("website")}
        required
        error={errors.websiteUrl}
        hint={locked.includes("websiteUrl") ? lockedHint : "Shoppers are sent here. It must start with https://"}
      >
        <Input
          id={id("website")}
          type="url"
          inputMode="url"
          value={values.websiteUrl}
          onChange={(e) => onChange({ websiteUrl: e.target.value })}
          invalid={!!errors.websiteUrl}
          disabled={locked.includes("websiteUrl")}
          placeholder="https://mystore.sa"
        />
      </Field>
      <Field
        label="Description"
        htmlFor={id("description")}
        required
        className="sm:col-span-2"
        error={errors.description}
        hint={`${values.description.trim().length}/400 characters. What do you sell and who is it for?`}
      >
        <TextArea
          id={id("description")}
          value={values.description}
          onChange={(e) => onChange({ description: e.target.value })}
          invalid={!!errors.description}
          maxLength={400}
        />
      </Field>
      <Field label="Category" htmlFor={id("category")} required error={errors.categoryId}>
        <Select id={id("category")} value={values.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })} invalid={!!errors.categoryId}>
          <option value="">Choose a category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold" id={id("price-label")}>
          Price level<span className="ml-0.5 text-bad" aria-hidden>*</span>
        </span>
        <Segmented<"1" | "2" | "3">
          label="Price level"
          value={String(values.priceLevel) as "1" | "2" | "3"}
          onChange={(v) => onChange({ priceLevel: Number(v) as PriceLevelValue })}
          options={[
            { value: "1", label: "$", title: "Low" },
            { value: "2", label: "$$", title: "Medium" },
            { value: "3", label: "$$$", title: "High" },
          ]}
        />
        <p className="text-xs text-subtle">A general level, not exact prices.</p>
      </div>
      <Field
        label="Search keywords"
        htmlFor={id("keywords")}
        required
        error={errors.keywords}
        hint={`Separate with commas, e.g. lamps, home decor, lighting (${keywordCount}/10).`}
      >
        <Input id={id("keywords")} value={values.keywords} onChange={(e) => onChange({ keywords: e.target.value })} invalid={!!errors.keywords} />
      </Field>
      <Field label="Contact email" htmlFor={id("email")} error={errors.contactEmail} hint="Optional. Only DealFinder staff see it.">
        <Input
          id={id("email")}
          type="email"
          value={values.contactEmail}
          onChange={(e) => onChange({ contactEmail: e.target.value })}
          invalid={!!errors.contactEmail}
          autoComplete="email"
        />
      </Field>
    </div>
  );
}

/* ==================================================================== */
/* Listing status control (FR15)                                        */
/* ==================================================================== */

/** Active / Hidden / Closed buttons with a confirmation dialog for every change. */
export function ListingStatusControl({ store, compact }: { store: Store; compact?: boolean }) {
  const toast = useToast();
  const [next, setNext] = useState<ListingStatus | null>(null);
  const [saving, setSaving] = useState(false);

  if (store.disabled || store.approval !== "approved") return null;

  const confirm = async () => {
    if (!next) return;
    setSaving(true);
    await fakeRequest(400);
    const prev = store.listing;
    update((d) => {
      const s = d.stores.find((x) => x.id === store.id);
      if (s) s.listing = next;
      d.log.unshift({ at: Date.now(), actor: getData().users.find((u) => u.id === store.ownerId)?.name ?? "Owner", text: `Set ${store.name} to ${LISTING_INFO[next].label}` });
    });
    setSaving(false);
    setNext(null);
    toast({
      title: `${store.name} is now ${LISTING_INFO[next].label.toLowerCase()}`,
      description: LISTING_INFO[next].help,
      action: {
        label: "Undo",
        onClick: () =>
          update((d) => {
            const s = d.stores.find((x) => x.id === store.id);
            if (s) s.listing = prev;
          }),
      },
    });
  };

  const icons: Record<ListingStatus, ReactNode> = {
    active: <Unlock className="size-4" aria-hidden />,
    hidden: <EyeOff className="size-4" aria-hidden />,
    closed: <Lock className="size-4" aria-hidden />,
  };

  return (
    <>
      <div role="group" aria-label={`Listing status of ${store.name}`} className="flex flex-wrap gap-2">
        {(Object.keys(LISTING_INFO) as ListingStatus[]).map((status) => {
          const active = store.listing === status;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={active}
              onClick={() => !active && setNext(status)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border font-semibold transition-colors",
                compact ? "h-9 px-3 text-xs" : "h-10 px-3.5 text-sm",
                active ? "border-brand bg-brand text-white" : "border-line bg-surface-2 text-fg hover:border-line-strong hover:bg-surface-3",
              )}
            >
              {icons[status]}
              {LISTING_INFO[status].label}
            </button>
          );
        })}
      </div>
      <Modal
        open={!!next}
        onClose={() => !saving && setNext(null)}
        icon={next ? icons[next] : undefined}
        title={next === "active" ? `Show ${store.name} again?` : next === "hidden" ? `Hide ${store.name}?` : `Mark ${store.name} as closed?`}
        description={next ? LISTING_INFO[next].help : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setNext(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant={next === "active" ? "primary" : "danger"} onClick={confirm} loading={saving} data-autofocus>
              {next === "active" ? "Make active" : next === "hidden" ? "Hide listing" : "Mark as closed"}
            </Button>
          </>
        }
      >
        {next !== "active" && (
          <Alert tone="warn">Your coupons and reviews are kept. You can change the status back at any time.</Alert>
        )}
      </Modal>
    </>
  );
}

/* ==================================================================== */
/* Owner Dashboard (W08)                                                */
/* ==================================================================== */

interface AttentionItem {
  key: string;
  icon: ReactNode;
  text: string;
  sub: string;
  to: string;
  tone: "warn" | "bad" | "brand";
}

function DashboardSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

export const OwnerDashboardPage = () => {
  useDocumentTitle("Store Portal");
  const data = useData();
  const user = useOwner();
  const loading = useSimulatedLoading();
  const [query, setQuery] = useState("");

  const stores = ownedStores(data, user.id);
  const approved = stores.filter((s) => s.approval === "approved");
  const applications = ownerApplications(data, user.id);
  const storeIds = new Set(approved.map((s) => s.id));

  const visits30 = approved.reduce((sum, s) => sum + visitsInRange(data, s.id, 30), 0);
  const visitsPrev = approved.reduce((sum, s) => sum + visitsInRange(data, s.id, 30, 30), 0);
  const change = visitsPrev ? Math.round(((visits30 - visitsPrev) / visitsPrev) * 100) : 0;
  const liveCoupons = data.coupons.filter((c) => storeIds.has(c.storeId) && c.active && c.expiresAt >= todayISO()).length;
  const unanswered = data.reviews.filter((r) => storeIds.has(r.storeId) && r.status === "visible" && !r.reply);
  const pendingApps = applications.filter((a) => a.status === "pending").length;

  const attention = useMemo(() => {
    const items: AttentionItem[] = [];
    for (const a of applications.filter((x) => x.status === "needs_changes")) {
      const store = data.stores.find((s) => s.id === a.storeId);
      const open = a.feedback.filter((f) => !f.done).length;
      items.push({ key: a.id, icon: <Pencil />, tone: "warn", text: `${store?.name ?? "Your store"} needs changes`, sub: `${a.ref} · ${plural(open, "item")} to fix`, to: `/portal/applications/${a.id}` });
    }
    for (const s of stores.filter((x) => x.disabled)) {
      items.push({ key: `d-${s.id}`, icon: <Ban />, tone: "bad", text: `${s.name} was disabled by DealFinder`, sub: s.disabledReason ?? "Contact support to learn more", to: `/portal/stores/${s.id}` });
    }
    for (const s of approved.filter((x) => x.brokenReports > 0)) {
      items.push({ key: `b-${s.id}`, icon: <AlertTriangle />, tone: "bad", text: `Shoppers could not open ${s.name}’s website`, sub: plural(s.brokenReports, "report"), to: `/portal/stores/${s.id}` });
    }
    for (const t of data.tickets.filter((x) => x.ownerId === user.id && x.ownerUnread)) {
      items.push({ key: t.id, icon: <LifeBuoy />, tone: "brand", text: "Support replied to your request", sub: `${t.ref} · ${t.subject}`, to: `/portal/support/${t.id}` });
    }
    if (unanswered.length) {
      items.push({ key: "reviews", icon: <MessageSquare />, tone: "brand", text: `${plural(unanswered.length, "review")} without a reply`, sub: "A quick reply builds trust with shoppers", to: "/portal/reviews?filter=unanswered" });
    }
    return items;
  }, [applications, approved, data.stores, data.tickets, stores, unanswered.length, user.id]);

  const q = query.trim().toLowerCase();
  const shown = q ? stores.filter((s) => s.name.toLowerCase().includes(q) || hostname(s.websiteUrl).includes(q)) : stores;
  const firstName = user.name.split(" ")[0];

  return (
    <PortalPage
      title={`Welcome back, ${firstName}`}
      subtitle={user.businessName ? `${user.businessName} · manage your listings, applications and store tools in one place.` : "Manage your listings, applications and store tools in one place."}
      actions={
        <>
          <Button to="/explore" icon={<Search className="size-4" />}>
            Claim an existing listing
          </Button>
          <Button to="/portal/stores/new" variant="primary" icon={<Plus className="size-4" />}>
            Add a store
          </Button>
        </>
      }
    >
      {loading ? (
        <DashboardSkeleton />
      ) : stores.length === 0 && applications.length === 0 ? (
        <EmptyState
          icon={<StoreIcon />}
          title="List your first store"
          action={
            <>
              <Button to="/portal/stores/new" variant="primary" icon={<Plus className="size-4" />}>
                Add a store
              </Button>
              <Button to="/explore">Find my store to claim</Button>
            </>
          }
        >
          Submit your online store for verification, or claim a listing DealFinder already added. Verified stores get a badge, coupons, reviews and visit analytics.
        </EmptyState>
      ) : (
        <div className="space-y-10">
          {/* Summary tiles */}
          <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={<StoreIcon />} label="Live listings" value={approved.filter(isPublicStore).length} sub={`${plural(stores.length, "store")} in total`} />
            <StatTile icon={<ClipboardList />} label="Pending applications" value={pendingApps} sub={pendingApps ? "Usually reviewed within 1 working day" : "Nothing waiting"} />
            <StatTile
              icon={<MousePointerClick />}
              label="Website visits (30 days)"
              value={compactNumber(visits30)}
              sub={visitsPrev ? <span className={change >= 0 ? "text-ok" : "text-bad"}>{change >= 0 ? "+" : ""}{change}% vs previous 30 days</span> : "No earlier data"}
            />
            <StatTile icon={<Ticket />} label="Live coupons" value={liveCoupons} sub={<Link className="text-brand-text hover:underline" to="/portal/coupons">Manage coupons</Link>} />
          </section>

          {/* Needs attention */}
          {attention.length > 0 && (
            <section aria-labelledby="attention-title">
              <h2 id="attention-title" className="text-xl font-semibold">
                Needs your attention
              </h2>
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {attention.map((item) => (
                  <li key={item.key}>
                    <Link to={item.to} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-2">
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl [&>svg]:size-4",
                          item.tone === "warn" ? "bg-warn-soft text-warn" : item.tone === "bad" ? "bg-bad-soft text-bad" : "bg-brand-soft text-brand-text",
                        )}
                        aria-hidden
                      >
                        {item.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{item.text}</span>
                        <span className="block truncate text-sm text-muted">{item.sub}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* My listings */}
          <section aria-labelledby="listings-title">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 id="listings-title" className="text-xl font-semibold">
                My listings <span className="text-base font-normal text-subtle">({stores.length})</span>
              </h2>
              {stores.length > 3 && (
                <div className="relative sm:w-64">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
                  <Input aria-label="Search my listings" placeholder="Search my listings" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
                </div>
              )}
            </div>
            {shown.length === 0 ? (
              <EmptyState className="mt-4" icon={<Search />} title="No listing matches your search" action={<Button onClick={() => setQuery("")}>Clear search</Button>} />
            ) : (
              <ul className="mt-4 space-y-3">
                {shown.map((s) => (
                  <ListingRow key={s.id} store={s} application={applications.find((a) => a.storeId === s.id)} />
                ))}
              </ul>
            )}
          </section>

          {/* Recent applications */}
          {applications.length > 0 && (
            <section aria-labelledby="apps-title">
              <div className="flex items-center justify-between gap-3">
                <h2 id="apps-title" className="text-xl font-semibold">
                  Recent applications
                </h2>
                <Link to="/portal/applications" className="text-sm font-semibold text-brand-text hover:underline">
                  View all
                </Link>
              </div>
              <Card className="mt-4 divide-y divide-line">
                {applications.slice(0, 4).map((a) => {
                  const store = data.stores.find((s) => s.id === a.storeId);
                  return (
                    <Link key={a.id} to={`/portal/applications/${a.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-surface-2">
                      <span className="font-mono text-sm text-subtle">{a.ref}</span>
                      <span className="min-w-0 flex-1 font-semibold">
                        {a.type === "claim" ? "Claim: " : ""}
                        {store?.name ?? "Unknown store"}
                      </span>
                      <span className="text-xs text-subtle">Updated {timeAgo(a.updatedAt)}</span>
                      <ApprovalBadge status={a.status} />
                    </Link>
                  );
                })}
              </Card>
            </section>
          )}

          {/* Shortcuts */}
          <section aria-labelledby="shortcuts-title">
            <h2 id="shortcuts-title" className="text-xl font-semibold">
              Shortcuts
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { to: "/portal/stores/new", icon: <FilePlus2 />, label: "Add a store", sub: "Submit for verification" },
                { to: "/portal/coupons", icon: <Ticket />, label: "Coupons", sub: `${liveCoupons} live` },
                { to: "/portal/reviews", icon: <Star />, label: "Reviews", sub: `${unanswered.length} without reply` },
                { to: "/portal/analytics", icon: <BarChart3 />, label: "Analytics", sub: "Visits and coupon use" },
                { to: "/portal/support", icon: <LifeBuoy />, label: "Platform support", sub: "Ask the DealFinder team" },
              ].map((s) => (
                <Link key={s.to} to={s.to} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brand/50 hover:bg-surface-2 lg:flex-col lg:items-start">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text [&>svg]:size-5" aria-hidden>
                    {s.icon}
                  </span>
                  <span>
                    <span className="block font-semibold">{s.label}</span>
                    <span className="block text-sm text-muted">{s.sub}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </PortalPage>
  );
};

/** One store in "My listings" with its status, numbers and actions. */
function ListingRow({ store, application }: { store: Store; application?: Application }) {
  const data = useData();
  const rating = storeRating(data, store);
  const category = getCategory(data, store.categoryId);
  const approved = store.approval === "approved";
  return (
    <li>
      <Card className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <StoreLogo store={store} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/portal/stores/${store.id}`} className="font-semibold hover:text-brand-text">
                {store.name}
              </Link>
              <StoreStatusBadge store={store} />
              {approved && (store.verified ? <VerifiedBadge /> : <UnverifiedBadge />)}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span className="truncate">{hostname(store.websiteUrl)}</span>
              {category && <span>{category.name}</span>}
              {approved && <RatingInline rating={rating} />}
              {approved && <span>{formatNumber(visitsInRange(data, store.id, 30))} visits / 30 days</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {approved && !store.disabled ? (
            <>
              <ListingStatusControl store={store} compact />
              <Button size="sm" to={`/portal/stores/${store.id}`} icon={<Pencil className="size-4" />}>
                Manage
              </Button>
            </>
          ) : application ? (
            <Button size="sm" to={`/portal/applications/${application.id}`} variant={application.status === "needs_changes" ? "primary" : "secondary"}>
              {application.status === "needs_changes" ? "Fix and resubmit" : "View application"}
            </Button>
          ) : (
            <Button size="sm" to={`/portal/stores/${store.id}`}>
              Details
            </Button>
          )}
        </div>
      </Card>
    </li>
  );
}

/* ==================================================================== */
/* Manage store: profile and status (W11, FR12, FR15)                   */
/* ==================================================================== */

export const ManageStorePage = () => {
  const { storeId } = useParams();
  const data = useData();
  const user = useOwner();
  const store = data.stores.find((s) => s.id === storeId && s.ownerId === user.id);
  useDocumentTitle(store ? `Manage ${store.name}` : "Store");
  if (!store) return <NotYoursState what="Store" back="/portal" backLabel="Back to Store Portal" />;
  // `key` resets the form when the owner switches between stores.
  return <ManageStore key={store.id} store={store} />;
};

function ManageStore({ store }: { store: Store }) {
  const data = useData();
  const toast = useToast();
  const [values, setValues] = useState<StoreDetailsValues>(() => storeToValues(store));
  const [errors, setErrors] = useState<StoreDetailsErrors>({});
  const [saving, setSaving] = useState(false);
  const [confirmFixed, setConfirmFixed] = useState(false);

  const application = data.applications.filter((a) => a.storeId === store.id && a.ownerId === store.ownerId).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const approved = store.approval === "approved";
  const editable = approved && !store.disabled;
  const original = storeToValues(store);
  const dirty = JSON.stringify(values) !== JSON.stringify(original);
  // Name and website are part of the ownership check, so a verified listing cannot change them here.
  const locked: Array<keyof StoreDetailsValues> = store.verified ? ["name", "websiteUrl"] : [];

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateStoreDetails(data, values, store.id);
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast({ tone: "bad", title: "Please fix the highlighted fields" });
      return;
    }
    setSaving(true);
    await fakeRequest();
    update((d) => {
      const s = d.stores.find((x) => x.id === store.id);
      if (!s) return;
      s.name = values.name.trim();
      s.websiteUrl = values.websiteUrl.trim();
      s.description = values.description.trim();
      s.categoryId = values.categoryId;
      s.priceLevel = values.priceLevel;
      s.keywords = parseKeywords(values.keywords);
      s.contactEmail = values.contactEmail.trim() || undefined;
    });
    setSaving(false);
    toast({ title: "Store profile saved", description: "Shoppers see the changes right away." });
  };

  const markFixed = () => {
    update((d) => {
      const s = d.stores.find((x) => x.id === store.id);
      if (s) s.brokenReports = 0;
    });
    setConfirmFixed(false);
    toast({ title: "Thanks! The broken-link reports were cleared." });
  };

  return (
    <PortalPage
      eyebrow={
        <Link to="/portal" className="hover:underline">
          Store Portal / My listings
        </Link>
      }
      title={
        <span className="flex items-center gap-4">
          <StoreLogo store={store} size="lg" />
          <span className="min-w-0">{store.name}</span>
        </span>
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <StoreStatusBadge store={store} />
          {approved && (store.verified ? <VerifiedBadge /> : <UnverifiedBadge />)}
          <span className="text-sm">{hostname(store.websiteUrl)}</span>
        </span>
      }
      actions={
        isPublicStore(store) ? (
          <Button to={`/stores/${store.id}`} icon={<ExternalLink className="size-4" />}>
            View public page
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          {store.disabled && (
            <Alert tone="bad" title="This store was disabled by DealFinder">
              {store.disabledReason ?? "It is not shown to shoppers."} You cannot edit it while it is disabled.{" "}
              <Link to={`/portal/support/new?store=${store.id}&topic=Listing`} className="font-semibold underline">
                Contact support
              </Link>
            </Alert>
          )}
          {!approved && (
            <Alert tone={store.approval === "needs_changes" ? "warn" : store.approval === "rejected" ? "bad" : "brand"} title={`Application: ${APPROVAL_LABEL[store.approval].label}`}>
              {store.approval === "pending"
                ? "The listing is waiting for an administrator. You can edit it again after the review."
                : store.approval === "needs_changes"
                  ? "An administrator asked for changes. Edit the details and resubmit from the application page."
                  : "The application was rejected. Read the reason and resubmit with better evidence."}
              {application && (
                <div className="mt-2">
                  <Link to={`/portal/applications/${application.id}`} className="font-semibold underline">
                    Open {application.ref}
                  </Link>
                </div>
              )}
            </Alert>
          )}
          {editable && store.brokenReports > 0 && (
            <Alert tone="bad" title={`${plural(store.brokenReports, "shopper")} could not open your website`}>
              Check that {hostname(store.websiteUrl)} loads, then tell us it is fixed.
              <div className="mt-2">
                <Button size="sm" variant="soft-danger" onClick={() => setConfirmFixed(true)}>
                  It works now
                </Button>
              </div>
            </Alert>
          )}

          {editable && (
            <Card as="section" aria-labelledby="status-title" className="p-6">
              <h2 id="status-title" className="text-lg font-semibold">
                Listing status
              </h2>
              <p className="mt-1 text-sm text-muted">{LISTING_INFO[store.listing].help}</p>
              <div className="mt-4">
                <ListingStatusControl store={store} />
              </div>
            </Card>
          )}

          <Card as="section" aria-labelledby="profile-title" className="p-6">
            <h2 id="profile-title" className="text-lg font-semibold">
              Store profile
            </h2>
            <p className="mt-1 text-sm text-muted">This is what shoppers see on your store page and in search results.</p>
            {editable ? (
              <form className="mt-6" onSubmit={onSubmit} noValidate>
                <StoreDetailsFields values={values} errors={errors} onChange={(p) => setValues((v) => ({ ...v, ...p }))} locked={locked} />
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="ghost"
                    disabled={!dirty || saving}
                    onClick={() => {
                      setValues(original);
                      setErrors({});
                    }}
                  >
                    Discard changes
                  </Button>
                  <Button type="submit" variant="primary" loading={saving} disabled={!dirty}>
                    Save changes
                  </Button>
                </div>
              </form>
            ) : (
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-subtle">Category</dt>
                  <dd className="mt-0.5 font-medium">{getCategory(data, store.categoryId)?.name ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-subtle">Price level</dt>
                  <dd className="mt-0.5 font-medium">{"$".repeat(store.priceLevel)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-subtle">Description</dt>
                  <dd className="mt-0.5">{store.description}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-subtle">Keywords</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {store.keywords.map((k) => (
                      <Badge key={k}>{k}</Badge>
                    ))}
                  </dd>
                </div>
              </dl>
            )}
          </Card>
        </div>

        <aside className="space-y-4">
          {approved && (
            <Card className="p-5">
              <h2 className="font-semibold">At a glance</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Rating</dt>
                  <dd>
                    <RatingInline rating={storeRating(data, store)} />
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Visits (30 days)</dt>
                  <dd className="font-semibold">{formatNumber(visitsInRange(data, store.id, 30))}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Live coupons</dt>
                  <dd className="font-semibold">{data.coupons.filter((c) => c.storeId === store.id && c.active && c.expiresAt >= todayISO()).length}</dd>
                </div>
              </dl>
            </Card>
          )}
          <Card className="p-2">
            {[
              { to: `/portal/coupons?store=${store.id}`, icon: <Ticket className="size-4" />, label: "Coupons", show: editable },
              { to: `/portal/reviews?store=${store.id}`, icon: <MessageSquare className="size-4" />, label: "Reviews and replies", show: approved },
              { to: `/portal/analytics?store=${store.id}`, icon: <BarChart3 className="size-4" />, label: "Analytics", show: approved },
              { to: `/portal/support/new?store=${store.id}`, icon: <Flag className="size-4" />, label: "Ask support about this store", show: true },
            ]
              .filter((l) => l.show)
              .map((l) => (
                <Link key={l.to} to={l.to} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg">
                  {l.icon}
                  {l.label}
                </Link>
              ))}
          </Card>
        </aside>
      </div>

      <Modal
        open={confirmFixed}
        onClose={() => setConfirmFixed(false)}
        icon={<AlertTriangle />}
        title="Is your website working again?"
        description={`We will clear the ${plural(store.brokenReports, "report")} for ${store.name}. If shoppers report it again, you will get a new notification.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmFixed(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={markFixed} data-autofocus>
              Yes, clear reports
            </Button>
          </>
        }
      />
    </PortalPage>
  );
}

/* ==================================================================== */
/* Portal 404                                                           */
/* ==================================================================== */

/** Any /portal/... address that does not exist. */
export const OwnerPortalPage = () => {
  useDocumentTitle("Page not found");
  return (
    <PortalPage title="Page not found">
      <EmptyState
        icon={<Search />}
        title="This portal page does not exist"
        action={
          <Button to="/portal" variant="primary">
            Back to Store Portal
          </Button>
        }
      >
        The link may be old or mistyped.
      </EmptyState>
    </PortalPage>
  );
};
