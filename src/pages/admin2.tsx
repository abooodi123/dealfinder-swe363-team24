/**
 * Administrator tools - Member 4 (Administrator Portal and Quality).
 *
 *   AdminCategoriesPage   W16  FR21  Add, rename, reorder, hide / show and delete categories
 *   AdminModerationPage   W17  FR22  Reported reviews: Keep, Hide with a reason, Restore, Delete
 *   AdminFeaturedPage     W18  FR23  Schedule featured stores and coupons for Home and Explore
 *   AdminAnalyticsPage    W19  FR24  Referral visits by date range and category, CSV export
 *   AdminSupportPage           FR16  Answer store owners' support requests (admin side)
 *   AdminSectionPage                 Unknown /admin/... address
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CircleCheck,
  Download,
  Eye,
  EyeOff,
  Flag,
  Inbox,
  Megaphone,
  MessageSquareText,
  Pencil,
  Plus,
  RotateCcw,
  SearchX,
  Send,
  Tags,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import type { AppData, Category, CategoryIconName, FeaturedSlot, Review, Store } from "../lib/types";
import { addDaysISO, cn, compactNumber, daysUntil, formatDate, formatNumber, plural, timeAgo, toISODate, todayISO } from "../lib/format";
import { useDebouncedValue, useDocumentTitle, useSimulatedLoading } from "../lib/hooks";
import { getData, update, useCurrentUser, useData } from "../lib/store";
import { couponValueLabel, getCategory, getStore, isActiveStore, isCouponLive, storeRating } from "../lib/selectors";
import { Alert, Badge, Button, Card, EmptyState, Field, IconButton, Input, Modal, SearchInput, Segmented, Select, Skeleton, TextArea, useToast } from "../ui/kit";
import { CATEGORY_ICON_NAMES, CategoryIcon, RatingInline, ReviewItem, StoreLogo } from "../ui/shared";
import { AdminShell, ConfirmModal, ListSkeleton, logActivity, newId, notifyUser, storeState, useBusy, visitsBetween } from "./admin";

const useAdminName = () => useCurrentUser()?.name ?? "Administrator";

/* ===================================================================== */
/* Categories (W16, FR21)                                                 */
/* ===================================================================== */

function validateCategoryName(name: string, data: AppData, editingId?: string): string | null {
  const v = name.trim();
  if (v.length < 2) return "Enter a name of at least 2 characters.";
  if (v.length > 40) return "Use 40 characters or fewer.";
  if (data.categories.some((c) => c.id !== editingId && c.name.toLowerCase() === v.toLowerCase())) return "A category with this name already exists.";
  return null;
}

function categoryIdFor(name: string, data: AppData): string {
  const base = name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "category";
  let id = base;
  for (let n = 2; data.categories.some((c) => c.id === id); n++) id = `${base}-${n}`;
  return id;
}

