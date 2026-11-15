/**
 * Owner tools - Member 3 (Store Owner Portal).
 * Coupons (W12), review replies, owner analytics and Platform Support (W13). Requirements: FR14, FR16.
 *
 *   CouponsPage     /portal/coupons              create, edit, pause and delete coupons
 *   ReviewsPage     /portal/reviews              read reviews, reply, edit/delete replies, report
 *   AnalyticsPage   /portal/analytics            website visits, coupon use and ratings
 *   SupportPage     /portal/support              support requests list
 *   NewTicketPage   /portal/support/new          new request form
 *   TicketPage      /portal/support/:ticketId    conversation with administrators
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  BarChart3,
  CircleCheck,
  Flag,
  LifeBuoy,
  MessageSquare,
  MousePointerClick,
  Pause,
  Pencil,
  Play,
  Plus,
  Send,
  Star,
  Ticket,
  Trash2,
  X,
} from "lucide-react";
import type { AppData, Coupon, Review, Store, SupportTicket } from "../lib/types";
import { getData, nextNumber, update, useData } from "../lib/store";
import { couponValueLabel, isCouponLive, storeRating, visibleReviews } from "../lib/selectors";
import { addDaysISO, cn, compactNumber, containsContactDetails, formatDate, formatNumber, plural, timeAgo, todayISO } from "../lib/format";
import { useDocumentTitle, useSimulatedLoading } from "../lib/hooks";
import { Alert, Badge, Button, Card, Checkbox, EmptyState, Field, Input, Modal, Segmented, Select, Skeleton, TextArea, useToast } from "../ui/kit";
import { ReviewItem, StoreLogo, expiryLabel } from "../ui/shared";
import { NotYoursState, PortalPage, StatTile, approvedOwnedStores, fakeRequest, notifyAdmins, ownedStores, useOwner, visitsInRange } from "./owner";

/** Store picker used by Coupons, Reviews and Analytics. Keeps the choice in the URL (?store=id). */
function StoreFilter({ stores, value, onChange, allLabel = "All my stores" }: { stores: Store[]; value: string; onChange: (id: string) => void; allLabel?: string }) {
  if (stores.length < 2) return null;
  return (
    <div className="w-full sm:w-64">
      <label htmlFor="store-filter" className="sr-only">
        Store
      </label>
      <Select id="store-filter" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allLabel}</option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

/** Read and write the ?store= filter, ignoring stores the owner does not manage. */
function useStoreParam(stores: Store[]): [string, (id: string) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get("store") ?? "";
  const value = stores.some((s) => s.id === raw) ? raw : "";
  const set = (id: string) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (id) next.set("store", id);
        else next.delete("store");
        return next;
      },
      { replace: true },
    );
  return [value, set];
}

function NoApprovedStores({ what }: { what: string }) {
  return (
    <EmptyState
      icon={<Ticket />}
      title="No approved store yet"
      action={
        <>
          <Button to="/portal/applications" variant="primary">
            Check my applications
          </Button>
          <Button to="/portal/stores/new">Add a store</Button>
        </>
      }
    >
      {what} become available once an administrator approves one of your stores.
    </EmptyState>
  );
}

/* ==================================================================== */
/* Coupons (W12, FR14)                                                  */
/* ==================================================================== */

type CouponState = "live" | "paused" | "expired";

const couponState = (c: Coupon): CouponState => (c.expiresAt < todayISO() ? "expired" : c.active ? "live" : "paused");

const COUPON_BADGE: Record<CouponState, { label: string; tone: "ok" | "neutral" | "bad" }> = {
  live: { label: "Live", tone: "ok" },
  paused: { label: "Paused", tone: "neutral" },
  expired: { label: "Expired", tone: "bad" },
};

interface CouponForm {
  storeId: string;
  code: string;
  title: string;
  description: string;
  kind: Coupon["kind"];
  value: string;
  expiresAt: string;
  active: boolean;
}

type CouponErrors = Partial<Record<keyof CouponForm, string>>;

function validateCoupon(data: AppData, f: CouponForm, editingId?: string): CouponErrors {
  const e: CouponErrors = {};
  if (!f.storeId) e.storeId = "Choose the store.";
  const code = f.code.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,15}$/.test(code)) e.code = "Use 4 to 15 letters or numbers, without spaces.";
  else if (data.coupons.some((c) => c.id !== editingId && c.storeId === f.storeId && c.code === code && couponState(c) !== "expired"))
    e.code = `${code} is already used by another coupon of this store.`;
  if (f.title.trim().length < 5) e.title = "Write a short title (at least 5 characters).";
  else if (f.title.trim().length > 60) e.title = "Keep the title under 60 characters.";
  if (f.description.length > 160) e.description = "Keep the conditions under 160 characters.";
  const value = Number(f.value);
  if (!f.value || !Number.isFinite(value) || value <= 0) e.value = "Enter the discount amount.";
  else if (!Number.isInteger(value)) e.value = "Use a whole number.";
  else if (f.kind === "percent" && value > 90) e.value = "A percentage discount can be at most 90%.";
  else if (f.kind === "fixed" && value > 10000) e.value = "A fixed discount can be at most 10,000 SAR.";
  const today = todayISO();
  if (!f.expiresAt) e.expiresAt = "Choose the last valid day.";
  else if (f.expiresAt < today && !editingId) e.expiresAt = "The last valid day cannot be in the past.";
  else if (f.expiresAt > addDaysISO(today, 365)) e.expiresAt = "Coupons can run for at most one year.";
  return e;
}

