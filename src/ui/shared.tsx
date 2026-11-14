/**
 * DealFinder-specific shared components: store cards, logos, badges, coupons,
 * reviews, favorite button and the "log in to continue" prompt.
 *
 * Owner: Member 1. These appear on public pages and are reused by the
 * shopper (Favorites), owner and admin screens, so keep their props stable.
 */
import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Baby,
  BookOpen,
  Car,
  Check,
  Copy,
  Cpu,
  Gamepad2,
  Gift,
  Heart,
  House,
  Lock,
  PawPrint,
  ShieldQuestion,
  Shirt,
  ShoppingBasket,
  Sparkles,
  Star,
  Tag,
  Ticket,
  Trophy,
  UserPlus,
  LogIn,
  type LucideIcon,
} from "lucide-react";
import type { Category, CategoryIconName, Coupon, Review, Store } from "../lib/types";
import { cn, daysUntil, formatDate, formatNumber, initials, plural, timeAgo } from "../lib/format";
import { useCurrentUser, useData, rememberPendingFavorite, toggleFavorite, recordCouponCopy } from "../lib/store";
import { useDocumentTitle } from "../lib/hooks";
import { couponValueLabel, featuredStoreIds, getCategory, storeRating, type RatingSummary } from "../lib/selectors";
import { Badge, Button, Card, Modal, PriceLevel, Skeleton, useToast } from "./kit";

/* ============================ Categories ============================ */

const CATEGORY_ICONS: Record<CategoryIconName, LucideIcon> = {
  Cpu,
  Shirt,
  House,
  Sparkles,
  Trophy,
  Gamepad2,
  ShoppingBasket,
  BookOpen,
  Car,
  Baby,
  PawPrint,
  Gift,
  Tag,
};

/** List of icon names admins can pick when creating a category. */
export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS) as CategoryIconName[];

export function CategoryIcon({ name, className }: { name: CategoryIconName; className?: string }) {
  const Icon = CATEGORY_ICONS[name] ?? Tag;
  return <Icon className={className} aria-hidden />;
}

