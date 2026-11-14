/**
 * DealFinder UI kit: the generic building blocks every page uses.
 * (Buttons, form fields, cards, badges, modal, toast, stars, price level, loading and empty states.)
 *
 * Owner: Member 1. Other members: import from here instead of styling raw elements,
 * so every screen looks the same in both themes. Need a variant? Add a prop here.
 */
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { CircleCheck, ChevronDown, CircleAlert, Info, LoaderCircle, Search, Star, X } from "lucide-react";
import { cn } from "../lib/format";
import type { PriceLevel as PriceLevelValue } from "../lib/types";

export { cn };

/* ============================== Layout ============================== */

/** Centered page width with responsive side padding. */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

/** Page title block used at the top of most pages. */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-text">{eyebrow}</p>}
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Rounded panel with a border. */
export function Card({
  className,
  children,
  as: Tag = "div",
  ...rest
}: { className?: string; children: ReactNode; as?: "div" | "section" | "article" | "aside" } & HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn("rounded-2xl border border-line bg-surface", className)} {...rest}>
      {children}
    </Tag>
  );
}

/* ============================== Buttons ============================= */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "soft" | "soft-danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 select-none disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white shadow-sm shadow-brand/20 hover:bg-brand-hover",
  secondary: "border border-line-strong bg-surface-2 text-fg hover:bg-surface-3",
  ghost: "text-muted hover:bg-surface-2 hover:text-fg",
  danger: "bg-red-600 text-white hover:bg-red-700",
  soft: "bg-brand-soft text-brand-text hover:bg-brand/25",
  "soft-danger": "border border-bad/30 bg-bad-soft text-bad hover:bg-bad/20",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-13 px-6 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders a router link instead of a button. */
  to?: string;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md", extra?: string) {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], extra);
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", to, loading, icon, iconRight, fullWidth, className, children, disabled, type = "button", ...rest },
  ref,
) {
  const classes = buttonClasses(variant, size, cn(fullWidth && "w-full", className));
  const content = (
    <>
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
      {!loading && iconRight}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={classes} aria-disabled={disabled || undefined}>
        {content}
      </Link>
    );
  }
  return (
    <button ref={ref} type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
});

/** Square icon-only button. `label` is read by screen readers and shown as a tooltip. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: "sm" | "md"; active?: boolean }
>(function IconButton({ label, size = "md", active, className, children, type = "button", ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl transition-colors",
        size === "sm" ? "size-9" : "size-10",
        active ? "bg-brand-soft text-brand-text" : "text-muted hover:bg-surface-2 hover:text-fg",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

/* =============================== Badges ============================= */

type Tone = "neutral" | "brand" | "ok" | "warn" | "bad";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-3 text-muted",
  brand: "bg-brand-soft text-brand-text",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
};

export function Badge({
  tone = "neutral",
  icon,
  className,
  children,
  caps,
}: {
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
  /** Small uppercase style (FEATURED). */
  caps?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        caps && "uppercase tracking-wider text-[0.68rem]",
        toneClasses[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/* ============================ Form fields =========================== */

const controlBase =
  "w-full rounded-xl border bg-surface-2 text-fg placeholder:text-subtle transition-colors outline-none focus:border-brand-text focus:ring-2 focus:ring-brand/25 disabled:opacity-60";

/** Label + control + hint/error. Pass the control as children and the same `id`. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-fg">
        {label}
        {required && (
          <span className="ml-0.5 text-bad" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="flex items-start gap-1.5 text-sm text-bad">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-hint`} className="text-xs leading-relaxed text-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(controlBase, "h-11 px-3.5 text-sm", invalid ? "border-bad" : "border-line", className)}
        {...rest}
      />
    );
  },
);

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function TextArea({ className, invalid, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(controlBase, "min-h-28 px-3.5 py-2.5 text-sm leading-relaxed", invalid ? "border-bad" : "border-line", className)}
        {...rest}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className, invalid, children, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(controlBase, "h-11 cursor-pointer appearance-none pr-10 pl-3.5 text-sm", invalid ? "border-bad" : "border-line", className)}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
      </div>
    );
  },
);

export function Checkbox({
  label,
  description,
  checked,
  onChange,
  id,
  className,
}: {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  className?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} className={cn("flex cursor-pointer items-start gap-3 text-sm", className)}>
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded accent-brand"
      />
      <span>
        <span className="font-medium text-fg">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-subtle">{description}</span>}
      </span>
    </label>
  );
}

/** Search field with an icon and a clear (x) button. */
export const SearchInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "size"> & {
    value: string;
    onValueChange: (value: string) => void;
    size?: "md" | "lg";
  }
>(function SearchInput({ value, onValueChange, size = "md", className, ...rest }, ref) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted", size === "lg" ? "left-4 size-5" : "left-3.5 size-4")}
        aria-hidden
      />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          controlBase,
          "border-line [&::-webkit-search-cancel-button]:hidden",
          size === "lg" ? "h-14 pr-12 pl-12 text-base" : "h-12 pr-10 pl-10 text-sm",
        )}
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={() => onValueChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-2.5 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-surface-3 hover:text-fg"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
});

/** Row of toggle buttons where exactly one is selected (e.g. Any / $ / $$ / $$$). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: Array<{ value: T; label: ReactNode; title?: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("flex gap-2", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            title={o.title}
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-10 flex-1 rounded-xl border px-3 text-sm font-semibold transition-colors",
              active ? "border-brand bg-brand text-white" : "border-line bg-surface-2 text-fg hover:border-line-strong hover:bg-surface-3",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ========================= Ratings and price ======================== */

/** Five stars filled to `value` (supports fractions such as 4.7). */
export function Stars({ value, size = "md", className }: { value: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const px = size === "sm" ? "size-3.5" : size === "lg" ? "size-5" : "size-4";
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const row = (filled: boolean) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={cn(px, "shrink-0", filled ? "fill-star text-star" : "fill-surface-3 text-surface-3")} aria-hidden strokeWidth={1.5} />
    ));
  return (
    <span className={cn("relative inline-flex", className)} role="img" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <span className="flex gap-0.5">{row(false)}</span>
      <span className="absolute inset-y-0 left-0 flex gap-0.5 overflow-hidden" style={{ width: `${pct}%` }}>
        {row(true)}
      </span>
    </span>
  );
}