export const CouponsPage = () => {
  useDocumentTitle("Coupons");
  const data = useData();
  const user = useOwner();
  const toast = useToast();
  const loading = useSimulatedLoading();
  const stores = approvedOwnedStores(data, user.id).filter((s) => !s.disabled);
  const [storeId, setStoreId] = useStoreParam(stores);
  const [status, setStatus] = useState<"all" | CouponState>("all");
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);

  const ids = new Set(stores.map((s) => s.id));
  const all = data.coupons.filter((c) => ids.has(c.storeId) && (!storeId || c.storeId === storeId));
  const shown = all
    .filter((c) => status === "all" || couponState(c) === status)
    .sort((a, b) => ["live", "paused", "expired"].indexOf(couponState(a)) - ["live", "paused", "expired"].indexOf(couponState(b)) || a.expiresAt.localeCompare(b.expiresAt));
  const storeOf = (id: string) => stores.find((s) => s.id === id);

  const toggleActive = (c: Coupon) => {
    update((d) => {
      const x = d.coupons.find((y) => y.id === c.id);
      if (x) x.active = !x.active;
    });
    toast({ title: c.active ? `${c.code} paused` : `${c.code} is live again`, description: c.active ? "Shoppers no longer see it." : "Shoppers can copy it on your store page." });
  };

  const remove = () => {
    if (!deleting) return;
    const removed = deleting;
    update((d) => {
      d.coupons = d.coupons.filter((c) => c.id !== removed.id);
      d.featured = d.featured.filter((f) => f.couponId !== removed.id);
    });
    setDeleting(null);
    toast({
      title: `${removed.code} deleted`,
      action: { label: "Undo", onClick: () => update((d) => void d.coupons.push(removed)) },
    });
  };

  return (
    <PortalPage
      title="Coupons"
      subtitle="Offer discount codes on your store page. Paused and expired coupons are hidden from shoppers automatically."
      actions={
        stores.length > 0 ? (
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>
            New coupon
          </Button>
        ) : undefined
      }
    >
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <NoApprovedStores what="Coupons" />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Segmented<"all" | CouponState>
              label="Coupon status"
              className="sm:max-w-md"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: `All (${all.length})` },
                { value: "live", label: "Live" },
                { value: "paused", label: "Paused" },
                { value: "expired", label: "Expired" },
              ]}
            />
            <StoreFilter stores={stores} value={storeId} onChange={setStoreId} />
          </div>
          {stores.some((s) => s.listing !== "active" && (!storeId || s.id === storeId)) && (
            <Alert tone="warn" className="mt-4">
              Coupons of hidden stores are not shown to shoppers until the store is active again.
            </Alert>
          )}
          {shown.length === 0 ? (
            <EmptyState
              className="mt-6"
              icon={<Ticket />}
              title={all.length ? "No coupons with this status" : "No coupons yet"}
              action={
                <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>
                  Create a coupon
                </Button>
              }
            >
              {all.length ? "Try another filter." : "Coupons appear on your store page and can be featured by DealFinder on the Home page."}
            </EmptyState>
          ) : (
            <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {shown.map((c) => {
                const state = couponState(c);
                const store = storeOf(c.storeId);
                return (
                  <li key={c.id}>
                    <Card className={cn("flex h-full flex-col p-5", state !== "live" && "opacity-80")}>
                      <div className="flex items-start justify-between gap-3">
                        <span className="rounded-lg border border-dashed border-line-strong bg-surface-2 px-2.5 py-1 font-mono text-sm font-bold tracking-wider">{c.code}</span>
                        <div className="flex gap-1.5">
                          <Badge tone="ok">{couponValueLabel(c)}</Badge>
                          <Badge tone={COUPON_BADGE[state].tone}>{COUPON_BADGE[state].label}</Badge>
                        </div>
                      </div>
                      <h3 className="mt-4 font-semibold">{c.title}</h3>
                      {c.description && <p className="mt-1 text-sm text-muted">{c.description}</p>}
                      <p className="mt-3 text-xs text-subtle">
                        {store && stores.length > 1 && <>{store.name} · </>}
                        {expiryLabel(c.expiresAt)} · copied {plural(c.copies, "time")}
                      </p>
                      <div className="mt-auto flex flex-wrap gap-2 pt-4">
                        <Button size="sm" icon={<Pencil className="size-4" />} onClick={() => setEditing(c)}>
                          Edit
                        </Button>
                        {state !== "expired" && (
                          <Button size="sm" variant="ghost" icon={c.active ? <Pause className="size-4" /> : <Play className="size-4" />} onClick={() => toggleActive(c)}>
                            {c.active ? "Pause" : "Activate"}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="ml-auto text-bad hover:text-bad" icon={<Trash2 className="size-4" />} onClick={() => setDeleting(c)} aria-label={`Delete ${c.code}`}>
                          Delete
                        </Button>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {editing && (
        <CouponDialog
          coupon={editing === "new" ? null : editing}
          stores={stores}
          defaultStoreId={storeId || (stores.length === 1 ? stores[0].id : "")}
          onClose={() => setEditing(null)}
        />
      )}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        icon={<Trash2 />}
        title={`Delete coupon ${deleting?.code ?? ""}?`}
        description="Shoppers will no longer see it, and it is removed from any featured spot. Its copy count is lost."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} data-autofocus>
              Delete coupon
            </Button>
          </>
        }
      />
    </PortalPage>
  );
};

function CouponDialog({ coupon, stores, defaultStoreId, onClose }: { coupon: Coupon | null; stores: Store[]; defaultStoreId: string; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<CouponForm>(() =>
    coupon
      ? { storeId: coupon.storeId, code: coupon.code, title: coupon.title, description: coupon.description, kind: coupon.kind, value: String(coupon.value), expiresAt: coupon.expiresAt, active: coupon.active }
      : { storeId: defaultStoreId, code: "", title: "", description: "", kind: "percent", value: "", expiresAt: addDaysISO(todayISO(), 30), active: true },
  );
  const [errors, setErrors] = useState<CouponErrors>({});
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<CouponForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateCoupon(getData(), form, coupon?.id);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    await fakeRequest(500);
    const values = {
      storeId: form.storeId,
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      description: form.description.trim(),
      kind: form.kind,
      value: Number(form.value),
      expiresAt: form.expiresAt,
      active: form.active,
    };
    update((d) => {
      if (coupon) {
        const c = d.coupons.find((x) => x.id === coupon.id);
        if (c) Object.assign(c, values);
      } else {
        d.coupons.push({ id: `c-${Date.now()}`, copies: 0, createdAt: Date.now(), ...values });
      }
    });
    setSaving(false);
    toast({ title: coupon ? `${values.code} updated` : `${values.code} created`, description: values.active ? "It is live on your store page." : "It is saved as paused." });
    onClose();
  };

  const formId = "coupon-form";
  return (
    <Modal
      open
      onClose={() => !saving && onClose()}
      size="lg"
      icon={<Ticket />}
      title={coupon ? `Edit ${coupon.code}` : "New coupon"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={saving}>
            {coupon ? "Save changes" : "Create coupon"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
        {stores.length > 1 && (
          <Field label="Store" htmlFor="cp-store" required error={errors.storeId} className="sm:col-span-2">
            <Select id="cp-store" value={form.storeId} onChange={(e) => set({ storeId: e.target.value })} invalid={!!errors.storeId} disabled={!!coupon}>
              <option value="">Choose a store</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Code" htmlFor="cp-code" required error={errors.code} hint="Shoppers type this at checkout.">
          <Input id="cp-code" value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s/g, "") })} invalid={!!errors.code} maxLength={15} className="font-mono uppercase" data-autofocus />
        </Field>
        <Field label="Last valid day" htmlFor="cp-exp" required error={errors.expiresAt}>
          <Input id="cp-exp" type="date" value={form.expiresAt} min={todayISO()} max={addDaysISO(todayISO(), 365)} onChange={(e) => set({ expiresAt: e.target.value })} invalid={!!errors.expiresAt} />
        </Field>
        <Field label="Title" htmlFor="cp-title" required error={errors.title} className="sm:col-span-2">
          <Input id="cp-title" value={form.title} onChange={(e) => set({ title: e.target.value })} invalid={!!errors.title} maxLength={60} placeholder="15% off all lamps" />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Discount type</span>
          <Segmented<Coupon["kind"]>
            label="Discount type"
            value={form.kind}
            onChange={(kind) => set({ kind })}
            options={[
              { value: "percent", label: "Percent %" },
              { value: "fixed", label: "Fixed SAR" },
            ]}
          />
        </div>
        <Field label={form.kind === "percent" ? "Percent off" : "SAR off"} htmlFor="cp-value" required error={errors.value}>
          <Input id="cp-value" type="number" inputMode="numeric" min={1} value={form.value} onChange={(e) => set({ value: e.target.value })} invalid={!!errors.value} />
        </Field>
        <Field label="Conditions" htmlFor="cp-desc" error={errors.description} hint={`Optional, ${form.description.length}/160.`} className="sm:col-span-2">
          <TextArea id="cp-desc" value={form.description} onChange={(e) => set({ description: e.target.value })} maxLength={160} className="min-h-20" placeholder="Valid on orders above 200 SAR." />
        </Field>
        <Checkbox className="sm:col-span-2" checked={form.active} onChange={(active) => set({ active })} label="Show it to shoppers now" description="Turn off to save it as paused." />
      </form>
    </Modal>
  );
}

/* ==================================================================== */
/* Reviews and owner replies                                            */
/* ==================================================================== */

const REPORT_REASONS = ["Spam or fake", "Offensive or abusive", "Not about this store", "Contains personal information"];

function validateReply(text: string): string | null {
  const t = text.trim();
  if (t.length < 5) return "Write at least 5 characters.";
  if (t.length > 500) return "Keep the reply under 500 characters.";
  if (containsContactDetails(t)) return "Replies cannot contain links, emails or phone numbers.";
  return null;
}

export const ReviewsPage = () => {
  useDocumentTitle("Reviews");
  const data = useData();
  const user = useOwner();
  const [params, setParams] = useSearchParams();
  const loading = useSimulatedLoading();
  const stores = approvedOwnedStores(data, user.id);
  const [storeId, setStoreId] = useStoreParam(stores);
  const filter = (["all", "unanswered", "replied"].includes(params.get("filter") ?? "") ? params.get("filter") : "all") as "all" | "unanswered" | "replied";
  const [rating, setRating] = useState("");

  const scoped = stores.filter((s) => !storeId || s.id === storeId);
  const reviews = scoped.flatMap((s) => visibleReviews(data, s.id));
  const hiddenCount = data.reviews.filter((r) => scoped.some((s) => s.id === r.storeId) && r.status === "hidden").length;
  const shown = reviews
    .filter((r) => (filter === "unanswered" ? !r.reply : filter === "replied" ? !!r.reply : true))
    .filter((r) => !rating || r.rating === Number(rating))
    .sort((a, b) => b.createdAt - a.createdAt);
  const replied = reviews.filter((r) => r.reply).length;
  const ratingSummary = scoped.length === 1 ? storeRating(data, scoped[0]) : null;

  const setFilter = (f: string) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (f === "all") next.delete("filter");
        else next.set("filter", f);
        return next;
      },
      { replace: true },
    );

  return (
    <PortalPage title="Reviews" subtitle="Thank happy customers and answer concerns politely. Your replies are public on the store page.">
      {loading ? (
        <Skeleton className="h-72 rounded-2xl" />
      ) : stores.length === 0 ? (
        <NoApprovedStores what="Reviews" />
      ) : (
        <>
          <section aria-label="Review summary" className="grid gap-4 sm:grid-cols-3">
            <StatTile icon={<Star />} label={ratingSummary ? "Average rating" : "Written reviews"} value={ratingSummary ? (ratingSummary.average?.toFixed(1) ?? "-") : reviews.length} sub={ratingSummary ? `${formatNumber(ratingSummary.count)} ratings` : `${plural(scoped.length, "store")}`} />
            <StatTile icon={<MessageSquare />} label="Reply rate" value={reviews.length ? `${Math.round((replied / reviews.length) * 100)}%` : "-"} sub={`${replied} of ${reviews.length} answered`} />
            <StatTile icon={<Flag />} label="Hidden by moderators" value={hiddenCount} sub="Not shown to shoppers" />
          </section>
          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Segmented
              label="Reply filter"
              className="lg:max-w-md"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All" },
                { value: "unanswered", label: `Needs reply (${reviews.length - replied})` },
                { value: "replied", label: "Replied" },
              ]}
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="sm:w-40">
                <label htmlFor="rating-filter" className="sr-only">
                  Stars
                </label>
                <Select id="rating-filter" value={rating} onChange={(e) => setRating(e.target.value)}>
                  <option value="">All ratings</option>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "star" : "stars"}
                    </option>
                  ))}
                </Select>
              </div>
              <StoreFilter stores={stores} value={storeId} onChange={setStoreId} />
            </div>
          </div>
          {shown.length === 0 ? (
            <EmptyState className="mt-6" icon={<MessageSquare />} title={reviews.length ? "No reviews match these filters" : "No reviews yet"}>
              {reviews.length ? (filter === "unanswered" ? "You have replied to every review. Nice work!" : "Try another filter.") : "Reviews from shoppers will appear here."}
            </EmptyState>
          ) : (
            <Card className="mt-6 px-5">
              {shown.map((r) => (
                <OwnerReview key={r.id} review={r} store={stores.find((s) => s.id === r.storeId)!} showStore={scoped.length > 1} />
              ))}
            </Card>
          )}
        </>
      )}
    </PortalPage>
  );
};

