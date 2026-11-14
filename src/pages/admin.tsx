/**
 * Administrator portal - Member 4 (Administrator Portal and Quality).
 *
 *   AdminDashboardPage    W14       Platform overview, items that need a decision, recent activity
 *   AdminQueuePage        W14       FR17       Submissions: new stores and ownership claims
 *   AdminApplicationPage  W15       FR17       One submission: Approve, Request changes, Reject
 *   AdminCatalogPage                FR19-FR20  Every store: search, filter, edit, disable / restore, delete
 *   AdminStoreFormPage              FR18-FR19  Add a verified store / edit an existing store
 *
 * Also exports the pieces shared with admin2.tsx: AdminShell (admin sub-navigation),
 * ConfirmModal, useBusy, logActivity and notifyUser.
 *
 * All changes go through `update()` from src/lib/store.ts. Every decision is written to the
 * activity log and, when it affects a store owner, to that owner's notifications.
 */
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  CircleCheck,
  ClipboardList,
  ExternalLink,
  FileText,
  Flag,
  History,
  Inbox,
  Megaphone,
  MousePointerClick,
  PenLine,
  Plus,
  RotateCcw,
  SearchX,
  ShieldCheck,
  Store as StoreIcon,
  Tag,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import type { AppData, Application, ApprovalStatus, PriceLevel as PriceLevelValue, Store } from "../lib/types";
import { addDaysISO, cn, formatDate, formatNumber, hostname, isValidEmail, isValidWebsite, plural, timeAgo, todayISO } from "../lib/format";
import { useDebouncedValue, useDocumentTitle, useSimulatedLoading } from "../lib/hooks";
import { getData, update, useCurrentUser, useData } from "../lib/store";
import { featuredStoreIds, getCategory, getStore, storeRating } from "../lib/selectors";
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
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Segmented,
  Select,
  Skeleton,
  TextArea,
  useToast,
} from "../ui/kit";
import { RatingInline, StoreLogo } from "../ui/shared";

/* ===================================================================== */
/* Shared admin helpers (also used by admin2.tsx)                         */
/* ===================================================================== */

/** Unique id for new records (notifications, slots, categories ...). */
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Add a line to the administrator activity log (newest first). */
export function logActivity(d: AppData, actor: string, text: string): void {
  d.log.unshift({ at: Date.now(), actor, text });
}

/** Send an in-app notification to a user (shown under the bell icon). */
export function notifyUser(d: AppData, userId: string | null | undefined, text: string, sub: string, link: string): void {
  if (!userId) return;
  d.notifications.unshift({ id: newId("n"), userId, text, sub, link, at: Date.now(), read: false });
}

/**
 * Simulates a short network request so buttons show their loading state.
 * In Milestone 5 the callback becomes a call to the REST API.
 */
export function useBusy(ms = 450): [boolean, (action: () => void) => void] {
  const [busy, setBusy] = useState(false);
  const run = (action: () => void) => {
    setBusy(true);
    window.setTimeout(() => {
      try {
        action();
      } finally {
        setBusy(false);
      }
    }, ms);
  };
  return [busy, run];
}

/** Reviews that shoppers or owners reported and that are still visible (FR22). */
export const flaggedReviewCount = (data: AppData) => data.reviews.filter((r) => r.status === "visible" && r.flags.length > 0).length;

/** Applications waiting for an administrator decision (FR17). */
export const pendingApplications = (data: AppData) => data.applications.filter((a) => a.status === "pending");

