/**
 * Read-only queries over AppData: which stores are public, ratings, coupons,
 * featured content and search. Pure functions, so every page computes the
 * same numbers the same way (NFR: data integrity).
 */
import type { AppData, Category, Coupon, FeaturedSlot, Review, Store } from "./types";
import { editDistance, todayISO } from "./format";

/* ------------------------------ Stores ------------------------------ */

/** Approved, not disabled, and not hidden by its owner. Closed stores are public but marked Closed. */
export const isPublicStore = (s: Store): boolean =>
  s.approval === "approved" && !s.disabled && s.listing !== "hidden";

/** Public and open for business. */
export const isActiveStore = (s: Store): boolean => isPublicStore(s) && s.listing === "active";

export function getStore(data: AppData, id: string | undefined): Store | undefined {
  return id ? data.stores.find((s) => s.id === id) : undefined;
}

export function getCategory(data: AppData, id: string): Category | undefined {
  return data.categories.find((c) => c.id === id);
}

/** Categories shoppers can see. */
export const visibleCategories = (data: AppData): Category[] => data.categories.filter((c) => !c.hidden);

/** Number of active public stores in each category. */
export function storeCountByCategory(data: AppData): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of data.stores) if (isActiveStore(s)) counts[s.categoryId] = (counts[s.categoryId] ?? 0) + 1;
  return counts;
}

/* ------------------------------ Reviews ----------------------------- */

/** Reviews the public can read, newest first. Hidden reviews are excluded (FR05, FR22). */
export function visibleReviews(data: AppData, storeId: string): Review[] {
  return data.reviews
    .filter((r) => r.storeId === storeId && r.status === "visible")
    .sort((a, b) => b.createdAt - a.createdAt);
}

export interface RatingSummary {
  /** Average from 1 to 5, or null when the store has no ratings yet. */
  average: number | null;
  count: number;
}

/**
 * Average rating = imported rating history + every visible review added since.
 * Recalculated on every render, so adding, hiding or deleting a review updates it immediately.
 */
export function storeRating(data: AppData, store: Store): RatingSummary {
  let total = store.baseRating * store.baseCount;
  let count = store.baseCount;
  for (const r of data.reviews) {
    if (r.storeId === store.id && r.status === "visible" && !r.inBase) {
      total += r.rating;
      count += 1;
    }
  }
  return count === 0 ? { average: null, count: 0 } : { average: Math.round((total / count) * 10) / 10, count };
}

/** How many visible written reviews have 5, 4, 3, 2 and 1 stars. */
export function ratingDistribution(reviews: Review[]): Record<1 | 2 | 3 | 4 | 5, number> {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) dist[Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5] += 1;
  return dist;
}

/** Total visible reviews on public stores (shown on Home). */
export const communityReviewCount = (data: AppData): number =>
  data.reviews.filter((r) => r.status === "visible" && data.stores.some((s) => s.id === r.storeId && isPublicStore(s))).length;

/* ------------------------------ Coupons ----------------------------- */

/** A coupon is shown publicly only while active and not expired, on a public store (FR05, FR14). */
export const isCouponLive = (c: Coupon, today = todayISO()): boolean => c.active && c.expiresAt >= today;

export function activeCoupons(data: AppData, storeId: string): Coupon[] {
  const today = todayISO();
  return data.coupons
    .filter((c) => c.storeId === storeId && isCouponLive(c, today))
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
}

/** "15% off" / "50 SAR off" */
export const couponValueLabel = (c: Coupon): string => (c.kind === "percent" ? `${c.value}% off` : `${c.value} SAR off`);

/* ----------------------------- Featured ----------------------------- */

const slotRunsToday = (slot: FeaturedSlot, today: string) => slot.start <= today && slot.end >= today;

/** Stores an administrator scheduled for a page today (FR23). Skips stores that are no longer active. */
export function featuredStores(data: AppData, location: FeaturedSlot["location"]): Store[] {
  const today = todayISO();
  const result: Store[] = [];
  for (const slot of data.featured) {
    if (slot.kind !== "store" || slot.location !== location || !slotRunsToday(slot, today)) continue;
    const store = getStore(data, slot.storeId);
    if (store && isActiveStore(store) && !result.includes(store)) result.push(store);
  }
  return result;
}

/** Coupons scheduled for a page today, only while the coupon itself is still live. */
export function featuredCoupons(data: AppData, location: FeaturedSlot["location"]): Array<{ coupon: Coupon; store: Store }> {
  const today = todayISO();
  const result: Array<{ coupon: Coupon; store: Store }> = [];
  for (const slot of data.featured) {
    if (slot.kind !== "coupon" || slot.location !== location || !slotRunsToday(slot, today)) continue;
    const coupon = data.coupons.find((c) => c.id === slot.couponId);
    const store = getStore(data, slot.storeId);
    if (coupon && store && isActiveStore(store) && isCouponLive(coupon, today)) result.push({ coupon, store });
  }
  return result;
}

/** Store ids featured anywhere today (for the FEATURED badge). */
export function featuredStoreIds(data: AppData): Set<string> {
  const today = todayISO();
  return new Set(data.featured.filter((f) => f.kind === "store" && slotRunsToday(f, today)).map((f) => f.storeId));
}

/* ------------------------------ Search ------------------------------ */

/** Lower-case text a store can be found by: name, description, keywords and category name. */
function searchableText(data: AppData, s: Store): string {
  return [s.name, s.description, s.keywords.join(" "), getCategory(data, s.categoryId)?.name ?? ""].join(" ").toLowerCase();
}

/** Every word of the query must appear somewhere in the store's searchable text (FR02). */
export function matchesQuery(data: AppData, s: Store, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = searchableText(data, s);
  return words.every((w) => text.includes(w));
}

/**
 * When a search finds nothing, suggest the closest store name or keyword
 * (e.g. "parfume" -> "perfume"). Returns null when nothing is close enough.
 */
export function suggestQuery(data: AppData, query: string): string | null {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return null;
  const candidates = new Set<string>();
  for (const s of data.stores.filter(isPublicStore)) {
    candidates.add(s.name.toLowerCase());
    s.keywords.forEach((k) => candidates.add(k.toLowerCase()));
  }
  data.categories.forEach((c) => candidates.add(c.name.toLowerCase()));
  let best: string | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const score = editDistance(q, c);
    if (score < bestScore) {
      best = c;
      bestScore = score;
    }
  }
  const allowed = q.length <= 5 ? 1 : 2;
  return best && bestScore > 0 && bestScore <= allowed ? best : null;
}

/* ------------------------------ Sorting ----------------------------- */

export type SortOption = "rating-desc" | "rating-asc" | "reviews";

export const SORT_LABELS: Record<SortOption, string> = {
  "rating-desc": "Highest rating",
  "rating-asc": "Lowest rating",
  reviews: "Most reviews",
};

/** Sort by rating or review count. Stores with no ratings always go last (FR04). */
export function sortStores(data: AppData, stores: Store[], sort: SortOption): Store[] {
  const withRating = stores.map((s) => ({ s, r: storeRating(data, s) }));
  return withRating
    .sort((a, b) => {
      if (a.r.average === null && b.r.average === null) return a.s.name.localeCompare(b.s.name);
      if (a.r.average === null) return 1;
      if (b.r.average === null) return -1;
      if (sort === "reviews") return b.r.count - a.r.count || b.r.average - a.r.average;
      const diff = sort === "rating-asc" ? a.r.average - b.r.average : b.r.average - a.r.average;
      return diff || b.r.count - a.r.count || a.s.name.localeCompare(b.s.name);
    })
    .map((x) => x.s);
}