function OwnerReview({ review, store, showStore }: { review: Review; store: Store; showStore: boolean }) {
  const user = useOwner();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(review.reply?.text ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reporting, setReporting] = useState(false);
  const reported = review.flags.some((f) => f.by === user.id);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const err = validateReply(text);
    setError(err);
    if (err) return;
    setSaving(true);
    await fakeRequest(400);
    update((d) => {
      const r = d.reviews.find((x) => x.id === review.id);
      if (r) r.reply = { text: text.trim(), at: Date.now() };
    });
    setSaving(false);
    setEditing(false);
    toast({ title: review.reply ? "Reply updated" : "Reply posted", description: "It is shown under the review on your store page." });
  };

  const deleteReply = () => {
    update((d) => {
      const r = d.reviews.find((x) => x.id === review.id);
      if (r) delete r.reply;
    });
    setConfirmDelete(false);
    setText("");
    toast({ title: "Reply deleted" });
  };

  return (
    <div>
      {showStore && (
        <p className="flex items-center gap-2 pt-4 text-xs font-semibold text-muted">
          <StoreLogo store={store} size="sm" className="size-5 rounded text-[0.5rem]" />
          {store.name}
        </p>
      )}
      <ReviewItem
        review={editing ? { ...review, reply: undefined } : review}
        storeName={store.name}
        actions={
          editing ? undefined : (
            <>
              <Button size="sm" variant="ghost" icon={review.reply ? <Pencil className="size-4" /> : <MessageSquare className="size-4" />} onClick={() => setEditing(true)}>
                {review.reply ? "Edit reply" : "Reply"}
              </Button>
              {review.reply && (
                <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>
                  Delete reply
                </Button>
              )}
              <Button size="sm" variant="ghost" icon={<Flag className="size-4" />} onClick={() => setReporting(true)} disabled={reported} title={reported ? "You already reported this review" : undefined}>
                {reported ? "Reported" : "Report"}
              </Button>
            </>
          )
        }
      />
      {editing && (
        <form onSubmit={save} noValidate className="-mt-2 mb-5 sm:pl-13">
          <Field label={`Reply as ${store.name}`} htmlFor={`reply-${review.id}`} error={error} hint={`${text.trim().length}/500. Be polite; no links or phone numbers.`}>
            <TextArea id={`reply-${review.id}`} value={text} onChange={(e) => setText(e.target.value)} invalid={!!error} maxLength={500} autoFocus />
          </Field>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setError(null);
                setText(review.reply?.text ?? "");
              }}
            >
              Cancel
            </Button>
            <Button size="sm" type="submit" variant="primary" loading={saving} icon={<Send className="size-4" />}>
              {review.reply ? "Update reply" : "Post reply"}
            </Button>
          </div>
        </form>
      )}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        icon={<Trash2 />}
        title="Delete your reply?"
        description="The review stays on your store page without your answer."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={deleteReply} data-autofocus>
              Delete reply
            </Button>
          </>
        }
      />
      {reporting && <ReportDialog review={review} onClose={() => setReporting(false)} />}
    </div>
  );
}