const PRICE_WORDS: Record<PriceLevelValue, string> = { 1: "low", 2: "medium", 3: "high" };

/** "$$$" with the store's level highlighted. Price levels are general, not exact prices. */
export function PriceLevel({ level, className }: { level: PriceLevelValue; className?: string }) {
  return (
    <span
      className={cn("inline-flex font-semibold tracking-tight", className)}
      role="img"
      aria-label={`Price level ${"$".repeat(level)} (${PRICE_WORDS[level]})`}
      title={`Price level: ${PRICE_WORDS[level]}`}
    >
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= level ? "text-ok" : "text-subtle/50"} aria-hidden>
          $
        </span>
      ))}
    </span>
  );
}

/* ====================== Loading and empty states ==================== */

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-muted", className)}>
      <LoaderCircle className="size-5 animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Grey placeholder block shown while content loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-3", className)} aria-hidden />;
}

/** Friendly message instead of a blank area (no results, nothing saved yet, ...). */
export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center", className)}>
      {icon && <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-muted [&>svg]:size-7">{icon}</div>}
      <h2 className="text-xl font-semibold">{title}</h2>
      {children && <div className="mt-2 max-w-md text-sm leading-relaxed text-muted">{children}</div>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

/** Inline information / warning / error box. */
export function Alert({
  tone = "brand",
  title,
  children,
  className,
}: {
  tone?: "brand" | "ok" | "warn" | "bad";
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const Icon = tone === "ok" ? CircleCheck : tone === "brand" ? Info : CircleAlert;
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl px-4 py-3 text-sm", toneClasses[tone], className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn("leading-relaxed", title ? "mt-0.5 opacity-90" : undefined)}>{children}</div>}
      </div>
    </div>
  );
}

/* =============================== Modal ============================== */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog: closes on Escape or backdrop click, keeps keyboard focus inside,
 * and returns focus to the button that opened it.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  icon,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();
    const scrollY = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      } else if (e.key === "Tab" && panel) {
        const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!items.length) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = scrollY;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-overlay backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "relative max-h-[92dvh] w-full animate-pop-in overflow-y-auto rounded-t-3xl border border-line bg-surface p-6 shadow-2xl outline-none sm:rounded-3xl",
          size === "sm" ? "sm:max-w-sm" : size === "lg" ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
      >
        <IconButton label="Close" size="sm" onClick={onClose} className="absolute top-4 right-4">
          <X className="size-4" />
        </IconButton>
        {icon && <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-text [&>svg]:size-6">{icon}</div>}
        <h2 id={titleId} className="pr-8 text-xl font-semibold">
          {title}
        </h2>
        {description && (
          <div id={descId} className="mt-2 text-sm leading-relaxed text-muted">
            {description}
          </div>
        )}
        {children && <div className="mt-5">{children}</div>}
        {footer && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* =============================== Toasts ============================= */

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: "ok" | "brand" | "bad";
  action?: { label: string; onClick: () => void };
  /** Milliseconds before it disappears (default 4500). */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

const ToastContext = createContext<(options: ToastOptions) => void>(() => {});

/** Show a short confirmation message: `const toast = useToast(); toast({ title: "Saved" })`. */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-2), { ...options, id }]);
      window.setTimeout(() => dismiss(id), options.duration ?? 4500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
      >
        {items.map((t) => {
          const Icon = t.tone === "bad" ? CircleAlert : t.tone === "brand" ? Info : CircleCheck;
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-2xl border border-line-strong bg-surface-2 p-4 shadow-2xl"
            >
              <Icon className={cn("mt-0.5 size-5 shrink-0", t.tone === "bad" ? "text-bad" : t.tone === "brand" ? "text-brand-text" : "text-ok")} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.description && <p className="mt-0.5 text-sm text-muted">{t.description}</p>}
              </div>
              {t.action && (
                <button
                  type="button"
                  className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-brand-text hover:bg-brand-soft"
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button type="button" aria-label="Dismiss" className="shrink-0 text-subtle hover:text-fg" onClick={() => dismiss(t.id)}>
                <X className="size-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
