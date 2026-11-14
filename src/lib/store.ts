/**
 * The prototype's in-browser "database".
 *
 * - All data lives in one `AppData` object (see types.ts), saved to localStorage.
 * - Components read it with `useData()` / `useCurrentUser()` and re-render on every change.
 * - Changes go through `update(draft => { ... })`, which copies the data, lets you
 *   mutate the copy, saves it and notifies every component.
 *
 * Adding a feature? Write a small named action next to the ones below (or in your
 * own page file) that calls `update`, so the logic stays easy to find and explain.
 * In Milestone 5 these actions become calls to the Node.js REST API.
 */
import { useSyncExternalStore } from "react";
import type { AppData, Role, User } from "./types";
import { createSeed, DATA_VERSION, DEMO_ACCOUNTS } from "./seed";
import { todayISO } from "./format";

const STORAGE_KEY = "dealfinder.data";
const PENDING_FAVORITE_KEY = "dealfinder.pendingFavorite";

function load(): AppData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed && parsed.version === DATA_VERSION) return parsed;
    }
  } catch {
    // Corrupt or blocked storage: fall back to fresh demo data.
  }
  return createSeed();
}

let state: AppData = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or disabled (private mode): the app keeps working in memory.
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Keep several open tabs in sync (e.g. shopper in one tab, admin in another).
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      state = load();
      emit();
    }
  });
}

/** Current data snapshot (read-only: never mutate it directly). */
export const getData = (): AppData => state;

/** Apply a change: `update(d => { d.stores[0].name = "New" })`. */
export function update(mutate: (draft: AppData) => void): void {
  const draft = structuredClone(state);
  mutate(draft);
  state = draft;
  persist();
  emit();
}

/** Restore the original demo data. Keeps the current user signed in when possible. */
export function resetDemoData(): void {
  const session = state.session;
  state = createSeed();
  if (session && state.users.some((u) => u.id === session.userId)) state.session = session;
  persist();
  emit();
}

/** React hook: the whole database, re-rendering on every change. */
export function useData(): AppData {
  return useSyncExternalStore(subscribe, getData, getData);
}

/** React hook: the signed-in user, or null for guests. */
export function useCurrentUser(): User | null {
  const data = useData();
  if (!data.session) return null;
  return data.users.find((u) => u.id === data.session?.userId) ?? null;
}

/** Readable sequential ids such as APP-1051 or SUP-1052. */
export function nextNumber(): number {
  let n = 0;
  update((d) => {
    d.seq += 1;
    n = d.seq;
  });
  return n;
}

/* ------------------------------------------------------------------ */
/* Session (shared by every member - the screens belong to Member 2)   */
/* ------------------------------------------------------------------ */

export type LoginResult = { ok: true; user: User } | { ok: false; error: string };

/** Check credentials and start a session (FR01, FR09). */
export function login(email: string, password: string): LoginResult {
  const user = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || user.password !== password) {
    return { ok: false, error: "The email or password is incorrect." };
  }
  if (!user.activated) {
    return { ok: false, error: "Please activate your account first. We sent the link to your email." };
  }
  if (user.suspended) {
    return { ok: false, error: "This account has been suspended. Please contact DealFinder support." };
  }
  update((d) => {
    d.session = { userId: user.id };
  });
  return { ok: true, user };
}

/** End the session. */
export function logout(): void {
  update((d) => {
    d.session = null;
  });
}

/** Prototype tools: sign in as one of the demo accounts. */
export function loginAsDemo(role: Role): LoginResult {
  const account = DEMO_ACCOUNTS[role];
  return login(account.email, account.password);
}

/** Where each role lands after signing in. */
export function homeFor(role: Role): string {
  if (role === "owner") return "/portal";
  if (role === "admin") return "/admin";
  return "/explore";
}

/* ------------------------------------------------------------------ */
/* Public store actions (Member 1)                                      */
/* ------------------------------------------------------------------ */

export type FavoriteResult = "added" | "removed" | "login-required" | "shoppers-only";

/** Save or remove a store from the signed-in shopper's favorites (FR06). */
export function toggleFavorite(storeId: string): FavoriteResult {
  const userId = state.session?.userId;
  const user = state.users.find((u) => u.id === userId);
  if (!user) return "login-required";
  if (user.role !== "shopper") return "shoppers-only";
  const saved = user.favorites.includes(storeId);
  update((d) => {
    const u = d.users.find((x) => x.id === user.id)!;
    u.favorites = saved ? u.favorites.filter((id) => id !== storeId) : [...u.favorites, storeId];
  });
  return saved ? "removed" : "added";
}

/** Remember a store a guest tried to save, so it is saved right after they sign in (W04-2). */
export function rememberPendingFavorite(storeId: string): void {
  try {
    window.sessionStorage.setItem(PENDING_FAVORITE_KEY, storeId);
  } catch {
    /* ignore */
  }
}

/** Read and clear the remembered store id. */
export function takePendingFavorite(): string | null {
  try {
    const id = window.sessionStorage.getItem(PENDING_FAVORITE_KEY);
    window.sessionStorage.removeItem(PENDING_FAVORITE_KEY);
    return id;
  } catch {
    return null;
  }
}

/** Count one referral visit to the store's official website (FR08, used by FR24 analytics). */
export function recordReferralClick(storeId: string): void {
  const today = todayISO();
  update((d) => {
    const table = (d.clicks[storeId] ??= {});
    table[today] = (table[today] ?? 0) + 1;
  });
}

/** A shopper could not open the store's website (W04-4). */
export function reportBrokenLink(storeId: string): void {
  update((d) => {
    const store = d.stores.find((s) => s.id === storeId);
    if (!store) return;
    store.brokenReports += 1;
    if (store.ownerId) {
      d.notifications.unshift({
        id: `n-${Date.now()}`,
        userId: store.ownerId,
        text: "Broken link reported",
        sub: `A shopper could not open ${store.name}’s website`,
        link: `/portal/stores/${store.id}`,
        at: Date.now(),
        read: false,
      });
    }
  });
}

/** Count a coupon code copy (shown to owners as "coupon uses"). */
export function recordCouponCopy(couponId: string): void {
  update((d) => {
    const coupon = d.coupons.find((c) => c.id === couponId);
    if (coupon) coupon.copies += 1;
  });
}