/** Confirmation dialog for destructive or important actions. */
export function ConfirmModal({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
  tone = "primary",
  busy,
  icon,
  disabled,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  tone?: "primary" | "danger";
  busy?: boolean;
  icon?: ReactNode;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      description={description}
      icon={icon}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={busy} disabled={disabled}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

/* --------------------------- Admin navigation -------------------------- */

interface AdminNavItem {
  to: string;
  label: string;
  count?: number;
  end?: boolean;
}

function useAdminNav(): AdminNavItem[] {
  const data = useData();
  return [
    { to: "/admin", label: "Overview", end: true },
    { to: "/admin/queue", label: "Submissions", count: pendingApplications(data).length },
    { to: "/admin/catalog", label: "Catalog" },
    { to: "/admin/categories", label: "Categories" },
    { to: "/admin/moderation", label: "Moderation", count: flaggedReviewCount(data) },
    { to: "/admin/featured", label: "Featured" },
    { to: "/admin/analytics", label: "Analytics" },
    { to: "/admin/support", label: "Support", count: data.tickets.filter((t) => t.adminUnread).length },
  ];
}

function AdminNav() {
  const items = useAdminNav();
  const path = useLocation().pathname;
  return (
    <nav aria-label="Administration" className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {items.map((item) => {
          const active = item.end ? path === item.to : path === item.to || path.startsWith(`${item.to}/`);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
                  active ? "border-brand-text text-brand-text" : "border-transparent text-muted hover:text-fg",
                )}
              >
                {item.label}
                {!!item.count && (
                  <span className="rounded-full bg-bad px-1.5 text-[0.68rem] leading-5 font-bold text-white" aria-label={`${item.count} need attention`}>
                    {item.count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Page frame for every admin screen: title, optional back link, sub-navigation. */
export function AdminShell({
  title,
  subtitle,
  actions,
  back,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
  children: ReactNode;
}) {
  return (
    <Container className="py-8 sm:py-10">
      {back && (
        <Link to={back.to} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg">
          <ArrowLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <PageHeader eyebrow="Administration" title={title} subtitle={subtitle} actions={actions} />
      <AdminNav />
      <div className="mt-6">{children}</div>
    </Container>
  );
}

/** Rows of grey blocks while an admin list "loads". */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card className="divide-y divide-line" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="size-10 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-2 h-3.5 w-1/2" />
          </div>
          <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
        </div>
      ))}
    </Card>
  );
}

/* ----------------------------- Status badges ---------------------------- */

const APP_STATUS: Record<Application["status"], { label: string; tone: "warn" | "brand" | "ok" | "bad" | "neutral" }> = {
  pending: { label: "Waiting for review", tone: "warn" },
  needs_changes: { label: "Changes requested", tone: "brand" },
  approved: { label: "Approved", tone: "ok" },
  rejected: { label: "Rejected", tone: "bad" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
};

export function ApplicationStatusBadge({ status }: { status: Application["status"] }) {
  const s = APP_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export type StoreState = "live" | "closed" | "hidden" | "disabled" | Exclude<ApprovalStatus, "approved">;

/** One word for where a store stands, combining approval, owner visibility and admin disabling. */
export function storeState(s: Store): StoreState {
  if (s.disabled) return "disabled";
  if (s.approval !== "approved") return s.approval;
  if (s.listing === "hidden") return "hidden";
  if (s.listing === "closed") return "closed";
  return "live";
}

const STORE_STATE: Record<StoreState, { label: string; tone: "warn" | "brand" | "ok" | "bad" | "neutral" }> = {
  live: { label: "Live", tone: "ok" },
  closed: { label: "Closed", tone: "neutral" },
  hidden: { label: "Hidden by owner", tone: "neutral" },
  disabled: { label: "Disabled", tone: "bad" },
  pending: { label: "Waiting for review", tone: "warn" },
  needs_changes: { label: "Changes requested", tone: "brand" },
  rejected: { label: "Rejected", tone: "bad" },
};

export function StoreStateBadge({ store }: { store: Store }) {
  const s = STORE_STATE[storeState(store)];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

const typeLabel = (a: Application) => (a.type === "claim" ? "Ownership claim" : "New store");

/** Other pending claims on the same store (two owners say they own it). */
const competingClaims = (data: AppData, a: Application) =>
  a.type === "claim" ? data.applications.filter((o) => o.id !== a.id && o.type === "claim" && o.storeId === a.storeId && o.status === "pending") : [];

/* ===================================================================== */
/* Application decisions (FR17)                                           */
/* ===================================================================== */

type ActionResult = { ok: true } | { ok: false; error: string };

/** Fails when another administrator already decided (for example in another tab). */
function checkPending(id: string): ActionResult {
  const app = getData().applications.find((a) => a.id === id);
  if (!app) return { ok: false, error: "This submission no longer exists." };
  if (app.status !== "pending") return { ok: false, error: `This submission was already handled (${APP_STATUS[app.status].label.toLowerCase()}).` };
  return { ok: true };
}

export function approveApplication(id: string, admin: string): ActionResult {
  const check = checkPending(id);
  if (!check.ok) return check;
  update((d) => {
    const now = Date.now();
    const a = d.applications.find((x) => x.id === id)!;
    const s = d.stores.find((x) => x.id === a.storeId);
    a.status = "approved";
    a.decidedAt = now;
    a.decidedBy = admin;
    a.updatedAt = now;
    a.history.push({ at: now, actor: admin, text: "Approved. Verified badge granted." });
    if (!s) return;
    s.verified = true;
    if (a.type === "new") {
      s.approval = "approved";
      notifyUser(d, a.ownerId, `${s.name} is now live`, `${a.ref} was approved and the Verified badge was added`, `/portal/applications/${a.id}`);
      logActivity(d, admin, `Approved ${s.name} (${a.ref})`);
    } else {
      s.ownerId = a.ownerId;
      notifyUser(d, a.ownerId, `You now manage ${s.name}`, `Your claim ${a.ref} was approved`, `/portal/applications/${a.id}`);
      logActivity(d, admin, `Approved the claim on ${s.name} (${a.ref})`);
      // Only one owner can win: close the other pending claims on the same store.
      for (const other of d.applications) {
        if (other.id === a.id || other.type !== "claim" || other.storeId !== a.storeId || other.status !== "pending") continue;
        other.status = "rejected";
        other.decidedAt = now;
        other.decidedBy = admin;
        other.updatedAt = now;
        other.rejectionReason = `Another owner proved ownership of ${s.name} first. Contact support if you believe this is a mistake.`;
        other.history.push({ at: now, actor: admin, text: "Rejected: another claim on this store was approved" });
        notifyUser(d, other.ownerId, `Claim on ${s.name} was not approved`, `${other.ref} · another owner was verified`, `/portal/applications/${other.id}`);
        logActivity(d, admin, `Closed the competing claim ${other.ref} on ${s.name}`);
      }
    }
  });
  return { ok: true };
}

export function requestChanges(id: string, admin: string, items: string[]): ActionResult {
  const check = checkPending(id);
  if (!check.ok) return check;
  update((d) => {
    const now = Date.now();
    const a = d.applications.find((x) => x.id === id)!;
    const s = d.stores.find((x) => x.id === a.storeId);
    a.status = "needs_changes";
    a.decidedAt = now;
    a.decidedBy = admin;
    a.updatedAt = now;
    a.feedback = items.map((text, i) => ({ id: `fb-${now}-${i}`, text: text.trim(), done: false }));
    a.history.push({ at: now, actor: admin, text: `Asked for ${plural(items.length, "change")}` });
    if (s && a.type === "new") s.approval = "needs_changes";
    notifyUser(d, a.ownerId, `${s?.name ?? a.ref} needs changes`, plural(items.length, "item") + " to fix", `/portal/applications/${a.id}`);
    logActivity(d, admin, `Asked for ${plural(items.length, "change")} on ${s?.name ?? "a store"} (${a.ref})`);
  });
  return { ok: true };
}

export function rejectApplication(id: string, admin: string, reason: string): ActionResult {
  const check = checkPending(id);
  if (!check.ok) return check;
  update((d) => {
    const now = Date.now();
    const a = d.applications.find((x) => x.id === id)!;
    const s = d.stores.find((x) => x.id === a.storeId);
    a.status = "rejected";
    a.decidedAt = now;
    a.decidedBy = admin;
    a.updatedAt = now;
    a.rejectionReason = reason.trim();
    a.history.push({ at: now, actor: admin, text: "Rejected" });
    if (s && a.type === "new") s.approval = "rejected";
    notifyUser(d, a.ownerId, `${s?.name ?? a.ref} was not approved`, "Open the submission to read the reason", `/portal/applications/${a.id}`);
    logActivity(d, admin, `Rejected ${a.type === "claim" ? "the claim on " : ""}${s?.name ?? "a store"} (${a.ref})`);
  });
  return { ok: true };
}

/* ===================================================================== */
/* Dashboard (W14)                                                        */
/* ===================================================================== */

/** Sum of referral visits for every store between two YYYY-MM-DD dates (inclusive). */
export function visitsBetween(data: AppData, from: string, to: string, storeIds?: Set<string>): number {
  let total = 0;
  for (const [storeId, days] of Object.entries(data.clicks)) {
    if (storeIds && !storeIds.has(storeId)) continue;
    for (const [date, n] of Object.entries(days)) if (date >= from && date <= to) total += n;
  }
  return total;
}

export function AdminDashboardPage() {
  useDocumentTitle("Administration");
  const data = useData();
  const loading = useSimulatedLoading(350);

  const pending = pendingApplications(data);
  const oldest = pending.reduce((min, a) => Math.min(min, a.submittedAt), Infinity);
  const flagged = data.reviews.filter((r) => r.status === "visible" && r.flags.length > 0);
  const unreadTickets = data.tickets.filter((t) => t.adminUnread);
  const openTickets = data.tickets.filter((t) => t.status !== "closed");
  const live = data.stores.filter((s) => storeState(s) === "live");
  const today = todayISO();
  const visits30 = visitsBetween(data, addDaysISO(today, -29), today);
  const featuredLive = featuredStoreIds(data).size + data.featured.filter((f) => f.kind === "coupon" && f.start <= today && f.end >= today).length;

  const stats: Array<{ label: string; value: string; sub: string; to: string; icon: ReactNode; hot?: boolean }> = [
    { label: "Submissions waiting", value: String(pending.length), sub: pending.length ? `Oldest sent ${timeAgo(oldest).toLowerCase()}` : "The queue is empty", to: "/admin/queue", icon: <ClipboardList />, hot: pending.length > 0 },
    { label: "Reported reviews", value: String(flagged.length), sub: flagged.length ? "Need a decision" : "Nothing reported", to: "/admin/moderation", icon: <Flag />, hot: flagged.length > 0 },
    { label: "Open support requests", value: String(openTickets.length), sub: `${unreadTickets.length} unread`, to: "/admin/support", icon: <Inbox />, hot: unreadTickets.length > 0 },
    { label: "Live stores", value: String(live.length), sub: `${plural(data.stores.length, "store")} in the catalog`, to: "/admin/catalog", icon: <StoreIcon /> },
    { label: "Referral visits, 30 days", value: formatNumber(visits30), sub: "Shoppers sent to store websites", to: "/admin/analytics", icon: <MousePointerClick /> },
    { label: "Featured today", value: String(featuredLive), sub: "Stores and coupons on Home and Explore", to: "/admin/featured", icon: <Megaphone /> },
  ];

  const attention = [
    ...pending.map((a) => ({
      id: a.id,
      kind: a.type === "claim" ? "Ownership claim" : "New store",
      title: getStore(data, a.storeId)?.name ?? "Removed store",
      detail: `${a.ref} · sent ${timeAgo(a.submittedAt).toLowerCase()}${competingClaims(data, a).length ? " · competing claim" : ""}`,
      to: `/admin/queue/${a.id}`,
      at: a.submittedAt,
      rank: 3,
    })),
    ...flagged.map((r) => ({
      id: r.id,
      kind: "Reported review",
      title: `${r.userName} on ${getStore(data, r.storeId)?.name ?? "a removed store"}`,
      detail: `${plural(r.flags.length, "report")} · ${r.flags[0].reason}`,
      to: `/admin/moderation?review=${r.id}`,
      at: Math.min(...r.flags.map((f) => f.at)),
      rank: 2,
    })),
    ...unreadTickets.map((t) => ({
      id: t.id,
      kind: "Support request",
      title: t.subject,
      detail: `${t.ref} · ${data.users.find((u) => u.id === t.ownerId)?.name ?? "Store owner"}`,
      to: `/admin/support/${t.id}`,
      at: t.updatedAt,
      rank: 1,
    })),
  ].sort((a, b) => b.rank - a.rank || a.at - b.at);

  return (
    <AdminShell title="Overview" subtitle="What needs your attention on DealFinder today.">
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          <section aria-label="Platform numbers" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {stats.map((s) => (
              <Link
                key={s.label}
                to={s.to}
                className={cn(
                  "group rounded-2xl border bg-surface p-5 transition-colors hover:border-line-strong hover:bg-surface-2",
                  s.hot ? "border-brand/50" : "border-line",
                )}
              >
                <span className="flex items-center justify-between text-muted [&>svg]:size-5">
                  {s.icon}
                  {s.hot && <span className="size-2.5 rounded-full bg-brand-text" aria-label="Needs attention" />}
                </span>
                <span className="mt-3 block font-display text-3xl font-bold">{s.value}</span>
                <span className="block text-sm font-semibold group-hover:text-brand-text">{s.label}</span>
                <span className="block text-xs text-subtle">{s.sub}</span>
              </Link>
            ))}
          </section>

          <section aria-labelledby="attention-title">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="attention-title" className="text-xl font-bold">
                  Needs a decision
                </h2>
                <p className="text-sm text-muted">Submissions first, then reported reviews and unread support requests, oldest first.</p>
              </div>
              {attention.length > 0 && <span className="text-xs font-semibold text-subtle">{plural(attention.length, "item")}</span>}
            </div>
            {attention.length === 0 ? (
              <Alert tone="ok" title="All caught up">
                No submissions, reported reviews or unread support requests are waiting.
              </Alert>
            ) : (
              <Card as="section" className="divide-y divide-line">
                {attention.map((item) => (
                  <Link key={item.id} to={item.to} className="flex flex-col gap-1 px-5 py-3.5 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <span className="min-w-0">
                      <span className="block text-xs font-bold tracking-wider text-brand-text uppercase">{item.kind}</span>
                      <span className="block truncate font-semibold">{item.title}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{item.detail}</span>
                  </Link>
                ))}
              </Card>
            )}
          </section>

          <section aria-labelledby="activity-title">
            <h2 id="activity-title" className="mb-3 flex items-center gap-2 text-xl font-bold">
              <History className="size-5 text-muted" aria-hidden />
              Recent administrator activity
            </h2>
            {data.log.length === 0 ? (
              <p className="text-sm text-muted">No activity yet.</p>
            ) : (
              <Card as="section">
                <ol className="divide-y divide-line">
                  {data.log.slice(0, 8).map((entry, i) => (
                    <li key={`${entry.at}-${i}`} className="flex flex-col gap-0.5 px-5 py-3 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <span>
                        <span className="font-semibold">{entry.actor}</span> <span className="text-muted">· {entry.text}</span>
                      </span>
                      <time className="shrink-0 text-xs text-subtle" title={formatDate(entry.at)}>
                        {timeAgo(entry.at)}
                      </time>
                    </li>
                  ))}
                </ol>
              </Card>
            )}
          </section>
        </div>
      )}
    </AdminShell>
  );
}

/* ===================================================================== */
/* Submission queue (W14, FR17)                                           */
/* ===================================================================== */

type QueueTab = "pending" | "needs_changes" | "decided";

export function AdminQueuePage() {
  useDocumentTitle("Submissions");
  const data = useData();
  const loading = useSimulatedLoading(350);
  const [tab, setTab] = useState<QueueTab>("pending");
  const [type, setType] = useState<"all" | Application["type"]>("all");
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query.trim().toLowerCase(), 200);

  const inTab = (t: QueueTab, a: Application) =>
    t === "pending" ? a.status === "pending" : t === "needs_changes" ? a.status === "needs_changes" : ["approved", "rejected", "withdrawn"].includes(a.status);
  const count = (t: QueueTab) => data.applications.filter((a) => inTab(t, a)).length;

  const rows = data.applications
    .filter((a) => inTab(tab, a) && (type === "all" || a.type === type))
    .filter((a) => {
      if (!q) return true;
      const store = getStore(data, a.storeId);
      const owner = data.users.find((u) => u.id === a.ownerId);
      return [a.ref, store?.name, store ? hostname(store.websiteUrl) : "", owner?.name, owner?.email].some((v) => v?.toLowerCase().includes(q));
    })
    .sort((a, b) => (tab === "decided" ? (b.decidedAt ?? b.updatedAt) - (a.decidedAt ?? a.updatedAt) : a.submittedAt - b.submittedAt));

  const filtered = q !== "" || type !== "all";

  return (
    <AdminShell title="Submissions" subtitle="New stores and ownership claims from store owners. The oldest waits at the top.">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Segmented<QueueTab>
          label="Submission status"
          value={tab}
          onChange={setTab}
          className="lg:max-w-xl lg:flex-1 [&>button]:px-1.5 sm:[&>button]:px-3"
          options={[
            { value: "pending", label: `Waiting (${count("pending")})` },
            { value: "needs_changes", label: `With owner (${count("needs_changes")})`, title: "Changes requested, waiting for the owner" },
            { value: "decided", label: `Decided (${count("decided")})` },
          ]}
        />
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <SearchInput value={query} onValueChange={setQuery} placeholder="Search store, owner or APP number" aria-label="Search submissions" className="flex-1" />
          <Select value={type} onChange={(e) => setType(e.target.value as typeof type)} aria-label="Submission type" className="sm:w-44">
            <option value="all">All types</option>
            <option value="new">New stores</option>
            <option value="claim">Ownership claims</option>
          </Select>
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <ListSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={filtered ? <SearchX /> : <CircleCheck />}
            title={filtered ? "No submissions match" : tab === "pending" ? "The queue is empty" : "Nothing here yet"}
            action={
              filtered ? (
                <Button
                  onClick={() => {
                    setQuery("");
                    setType("all");
                  }}
                >
                  Clear search and filter
                </Button>
              ) : undefined
            }
          >
            {filtered
              ? "Try another store name, owner or reference number."
              : tab === "pending"
                ? "Every submission has a decision. New ones appear here as soon as owners send them."
                : "Submissions move here as they go through review."}
          </EmptyState>
        ) : (
          <Card as="section" className="divide-y divide-line" aria-label="Submissions">
            {rows.map((a) => {
              const store = getStore(data, a.storeId);
              const owner = data.users.find((u) => u.id === a.ownerId);
              const conflict = a.status === "pending" && competingClaims(data, a).length > 0;
              return (
                <Link key={a.id} to={`/admin/queue/${a.id}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-surface-2">
                  {store ? <StoreLogo store={store} size="sm" /> : <span className="size-9 shrink-0 rounded-lg bg-surface-3" aria-hidden />}
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold">{store?.name ?? "Removed store"}</span>
                      <Badge tone={a.type === "claim" ? "brand" : "neutral"}>{typeLabel(a)}</Badge>
                      {conflict && (
                        <Badge tone="bad" icon={<TriangleAlert className="size-3" aria-hidden />}>
                          Competing claim
                        </Badge>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-muted">
                      <span className="font-mono text-xs">{a.ref}</span> · {owner?.name ?? "Unknown owner"} ·{" "}
                      {tab === "decided" ? `decided ${timeAgo(a.decidedAt ?? a.updatedAt).toLowerCase()}` : `sent ${timeAgo(a.submittedAt).toLowerCase()}`}
                    </span>
                  </span>
                  <span className="hidden shrink-0 sm:block">
                    <ApplicationStatusBadge status={a.status} />
                  </span>
                </Link>
              );
            })}
          </Card>
        )}
      </div>
    </AdminShell>
  );
}

/* ===================================================================== */
/* One submission (W15, FR17)                                             */
/* ===================================================================== */

const REJECT_REASONS = [
  "We could not confirm that you operate this website.",
  "The website does not work or does not sell online.",
  "The store breaks DealFinder's listing rules.",
  "This store is already listed on DealFinder.",
];

const EVIDENCE_LABEL: Record<Application["evidence"]["method"], string> = {
  registration: "Commercial registration document",
  email: "Email on the store's domain",
  dns: "DNS record on the store's domain",
};

function EvidenceDetails({ app, store }: { app: Application; store?: Store }) {
  const e = app.evidence;
  const host = store ? hostname(store.websiteUrl) : "";
  const rows: Array<[string, ReactNode]> = [["Method", EVIDENCE_LABEL[e.method]]];
  if (e.method === "registration") {
    rows.push(["Registration number", e.regNumber ? <span className="font-mono">{e.regNumber}</span> : "Not given"]);
    rows.push(["Document", e.fileName ? `${e.fileName} (${(e.fileSize / 1_000_000).toFixed(1)} MB)` : "No file attached"]);
  }
  if (e.method === "email") {
    const matches = !!host && e.emailVerified.toLowerCase().endsWith(`@${host}`);
    rows.push([
      "Verified email",
      e.emailVerified ? (
        <span className="inline-flex flex-wrap items-center gap-2">
          {e.emailVerified}
          {matches ? <Badge tone="ok">Matches {host}</Badge> : <Badge tone="warn">Different domain</Badge>}
        </span>
      ) : (
        "Not verified yet"
      ),
    ]);
  }
  if (e.method === "dns") rows.push(["DNS record", e.dnsVerified ? <Badge tone="ok">Found</Badge> : <Badge tone="bad">Not found</Badge>]);
  if (e.notes) rows.push(["Owner's note", e.notes]);
  const warning =
    e.method === "registration" && e.regNumber && !/^\d{10}$/.test(e.regNumber)
      ? `The registration number has ${e.regNumber.replace(/\D/g, "").length} digits; Saudi commercial registration numbers have 10.`
      : e.method === "registration" && !e.fileName
        ? "No document is attached."
        : e.method === "dns" && !e.dnsVerified
          ? "The DNS record was not found."
          : null;
  return (
    <>
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[12rem_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="font-medium break-words">{v}</dd>
          </div>
        ))}
      </dl>
      {warning && (
        <Alert tone="warn" className="mt-4">
          {warning}
        </Alert>
      )}
    </>
  );
}

export function AdminApplicationPage() {
  const { appId } = useParams<"appId">();
  const data = useData();
  const admin = useCurrentUser();
  const toast = useToast();
  const navigate = useNavigate();
  const loading = useSimulatedLoading(300, appId);
  const [busy, run] = useBusy();
  const [dialog, setDialog] = useState<null | "approve" | "changes" | "reject">(null);
  const [items, setItems] = useState<string[]>([""]);
  const [itemErrors, setItemErrors] = useState<Array<string | null>>([]);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const app = data.applications.find((a) => a.id === appId);
  useDocumentTitle(app ? `${app.ref} · Submissions` : "Submission not found");

  if (loading) {
    return (
      <AdminShell title="Submission" back={{ to: "/admin/queue", label: "Back to submissions" }}>
        <ListSkeleton rows={3} />
      </AdminShell>
    );
  }
  if (!app) {
    return (
      <AdminShell title="Submission not found" back={{ to: "/admin/queue", label: "Back to submissions" }}>
        <EmptyState icon={<SearchX />} title="We could not find this submission" action={<Button to="/admin/queue" variant="primary">Open the queue</Button>}>
          It may have been removed together with its store, or the link is wrong.
        </EmptyState>
      </AdminShell>
    );
  }

  const store = getStore(data, app.storeId);
  const owner = data.users.find((u) => u.id === app.ownerId);
  const category = store ? getCategory(data, store.categoryId) : undefined;
  const rivals = competingClaims(data, app);
  const ownerStores = data.stores.filter((s) => s.ownerId === app.ownerId && s.approval === "approved").length;
  const adminName = admin?.name ?? "Administrator";

  const close = () => {
    if (busy) return;
    setDialog(null);
    setItemErrors([]);
    setReasonError(null);
  };
  const finish = (result: ActionResult, message: string) => {
    setDialog(null);
    if (!result.ok) {
      setActionError(result.error);
      toast({ tone: "bad", title: "Nothing was changed", description: result.error });
      return;
    }
    toast({ title: message, action: { label: "Back to queue", onClick: () => navigate("/admin/queue") } });
  };

  const onApprove = () => run(() => finish(approveApplication(app.id, adminName), `${app.ref} approved`));

  const onRequestChanges = () => {
    const errs = items.map((t) => {
      const v = t.trim();
      if (!v) return "Describe the change, or remove this item.";
      if (v.length < 10) return "Write at least 10 characters so the owner knows what to fix.";
      if (v.length > 300) return "Use 300 characters or fewer.";
      return null;
    });
    setItemErrors(errs);
    if (errs.some(Boolean)) return;
    run(() => finish(requestChanges(app.id, adminName, items), `Changes requested on ${app.ref}`));
  };

  const onReject = () => {
    const v = reason.trim();
    const err = !v ? "Give the owner a reason." : v.length < 20 ? `Write at least 20 characters (${v.length} so far) so the owner understands the decision.` : v.length > 500 ? "Use 500 characters or fewer." : null;
    setReasonError(err);
    if (err) return;
    run(() => finish(rejectApplication(app.id, adminName, v), `${app.ref} rejected`));
  };

  return (
    <AdminShell
      title={
        <span className="flex flex-wrap items-center gap-3">
          {store?.name ?? "Removed store"}
          <ApplicationStatusBadge status={app.status} />
        </span>
      }
      subtitle={`${typeLabel(app)} · ${app.ref} · sent ${formatDate(app.submittedAt)}`}
      back={{ to: "/admin/queue", label: "Back to submissions" }}
    >
      {actionError && (
        <Alert tone="bad" title="This submission changed" className="mb-5">
          {actionError}
        </Alert>
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {rivals.length > 0 && (
            <Alert tone="warn" title="Competing claim">
              {rivals.map((r) => data.users.find((u) => u.id === r.ownerId)?.name ?? "Another owner").join(", ")} also claimed this store ({rivals.map((r) => r.ref).join(", ")}). Approving this claim
              rejects the other one automatically. Compare the evidence first.
            </Alert>
          )}

          <Card as="section" className="p-6">
            <h2 className="text-lg font-semibold">Store details</h2>
            {store ? (
              <div className="mt-4">
                <div className="flex items-start gap-4">
                  <StoreLogo store={store} size="lg" />
                  <div className="min-w-0">
                    <p className="text-lg font-semibold">{store.name}</p>
                    <a href={store.websiteUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-sm text-brand-text hover:underline">
                      {hostname(store.websiteUrl)}
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {category && <Badge icon={<Tag className="size-3" aria-hidden />}>{category.name}</Badge>}
                      <Badge>{"$".repeat(store.priceLevel)} price level</Badge>
                      {app.type === "claim" && <StoreStateBadge store={store} />}
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted">{store.description}</p>
                {store.keywords.length > 0 && (
                  <p className="mt-3 flex flex-wrap gap-1.5">
                    {store.keywords.map((k) => (
                      <Badge key={k}>{k}</Badge>
                    ))}
                  </p>
                )}
                {app.type === "claim" && (
                  <p className="mt-4 text-sm text-muted">
                    Current owner: <span className="font-semibold text-fg">{store.ownerId ? data.users.find((u) => u.id === store.ownerId)?.name : "Nobody (unclaimed listing)"}</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">The store was removed from the catalog.</p>
            )}
          </Card>

          <Card as="section" className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck className="size-5 text-muted" aria-hidden />
              Proof of ownership
            </h2>
            <EvidenceDetails app={app} store={store} />
          </Card>

          {(app.feedback.length > 0 || app.rejectionReason) && (
            <Card as="section" className="p-6">
              <h2 className="text-lg font-semibold">{app.rejectionReason ? "Reason given to the owner" : "Changes requested"}</h2>
              {app.rejectionReason && <p className="mt-3 text-sm leading-relaxed text-muted">{app.rejectionReason}</p>}
              {app.feedback.length > 0 && (
                <ul className="mt-3 space-y-2 text-sm">
                  {app.feedback.map((f) => (
                    <li key={f.id} className="flex gap-2">
                      {f.done ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-ok" aria-label="Fixed" /> : <span className="mt-1.5 size-2 shrink-0 rounded-full bg-warn" aria-label="Not fixed yet" />}
                      <span className={f.done ? "text-muted line-through" : undefined}>{f.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card as="section" className="p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <History className="size-5 text-muted" aria-hidden />
              History
            </h2>
            <ol className="mt-4 space-y-3 border-l border-line pl-5">
              {app.history.map((h, i) => (
                <li key={i} className="relative text-sm">
                  <span className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full border-2 border-surface bg-brand-text" aria-hidden />
                  <span className="font-semibold">{h.text}</span>
                  <span className="block text-xs text-subtle">
                    {h.actor} · {formatDate(h.at)} ({timeAgo(h.at).toLowerCase()})
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="p-6 lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold">Decision</h2>
            {app.status === "pending" ? (
              <>
                <p className="mt-1 text-sm text-muted">The owner is notified as soon as you decide.</p>
                <div className="mt-5 grid gap-2">
                  <Button variant="primary" icon={<BadgeCheck className="size-4" />} onClick={() => setDialog("approve")} disabled={!store}>
                    Approve
                  </Button>
                  <Button
                    icon={<PenLine className="size-4" />}
                    onClick={() => {
                      setItems([""]);
                      setDialog("changes");
                    }}
                  >
                    Request changes
                  </Button>
                  <Button
                    variant="soft-danger"
                    icon={<X className="size-4" />}
                    onClick={() => {
                      setReason("");
                      setDialog("reject");
                    }}
                  >
                    Reject
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">
                {app.status === "needs_changes"
                  ? "Waiting for the owner to fix the requested items and send the submission again."
                  : `${APP_STATUS[app.status].label}${app.decidedBy ? ` by ${app.decidedBy}` : ""}${app.decidedAt ? ` on ${formatDate(app.decidedAt)}` : ""}.`}
              </p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold">Store owner</h2>
            {owner ? (
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-muted">Name</dt>
                  <dd className="font-medium">{owner.name}</dd>
                </div>
                <div>
                  <dt className="text-muted">Email</dt>
                  <dd className="font-medium break-all">{owner.email}</dd>
                </div>
                {owner.businessName && (
                  <div>
                    <dt className="text-muted">Business</dt>
                    <dd className="font-medium">{owner.businessName}</dd>
                  </div>
                )}
                {owner.phone && (
                  <div>
                    <dt className="text-muted">Phone</dt>
                    <dd className="font-medium">{owner.phone}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted">Member since</dt>
                  <dd className="font-medium">{formatDate(owner.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Approved stores</dt>
                  <dd className="font-medium">{ownerStores}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-muted">This account no longer exists.</p>
            )}
          </Card>
        </aside>
      </div>

      {/* ---------------- Dialogs ---------------- */}
      <ConfirmModal
        open={dialog === "approve"}
        onClose={close}
        busy={busy}
        icon={<BadgeCheck />}
        title={app.type === "claim" ? `Give ${owner?.name ?? "this owner"} control of ${store?.name}?` : `Approve ${store?.name}?`}
        description={
          app.type === "claim"
            ? `The listing keeps its reviews and rating, gets the Verified badge, and ${owner?.name ?? "the owner"} can manage it from the Store Portal.${rivals.length ? ` The competing claim (${rivals.map((r) => r.ref).join(", ")}) will be rejected.` : ""}`
            : "The store becomes visible to shoppers right away with the Verified badge, and the owner is notified."
        }
        confirmLabel="Approve"
        onConfirm={onApprove}
      />

      <Modal
        open={dialog === "changes"}
        onClose={close}
        icon={<PenLine />}
        size="lg"
        title="Request changes"
        description="List each thing the owner must fix. They see this list in their portal and can send the submission again."
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onRequestChanges} loading={busy}>
              Send to owner
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {items.map((text, i) => (
            <div key={i} className="flex items-start gap-2">
              <Field label={`Change ${i + 1}`} htmlFor={`change-${i}`} error={itemErrors[i]} className="flex-1">
                <TextArea
                  id={`change-${i}`}
                  value={text}
                  rows={2}
                  className="min-h-20"
                  invalid={!!itemErrors[i]}
                  placeholder="For example: The commercial registration number must have 10 digits."
                  onChange={(e) => setItems((list) => list.map((x, j) => (j === i ? e.target.value : x)))}
                  data-autofocus={i === 0 ? true : undefined}
                />
              </Field>
              {items.length > 1 && (
                <IconButton
                  label={`Remove change ${i + 1}`}
                  size="sm"
                  className="mt-7"
                  onClick={() => {
                    setItems((list) => list.filter((_, j) => j !== i));
                    setItemErrors((list) => list.filter((_, j) => j !== i));
                  }}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              )}
            </div>
          ))}
          {items.length < 5 ? (
            <Button variant="ghost" size="sm" icon={<Plus className="size-4" />} onClick={() => setItems((list) => [...list, ""])}>
              Add another change
            </Button>
          ) : (
            <p className="text-xs text-subtle">You can list up to 5 changes.</p>
          )}
        </div>
      </Modal>

      <Modal
        open={dialog === "reject"}
        onClose={close}
        icon={<X />}
        title={`Reject ${app.ref}?`}
        description="The owner sees this reason. Rejected submissions cannot be sent again; the owner has to start a new one."
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onReject} loading={busy}>
              Reject submission
            </Button>
          </>
        }
      >
        <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Common reasons">
          {REJECT_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setReason(r);
                setReasonError(null);
              }}
              className="rounded-full border border-line bg-surface-2 px-3 py-1 text-left text-xs font-medium text-muted hover:border-line-strong hover:text-fg"
            >
              {r}
            </button>
          ))}
        </div>
        <Field label="Reason" htmlFor="reject-reason" error={reasonError} hint={`${reason.trim().length}/500 characters, at least 20`} required>
          <TextArea id="reject-reason" value={reason} invalid={!!reasonError} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </Field>
      </Modal>
    </AdminShell>
  );
}

/* ===================================================================== */
/* Catalog (FR19, FR20)                                                   */
/* ===================================================================== */

const DISABLE_REASONS = ["Website no longer works", "Repeated shopper complaints", "Breaks the listing rules", "Ownership is disputed", "Other"];

/** What else is removed when a store is deleted (shown before confirming). */
function deletionImpact(data: AppData, storeId: string) {
  return {
    reviews: data.reviews.filter((r) => r.storeId === storeId).length,
    coupons: data.coupons.filter((c) => c.storeId === storeId).length,
    featured: data.featured.filter((f) => f.storeId === storeId).length,
    applications: data.applications.filter((a) => a.storeId === storeId).length,
    favorites: data.users.filter((u) => u.favorites.includes(storeId)).length,
  };
}

export function disableStore(storeId: string, admin: string, reason: string): void {
  update((d) => {
    const s = d.stores.find((x) => x.id === storeId);
    if (!s) return;
    s.disabled = true;
    s.disabledReason = reason;
    notifyUser(d, s.ownerId, `${s.name} was disabled`, `Reason: ${reason}`, `/portal/stores/${s.id}`);
    logActivity(d, admin, `Disabled ${s.name} (${reason})`);
  });
}

export function restoreStore(storeId: string, admin: string): void {
  update((d) => {
    const s = d.stores.find((x) => x.id === storeId);
    if (!s) return;
    s.disabled = false;
    delete s.disabledReason;
    notifyUser(d, s.ownerId, `${s.name} is visible again`, "An administrator restored your listing", `/portal/stores/${s.id}`);
    logActivity(d, admin, `Restored ${s.name}`);
  });
}

/** Permanently removes a store and everything that belongs to it (FR20). */
export function deleteStore(storeId: string, admin: string): void {
  update((d) => {
    const s = d.stores.find((x) => x.id === storeId);
    if (!s) return;
    d.stores = d.stores.filter((x) => x.id !== storeId);
    d.reviews = d.reviews.filter((r) => r.storeId !== storeId);
    d.coupons = d.coupons.filter((c) => c.storeId !== storeId);
    d.featured = d.featured.filter((f) => f.storeId !== storeId);
    d.applications = d.applications.filter((a) => a.storeId !== storeId);
    d.users.forEach((u) => (u.favorites = u.favorites.filter((id) => id !== storeId)));
    d.tickets.forEach((t) => {
      if (t.storeId === storeId) delete t.storeId;
    });
    delete d.clicks[storeId];
    notifyUser(d, s.ownerId, `${s.name} was removed from DealFinder`, "Contact support if you have questions", "/portal/support");
    logActivity(d, admin, `Deleted ${s.name}`);
  });
}

type CatalogFilter = "all" | StoreState;

export function AdminCatalogPage() {
  useDocumentTitle("Store catalog");
  const data = useData();
  const admin = useCurrentUser();
  const adminName = admin?.name ?? "Administrator";
  const toast = useToast();
  const loading = useSimulatedLoading(350);
  const [busy, run] = useBusy();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<CatalogFilter>("all");
  const [categoryId, setCategoryId] = useState("all");
  const q = useDebouncedValue(query.trim().toLowerCase(), 200);

  const [disabling, setDisabling] = useState<Store | null>(null);
  const [disableReason, setDisableReason] = useState(DISABLE_REASONS[0]);
  const [disableNote, setDisableNote] = useState("");
  const [disableError, setDisableError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<Store | null>(null);
  const [deleting, setDeleting] = useState<Store | null>(null);
  const [deleteText, setDeleteText] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data.stores.length };
    for (const s of data.stores) c[storeState(s)] = (c[storeState(s)] ?? 0) + 1;
    return c;
  }, [data.stores]);

  const rows = data.stores
    .filter((s) => state === "all" || storeState(s) === state)
    .filter((s) => categoryId === "all" || s.categoryId === categoryId)
    .filter((s) => {
      if (!q) return true;
      const owner = data.users.find((u) => u.id === s.ownerId);
      return [s.name, hostname(s.websiteUrl), owner?.name ?? "", s.keywords.join(" ")].some((v) => v.toLowerCase().includes(q));
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const filtered = q !== "" || state !== "all" || categoryId !== "all";

  const openDisable = (s: Store) => {
    setDisabling(s);
    setDisableReason(DISABLE_REASONS[0]);
    setDisableNote("");
    setDisableError(null);
  };
  const confirmDisable = () => {
    if (!disabling) return;
    const note = disableNote.trim();
    if (disableReason === "Other" && note.length < 10) {
      setDisableError("Describe the reason in at least 10 characters.");
      return;
    }
    const full = disableReason === "Other" ? note : note ? `${disableReason}: ${note}` : disableReason;
    const s = disabling;
    run(() => {
      disableStore(s.id, adminName, full);
      setDisabling(null);
      toast({ title: `${s.name} disabled`, description: "Shoppers can no longer see it.", action: { label: "Undo", onClick: () => restoreStore(s.id, adminName) } });
    });
  };
  const confirmRestore = () => {
    if (!restoring) return;
    const s = restoring;
    run(() => {
      restoreStore(s.id, adminName);
      setRestoring(null);
      toast({ title: `${s.name} restored` });
    });
  };
  const confirmDelete = () => {
    if (!deleting) return;
    const s = deleting;
    run(() => {
      deleteStore(s.id, adminName);
      setDeleting(null);
      setDeleteText("");
      toast({ title: `${s.name} deleted` });
    });
  };
  const impact = deleting ? deletionImpact(data, deleting.id) : null;

  return (
    <AdminShell
      title="Store catalog"
      subtitle="Every store on DealFinder, including ones waiting for review and ones you disabled."
      actions={
        <Button to="/admin/catalog/new" variant="primary" icon={<Plus className="size-4" />}>
          Add store
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <SearchInput value={query} onValueChange={setQuery} placeholder="Search name, website, owner or keyword" aria-label="Search stores" />
        <Select value={state} onChange={(e) => setState(e.target.value as CatalogFilter)} aria-label="Status" className="sm:w-52">
          <option value="all">All statuses ({counts.all})</option>
          {(Object.keys(STORE_STATE) as StoreState[]).map((k) => (
            <option key={k} value={k}>
              {STORE_STATE[k].label} ({counts[k] ?? 0})
            </option>
          ))}
        </Select>
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category" className="sm:w-52">
          <option value="all">All categories</option>
          {data.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.hidden ? " (hidden)" : ""}
            </option>
          ))}
        </Select>
      </div>
      <p className="mt-3 text-sm text-muted" aria-live="polite">
        {loading ? "Loading stores…" : `Showing ${plural(rows.length, "store")}`}
      </p>

      <div className="mt-3">
        {loading ? (
          <ListSkeleton rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<SearchX />}
            title={filtered ? "No stores match" : "The catalog is empty"}
            action={
              filtered ? (
                <Button
                  onClick={() => {
                    setQuery("");
                    setState("all");
                    setCategoryId("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button to="/admin/catalog/new" variant="primary">
                  Add the first store
                </Button>
              )
            }
          >
            {filtered ? "Try another name or remove a filter." : "Stores appear here when owners submit them or you add one."}
          </EmptyState>
        ) : (
          <Card as="section" className="divide-y divide-line" aria-label="Stores">
            {rows.map((s) => {
              const owner = data.users.find((u) => u.id === s.ownerId);
              const category = getCategory(data, s.categoryId);
              const st = storeState(s);
              return (
                <article key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <StoreLogo store={s} />
                    <div className="min-w-0">
                      <h3 className="flex flex-wrap items-center gap-2 font-semibold">
                        <Link to={`/admin/catalog/${s.id}`} className="hover:text-brand-text">
                          {s.name}
                        </Link>
                        <StoreStateBadge store={s} />
                        {s.verified && st !== "pending" && <BadgeCheck className="size-4 text-ok" aria-label="Verified" />}
                      </h3>
                      <p className="mt-0.5 truncate text-sm text-muted">
                        {hostname(s.websiteUrl)} · {category?.name ?? "No category"} · {owner ? owner.name : "Unclaimed"}
                      </p>
                      {st === "disabled" && s.disabledReason && <p className="mt-0.5 text-xs text-bad">Reason: {s.disabledReason}</p>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <RatingInline rating={storeRating(data, s)} className="mr-2" />
                    <Button to={`/admin/catalog/${s.id}`} size="sm" icon={<PenLine className="size-4" />}>
                      Edit
                    </Button>
                    {s.disabled ? (
                      <Button size="sm" variant="soft" icon={<RotateCcw className="size-4" />} onClick={() => setRestoring(s)}>
                        Restore
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" icon={<Ban className="size-4" />} onClick={() => openDisable(s)}>
                        Disable
                      </Button>
                    )}
                    <IconButton label={`Delete ${s.name}`} size="sm" className="hover:bg-bad-soft hover:text-bad" onClick={() => setDeleting(s)}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                </article>
              );
            })}
          </Card>
        )}
      </div>

      <ConfirmModal
        open={!!disabling}
        onClose={() => setDisabling(null)}
        busy={busy}
        icon={<Ban />}
        tone="danger"
        title={`Disable ${disabling?.name}?`}
        description="The listing disappears from Home, Explore, search and favorites right away. Its reviews and coupons are kept, and you can restore it later. The owner is notified with your reason."
        confirmLabel="Disable store"
        onConfirm={confirmDisable}
      >
        <div className="space-y-4">
          <Field label="Reason" htmlFor="disable-reason" required>
            <Select id="disable-reason" value={disableReason} onChange={(e) => setDisableReason(e.target.value)}>
              {DISABLE_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </Field>
          <Field
            label={disableReason === "Other" ? "Describe the reason" : "Note for the owner (optional)"}
            htmlFor="disable-note"
            error={disableError}
            required={disableReason === "Other"}
          >
            <TextArea id="disable-note" value={disableNote} invalid={!!disableError} maxLength={300} onChange={(e) => setDisableNote(e.target.value)} className="min-h-20" />
          </Field>
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={!!restoring}
        onClose={() => setRestoring(null)}
        busy={busy}
        icon={<RotateCcw />}
        title={`Restore ${restoring?.name}?`}
        description={`It was disabled because: ${restoring?.disabledReason ?? "no reason recorded"}. After restoring, shoppers can find it again (if it is approved and not hidden by its owner).`}
        confirmLabel="Restore store"
        onConfirm={confirmRestore}
      />

      <ConfirmModal
        open={!!deleting}
        onClose={() => {
          setDeleting(null);
          setDeleteText("");
        }}
        busy={busy}
        icon={<Trash2 />}
        tone="danger"
        title={`Delete ${deleting?.name} permanently?`}
        description="This cannot be undone. If you only want to hide the store, disable it instead."
        confirmLabel="Delete permanently"
        onConfirm={confirmDelete}
        disabled={deleteText.trim().toLowerCase() !== (deleting?.name ?? "").toLowerCase()}
      >
        {impact && (
          <ul className="mb-4 grid grid-cols-2 gap-2 text-sm">
            {(
              [
                ["reviews", impact.reviews],
                ["coupons", impact.coupons],
                ["featured slots", impact.featured],
                ["submissions", impact.applications],
              ] as const
            ).map(([label, n]) => (
              <li key={label} className="rounded-xl bg-surface-2 px-3 py-2">
                <span className="font-semibold">{n}</span> <span className="text-muted">{label}</span>
              </li>
            ))}
            <li className="col-span-2 text-xs text-subtle">It is also removed from {plural(impact.favorites, "shopper's favorites list", "shoppers' favorites lists")}.</li>
          </ul>
        )}
        <Field label={`Type the store name (${deleting?.name}) to confirm`} htmlFor="delete-confirm">
          <Input id="delete-confirm" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} autoComplete="off" />
        </Field>
      </ConfirmModal>
    </AdminShell>
  );
}

/* ===================================================================== */
/* Add / edit a store (FR18, FR19)                                        */
/* ===================================================================== */

interface StoreFormValues {
  name: string;
  websiteUrl: string;
  categoryId: string;
  priceLevel: "1" | "2" | "3";
  description: string;
  keywords: string;
  contactEmail: string;
  verified: boolean;
}

type StoreFormErrors = Partial<Record<keyof StoreFormValues, string>>;

const toValues = (s?: Store): StoreFormValues => ({
  name: s?.name ?? "",
  websiteUrl: s?.websiteUrl ?? "https://",
  categoryId: s?.categoryId ?? "",
  priceLevel: String(s?.priceLevel ?? 2) as StoreFormValues["priceLevel"],
  description: s?.description ?? "",
  keywords: s?.keywords.join(", ") ?? "",
  contactEmail: s?.contactEmail ?? "",
  verified: s?.verified ?? true,
});

const splitKeywords = (text: string) =>
  Array.from(new Set(text.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean)));

/** Store form rules (FR18, FR19). Returns an error per field; empty object when valid. */
export function validateStoreForm(v: StoreFormValues, data: AppData, editingId?: string): StoreFormErrors {
  const e: StoreFormErrors = {};
  const others = data.stores.filter((s) => s.id !== editingId);
  const name = v.name.trim();
  if (name.length < 2) e.name = "Enter the store name (at least 2 characters).";
  else if (name.length > 60) e.name = "Use 60 characters or fewer.";
  else if (others.some((s) => s.name.toLowerCase() === name.toLowerCase())) e.name = "Another store already uses this name.";

  const url = v.websiteUrl.trim();
  if (!url || url === "https://") e.websiteUrl = "Enter the store's website address.";
  else if (!isValidWebsite(url)) e.websiteUrl = "Use a full secure address that starts with https://, for example https://example.sa";
  else {
    const twin = others.find((s) => hostname(s.websiteUrl) === hostname(url));
    if (twin) e.websiteUrl = `${twin.name} already uses ${hostname(url)}.`;
  }

  if (!v.categoryId) e.categoryId = "Choose a category.";
  const desc = v.description.trim();
  if (desc.length < 20) e.description = `Describe what the store sells in at least 20 characters (${desc.length} so far).`;
  else if (desc.length > 300) e.description = "Use 300 characters or fewer.";

  const kw = splitKeywords(v.keywords);
  if (kw.length > 10) e.keywords = `Use up to 10 keywords (${kw.length} entered).`;
  else if (kw.some((k) => k.length > 30)) e.keywords = "Each keyword must be 30 characters or fewer.";

  if (v.contactEmail.trim() && !isValidEmail(v.contactEmail)) e.contactEmail = "Enter a valid email address, or leave it empty.";
  return e;
}

/** Readable id from the name, unique among stores ("Fresh Pantry" -> "fresh-pantry"). */
function storeIdFor(name: string, data: AppData): string {
  const base = name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "store";
  let id = base;
  for (let n = 2; data.stores.some((s) => s.id === id); n++) id = `${base}-${n}`;
  return id;
}

export function AdminStoreFormPage() {
  const { storeId } = useParams<"storeId">();
  const data = useData();
  const admin = useCurrentUser();
  const adminName = admin?.name ?? "Administrator";
  const navigate = useNavigate();
  const toast = useToast();
  const loading = useSimulatedLoading(250, storeId);
  const [busy, run] = useBusy();
  const editing = storeId ? getStore(data, storeId) : undefined;
  const isEdit = !!storeId;
  const [values, setValues] = useState<StoreFormValues>(() => toValues(storeId ? getData().stores.find((s) => s.id === storeId) : undefined));
  const [errors, setErrors] = useState<StoreFormErrors>({});
  const [leaving, setLeaving] = useState(false);
  useDocumentTitle(isEdit ? (editing ? `Edit ${editing.name}` : "Store not found") : "Add store");

  const initial = useMemo(() => toValues(editing), [editing]);
  const dirty = (Object.keys(values) as Array<keyof StoreFormValues>).some((k) => values[k] !== initial[k]);
  const set = <K extends keyof StoreFormValues>(key: K, value: StoreFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  if (loading) {
    return (
      <AdminShell title={isEdit ? "Edit store" : "Add store"} back={{ to: "/admin/catalog", label: "Back to catalog" }}>
        <ListSkeleton rows={3} />
      </AdminShell>
    );
  }
  if (isEdit && !editing) {
    return (
      <AdminShell title="Store not found" back={{ to: "/admin/catalog", label: "Back to catalog" }}>
        <EmptyState icon={<SearchX />} title="This store is not in the catalog" action={<Button to="/admin/catalog" variant="primary">Open the catalog</Button>}>
          It may have been deleted by another administrator.
        </EmptyState>
      </AdminShell>
    );
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateStoreForm(values, getData(), editing?.id);
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) {
      document.getElementById(`store-${first}`)?.focus();
      return;
    }
    run(() => {
      // Re-check against the latest data in case another tab changed it meanwhile.
      const again = validateStoreForm(values, getData(), editing?.id);
      if (Object.keys(again).length) {
        setErrors(again);
        return;
      }
      const fields = {
        name: values.name.trim(),
        websiteUrl: values.websiteUrl.trim().replace(/\/$/, ""),
        categoryId: values.categoryId,
        priceLevel: Number(values.priceLevel) as PriceLevelValue,
        description: values.description.trim(),
        keywords: splitKeywords(values.keywords),
        contactEmail: values.contactEmail.trim() || undefined,
        verified: values.verified,
      };
      if (editing) {
        update((d) => {
          const s = d.stores.find((x) => x.id === editing.id);
          if (!s) return;
          Object.assign(s, fields);
          if (!fields.contactEmail) delete s.contactEmail;
          notifyUser(d, s.ownerId, `${s.name} was updated by DealFinder`, "An administrator edited your listing details", `/portal/stores/${s.id}`);
          logActivity(d, adminName, `Edited ${s.name}`);
        });
        toast({ title: `${fields.name} saved`, description: "Changes are visible to shoppers now." });
        navigate("/admin/catalog");
      } else {
        const id = storeIdFor(fields.name, getData());
        update((d) => {
          d.stores.push({
            id,
            ...fields,
            ownerId: null,
            hue: Array.from(fields.name).reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7),
            approval: "approved",
            listing: "active",
            disabled: false,
            baseRating: 0,
            baseCount: 0,
            createdAt: Date.now(),
            addedBy: "admin",
            brokenReports: 0,
          });
          logActivity(d, adminName, `Added ${fields.name} to the catalog`);
        });
        toast({ title: `${fields.name} added`, description: "It is live now. Owners can claim it.", action: { label: "View page", onClick: () => navigate(`/stores/${id}`) } });
        navigate("/admin/catalog");
      }
    });
  };

  const cancel = () => (dirty ? setLeaving(true) : navigate("/admin/catalog"));
  const err = (k: keyof StoreFormValues) => errors[k] ?? null;
  const descLen = values.description.trim().length;

  return (
    <AdminShell
      title={editing ? `Edit ${editing.name}` : "Add a verified store"}
      subtitle={editing ? "Changes are visible to shoppers as soon as you save." : "Stores you add are approved and live immediately. Owners can claim them later."}
      back={{ to: "/admin/catalog", label: "Back to catalog" }}
      actions={editing && storeState(editing) === "live" ? <Button to={`/stores/${editing.id}`} icon={<ExternalLink className="size-4" />}>View public page</Button> : undefined}
    >
      <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="space-y-5 p-6 lg:col-span-2">
          {Object.keys(errors).some((k) => errors[k as keyof StoreFormErrors]) && (
            <Alert tone="bad" title="Please fix the highlighted fields" />
          )}
          <Field label="Store name" htmlFor="store-name" error={err("name")} required>
            <Input id="store-name" value={values.name} invalid={!!errors.name} maxLength={80} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Official website" htmlFor="store-websiteUrl" error={err("websiteUrl")} hint="Shoppers are sent here from the store page." required>
            <Input id="store-websiteUrl" type="url" inputMode="url" value={values.websiteUrl} invalid={!!errors.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Category" htmlFor="store-categoryId" error={err("categoryId")} required>
              <Select id="store-categoryId" value={values.categoryId} invalid={!!errors.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">Choose a category</option>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.hidden ? " (hidden from shoppers)" : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">
                Price level
              </span>
              <Segmented<StoreFormValues["priceLevel"]>
                label="Price level"
                value={values.priceLevel}
                onChange={(v) => set("priceLevel", v)}
                options={[
                  { value: "1", label: "$", title: "Low" },
                  { value: "2", label: "$$", title: "Medium" },
                  { value: "3", label: "$$$", title: "High" },
                ]}
              />
            </div>
          </div>
          <Field label="Description" htmlFor="store-description" error={err("description")} hint={`${descLen}/300 characters, at least 20`} required>
            <TextArea id="store-description" value={values.description} invalid={!!errors.description} maxLength={400} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Field label="Search keywords" htmlFor="store-keywords" error={err("keywords")} hint="Separate with commas, up to 10. Shoppers find the store by these words.">
            <Input id="store-keywords" value={values.keywords} invalid={!!errors.keywords} placeholder="lamps, home decor, furniture" onChange={(e) => set("keywords", e.target.value)} />
          </Field>
          <Field label="Contact email" htmlFor="store-contactEmail" error={err("contactEmail")} hint="Optional. Only administrators see it.">
            <Input id="store-contactEmail" type="email" value={values.contactEmail} invalid={!!errors.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
          </Field>
          <Checkbox
            label="Verified store"
            description="Show the Verified badge. Only tick this after checking the business is real."
            checked={values.verified}
            onChange={(c) => set("verified", c)}
          />
        </Card>

        <aside className="space-y-6">
          <Card className="p-6 lg:sticky lg:top-24">
            <h2 className="font-semibold">Preview</h2>
            <div className="mt-4 flex items-center gap-3">
              <StoreLogo store={{ name: values.name || "?", hue: editing?.hue ?? 210 }} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{values.name.trim() || "Store name"}</p>
                <p className="truncate text-sm text-muted">{hostname(values.websiteUrl) || "website"}</p>
              </div>
            </div>
            {editing && (
              <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Status</dt>
                  <dd>
                    <StoreStateBadge store={editing} />
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Owner</dt>
                  <dd className="text-right font-medium">{data.users.find((u) => u.id === editing.ownerId)?.name ?? "Unclaimed"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Added</dt>
                  <dd className="font-medium">
                    {formatDate(editing.createdAt)} by {editing.addedBy}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Broken-link reports</dt>
                  <dd className="font-medium">{editing.brokenReports}</dd>
                </div>
              </dl>
            )}
            <div className="mt-6 grid gap-2">
              <Button type="submit" variant="primary" loading={busy} icon={<FileText className="size-4" />}>
                {editing ? "Save changes" : "Add store"}
              </Button>
              <Button variant="ghost" onClick={cancel} disabled={busy}>
                Cancel
              </Button>
            </div>
          </Card>
        </aside>
      </form>

      <ConfirmModal
        open={leaving}
        onClose={() => setLeaving(false)}
        icon={<TriangleAlert />}
        tone="danger"
        title="Discard your changes?"
        description="You have changes that are not saved."
        confirmLabel="Discard changes"
        onConfirm={() => navigate("/admin/catalog")}
      />
    </AdminShell>
  );
}

