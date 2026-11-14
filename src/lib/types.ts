/**
 * Shared data types for the DealFinder prototype.
 *
 * Every page reads and writes these shapes through `src/lib/store.tsx`.
 * Coordinate with the team before changing an existing field (see CONTRIBUTING.md);
 * adding a new optional field is always safe.
 */

export type Role = "shopper" | "owner" | "admin";

/** General price level of a store: 1 = $ (low), 2 = $$ (medium), 3 = $$$ (high). */
export type PriceLevel = 1 | 2 | 3;

/** Administrator decision on a store listing (FR10, FR17). */
export type ApprovalStatus = "pending" | "needs_changes" | "approved" | "rejected";

/** Owner-controlled visibility of an approved listing (FR15). */
export type ListingStatus = "active" | "hidden" | "closed";

/** Icon names a category can use. Rendered by `CategoryIcon` in src/ui/shared.tsx. */
export type CategoryIconName =
  | "Cpu"
  | "Shirt"
  | "House"
  | "Sparkles"
  | "Trophy"
  | "Gamepad2"
  | "ShoppingBasket"
  | "BookOpen"
  | "Car"
  | "Baby"
  | "PawPrint"
  | "Gift"
  | "Tag";

export interface User {
  id: string;
  name: string;
  email: string;
  /** Prototype only: plain text so the demo can run in the browser. The real back end stores a hash. */
  password: string;
  role: Role;
  activated: boolean;
  suspended: boolean;
  createdAt: number;
  /** Store ids saved by a shopper (FR06). */
  favorites: string[];
  phone?: string;
  businessName?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: CategoryIconName;
  hidden: boolean;
}

export interface Store {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  priceLevel: PriceLevel;
  websiteUrl: string;
  keywords: string[];
  /** User id of the owner who manages the listing, or null when nobody has claimed it (FR11). */
  ownerId: string | null;
  /** Hue (0-359) used to draw the store's logo tile. */
  hue: number;
  approval: ApprovalStatus;
  listing: ListingStatus;
  /** Ownership verified by an administrator (shows the Verified badge). */
  verified: boolean;
  /** Disabled by an administrator (FR20). Disabled stores never appear in public. */
  disabled: boolean;
  disabledReason?: string;
  /** Rating history imported before the prototype's own reviews (keeps the numbers realistic). */
  baseRating: number;
  baseCount: number;
  createdAt: number;
  addedBy: "owner" | "admin";
  /** Number of "broken link" reports from shoppers (FR08). */
  brokenReports: number;
  /** Prototype only: simulates a retailer website that does not respond (W04-4). */
  websiteDown?: boolean;
  contactEmail?: string;
}

export interface ReviewFlag {
  by: string;
  byRole: Role;
  reason: string;
  note?: string;
  at: number;
}

export interface Review {
  id: string;
  storeId: string;
  userId: string | null;
  userName: string;
  /** 1 to 5 stars. */
  rating: number;
  comment: string;
  createdAt: number;
  status: "visible" | "hidden";
  /** True when the rating is already counted inside the store's baseRating/baseCount. */
  inBase: boolean;
  flags: ReviewFlag[];
  reply?: { text: string; at: number };
  modNote?: string;
}

export interface Coupon {
  id: string;
  storeId: string;
  code: string;
  title: string;
  description: string;
  kind: "percent" | "fixed";
  /** Percent off, or SAR off for fixed coupons. */
  value: number;
  /** Last valid day, as YYYY-MM-DD. */
  expiresAt: string;
  active: boolean;
  /** How many times shoppers copied the code. */
  copies: number;
  createdAt: number;
}

/** A store or coupon an administrator scheduled for the Home or Explore page (FR23). */
export interface FeaturedSlot {
  id: string;
  kind: "store" | "coupon";
  storeId: string;
  couponId?: string;
  location: "home" | "explore";
  /** First day, YYYY-MM-DD. */
  start: string;
  /** Last day, YYYY-MM-DD. */
  end: string;
  createdAt: number;
}

export interface OwnershipEvidence {
  method: "registration" | "email" | "dns";
  regNumber: string;
  fileName: string;
  fileSize: number;
  dnsVerified: boolean;
  emailVerified: string;
  notes: string;
}

export interface ApplicationFeedback {
  id: string;
  text: string;
  done: boolean;
}

export interface ApplicationHistoryEntry {
  at: number;
  actor: string;
  text: string;
}

/** A new-store submission (FR10) or a listing claim (FR11). */
export interface Application {
  id: string;
  ref: string;
  type: "new" | "claim";
  storeId: string;
  ownerId: string;
  status: ApprovalStatus | "withdrawn";
  evidence: OwnershipEvidence;
  createdAt: number;
  submittedAt: number;
  updatedAt: number;
  decidedAt?: number;
  decidedBy?: string;
  rejectionReason?: string;
  feedback: ApplicationFeedback[];
  history: ApplicationHistoryEntry[];
}

export interface TicketMessage {
  id: string;
  from: "owner" | "admin";
  name: string;
  text: string;
  at: number;
}

/** Store owner support request (FR16). */
export interface SupportTicket {
  id: string;
  ref: string;
  ownerId: string;
  storeId?: string;
  subject: string;
  topic: string;
  status: "open" | "answered" | "closed";
  messages: TicketMessage[];
  ownerUnread: boolean;
  adminUnread: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Notification {
  id: string;
  userId: string;
  text: string;
  sub: string;
  link: string;
  at: number;
  read: boolean;
}

export interface ActivityLogEntry {
  at: number;
  actor: string;
  text: string;
}

/** Referral clicks per store per day: clicks[storeId][YYYY-MM-DD] = number of visits. */
export type ClickTable = Record<string, Record<string, number>>;

/** The complete prototype database, kept in localStorage. */
export interface AppData {
  version: number;
  session: { userId: string } | null;
  users: User[];
  categories: Category[];
  stores: Store[];
  reviews: Review[];
  coupons: Coupon[];
  featured: FeaturedSlot[];
  applications: Application[];
  tickets: SupportTicket[];
  notifications: Notification[];
  clicks: ClickTable;
  log: ActivityLogEntry[];
  /** Simple counter for generating readable ids (APP-1050, SUP-2203, ...). */
  seq: number;
}