function ReportDialog({ review, onClose }: { review: Review; onClose: () => void }) {
  const user = useOwner();
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!reason) return setError("Choose a reason.");
    update((d) => {
      const r = d.reviews.find((x) => x.id === review.id);
      if (r && !r.flags.some((f) => f.by === user.id)) r.flags.push({ by: user.id, byRole: "owner", reason, note: note.trim() || undefined, at: Date.now() });
      notifyAdmins(d, "A review was reported", `${reason} · by a store owner`, "/admin/moderation");
    });
    toast({ title: "Review reported", description: "A moderator will check it. It stays visible until then." });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      icon={<Flag />}
      title="Report this review"
      description="Reviews are only removed if they break the review rules. A bad rating alone is not a reason."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            Send report
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Reason" htmlFor="report-reason" required error={error}>
          <Select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)} invalid={!!error} data-autofocus>
            <option value="">Choose a reason</option>
            {REPORT_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Field label="Details for the moderator" htmlFor="report-note" hint="Optional.">
          <TextArea id="report-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="min-h-20" />
        </Field>
      </div>
    </Modal>
  );
}

/* ==================================================================== */
/* Owner analytics                                                       */
/* ==================================================================== */

type Range = "7" | "30" | "90";

/** Daily visit bars with an accessible data table. */
function VisitsChart({ series }: { series: Array<{ date: string; value: number }> }) {
  const max = Math.max(1, ...series.map((p) => p.value));
  const [active, setActive] = useState<number | null>(null);
  const point = active !== null ? series[active] : null;
  return (
    <div>
      <div className="flex h-6 items-center text-sm text-muted" aria-live="polite">
        {point ? (
          <>
            <span className="font-semibold text-fg">{formatNumber(point.value)} visits</span>&nbsp;on {formatDate(point.date)}
          </>
        ) : (
          "Hover or tap a bar for details"
        )}
      </div>
      <div className="mt-3 flex h-48 items-end gap-px sm:gap-0.5" role="img" aria-label={`Daily website visits, highest ${formatNumber(max)}`}>
        {series.map((p, i) => (
          <button
            key={p.date}
            type="button"
            aria-label={`${formatDate(p.date)}: ${p.value} visits`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className="group flex h-full flex-1 items-end"
            tabIndex={series.length > 31 ? -1 : 0}
          >
            <span
              className={cn("w-full rounded-t-sm transition-colors", active === i ? "bg-brand-text" : "bg-brand/70 group-hover:bg-brand")}
              style={{ height: `${Math.max(2, (p.value / max) * 100)}%` }}
            />
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-subtle">
        <span>{formatDate(series[0].date)}</span>
        <span>{formatDate(series[series.length - 1].date)}</span>
      </div>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-semibold text-brand-text">Show as table</summary>
        <div className="mt-3 max-h-60 overflow-y-auto rounded-xl border border-line">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-surface-2 text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 text-right font-semibold">Visits</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((p) => (
                <tr key={p.date} className="border-t border-line">
                  <td className="px-3 py-1.5">{formatDate(p.date)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{p.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export const AnalyticsPage = () => {
  useDocumentTitle("Analytics");
  const data = useData();
  const user = useOwner();
  const loading = useSimulatedLoading();
  const stores = approvedOwnedStores(data, user.id);
  const [storeId, setStoreId] = useStoreParam(stores);
  const [range, setRange] = useState<Range>("30");
  const days = Number(range);
  const scoped = stores.filter((s) => !storeId || s.id === storeId);

  const series = useMemo(() => {
    const today = todayISO();
    return Array.from({ length: days }, (_, i) => {
      const date = addDaysISO(today, i - days + 1);
      return { date, value: scoped.reduce((sum, s) => sum + (data.clicks[s.id]?.[date] ?? 0), 0) };
    });
  }, [data.clicks, days, scoped]);

  const total = series.reduce((s, p) => s + p.value, 0);
  const prev = scoped.reduce((sum, s) => sum + visitsInRange(data, s.id, days, days), 0);
  const change = prev ? Math.round(((total - prev) / prev) * 100) : null;
  const best = series.reduce((a, b) => (b.value > a.value ? b : a), series[0]);
  const coupons = data.coupons.filter((c) => scoped.some((s) => s.id === c.storeId));
  const since = Date.now() - days * 86_400_000;
  const newReviews = data.reviews.filter((r) => scoped.some((s) => s.id === r.storeId) && r.status === "visible" && r.createdAt >= since).length;

  return (
    <PortalPage
      title="Analytics"
      subtitle="How many shoppers DealFinder sends to your website, and how your coupons and reviews are doing."
      actions={stores.length ? <Segmented<Range> label="Date range" className="w-full sm:w-72" value={range} onChange={setRange} options={[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }]} /> : undefined}
    >
      {loading ? (
        <div className="space-y-4" aria-hidden>
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : stores.length === 0 ? (
        <NoApprovedStores what="Analytics" />
      ) : (
        <div className="space-y-6">
          <div className="flex justify-end">
            <StoreFilter stores={stores} value={storeId} onChange={setStoreId} />
          </div>
          <section aria-label="Totals" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={<MousePointerClick />}
              label={`Website visits (${days} days)`}
              value={compactNumber(total)}
              sub={change === null ? "No earlier data" : <span className={change >= 0 ? "text-ok" : "text-bad"}>{change >= 0 ? "+" : ""}{change}% vs previous {days} days</span>}
            />
            <StatTile icon={<BarChart3 />} label="Best day" value={formatNumber(best.value)} sub={formatDate(best.date)} />
            <StatTile icon={<Ticket />} label="Coupon copies (all time)" value={formatNumber(coupons.reduce((s, c) => s + c.copies, 0))} sub={`${plural(coupons.filter((c) => isCouponLive(c)).length, "live coupon")}`} />
            <StatTile icon={<Star />} label={`New reviews (${days} days)`} value={newReviews} sub="Visible written reviews" />
          </section>

          <Card as="section" aria-labelledby="visits-title" className="p-6">
            <h2 id="visits-title" className="text-lg font-semibold">
              Daily website visits
            </h2>
            <p className="text-sm text-muted">Each visit is a shopper pressing “Visit official website” on DealFinder.</p>
            <div className="mt-4">
              <VisitsChart series={series} />
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card as="section" aria-labelledby="by-store-title" className="overflow-hidden">
              <h2 id="by-store-title" className="px-6 pt-6 text-lg font-semibold">
                By store
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead className="bg-surface-2 text-xs text-muted">
                    <tr>
                      <th className="px-6 py-2.5 font-semibold">Store</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Visits</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Rating</th>
                      <th className="px-6 py-2.5 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoped.map((s) => {
                      const r = storeRating(data, s);
                      return (
                        <tr key={s.id} className="border-t border-line">
                          <td className="px-6 py-3">
                            <Link to={`/portal/stores/${s.id}`} className="flex items-center gap-2 font-medium hover:text-brand-text">
                              <StoreLogo store={s} size="sm" />
                              {s.name}
                            </Link>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">{formatNumber(visitsInRange(data, s.id, days))}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{r.average?.toFixed(1) ?? "-"}</td>
                          <td className="px-6 py-3 text-right capitalize text-muted">{s.disabled ? "Disabled" : s.listing}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card as="section" aria-labelledby="coupon-title" className="overflow-hidden">
              <h2 id="coupon-title" className="px-6 pt-6 text-lg font-semibold">
                Coupons by copies
              </h2>
              {coupons.length === 0 ? (
                <p className="px-6 py-6 text-sm text-muted">
                  No coupons yet.{" "}
                  <Link to="/portal/coupons" className="font-semibold text-brand-text hover:underline">
                    Create one
                  </Link>
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-line">
                  {[...coupons]
                    .sort((a, b) => b.copies - a.copies)
                    .slice(0, 6)
                    .map((c) => {
                      const top = Math.max(1, ...coupons.map((x) => x.copies));
                      return (
                        <li key={c.id} className="px-6 py-3">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-mono font-semibold">{c.code}</span>
                            <span className="tabular-nums text-muted">{formatNumber(c.copies)}</span>
                          </div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-surface-3">
                            <div className="h-full rounded-full bg-ok" style={{ width: `${(c.copies / top) * 100}%` }} />
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </PortalPage>
  );
};

/* ==================================================================== */
/* Platform support (W13, FR16)                                         */
/* ==================================================================== */

const TOPICS = ["Verification", "Listing", "Ownership", "Coupons", "Reviews", "Account", "Other"];

const TICKET_BADGE: Record<SupportTicket["status"], { label: string; tone: "brand" | "ok" | "neutral" }> = {
  open: { label: "Waiting for support", tone: "brand" },
  answered: { label: "Answered", tone: "ok" },
  closed: { label: "Closed", tone: "neutral" },
};

export const SupportPage = () => {
  useDocumentTitle("Platform support");
  const data = useData();
  const user = useOwner();
  const [status, setStatus] = useState<"all" | SupportTicket["status"]>("all");
  const tickets = data.tickets.filter((t) => t.ownerId === user.id).sort((a, b) => b.updatedAt - a.updatedAt);
  const shown = tickets.filter((t) => status === "all" || t.status === status);

  return (
    <PortalPage
      title="Platform support"
      subtitle="Ask the DealFinder team about verification, listings, coupons or your account. We reply within one working day."
      actions={
        <Button to="/portal/support/new" variant="primary" icon={<Plus className="size-4" />}>
          New request
        </Button>
      }
    >
      {tickets.length === 0 ? (
        <EmptyState icon={<LifeBuoy />} title="No support requests yet" action={<Button to="/portal/support/new" variant="primary">Ask a question</Button>}>
          If something is unclear or not working, send us a request and follow the conversation here.
        </EmptyState>
      ) : (
        <>
          <Segmented<"all" | SupportTicket["status"]>
            label="Request status"
            className="sm:max-w-lg"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: `All (${tickets.length})` },
              { value: "open", label: "Waiting" },
              { value: "answered", label: "Answered" },
              { value: "closed", label: "Closed" },
            ]}
          />
          {shown.length === 0 ? (
            <EmptyState className="mt-6" icon={<LifeBuoy />} title="No requests with this status" action={<Button onClick={() => setStatus("all")}>Show all</Button>} />
          ) : (
            <Card className="mt-6 divide-y divide-line">
              {shown.map((t) => {
                const store = data.stores.find((s) => s.id === t.storeId);
                const last = t.messages[t.messages.length - 1];
                return (
                  <Link key={t.id} to={`/portal/support/${t.id}`} className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-surface-2">
                    <span className={cn("mt-2 size-2 shrink-0 rounded-full", t.ownerUnread ? "bg-brand-text" : "bg-transparent")} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className={cn("font-semibold", t.ownerUnread && "text-brand-text")}>{t.subject}</span>
                        <Badge tone={TICKET_BADGE[t.status].tone}>{TICKET_BADGE[t.status].label}</Badge>
                        {t.ownerUnread && <span className="sr-only">New reply</span>}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted">
                        {last.from === "admin" ? `${last.name}: ` : "You: "}
                        {last.text}
                      </p>
                      <p className="mt-1 text-xs text-subtle">
                        {t.ref} · {t.topic}
                        {store && ` · ${store.name}`} · {timeAgo(t.updatedAt)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </Card>
          )}
        </>
      )}
    </PortalPage>
  );
};

export const NewTicketPage = () => {
  useDocumentTitle("New support request");
  const data = useData();
  const user = useOwner();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const stores = ownedStores(data, user.id);
  const ref = params.get("ref");
  const [form, setForm] = useState(() => ({
    topic: TOPICS.includes(params.get("topic") ?? "") ? (params.get("topic") as string) : "",
    storeId: stores.some((s) => s.id === params.get("store")) ? (params.get("store") as string) : "",
    subject: ref ? `Question about ${ref}` : "",
    message: "",
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [sending, setSending] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!form.topic) errs.topic = "Choose a topic so the right person answers.";
    if (form.subject.trim().length < 5) errs.subject = "Write a short subject (at least 5 characters).";
    else if (form.subject.trim().length > 80) errs.subject = "Keep the subject under 80 characters.";
    if (form.message.trim().length < 20) errs.message = `Describe the problem in at least 20 characters (${form.message.trim().length}/20).`;
    else if (form.message.trim().length > 1000) errs.message = "Keep the message under 1000 characters.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSending(true);
    await fakeRequest(700);
    const num = nextNumber();
    const id = `t-${num}`;
    const now = Date.now();
    update((d) => {
      d.tickets.push({
        id,
        ref: `SUP-${num}`,
        ownerId: user.id,
        storeId: form.storeId || undefined,
        subject: form.subject.trim(),
        topic: form.topic,
        status: "open",
        messages: [{ id: `m-${now}`, from: "owner", name: user.name, text: form.message.trim(), at: now }],
        ownerUnread: false,
        adminUnread: true,
        createdAt: now,
        updatedAt: now,
      });
      notifyAdmins(d, "New support request", `SUP-${num} · ${form.subject.trim()}`, "/admin/support");
    });
    setSending(false);
    toast({ title: `Request SUP-${num} sent`, description: "You will get a notification when we reply." });
    navigate(`/portal/support/${id}`);
  };

  return (
    <PortalPage title="New support request" subtitle="Tell us what you need. Please do not share passwords.">
      <Card className="mx-auto max-w-2xl p-6 sm:p-8">
        <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
          <Field label="Topic" htmlFor="tk-topic" required error={errors.topic}>
            <Select id="tk-topic" value={form.topic} onChange={(e) => set({ topic: e.target.value })} invalid={!!errors.topic}>
              <option value="">Choose a topic</option>
              {TOPICS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Store" htmlFor="tk-store" hint="Optional.">
            <Select id="tk-store" value={form.storeId} onChange={(e) => set({ storeId: e.target.value })}>
              <option value="">Not about a specific store</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Subject" htmlFor="tk-subject" required error={errors.subject} className="sm:col-span-2">
            <Input id="tk-subject" value={form.subject} onChange={(e) => set({ subject: e.target.value })} invalid={!!errors.subject} maxLength={80} />
          </Field>
          <Field label="Message" htmlFor="tk-message" required error={errors.message} hint={`${form.message.trim().length}/1000`} className="sm:col-span-2">
            <TextArea id="tk-message" value={form.message} onChange={(e) => set({ message: e.target.value })} invalid={!!errors.message} maxLength={1000} className="min-h-40" />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button to="/portal/support" variant="ghost">
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={sending} icon={<Send className="size-4" />}>
              Send request
            </Button>
          </div>
        </form>
      </Card>
    </PortalPage>
  );
};

export const TicketPage = () => {
  const { ticketId } = useParams();
  const data = useData();
  const user = useOwner();
  const ticket = data.tickets.find((t) => t.id === ticketId && t.ownerId === user.id);
  useDocumentTitle(ticket ? ticket.subject : "Support request");
  if (!ticket) return <NotYoursState what="Support request" back="/portal/support" backLabel="Back to support" />;
  return <TicketView key={ticket.id} ticket={ticket} />;
};

function TicketView({ ticket }: { ticket: SupportTicket }) {
  const data = useData();
  const user = useOwner();
  const toast = useToast();
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const store = data.stores.find((s) => s.id === ticket.storeId);

  // Opening the conversation marks the administrator's reply as read.
  useEffect(() => {
    if (!ticket.ownerUnread) return;
    update((d) => {
      const t = d.tickets.find((x) => x.id === ticket.id);
      if (t) t.ownerUnread = false;
      d.notifications.forEach((n) => {
        if (n.userId === user.id && n.link === `/portal/support/${ticket.id}`) n.read = true;
      });
    });
  }, [ticket.id, ticket.ownerUnread, user.id]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const t = reply.trim();
    if (t.length < 2) return setError("Write a message first.");
    if (t.length > 1000) return setError("Keep the message under 1000 characters.");
    setError(null);
    setSending(true);
    await fakeRequest(500);
    const now = Date.now();
    update((d) => {
      const x = d.tickets.find((y) => y.id === ticket.id);
      if (!x) return;
      x.messages.push({ id: `m-${now}`, from: "owner", name: user.name, text: t, at: now });
      x.status = "open";
      x.adminUnread = true;
      x.updatedAt = now;
    });
    setSending(false);
    setReply("");
    toast({ title: ticket.status === "closed" ? "Request reopened and message sent" : "Message sent" });
    window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
  };

  const close = () => {
    update((d) => {
      const x = d.tickets.find((y) => y.id === ticket.id);
      if (x) {
        x.status = "closed";
        x.updatedAt = Date.now();
      }
    });
    setConfirmClose(false);
    toast({ title: `${ticket.ref} closed`, description: "Reply any time to reopen it." });
  };

  return (
    <PortalPage
      eyebrow={
        <Link to="/portal/support" className="hover:underline">
          Store Portal / Platform support
        </Link>
      }
      title={ticket.subject}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone={TICKET_BADGE[ticket.status].tone}>{TICKET_BADGE[ticket.status].label}</Badge>
          <span className="text-sm">
            {ticket.ref} · {ticket.topic}
            {store && ` · ${store.name}`} · opened {formatDate(ticket.createdAt)}
          </span>
        </span>
      }
      actions={
        ticket.status !== "closed" ? (
          <Button variant="ghost" icon={<X className="size-4" />} onClick={() => setConfirmClose(true)}>
            Close request
          </Button>
        ) : undefined
      }
    >
      <div className="mx-auto max-w-3xl">
        <ol className="space-y-4" aria-label="Conversation">
          {ticket.messages.map((m) => {
            const mine = m.from === "owner";
            return (
              <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%]", mine ? "rounded-br-md bg-brand-soft" : "rounded-bl-md border border-line bg-surface")}>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs">
                    <span className={cn("font-semibold", mine ? "text-brand-text" : "text-fg")}>{mine ? "You" : m.name}</span>
                    {!mine && <Badge tone="ok">DealFinder team</Badge>}
                    <time className="text-subtle" title={formatDate(m.at)}>
                      {timeAgo(m.at)}
                    </time>
                  </p>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed">{m.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <div ref={endRef} />

        {ticket.status === "closed" && (
          <Alert tone="brand" className="mt-6">
            This request is closed. Sending a message reopens it.
          </Alert>
        )}
        <Card className="mt-6 p-5">
          <form onSubmit={send} noValidate>
            <Field label="Your reply" htmlFor="tk-reply" error={error} hint={`${reply.trim().length}/1000`}>
              <TextArea id="tk-reply" value={reply} onChange={(e) => setReply(e.target.value)} invalid={!!error} maxLength={1000} />
            </Field>
            <div className="mt-3 flex justify-end">
              <Button type="submit" variant="primary" loading={sending} icon={<Send className="size-4" />}>
                {ticket.status === "closed" ? "Reopen and send" : "Send"}
              </Button>
            </div>
          </form>
        </Card>
        {ticket.status === "answered" && (
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
            <CircleCheck className="size-4 text-ok" aria-hidden />
            Problem solved?
            <button type="button" className="font-semibold text-brand-text hover:underline" onClick={() => setConfirmClose(true)}>
              Close the request
            </button>
          </p>
        )}
      </div>

      <Modal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        icon={<LifeBuoy />}
        title={`Close ${ticket.ref}?`}
        description="We will stop following it. You can reopen it later by sending a new message."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClose(false)}>
              Keep open
            </Button>
            <Button variant="primary" onClick={close} data-autofocus>
              Close request
            </Button>
          </>
        }
      />
    </PortalPage>
  );
}