/** Add / rename dialog with an icon picker. */
function CategoryDialog({ open, category, onClose }: { open: boolean; category: Category | null; onClose: () => void }) {
  const admin = useAdminName();
  const toast = useToast();
  const [busy, run] = useBusy(350);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<CategoryIconName>("Tag");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setIcon(category?.icon ?? "Tag");
    setError(null);
  }, [open, category]);

  const save = (e?: FormEvent) => {
    e?.preventDefault();
    const err = validateCategoryName(name, getData(), category?.id);
    setError(err);
    if (err) return;
    const clean = name.trim();
    run(() => {
      update((d) => {
        if (category) {
          const c = d.categories.find((x) => x.id === category.id);
          if (!c) return;
          if (c.name !== clean) logActivity(d, admin, `Renamed the category ${c.name} to ${clean}`);
          c.name = clean;
          c.icon = icon;
        } else {
          d.categories.push({ id: categoryIdFor(clean, d), name: clean, icon, hidden: false });
          logActivity(d, admin, `Added the category ${clean}`);
        }
      });
      toast({ title: category ? "Category saved" : `${clean} added`, description: category ? undefined : "It appears on Home and in the Explore filter." });
      onClose();
    });
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      icon={<Tags />}
      title={category ? `Edit ${category.name}` : "Add a category"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => save()} loading={busy}>
            {category ? "Save" : "Add category"}
          </Button>
        </>
      }
    >
      <form onSubmit={save} noValidate className="space-y-5">
        <Field label="Name" htmlFor="category-name" error={error} hint="Shoppers see this on Home and in the Explore filter." required>
          <Input
            id="category-name"
            value={name}
            invalid={!!error}
            maxLength={50}
            data-autofocus
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Icon</legend>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
            {CATEGORY_ICON_NAMES.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={icon === n}
                aria-label={`Icon ${n}`}
                title={n}
                onClick={() => setIcon(n)}
                className={cn(
                  "flex h-11 items-center justify-center rounded-xl border transition-colors",
                  icon === n ? "border-brand bg-brand text-white" : "border-line bg-surface-2 text-muted hover:border-line-strong hover:text-fg",
                )}
              >
                <CategoryIcon name={n} className="size-5" />
              </button>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

export function AdminCategoriesPage() {
  useDocumentTitle("Categories");
  const data = useData();
  const admin = useAdminName();
  const toast = useToast();
  const loading = useSimulatedLoading(300);
  const [busy, run] = useBusy(350);
  const [editing, setEditing] = useState<Category | null>(null);
  const [adding, setAdding] = useState(false);
  const [hiding, setHiding] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [moveTo, setMoveTo] = useState("");
  const [moveError, setMoveError] = useState<string | null>(null);

  const counts = (id: string) => {
    const inCat = data.stores.filter((s) => s.categoryId === id);
    return { all: inCat.length, live: inCat.filter((s) => storeState(s) === "live" || storeState(s) === "closed").length };
  };

  const move = (index: number, delta: -1 | 1) =>
    update((d) => {
      const target = index + delta;
      if (target < 0 || target >= d.categories.length) return;
      [d.categories[index], d.categories[target]] = [d.categories[target], d.categories[index]];
    });

  const setHidden = (c: Category, hidden: boolean) =>
    update((d) => {
      const x = d.categories.find((y) => y.id === c.id);
      if (!x) return;
      x.hidden = hidden;
      logActivity(d, admin, `${hidden ? "Hid" : "Showed"} the category ${c.name}`);
    });

  const confirmHide = () => {
    if (!hiding) return;
    const c = hiding;
    run(() => {
      setHidden(c, true);
      setHiding(null);
      toast({ title: `${c.name} is hidden`, action: { label: "Undo", onClick: () => setHidden(c, false) } });
    });
  };

  const openDelete = (c: Category) => {
    setDeleting(c);
    setMoveTo("");
    setMoveError(null);
  };
  const confirmDelete = () => {
    if (!deleting) return;
    const c = deleting;
    const n = counts(c.id).all;
    if (n > 0 && !moveTo) {
      setMoveError("Choose where these stores should go.");
      return;
    }
    run(() => {
      update((d) => {
        const target = d.categories.find((x) => x.id === moveTo);
        d.stores.forEach((s) => {
          if (s.categoryId === c.id && target) s.categoryId = target.id;
        });
        d.categories = d.categories.filter((x) => x.id !== c.id);
        logActivity(d, admin, `Deleted the category ${c.name}${n && target ? ` and moved ${plural(n, "store")} to ${target.name}` : ""}`);
      });
      setDeleting(null);
      toast({ title: `${c.name} deleted`, description: n ? `${plural(n, "store")} moved.` : undefined });
    });
  };

  return (
    <AdminShell
      title="Categories"
      subtitle="The order here is the order shoppers see on Home and in the Explore filter."
      actions={
        <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
          Add category
        </Button>
      }
    >
      {loading ? (
        <ListSkeleton rows={6} />
      ) : data.categories.length === 0 ? (
        <EmptyState icon={<Tags />} title="No categories yet" action={<Button variant="primary" onClick={() => setAdding(true)}>Add the first category</Button>}>
          Stores need a category before shoppers can browse them.
        </EmptyState>
      ) : (
        <Card as="section" aria-label="Categories">
          <ol className="divide-y divide-line">
            {data.categories.map((c, i) => {
              const n = counts(c.id);
              return (
                <li key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <span className="w-6 text-center text-sm font-semibold text-subtle">{i + 1}</span>
                    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", c.hidden ? "bg-surface-3 text-subtle" : "bg-brand-soft text-brand-text")}>
                      <CategoryIcon name={c.icon} className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {c.name}
                        {c.hidden && <Badge icon={<EyeOff className="size-3" aria-hidden />}>Hidden</Badge>}
                      </p>
                      <p className="text-sm text-muted">
                        {plural(n.all, "store")} · {n.live} public
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 pl-10 sm:pl-0">
                    <IconButton label={`Move ${c.name} up`} size="sm" disabled={i === 0} className="disabled:opacity-30" onClick={() => move(i, -1)}>
                      <ArrowUp className="size-4" />
                    </IconButton>
                    <IconButton label={`Move ${c.name} down`} size="sm" disabled={i === data.categories.length - 1} className="disabled:opacity-30" onClick={() => move(i, 1)}>
                      <ArrowDown className="size-4" />
                    </IconButton>
                    <Button size="sm" variant="ghost" icon={<Pencil className="size-4" />} onClick={() => setEditing(c)}>
                      Edit
                    </Button>
                    {c.hidden ? (
                      <Button
                        size="sm"
                        variant="soft"
                        icon={<Eye className="size-4" />}
                        onClick={() => {
                          setHidden(c, false);
                          toast({ title: `${c.name} is visible again` });
                        }}
                      >
                        Show
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" icon={<EyeOff className="size-4" />} onClick={() => setHiding(c)}>
                        Hide
                      </Button>
                    )}
                    <IconButton label={`Delete ${c.name}`} size="sm" className="hover:bg-bad-soft hover:text-bad" onClick={() => openDelete(c)}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      <CategoryDialog open={adding || !!editing} category={editing} onClose={() => (setAdding(false), setEditing(null))} />

      <ConfirmModal
        open={!!hiding}
        onClose={() => setHiding(null)}
        busy={busy}
        icon={<EyeOff />}
        title={`Hide ${hiding?.name}?`}
        description={`The category tile and filter disappear for shoppers. Its ${plural(hiding ? counts(hiding.id).all : 0, "store")} stay listed and can still be found by search. You can show it again at any time.`}
        confirmLabel="Hide category"
        onConfirm={confirmHide}
      />

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        busy={busy}
        tone="danger"
        icon={<Trash2 />}
        title={`Delete ${deleting?.name}?`}
        description={
          deleting && counts(deleting.id).all > 0
            ? `${plural(counts(deleting.id).all, "store")} use this category. Choose a category to move them to before deleting.`
            : "No stores use this category. This cannot be undone."
        }
        confirmLabel="Delete category"
        onConfirm={confirmDelete}
      >
        {deleting && counts(deleting.id).all > 0 && (
          <Field label="Move stores to" htmlFor="move-to" error={moveError} required>
            <Select
              id="move-to"
              value={moveTo}
              invalid={!!moveError}
              onChange={(e) => {
                setMoveTo(e.target.value);
                setMoveError(null);
              }}
            >
              <option value="">Choose a category</option>
              {data.categories
                .filter((c) => c.id !== deleting.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.hidden ? " (hidden)" : ""}
                  </option>
                ))}
            </Select>
          </Field>
        )}
      </ConfirmModal>
    </AdminShell>
  );
}

/* ===================================================================== */
/* Review moderation (W17, FR22)                                          */
/* ===================================================================== */

const HIDE_REASONS = ["Spam or advertising", "Offensive or abusive language", "Contains contact details or links", "Not about this store", "Fake or conflict of interest"];

/** Pre-select the hide reason that matches the most common report ("Spam or fake" -> "Spam or advertising"). */
function suggestedHideReason(r: Review): string {
  const first = r.flags[0]?.reason.toLowerCase() ?? "";
  return HIDE_REASONS.find((x) => first && x.toLowerCase().startsWith(first.split(" ")[0])) ?? HIDE_REASONS[0];
}

/**
 * A review imported with the store's rating history (`inBase`) is part of baseRating/baseCount.
 * Before hiding or deleting it we take it out of that history, so the average changes right away.
 */
function takeOutOfBase(d: AppData, r: Review) {
  if (!r.inBase) return;
  const s = d.stores.find((x) => x.id === r.storeId);
  if (s && s.baseCount > 0) {
    const total = s.baseRating * s.baseCount - r.rating;
    s.baseCount -= 1;
    s.baseRating = s.baseCount > 0 ? Math.max(0, total / s.baseCount) : 0;
  }
  r.inBase = false;
}

/** The store's average after hiding (or deleting) one review, for the confirmation dialog. */
function averageWithout(data: AppData, review: Review): number | null {
  const store = getStore(data, review.storeId);
  if (!store) return null;
  const draft = structuredClone(data);
  const r = draft.reviews.find((x) => x.id === review.id)!;
  takeOutOfBase(draft, r);
  r.status = "hidden";
  return storeRating(draft, draft.stores.find((s) => s.id === store.id)!).average;
}

type ModTab = "reported" | "hidden" | "all";

export function AdminModerationPage() {
  useDocumentTitle("Review moderation");
  const data = useData();
  const admin = useAdminName();
  const toast = useToast();
  const loading = useSimulatedLoading(350);
  const [params, setParams] = useSearchParams();
  const focusId = params.get("review");
  const [tab, setTab] = useState<ModTab>("reported");
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query.trim().toLowerCase(), 200);
  const [busy, run] = useBusy();
  const [hiding, setHiding] = useState<Review | null>(null);
  const [reason, setReason] = useState(HIDE_REASONS[0]);
  const [note, setNote] = useState("");
  const [deleting, setDeleting] = useState<Review | null>(null);
  const focusRef = useRef<HTMLDivElement>(null);

  const isReported = (r: Review) => r.status === "visible" && r.flags.length > 0;
  const inTab = (t: ModTab, r: Review) => (t === "reported" ? isReported(r) : t === "hidden" ? r.status === "hidden" : true);
  const count = (t: ModTab) => data.reviews.filter((r) => inTab(t, r)).length;

  // Opened from the dashboard with ?review=<id>: show the tab that contains it and scroll to it.
  useEffect(() => {
    if (!focusId) return;
    const r = getData().reviews.find((x) => x.id === focusId);
    if (r) setTab(isReported(r) ? "reported" : r.status === "hidden" ? "hidden" : "all");
  }, [focusId]);
  useEffect(() => {
    if (!loading && focusId) focusRef.current?.scrollIntoView({ block: "center" });
  }, [loading, focusId]);

  const rows = data.reviews
    .filter((r) => inTab(tab, r))
    .filter((r) => {
      if (!q) return true;
      const store = getStore(data, r.storeId);
      return [r.userName, r.comment, store?.name ?? "", ...r.flags.map((f) => f.reason), r.modNote ?? ""].some((v) => v.toLowerCase().includes(q));
    })
    .sort((a, b) => (tab === "reported" ? b.flags.length - a.flags.length || a.flags[0].at - b.flags[0].at : b.createdAt - a.createdAt));

  const keep = (r: Review) =>
    run(() => {
      const before = r.flags;
      update((d) => {
        const x = d.reviews.find((y) => y.id === r.id);
        if (!x) return;
        x.flags = [];
        x.modNote = `Kept after review by ${admin}`;
        logActivity(d, admin, `Kept ${r.userName}'s review on ${getStore(d, r.storeId)?.name ?? "a store"} (${plural(before.length, "report")} dismissed)`);
      });
      toast({
        title: "Review kept",
        description: "The reports were dismissed.",
        action: {
          label: "Undo",
          onClick: () =>
            update((d) => {
              const x = d.reviews.find((y) => y.id === r.id);
              if (x) {
                x.flags = before;
                delete x.modNote;
              }
            }),
        },
      });
    });

  const confirmHide = () => {
    if (!hiding) return;
    const r = hiding;
    const text = note.trim() ? `${reason}: ${note.trim()}` : reason;
    run(() => {
      update((d) => {
        const x = d.reviews.find((y) => y.id === r.id);
        if (!x) return;
        takeOutOfBase(d, x);
        x.status = "hidden";
        x.modNote = text;
        const store = getStore(d, r.storeId);
        notifyUser(d, x.userId, "Your review was hidden", `${store?.name ?? "Store"} · ${reason}`, `/stores/${r.storeId}`);
        logActivity(d, admin, `Hid ${r.userName}'s review on ${store?.name ?? "a store"} (${reason})`);
      });
      setHiding(null);
      toast({ title: "Review hidden", description: "Shoppers no longer see it and the store rating was updated." });
    });
  };

  const restore = (r: Review) =>
    run(() => {
      update((d) => {
        const x = d.reviews.find((y) => y.id === r.id);
        if (!x) return;
        x.status = "visible";
        x.flags = [];
        x.modNote = `Restored by ${admin}`;
        logActivity(d, admin, `Restored ${r.userName}'s review on ${getStore(d, r.storeId)?.name ?? "a store"}`);
      });
      toast({ title: "Review restored", description: "It is visible again and counts toward the rating." });
    });

  const confirmDelete = () => {
    if (!deleting) return;
    const r = deleting;
    run(() => {
      update((d) => {
        const x = d.reviews.find((y) => y.id === r.id);
        if (x && x.status === "visible") takeOutOfBase(d, x);
        d.reviews = d.reviews.filter((y) => y.id !== r.id);
        logActivity(d, admin, `Deleted ${r.userName}'s review on ${getStore(d, r.storeId)?.name ?? "a store"}`);
      });
      setDeleting(null);
      if (focusId === r.id) setParams({}, { replace: true });
      toast({ title: "Review deleted" });
    });
  };

  const impact = (r: Review | null) => {
    if (!r) return null;
    const store = getStore(data, r.storeId);
    if (!store || r.status !== "visible") return null;
    const before = storeRating(data, store).average;
    const after = averageWithout(data, r);
    return `${store.name}'s rating goes from ${before?.toFixed(1) ?? "none"} to ${after?.toFixed(1) ?? "no ratings"}.`;
  };

  return (
    <AdminShell title="Review moderation" subtitle="Reviews that shoppers or store owners reported. Hidden reviews stop counting toward the store's rating.">
      <div className="flex flex-col gap-3 lg:flex-row">
        <Segmented<ModTab>
          label="Which reviews"
          value={tab}
          onChange={setTab}
          className="lg:max-w-lg lg:flex-1 [&>button]:px-1.5 sm:[&>button]:px-3"
          options={[
            { value: "reported", label: `Reported (${count("reported")})` },
            { value: "hidden", label: `Hidden (${count("hidden")})` },
            { value: "all", label: `All (${count("all")})` },
          ]}
        />
        <SearchInput value={query} onValueChange={setQuery} placeholder="Search author, store, text or reason" aria-label="Search reviews" className="flex-1" />
      </div>

      <div className="mt-5">
        {loading ? (
          <ListSkeleton rows={3} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={q ? <SearchX /> : <CircleCheck />}
            title={q ? "No reviews match" : tab === "reported" ? "No reported reviews" : tab === "hidden" ? "No hidden reviews" : "No reviews yet"}
            action={q ? <Button onClick={() => setQuery("")}>Clear search</Button> : undefined}
          >
            {q ? "Try another name, store or reason." : tab === "reported" ? "When someone reports a review it appears here for a decision." : "Nothing to show here."}
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {rows.map((r) => {
              const store = getStore(data, r.storeId);
              const focused = r.id === focusId;
              return (
                <Card key={r.id} as="article" className={cn("px-5 pt-1 pb-4", focused && "ring-2 ring-brand-text")}>
                  <div ref={focused ? focusRef : undefined} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      {store && <StoreLogo store={store} size="sm" />}
                      {store ? (
                        <Link to={`/stores/${store.id}`} className="truncate font-semibold hover:text-brand-text">
                          {store.name}
                        </Link>
                      ) : (
                        <span className="text-muted">Removed store</span>
                      )}
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {r.status === "hidden" ? <Badge tone="bad" icon={<EyeOff className="size-3" aria-hidden />}>Hidden</Badge> : <Badge tone="ok">Visible</Badge>}
                      {r.flags.length > 0 && (
                        <Badge tone="warn" icon={<Flag className="size-3" aria-hidden />}>
                          {plural(r.flags.length, "report")}
                        </Badge>
                      )}
                    </span>
                  </div>
                  <ReviewItem review={r} storeName={store?.name ?? "the store"} />
                  {r.flags.length > 0 && (
                    <ul className="mb-3 space-y-1.5 rounded-xl bg-warn-soft px-4 py-3 text-sm" aria-label="Reports">
                      {r.flags.map((f, i) => (
                        <li key={i}>
                          <span className="font-semibold text-warn">{f.reason}</span>
                          <span className="text-muted">
                            {" "}
                            · by a {f.byRole === "owner" ? "store owner" : f.byRole} · {timeAgo(f.at).toLowerCase()}
                          </span>
                          {f.note && <span className="block text-muted">“{f.note}”</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {r.modNote && <p className="mb-3 text-xs text-subtle">Moderation note: {r.modNote}</p>}
                  <div className="flex flex-wrap gap-2">
                    {r.status === "visible" ? (
                      <>
                        {r.flags.length > 0 && (
                          <Button size="sm" variant="secondary" icon={<CircleCheck className="size-4" />} onClick={() => keep(r)} disabled={busy}>
                            Keep
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="soft-danger"
                          icon={<EyeOff className="size-4" />}
                          onClick={() => {
                            setHiding(r);
                            setReason(suggestedHideReason(r));
                            setNote("");
                          }}
                        >
                          Hide
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="soft" icon={<RotateCcw className="size-4" />} onClick={() => restore(r)} disabled={busy}>
                        Restore
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => setDeleting(r)}>
                      Delete
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!hiding}
        onClose={() => setHiding(null)}
        busy={busy}
        tone="danger"
        icon={<EyeOff />}
        title={`Hide ${hiding?.userName}'s review?`}
        description={
          <>
            Shoppers will no longer see it and it stops counting toward the rating. {impact(hiding)} You can restore it later.
          </>
        }
        confirmLabel="Hide review"
        onConfirm={confirmHide}
      >
        <div className="space-y-4">
          <Field label="Reason" htmlFor="hide-reason" required>
            <Select id="hide-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              {HIDE_REASONS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </Field>
          <Field label="Note (optional)" htmlFor="hide-note" hint="Kept with the review for other administrators.">
            <TextArea id="hide-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} className="min-h-20" />
          </Field>
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        busy={busy}
        tone="danger"
        icon={<Trash2 />}
        title="Delete this review permanently?"
        description={
          <>
            This cannot be undone. {impact(deleting)} Hide the review instead if you may need it later.
          </>
        }
        confirmLabel="Delete review"
        onConfirm={confirmDelete}
      />
    </AdminShell>
  );
}

/* ===================================================================== */
/* Featured content (W18, FR23)                                           */
/* ===================================================================== */

/** How many items a page can feature on the same day (Home grid / Explore strip). */
const FEATURE_LIMIT: Record<FeaturedSlot["kind"], Partial<Record<FeaturedSlot["location"], number>>> = {
  store: { home: 6, explore: 4 },
  coupon: { home: 6 },
};
const MAX_DAYS = 60;
const LOCATION_LABEL: Record<FeaturedSlot["location"], string> = { home: "Home", explore: "Explore" };

type SlotPhase = "running" | "scheduled" | "ended";
const slotPhase = (s: FeaturedSlot, today: string): SlotPhase => (s.end < today ? "ended" : s.start > today ? "scheduled" : "running");

/** Why a running slot is not visible to shoppers right now, if anything. */
function slotProblem(data: AppData, slot: FeaturedSlot): string | null {
  const store = getStore(data, slot.storeId);
  if (!store) return "The store was removed.";
  if (!isActiveStore(store)) return `${store.name} is not live (${storeState(store).replace("_", " ")}), so it is skipped.`;
  if (slot.kind === "coupon") {
    const c = data.coupons.find((x) => x.id === slot.couponId);
    if (!c) return "The coupon was deleted.";
    if (!isCouponLive(c)) return `${c.code} is paused or expired, so it is skipped.`;
  }
  return null;
}

interface SlotForm {
  kind: FeaturedSlot["kind"];
  storeId: string;
  couponId: string;
  location: FeaturedSlot["location"];
  start: string;
  end: string;
}
type SlotErrors = Partial<Record<keyof SlotForm, string>>;

export function validateSlot(v: SlotForm, data: AppData, today = todayISO()): SlotErrors {
  const e: SlotErrors = {};
  const store = getStore(data, v.storeId);
  if (!v.storeId) e.storeId = "Choose a store.";
  else if (!store || !isActiveStore(store)) e.storeId = "Only live stores can be featured.";
  const coupon = data.coupons.find((c) => c.id === v.couponId);
  if (v.kind === "coupon") {
    if (!v.couponId) e.couponId = "Choose a coupon.";
    else if (!coupon || !isCouponLive(coupon, today)) e.couponId = "This coupon is paused or expired.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.start)) e.start = "Choose a start date.";
  else if (v.start < today) e.start = "The start date cannot be in the past.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.end)) e.end = "Choose an end date.";
  else if (!e.start && v.end < v.start) e.end = "The end date must be on or after the start date.";
  else if (!e.start && daysBetween(v.start, v.end) + 1 > MAX_DAYS) e.end = `A slot can run for ${MAX_DAYS} days at most.`;
  else if (v.kind === "coupon" && coupon && v.end > coupon.expiresAt) e.end = `${coupon.code} expires on ${formatDate(coupon.expiresAt)}. End the slot on or before that day.`;
  if (Object.keys(e).length) return e;

  const overlapping = data.featured.filter((f) => f.kind === v.kind && f.location === v.location && f.start <= v.end && f.end >= v.start);
  if (overlapping.some((f) => (v.kind === "store" ? f.storeId === v.storeId : f.couponId === v.couponId))) {
    e.storeId = `This ${v.kind} is already featured on ${LOCATION_LABEL[v.location]} during some of these dates.`;
    return e;
  }
  const limit = FEATURE_LIMIT[v.kind][v.location] ?? 0;
  for (let day = v.start; day <= v.end; day = addDaysISO(day, 1)) {
    const n = overlapping.filter((f) => f.start <= day && f.end >= day).length;
    if (n >= limit) {
      e.start = `${LOCATION_LABEL[v.location]} already has ${limit} featured ${v.kind}s on ${formatDate(day)}. Pick other dates or remove a slot.`;
      break;
    }
  }
  return e;
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function AdminFeaturedPage() {
  useDocumentTitle("Featured content");
  const data = useData();
  const admin = useAdminName();
  const toast = useToast();
  const loading = useSimulatedLoading(300);
  const [busy, run] = useBusy();
  const today = todayISO();
  const [phase, setPhase] = useState<SlotPhase>("running");
  const [form, setForm] = useState<SlotForm>({ kind: "store", storeId: "", couponId: "", location: "home", start: today, end: addDaysISO(today, 13) });
  const [errors, setErrors] = useState<SlotErrors>({});
  const [ending, setEnding] = useState<FeaturedSlot | null>(null);

  const liveStores = data.stores.filter(isActiveStore).sort((a, b) => a.name.localeCompare(b.name));
  const storesWithCoupons = liveStores.filter((s) => data.coupons.some((c) => c.storeId === s.id && isCouponLive(c, today)));
  const couponChoices = data.coupons.filter((c) => c.storeId === form.storeId && isCouponLive(c, today));

  const set = <K extends keyof SlotForm>(k: K, v: SlotForm[K]) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "kind") {
        next.couponId = "";
        if (v === "coupon") next.location = "home";
        if (v === "coupon" && !storesWithCoupons.some((s) => s.id === next.storeId)) next.storeId = "";
      }
      if (k === "storeId") next.couponId = "";
      return next;
    });
    setErrors({});
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateSlot(form, getData(), todayISO());
    setErrors(errs);
    if (Object.keys(errs).length) return;
    run(() => {
      const again = validateSlot(form, getData(), todayISO());
      if (Object.keys(again).length) {
        setErrors(again);
        return;
      }
      const store = getStore(getData(), form.storeId)!;
      update((d) => {
        d.featured.push({
          id: newId("f"),
          kind: form.kind,
          storeId: form.storeId,
          couponId: form.kind === "coupon" ? form.couponId : undefined,
          location: form.location,
          start: form.start,
          end: form.end,
          createdAt: Date.now(),
        });
        logActivity(d, admin, `Featured ${form.kind === "coupon" ? `a ${store.name} coupon` : store.name} on ${LOCATION_LABEL[form.location]}, ${formatDate(form.start)} to ${formatDate(form.end)}`);
        notifyUser(d, store.ownerId, `${store.name} will be featured`, `${LOCATION_LABEL[form.location]} page · ${formatDate(form.start)} to ${formatDate(form.end)}`, `/stores/${store.id}`);
      });
      toast({ title: "Slot scheduled", description: form.start === todayISO() ? "It is showing now." : `It starts on ${formatDate(form.start)}.` });
      setPhase(form.start === todayISO() ? "running" : "scheduled");
      setForm((f) => ({ ...f, storeId: "", couponId: "" }));
    });
  };

  const confirmEnd = () => {
    if (!ending) return;
    const slot = ending;
    const running = slotPhase(slot, todayISO()) === "running";
    run(() => {
      update((d) => {
        const s = getStore(d, slot.storeId);
        if (running) {
          const x = d.featured.find((f) => f.id === slot.id);
          if (x) x.end = addDaysISO(todayISO(), -1);
        } else {
          d.featured = d.featured.filter((f) => f.id !== slot.id);
        }
        logActivity(d, admin, `${running ? "Ended" : "Removed"} the featured slot for ${s?.name ?? "a store"} on ${LOCATION_LABEL[slot.location]}`);
      });
      setEnding(null);
      toast({ title: running ? "Slot ended" : "Slot removed" });
    });
  };

  const slots = data.featured
    .filter((s) => slotPhase(s, today) === phase)
    .sort((a, b) => (phase === "ended" ? b.end.localeCompare(a.end) : a.start.localeCompare(b.start)));
  const countPhase = (p: SlotPhase) => data.featured.filter((s) => slotPhase(s, today) === p).length;
  const err = (k: keyof SlotForm) => errors[k] ?? null;

  return (
    <AdminShell title="Featured content" subtitle="Schedule stores and coupons for the Home page and the Explore page. Only live stores and active coupons are shown.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        <section aria-label="Featured slots">
          <Segmented<SlotPhase>
            label="Slot status"
            value={phase}
            onChange={setPhase}
            className="[&>button]:px-1.5 sm:[&>button]:px-3"
            options={[
              { value: "running", label: `Showing now (${countPhase("running")})` },
              { value: "scheduled", label: `Scheduled (${countPhase("scheduled")})` },
              { value: "ended", label: `Ended (${countPhase("ended")})` },
            ]}
          />
          <div className="mt-4">
            {loading ? (
              <ListSkeleton rows={4} />
            ) : slots.length === 0 ? (
              <EmptyState icon={<Megaphone />} title={phase === "running" ? "Nothing is featured today" : phase === "scheduled" ? "Nothing is scheduled" : "No ended slots"}>
                {phase === "ended" ? "Slots move here after their last day." : "Use the form to feature a store or a coupon."}
              </EmptyState>
            ) : (
              <Card className="divide-y divide-line">
                {slots.map((slot) => {
                  const store = getStore(data, slot.storeId);
                  const coupon = slot.kind === "coupon" ? data.coupons.find((c) => c.id === slot.couponId) : undefined;
                  const problem = phase === "ended" ? null : slotProblem(data, slot);
                  const left = daysUntil(slot.end);
                  return (
                    <article key={slot.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {store ? <StoreLogo store={store} size="sm" /> : <span className="size-9 rounded-lg bg-surface-3" aria-hidden />}
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 font-semibold">
                            {store?.name ?? "Removed store"}
                            <Badge tone={slot.kind === "coupon" ? "ok" : "brand"}>{slot.kind === "coupon" ? `Coupon ${coupon?.code ?? ""}` : "Store"}</Badge>
                            <Badge>{LOCATION_LABEL[slot.location]}</Badge>
                          </p>
                          <p className="mt-0.5 text-sm text-muted">
                            {formatDate(slot.start)} – {formatDate(slot.end)}
                            {phase === "running" && ` · ${left === 0 ? "last day today" : `${plural(left, "day")} left`}`}
                            {phase === "scheduled" && ` · starts in ${plural(daysUntil(slot.start), "day")}`}
                            {coupon && ` · ${couponValueLabel(coupon)}`}
                          </p>
                          {problem && (
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-warn">
                              <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
                              {problem}
                            </p>
                          )}
                        </div>
                      </div>
                      {phase !== "ended" && (
                        <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => setEnding(slot)} className="self-start sm:self-auto">
                          {phase === "running" ? "End now" : "Remove"}
                        </Button>
                      )}
                    </article>
                  );
                })}
              </Card>
            )}
          </div>
        </section>

        <Card as="aside" className="h-fit p-6 lg:sticky lg:top-24">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarDays className="size-5 text-muted" aria-hidden />
            Schedule a slot
          </h2>
          <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
            <Segmented<FeaturedSlot["kind"]>
              label="What to feature"
              value={form.kind}
              onChange={(v) => set("kind", v)}
              options={[
                { value: "store", label: "Store" },
                { value: "coupon", label: "Coupon" },
              ]}
            />
            <Field label="Store" htmlFor="slot-store" error={err("storeId")} required>
              <Select id="slot-store" value={form.storeId} invalid={!!errors.storeId} onChange={(e) => set("storeId", e.target.value)}>
                <option value="">Choose a live store</option>
                {(form.kind === "coupon" ? storesWithCoupons : liveStores).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            {form.kind === "coupon" && (
              <Field label="Coupon" htmlFor="slot-coupon" error={err("couponId")} hint={form.storeId && couponChoices.length === 0 ? "This store has no active coupon." : undefined} required>
                <Select id="slot-coupon" value={form.couponId} invalid={!!errors.couponId} disabled={!form.storeId} onChange={(e) => set("couponId", e.target.value)}>
                  <option value="">{form.storeId ? "Choose a coupon" : "Choose a store first"}</option>
                  {couponChoices.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {couponValueLabel(c)} · until {formatDate(c.expiresAt)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {form.kind === "store" ? (
              <div>
                <p className="mb-1.5 text-sm font-semibold">Page</p>
                <Segmented<FeaturedSlot["location"]>
                  label="Page"
                  value={form.location}
                  onChange={(v) => set("location", v)}
                  options={[
                    { value: "home", label: "Home" },
                    { value: "explore", label: "Explore" },
                  ]}
                />
              </div>
            ) : (
              <p className="text-xs text-subtle">Featured coupons appear on the Home page.</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="First day" htmlFor="slot-start" error={err("start")} required>
                <Input id="slot-start" type="date" min={today} value={form.start} invalid={!!errors.start} onChange={(e) => set("start", e.target.value)} />
              </Field>
              <Field label="Last day" htmlFor="slot-end" error={err("end")} required>
                <Input id="slot-end" type="date" min={form.start || today} value={form.end} invalid={!!errors.end} onChange={(e) => set("end", e.target.value)} />
              </Field>
            </div>
            <p className="text-xs text-subtle">
              Up to {MAX_DAYS} days. Home shows up to {FEATURE_LIMIT.store.home} stores and {FEATURE_LIMIT.coupon.home} coupons a day; Explore up to {FEATURE_LIMIT.store.explore} stores.
            </p>
            <Button type="submit" variant="primary" fullWidth loading={busy} icon={<Plus className="size-4" />}>
              Schedule
            </Button>
          </form>
        </Card>
      </div>

      <ConfirmModal
        open={!!ending}
        onClose={() => setEnding(null)}
        busy={busy}
        tone="danger"
        icon={<Megaphone />}
        title={ending && slotPhase(ending, today) === "running" ? "End this slot now?" : "Remove this scheduled slot?"}
        description={
          ending && slotPhase(ending, today) === "running"
            ? `${getStore(data, ending.storeId)?.name ?? "The store"} stops being featured on ${LOCATION_LABEL[ending.location]} immediately. The slot is kept under Ended.`
            : "The slot is deleted before it starts."
        }
        confirmLabel={ending && slotPhase(ending, today) === "running" ? "End now" : "Remove slot"}
        onConfirm={confirmEnd}
      />
    </AdminShell>
  );
}

/* ===================================================================== */
/* Analytics (W19, FR24)                                                  */
/* ===================================================================== */

type RangePreset = "7" | "30" | "90" | "custom";

interface StoreRow {
  store: Store;
  visits: number;
  previous: number;
  share: number;
}

/** "+12%" / "-4%" / "new" compared with the previous period of the same length. */
function changeLabel(now: number, before: number): { text: string; tone: "ok" | "bad" | "neutral" } {
  if (before === 0) return now > 0 ? { text: "new", tone: "ok" } : { text: "–", tone: "neutral" };
  const pct = Math.round(((now - before) / before) * 100);
  return { text: `${pct > 0 ? "+" : ""}${pct}%`, tone: pct > 0 ? "ok" : pct < 0 ? "bad" : "neutral" };
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Daily (or weekly, for long ranges) referral visits as columns, with a hover / focus tooltip. */
function VisitsChart({ points }: { points: Array<{ label: string; full: string; value: number }> }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.value));
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / step) * step;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f));
  const labelEvery = Math.ceil(points.length / 8);
  return (
    <div className="relative">
      <div className="flex">
        <div className="relative mr-2 h-56 w-10 shrink-0 text-right text-[0.7rem] text-subtle" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `calc(${(t / top) * 100}% - 0.5em)` }}>
              {t >= 10_000 ? compactNumber(t) : formatNumber(t)}
            </span>
          ))}
        </div>
        <div className="relative h-56 flex-1">
          {ticks.map((t) => (
            <span key={t} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${(t / top) * 100}%` }} aria-hidden />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]" role="list" aria-label="Referral visits per period">
            {points.map((p, i) => (
              <div key={p.full} role="listitem" className="flex h-full flex-1 items-end justify-center">
                <button
                  type="button"
                  className="group flex h-full w-full max-w-6 items-end justify-center outline-none"
                  aria-label={`${p.full}: ${formatNumber(p.value)} visits`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                >
                  <span
                    className={cn("block w-full rounded-t-[4px] bg-brand transition-opacity", active !== null && active !== i ? "opacity-50" : "opacity-100", "group-focus-visible:ring-2 group-focus-visible:ring-brand-text")}
                    style={{ height: `${(p.value / top) * 100}%`, minHeight: p.value ? 2 : 0 }}
                  />
                </button>
              </div>
            ))}
          </div>
          {active !== null && (
            <div
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-line-strong bg-surface-2 px-3 py-2 text-center shadow-xl"
              style={{ left: `${((active + 0.5) / points.length) * 100}%` }}
              role="status"
            >
              <p className="text-base font-bold">{formatNumber(points[active].value)}</p>
              <p className="text-xs whitespace-nowrap text-muted">{points[active].full}</p>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 ml-12 flex gap-[2px] text-[0.7rem] text-subtle" aria-hidden>
        {points.map((p, i) => (
          <span key={p.full} className="flex-1 overflow-visible text-center whitespace-nowrap">
            {i % labelEvery === 0 ? p.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AdminAnalyticsPage() {
  useDocumentTitle("Analytics");
  const data = useData();
  const toast = useToast();
  const today = todayISO();
  const [preset, setPreset] = useState<RangePreset>("30");
  const [customFrom, setCustomFrom] = useState(addDaysISO(today, -13));
  const [customTo, setCustomTo] = useState(today);
  const [categoryId, setCategoryId] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const loading = useSimulatedLoading(450, `${preset}|${customFrom}|${customTo}|${categoryId}`);

  // Date range and its validation (custom ranges).
  const rangeError =
    preset !== "custom"
      ? null
      : !customFrom || !customTo
        ? "Choose both dates."
        : customFrom > customTo
          ? "The start date must be before the end date."
          : customTo > today
            ? "The end date cannot be in the future."
            : daysBetween(customFrom, customTo) + 1 > 365
              ? "Choose a range of 365 days or less."
              : null;
  const from = preset === "custom" ? customFrom : addDaysISO(today, -(Number(preset) - 1));
  const to = preset === "custom" ? customTo : today;
  const days = rangeError ? 0 : daysBetween(from, to) + 1;
  const prevTo = addDaysISO(from, -1);
  const prevFrom = addDaysISO(from, -days);

  const report = useMemo(() => {
    if (rangeError) return null;
    const stores = data.stores.filter((s) => categoryId === "all" || s.categoryId === categoryId);
    const ids = new Set(stores.map((s) => s.id));
    const total = visitsBetween(data, from, to, ids);
    const previous = visitsBetween(data, prevFrom, prevTo, ids);
    const rows: StoreRow[] = stores
      .map((store) => {
        const one = new Set([store.id]);
        return { store, visits: visitsBetween(data, from, to, one), previous: visitsBetween(data, prevFrom, prevTo, one), share: 0 };
      })
      .filter((r) => r.visits > 0 || r.previous > 0)
      .map((r) => ({ ...r, share: total ? r.visits / total : 0 }))
      .sort((a, b) => b.visits - a.visits || a.store.name.localeCompare(b.store.name));

    // Chart points: one per day, or one per week when the range is longer than 60 days.
    const weekly = days > 60;
    const points: Array<{ label: string; full: string; value: number }> = [];
    for (let start = from; start <= to; start = addDaysISO(start, weekly ? 7 : 1)) {
      const end = weekly ? (addDaysISO(start, 6) > to ? to : addDaysISO(start, 6)) : start;
      const [, m, d] = start.split("-").map(Number);
      points.push({
        label: `${d}/${m}`,
        full: weekly ? `Week of ${formatDate(start)}` : formatDate(start),
        value: visitsBetween(data, start, end, ids),
      });
    }

    const inRange = (t: number) => {
      const iso = toISODate(t);
      return iso >= from && iso <= to;
    };
    const newReviews = data.reviews.filter((r) => ids.has(r.storeId) && inRange(r.createdAt)).length;
    const newStores = stores.filter((s) => s.approval === "approved" && inRange(s.createdAt)).length;
    return { total, previous, rows, points, weekly, newReviews, newStores };
  }, [data, from, to, prevFrom, prevTo, categoryId, days, rangeError]);

  const exportCsv = () => {
    if (!report) return;
    const header = ["Store", "Category", "Status", `Visits ${from} to ${to}`, "Share of visits", `Visits ${prevFrom} to ${prevTo}`, "Change", "Average rating", "Ratings"];
    const lines = report.rows.map((r) => {
      const rating = storeRating(data, r.store);
      return [
        r.store.name,
        getCategory(data, r.store.categoryId)?.name ?? "",
        storeState(r.store),
        r.visits,
        `${(r.share * 100).toFixed(1)}%`,
        r.previous,
        changeLabel(r.visits, r.previous).text,
        rating.average?.toFixed(1) ?? "",
        rating.count,
      ];
    });
    const csv = [header, ...lines, [], ["Total", "", "", report.total, "100%", report.previous, changeLabel(report.total, report.previous).text]]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dealfinder-analytics-${from}-to-${to}${categoryId === "all" ? "" : `-${categoryId}`}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ title: "CSV downloaded", description: `${plural(report.rows.length, "store")}, ${formatDate(from)} to ${formatDate(to)}.` });
  };

  const change = report ? changeLabel(report.total, report.previous) : null;
  const tiles = report
    ? [
        { label: "Referral visits", value: formatNumber(report.total), sub: change && <span className={cn(change.tone === "ok" && "text-ok", change.tone === "bad" && "text-bad")}>{change.text} vs previous {plural(days, "day")}</span> },
        { label: "Average per day", value: formatNumber(Math.round(report.total / Math.max(1, days))), sub: `Over ${plural(days, "day")}` },
        { label: "New reviews", value: formatNumber(report.newReviews), sub: "Written in this period" },
        { label: "Stores added", value: formatNumber(report.newStores), sub: "Approved stores created in this period" },
      ]
    : [];
  const shownRows = report ? (showAll ? report.rows : report.rows.slice(0, 10)) : [];

  return (
    <AdminShell
      title="Analytics"
      subtitle="How many shoppers DealFinder sends to each store's website."
      actions={
        <Button icon={<Download className="size-4" />} onClick={exportCsv} disabled={loading || !report || report.rows.length === 0}>
          Export CSV
        </Button>
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="lg:w-[26rem]">
          <p className="mb-1.5 text-sm font-semibold">Date range</p>
          <Segmented<RangePreset>
            label="Date range"
            value={preset}
            onChange={setPreset}
            className="[&>button]:px-1.5 sm:[&>button]:px-3"
            options={[
              { value: "7", label: "7 days" },
              { value: "30", label: "30 days" },
              { value: "90", label: "90 days" },
              { value: "custom", label: "Custom" },
            ]}
          />
        </div>
        {preset === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="From" htmlFor="range-from">
              <Input id="range-from" type="date" max={today} value={customFrom} invalid={!!rangeError} onChange={(e) => setCustomFrom(e.target.value)} />
            </Field>
            <Field label="To" htmlFor="range-to">
              <Input id="range-to" type="date" max={today} value={customTo} invalid={!!rangeError} onChange={(e) => setCustomTo(e.target.value)} />
            </Field>
          </div>
        )}
        <Field label="Category" htmlFor="range-category" className="lg:w-56">
          <Select id="range-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="all">All categories</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {rangeError ? (
        <Alert tone="bad" title="Check the dates" className="mt-5">
          {rangeError}
        </Alert>
      ) : (
        <p className="mt-3 text-sm text-muted" aria-live="polite">
          {formatDate(from)} – {formatDate(to)} · compared with {formatDate(prevFrom)} – {formatDate(prevTo)}
        </p>
      )}

      {!rangeError && (
        <div className="mt-6 space-y-6">
          {loading || !report ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-28 rounded-2xl" />
                ))}
              </div>
              <Skeleton className="h-72 rounded-2xl" />
            </>
          ) : report.total === 0 && report.previous === 0 ? (
            <EmptyState icon={<SearchX />} title="No visits in this period" action={<Button onClick={() => (setPreset("30"), setCategoryId("all"))}>Show the last 30 days</Button>}>
              No shopper opened a store website from DealFinder for this range and category.
            </EmptyState>
          ) : (
            <>
              <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                {tiles.map((t) => (
                  <Card key={t.label} className="p-4 sm:p-5">
                    <p className="text-sm text-muted">{t.label}</p>
                    <p className="mt-1 font-display text-2xl font-bold sm:text-3xl">{t.value}</p>
                    <p className="mt-1 text-xs text-subtle">{t.sub}</p>
                  </Card>
                ))}
              </section>

              <Card as="section" className="p-5 sm:p-6" aria-labelledby="chart-title">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 id="chart-title" className="text-lg font-semibold">
                      Referral visits {report.weekly ? "per week" : "per day"}
                    </h2>
                    <p className="text-sm text-muted">Hover or focus a column to see its value.</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable}>
                    {showTable ? "Hide table" : "Show as table"}
                  </Button>
                </div>
                <VisitsChart points={report.points} />
                {showTable && (
                  <div className="mt-5 max-h-72 overflow-y-auto rounded-xl border border-line">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-surface-2 text-left text-muted">
                        <tr>
                          <th className="px-4 py-2 font-semibold">{report.weekly ? "Week" : "Day"}</th>
                          <th className="px-4 py-2 text-right font-semibold">Visits</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {report.points.map((p) => (
                          <tr key={p.full}>
                            <td className="px-4 py-2">{p.full}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{formatNumber(p.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              <Card as="section" className="overflow-hidden" aria-labelledby="top-title">
                <div className="flex flex-wrap items-end justify-between gap-2 px-5 pt-5 sm:px-6">
                  <h2 id="top-title" className="text-lg font-semibold">
                    Stores by referral visits
                  </h2>
                  <span className="text-xs text-subtle">{plural(report.rows.length, "store")} with visits</span>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[40rem] text-sm">
                    <thead className="border-y border-line bg-surface-2 text-left text-muted">
                      <tr>
                        <th className="px-5 py-2.5 font-semibold sm:px-6">#</th>
                        <th className="px-3 py-2.5 font-semibold">Store</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Visits</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Share</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Change</th>
                        <th className="px-5 py-2.5 font-semibold sm:px-6">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {shownRows.map((r, i) => {
                        const ch = changeLabel(r.visits, r.previous);
                        return (
                          <tr key={r.store.id}>
                            <td className="px-5 py-3 text-subtle sm:px-6">{i + 1}</td>
                            <td className="px-3 py-3">
                              <span className="flex items-center gap-2.5">
                                <StoreLogo store={r.store} size="sm" />
                                <span className="min-w-0">
                                  <Link to={`/admin/catalog/${r.store.id}`} className="block truncate font-semibold hover:text-brand-text">
                                    {r.store.name}
                                  </Link>
                                  <span className="block text-xs text-muted">{getCategory(data, r.store.categoryId)?.name}</span>
                                </span>
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatNumber(r.visits)}</td>
                            <td className="px-3 py-3 text-right tabular-nums">
                              <span className="inline-flex items-center gap-2">
                                <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-surface-3 sm:block" aria-hidden>
                                  <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.round(r.share * 100)}%` }} />
                                </span>
                                {(r.share * 100).toFixed(1)}%
                              </span>
                            </td>
                            <td className={cn("px-3 py-3 text-right tabular-nums", ch.tone === "ok" && "text-ok", ch.tone === "bad" && "text-bad", ch.tone === "neutral" && "text-muted")}>{ch.text}</td>
                            <td className="px-5 py-3 sm:px-6">
                              <RatingInline rating={storeRating(data, r.store)} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {report.rows.length > 10 && (
                  <div className="border-t border-line p-3 text-center">
                    <Button size="sm" variant="ghost" onClick={() => setShowAll((v) => !v)}>
                      {showAll ? "Show top 10" : `Show all ${report.rows.length}`}
                    </Button>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}
    </AdminShell>
  );
}

/* ===================================================================== */
/* Support requests, admin side (FR16)                                    */
/* ===================================================================== */

type TicketTab = "open" | "answered" | "closed" | "all";

export function AdminSupportPage() {
  const { ticketId } = useParams<"ticketId">();
  useDocumentTitle("Support requests");
  const data = useData();
  const admin = useAdminName();
  const toast = useToast();
  const navigate = useNavigate();
  const loading = useSimulatedLoading(300);
  const [busy, run] = useBusy();
  const [tab, setTab] = useState<TicketTab>("open");
  const [query, setQuery] = useState("");
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const q = query.trim().toLowerCase();

  const ticket = ticketId ? data.tickets.find((t) => t.id === ticketId) : undefined;

  // Opening a request marks it as read for administrators.
  useEffect(() => {
    if (ticket?.adminUnread) {
      update((d) => {
        const t = d.tickets.find((x) => x.id === ticket.id);
        if (t) t.adminUnread = false;
      });
    }
    setReply("");
    setReplyError(null);
  }, [ticket?.id]);

  const list = data.tickets
    .filter((t) => tab === "all" || t.status === tab)
    .filter((t) => {
      if (!q) return true;
      const owner = data.users.find((u) => u.id === t.ownerId);
      return [t.ref, t.subject, t.topic, owner?.name ?? "", ...t.messages.map((m) => m.text)].some((v) => v.toLowerCase().includes(q));
    })
    .sort((a, b) => Number(b.adminUnread) - Number(a.adminUnread) || b.updatedAt - a.updatedAt);
  const count = (t: TicketTab) => data.tickets.filter((x) => t === "all" || x.status === t).length;

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    const text = reply.trim();
    const err = text.length < 2 ? "Write a reply first." : text.length > 2000 ? "Use 2,000 characters or fewer." : null;
    setReplyError(err);
    if (err) return;
    run(() => {
      update((d) => {
        const t = d.tickets.find((x) => x.id === ticket.id);
        if (!t) return;
        const now = Date.now();
        t.messages.push({ id: newId("m"), from: "admin", name: admin, text, at: now });
        t.status = "answered";
        t.ownerUnread = true;
        t.adminUnread = false;
        t.updatedAt = now;
        notifyUser(d, t.ownerId, "Support replied to your question", `${t.ref} · ${t.subject}`, `/portal/support/${t.id}`);
        logActivity(d, admin, `Replied to ${t.ref}`);
      });
      setReply("");
      toast({ title: "Reply sent", description: "The owner was notified." });
    });
  };

  const setStatus = (status: "closed" | "open") => {
    if (!ticket) return;
    run(() => {
      update((d) => {
        const t = d.tickets.find((x) => x.id === ticket.id);
        if (!t) return;
        t.status = status;
        t.updatedAt = Date.now();
        logActivity(d, admin, `${status === "closed" ? "Closed" : "Reopened"} ${t.ref}`);
      });
      toast({ title: status === "closed" ? `${ticket.ref} closed` : `${ticket.ref} reopened` });
    });
  };

  const STATUS_BADGE = { open: { tone: "warn", label: "Open" }, answered: { tone: "ok", label: "Answered" }, closed: { tone: "neutral", label: "Closed" } } as const;
  const owner = ticket ? data.users.find((u) => u.id === ticket.ownerId) : undefined;
  const ticketStore = ticket?.storeId ? getStore(data, ticket.storeId) : undefined;

  return (
    <AdminShell title="Support requests" subtitle="Questions from store owners. Replies appear in the owner's Store Portal.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_1fr]">
        <section aria-label="Requests" className={cn("min-w-0", ticketId && "hidden lg:block")}>
          <Select value={tab} onChange={(e) => setTab(e.target.value as TicketTab)} aria-label="Request status">
            <option value="open">Open ({count("open")})</option>
            <option value="answered">Answered ({count("answered")})</option>
            <option value="closed">Closed ({count("closed")})</option>
            <option value="all">All ({count("all")})</option>
          </Select>
          <SearchInput value={query} onValueChange={setQuery} placeholder="Search requests" aria-label="Search requests" className="mt-3" />
          <div className="mt-3">
            {loading ? (
              <ListSkeleton rows={2} />
            ) : list.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">No {tab === "all" ? "" : `${tab} `}requests{q ? " match your search" : ""}.</p>
            ) : (
              <Card className="divide-y divide-line">
                {list.map((t) => {
                  const o = data.users.find((u) => u.id === t.ownerId);
                  return (
                    <Link
                      key={t.id}
                      to={`/admin/support/${t.id}`}
                      aria-current={t.id === ticketId ? "page" : undefined}
                      className={cn("block px-4 py-3 transition-colors hover:bg-surface-2", t.id === ticketId && "bg-brand-soft")}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className={cn("min-w-0 truncate text-sm", t.adminUnread ? "font-bold" : "font-semibold")}>
                          {t.adminUnread && <span className="mr-1.5 inline-block size-2 rounded-full bg-brand-text" aria-label="Unread" />}
                          {t.subject}
                        </span>
                        <Badge tone={STATUS_BADGE[t.status].tone}>{STATUS_BADGE[t.status].label}</Badge>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {t.ref} · {o?.name ?? "Owner"} · {timeAgo(t.updatedAt)}
                      </span>
                    </Link>
                  );
                })}
              </Card>
            )}
          </div>
        </section>

        <section aria-label="Conversation" className={cn("min-w-0", !ticketId && "hidden lg:block")}>
          {!ticketId ? (
            <EmptyState icon={<Inbox />} title="Choose a request">
              Pick a request on the left to read it and reply.
            </EmptyState>
          ) : !ticket ? (
            <EmptyState icon={<SearchX />} title="Request not found" action={<Button to="/admin/support">Back to requests</Button>}>
              The link may be wrong.
            </EmptyState>
          ) : (
            <Card className="p-5 sm:p-6">
              <button type="button" onClick={() => navigate("/admin/support")} className="mb-3 text-sm font-semibold text-muted hover:text-fg lg:hidden">
                ← All requests
              </button>
              <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold">{ticket.subject}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {ticket.ref} · {ticket.topic} · {owner?.name ?? "Owner"}
                    {owner?.email && <> ({owner.email})</>}
                    {ticketStore && (
                      <>
                        {" "}
                        · about{" "}
                        <Link to={`/admin/catalog/${ticketStore.id}`} className="text-brand-text hover:underline">
                          {ticketStore.name}
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={STATUS_BADGE[ticket.status].tone}>{STATUS_BADGE[ticket.status].label}</Badge>
                  {ticket.status === "closed" ? (
                    <Button size="sm" onClick={() => setStatus("open")} disabled={busy}>
                      Reopen
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setStatus("closed")} disabled={busy}>
                      Close request
                    </Button>
                  )}
                </div>
              </div>
              <ol className="mt-5 space-y-4" aria-label="Messages">
                {ticket.messages.map((m) => (
                  <li key={m.id} className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm", m.from === "admin" ? "ml-auto bg-brand-soft" : "bg-surface-2")}>
                    <p className="text-xs font-semibold text-muted">
                      {m.name} {m.from === "admin" ? "(DealFinder)" : "(store owner)"} · {timeAgo(m.at)}
                    </p>
                    <p className="mt-1 leading-relaxed whitespace-pre-line">{m.text}</p>
                  </li>
                ))}
              </ol>
              {ticket.status === "closed" ? (
                <Alert tone="brand" className="mt-6">
                  This request is closed. Reopen it to reply.
                </Alert>
              ) : (
                <form onSubmit={send} noValidate className="mt-6 space-y-3">
                  <Field label="Your reply" htmlFor="reply" error={replyError} hint={`${reply.trim().length}/2,000`}>
                    <TextArea
                      id="reply"
                      value={reply}
                      invalid={!!replyError}
                      maxLength={2100}
                      onChange={(e) => {
                        setReply(e.target.value);
                        setReplyError(null);
                      }}
                    />
                  </Field>
                  <div className="flex justify-end">
                    <Button type="submit" variant="primary" loading={busy} icon={<Send className="size-4" />}>
                      Send reply
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

/* ===================================================================== */
/* Unknown /admin address                                                 */
/* ===================================================================== */

export function AdminSectionPage() {
  useDocumentTitle("Admin page not found");
  return (
    <AdminShell title="Page not found">
      <EmptyState icon={<MessageSquareText />} title="This admin page does not exist" action={<Button to="/admin" variant="primary">Go to the overview</Button>}>
        Use the tabs above to open a section.
      </EmptyState>
    </AdminShell>
  );
}