/** Home page tile: icon, category name and number of stores. Opens Explore filtered to it. */
export function CategoryTile({ category, count }: { category: Category; count: number }) {
  return (
    <Link
      to={`/explore?category=${category.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:bg-surface-2 sm:flex-col sm:items-start sm:p-5"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text transition-colors group-hover:bg-brand group-hover:text-white">
        <CategoryIcon name={category.icon} className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{category.name}</span>
        <span className="text-sm text-muted">{plural(count, "store")}</span>
      </span>
    </Link>
  );
}

/* ============================ Store parts =========================== */

/** Square logo tile with the store's initials on its colour. */
export function StoreLogo({ store, size = "md", className }: { store: Pick<Store, "name" | "hue">; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const sizes = {
    sm: "size-9 rounded-lg text-xs",
    md: "size-12 rounded-xl text-sm",
    lg: "size-16 rounded-2xl text-lg",
    xl: "size-20 rounded-2xl text-2xl sm:size-24 sm:text-3xl",
  };
  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center font-display font-bold text-white shadow-inner", sizes[size], className)}
      style={{ background: `linear-gradient(135deg, hsl(${store.hue} 70% 48%), hsl(${(store.hue + 40) % 360} 72% 38%))` }}
    >
      {initials(store.name)}
    </span>
  );
}

export const VerifiedBadge = () => (
  <Badge tone="ok" icon={<BadgeCheck className="size-3.5" aria-hidden />}>
    Verified
  </Badge>
);

export const UnverifiedBadge = () => (
  <Badge tone="neutral" icon={<ShieldQuestion className="size-3.5" aria-hidden />}>
    Not verified
  </Badge>
);

export const FeaturedBadge = () => (
  <Badge tone="warn" caps>
    Featured
  </Badge>
);

export const ClosedBadge = () => (
  <Badge tone="bad" icon={<Lock className="size-3" aria-hidden />}>
    Closed
  </Badge>
);

/** "★ 4.9 (2,100)" or "No ratings". */
export function RatingInline({ rating, className }: { rating: RatingSummary; className?: string }) {
  if (rating.average === null) return <span className={cn("text-sm text-subtle", className)}>No ratings</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)} aria-label={`Rated ${rating.average} out of 5 from ${formatNumber(rating.count)} ratings`}>
      <Star className="size-4 fill-star text-star" aria-hidden />
      <span className="font-semibold text-fg">{rating.average.toFixed(1)}</span>
      <span className="text-subtle">({formatNumber(rating.count)})</span>
    </span>
  );
}

/* ========================= Log in prompt (W04-2) ===================== */

/**
 * Shown when a guest tries something that needs an account (save, review, claim).
 * After logging in, the user returns to this page; a pending save is completed automatically.
 */
export function LoginPrompt({
  open,
  onClose,
  title = "Log in to save stores",
  reason = "Guests can browse everything, but saving a store to your favorites needs a free shopper account so your list is kept for you.",
  pendingFavoriteId,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  reason?: ReactNode;
  /** When set, this store is saved automatically right after the user logs in. */
  pendingFavoriteId?: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const next = encodeURIComponent(location.pathname + location.search);
  const go = (path: string) => {
    if (pendingFavoriteId) rememberPendingFavorite(pendingFavoriteId);
    onClose();
    navigate(`${path}?next=${next}`);
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<Heart />}
      title={title}
      description={reason}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Not now
          </Button>
          <Button variant="secondary" icon={<UserPlus className="size-4" />} onClick={() => go("/signup")}>
            Create an account
          </Button>
          <Button variant="primary" icon={<LogIn className="size-4" />} onClick={() => go("/login")} data-autofocus>
            Log in
          </Button>
        </>
      }
    />
  );
}

/* ========================= Favorite button (FR06) ==================== */

/**
 * Heart button that saves / removes a store.
 * Guests see the log in prompt; owners and admins are told favorites are for shoppers.
 */
export function FavoriteButton({ store, variant = "icon", className }: { store: Store; variant?: "icon" | "button"; className?: string }) {
  const user = useCurrentUser();
  const toast = useToast();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState(false);
  const saved = !!user?.favorites.includes(store.id);

  const onClick = () => {
    const result = toggleFavorite(store.id);
    if (result === "login-required") setPrompt(true);
    else if (result === "shoppers-only")
      toast({ tone: "brand", title: "Favorites are for shopper accounts", description: "Log in with a shopper account to save stores." });
    else if (result === "added")
      toast({ title: `${store.name} saved to favorites`, action: { label: "View list", onClick: () => navigate("/favorites") } });
    else toast({ title: `${store.name} removed from favorites`, action: { label: "Undo", onClick: () => toggleFavorite(store.id) } });
  };

  const label = saved ? `Remove ${store.name} from favorites` : `Save ${store.name} to favorites`;
  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={onClick}
          aria-pressed={saved}
          aria-label={label}
          title={saved ? "Remove from favorites" : "Save to favorites"}
          className={cn(
            "relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors",
            saved ? "border-transparent bg-bad-soft text-bad" : "border-line bg-surface-2 text-muted hover:border-line-strong hover:text-fg",
            className,
          )}
        >
          <Heart className={cn("size-[18px] transition-transform", saved && "scale-110 fill-current")} aria-hidden />
        </button>
      ) : (
        <Button
          variant={saved ? "soft-danger" : "secondary"}
          size="lg"
          onClick={onClick}
          aria-pressed={saved}
          className={className}
          icon={<Heart className={cn("size-5", saved && "fill-current")} aria-hidden />}
        >
          {saved ? "Saved to favorites" : "Save to favorites"}
        </Button>
      )}
      <LoginPrompt open={prompt} onClose={() => setPrompt(false)} pendingFavoriteId={store.id} />
    </>
  );
}

/* ============================ Store cards =========================== */

function StoreBadges({ store, featured }: { store: Store; featured: boolean }) {
  return (
    <>
      {store.verified ? <VerifiedBadge /> : <UnverifiedBadge />}
      {store.listing === "closed" && <ClosedBadge />}
      {featured && <FeaturedBadge />}
    </>
  );
}

/** Grid card used on Home, Explore and Favorites. The whole card opens the store. */
export function StoreCard({ store, className }: { store: Store; className?: string }) {
  const data = useData();
  const rating = storeRating(data, store);
  const category = getCategory(data, store.categoryId);
  const featured = featuredStoreIds(data).has(store.id);
  return (
    <Card
      as="article"
      className={cn(
        "group relative flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-xl hover:shadow-black/10",
        store.listing === "closed" && "opacity-75",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <StoreLogo store={store} />
        <FavoriteButton store={store} />
      </div>
      <h3 className="mt-4 flex flex-wrap items-center gap-2 text-lg font-semibold leading-snug">
        <Link to={`/stores/${store.id}`} className="outline-none after:absolute after:inset-0 after:rounded-2xl group-hover:text-brand-text focus-visible:after:outline-2 focus-visible:after:outline-brand-text">
          {store.name}
        </Link>
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{store.description}</p>
      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          <RatingInline rating={rating} />
          <PriceLevel level={store.priceLevel} />
          {category && (
            <span className="inline-flex items-center gap-1 text-muted">
              <Tag className="size-3.5" aria-hidden />
              {category.name}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <StoreBadges store={store} featured={featured} />
        </div>
      </div>
    </Card>
  );
}

/** Compact horizontal row used by the Explore list view. */
export function StoreRow({ store }: { store: Store }) {
  const data = useData();
  const rating = storeRating(data, store);
  const category = getCategory(data, store.categoryId);
  const featured = featuredStoreIds(data).has(store.id);
  return (
    <Card as="article" className={cn("group relative flex items-center gap-4 p-4 transition-colors hover:border-line-strong hover:bg-surface-2", store.listing === "closed" && "opacity-75")}>
      <StoreLogo store={store} />
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">
          <Link to={`/stores/${store.id}`} className="outline-none after:absolute after:inset-0 after:rounded-2xl group-hover:text-brand-text focus-visible:after:outline-2 focus-visible:after:outline-brand-text">
            {store.name}
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-sm text-muted">{store.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          <RatingInline rating={rating} />
          <PriceLevel level={store.priceLevel} />
          {category && <span className="text-muted">{category.name}</span>}
          <span className="hidden flex-wrap gap-1.5 sm:flex">
            <StoreBadges store={store} featured={featured} />
          </span>
        </div>
      </div>
      <FavoriteButton store={store} />
    </Card>
  );
}

/** Small link with logo, name, rating and price (related stores, featured today). */
export function StoreMiniLink({ store, className }: { store: Store; className?: string }) {
  const data = useData();
  const rating = storeRating(data, store);
  const category = getCategory(data, store.categoryId);
  return (
    <Link
      to={`/stores/${store.id}`}
      className={cn("flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-line-strong hover:bg-surface-2", className)}
    >
      <StoreLogo store={store} size="md" />
      <span className="min-w-0">
        <span className="block truncate font-semibold">{store.name}</span>
        <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
          {category && <span>{category.name}</span>}
          <span aria-hidden>&middot;</span>
          {rating.average !== null ? (
            <span className="inline-flex items-center gap-0.5">
              <Star className="size-3 fill-star text-star" aria-hidden />
              {rating.average.toFixed(1)}
            </span>
          ) : (
            <span>No ratings</span>
          )}
          <span aria-hidden>&middot;</span>
          <PriceLevel level={store.priceLevel} />
        </span>
      </span>
    </Link>
  );
}

export function StoreCardSkeleton() {
  return (
    <Card className="p-5" aria-hidden>
      <div className="flex justify-between">
        <Skeleton className="size-12 rounded-xl" />
        <Skeleton className="size-10 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-5 w-1/2" />
      <Skeleton className="mt-3 h-3.5 w-full" />
      <Skeleton className="mt-2 h-3.5 w-3/4" />
      <Skeleton className="mt-5 h-4 w-2/5" />
    </Card>
  );
}

export function StoreRowSkeleton() {
  return (
    <Card className="flex items-center gap-4 p-4" aria-hidden>
      <Skeleton className="size-12 rounded-xl" />
      <div className="flex-1">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="mt-2 h-3.5 w-2/3" />
        <Skeleton className="mt-2.5 h-3.5 w-1/4" />
      </div>
    </Card>
  );
}

/* ============================== Coupons ============================= */

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers that block the async clipboard API.
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

/** "Expires 9 Dec 2026" or "Ends in 3 days" when close. */
export function expiryLabel(iso: string): string {
  const left = daysUntil(iso);
  if (left < 0) return `Expired ${formatDate(iso)}`;
  if (left === 0) return "Ends today";
  if (left <= 7) return `Ends in ${plural(left, "day")}`;
  return `Expires ${formatDate(iso)}`;
}

/** Coupon with a click-to-copy code (W04-1 #4). */
export function CouponCard({ coupon, store, className }: { coupon: Coupon; store?: Store; className?: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    const ok = await copyText(coupon.code);
    if (ok) {
      recordCouponCopy(coupon.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast({ title: `Code ${coupon.code} copied`, description: "Paste it at checkout on the store's website." });
    } else {
      toast({ tone: "bad", title: "Could not copy the code", description: `Select and copy it manually: ${coupon.code}` });
    }
  };
  return (
    <Card as="article" className={cn("flex flex-col p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        {store ? (
          <Link to={`/stores/${store.id}`} className="flex min-w-0 items-center gap-3 hover:text-brand-text">
            <StoreLogo store={store} size="sm" />
            <span className="truncate text-sm font-semibold">{store.name}</span>
          </Link>
        ) : (
          <span className="flex size-10 items-center justify-center rounded-xl bg-ok-soft text-ok">
            <Ticket className="size-5" aria-hidden />
          </span>
        )}
        <Badge tone="ok">{couponValueLabel(coupon)}</Badge>
      </div>
      <h3 className="mt-4 font-semibold">{coupon.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{coupon.description}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copy coupon code ${coupon.code}`}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border border-dashed px-3 py-2 font-mono text-sm font-bold tracking-wider transition-colors",
            copied ? "border-ok bg-ok-soft text-ok" : "border-line-strong bg-surface-2 text-fg hover:border-brand-text hover:text-brand-text",
          )}
        >
          {coupon.code}
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        </button>
        <span className="text-xs text-subtle">{expiryLabel(coupon.expiresAt)}</span>
      </div>
    </Card>
  );
}

/* ============================== Reviews ============================= */

/** One review with stars, text, date and the owner's public reply. `actions` holds Report / Edit buttons. */
export function ReviewItem({ review, storeName, actions }: { review: Review; storeName: string; actions?: ReactNode }) {
  return (
    <article className="border-b border-line py-5 last:border-b-0">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-3 text-sm font-semibold text-muted" aria-hidden>
          {initials(review.userName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="font-semibold">{review.userName}</p>
            <time className="text-xs text-subtle" dateTime={new Date(review.createdAt).toISOString()} title={formatDate(review.createdAt)}>
              {timeAgo(review.createdAt)}
            </time>
          </div>
          <div className="mt-1 flex items-center gap-1" role="img" aria-label={`${review.rating} out of 5 stars`}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} className={cn("size-3.5", i < review.rating ? "fill-star text-star" : "fill-surface-3 text-surface-3")} aria-hidden />
            ))}
          </div>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-fg/90">{review.comment}</p>
          {review.reply && (
            <div className="mt-3 rounded-xl border-l-2 border-brand bg-surface-2 px-4 py-3">
              <p className="text-xs font-semibold text-brand-text">
                Reply from {storeName} <span className="font-normal text-subtle">&middot; {timeAgo(review.reply.at)}</span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{review.reply.text}</p>
            </div>
          )}
          {actions && <div className="mt-2 flex flex-wrap gap-1">{actions}</div>}
        </div>
      </div>
    </article>
  );
}

/* ===================== Placeholder for team members ================== */

/**
 * Temporary screen for a route another member is building.
 * Replace the whole component in your own page file when you implement the screen.
 */
export function PlannedPage({
  title,
  member,
  file,
  requirements,
  tasks,
}: {
  title: string;
  member: string;
  file: string;
  requirements?: string;
  tasks: string[];
}) {
  useDocumentTitle(title);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <Card className="p-8">
        <Badge tone="warn" caps>
          In progress
        </Badge>
        <h1 className="mt-4 text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-muted">
          This screen is being built by <strong className="text-fg">{member}</strong> in <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm">{file}</code>
          {requirements && <> ({requirements})</>}.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-muted">
          {tasks.map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-text" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button to="/" variant="primary">
            Back to Home
          </Button>
          <Button to="/explore">Explore stores</Button>
        </div>
      </Card>
    </div>
  );
}
