/**
 * App shell shared by every page: navigation bar, footer, error boundary,
 * scroll restoration and the Prototype tools panel.
 *
 * Owner: Member 1. Role links in the navbar point at routes owned by Members 2-4.
 */
import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  FlaskConical,
  Heart,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu as MenuIcon,
  Moon,
  RotateCcw,
  Search,
  ShieldCheck,
  Store as StoreIcon,
  Sun,
  User as UserIcon,
  X,
} from "lucide-react";
import type { Role, User } from "../lib/types";
import { cn, initials, timeAgo } from "../lib/format";
import { getData, loginAsDemo, logout, resetDemoData, takePendingFavorite, toggleFavorite, update, useCurrentUser, useData } from "../lib/store";
import { DEMO_ACCOUNTS } from "../lib/seed";
import { useTheme } from "../lib/theme";
import { Badge, Button, Container, EmptyState, IconButton, Modal, useToast } from "./kit";

/* ================================ Logo =============================== */

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("inline-flex items-center gap-2.5 rounded-lg", className)} aria-label="DealFinder home">
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-white shadow-lg shadow-brand/30">
        <Search className="size-5" strokeWidth={2.6} aria-hidden />
      </span>
      <span className="font-display text-xl font-bold tracking-tight">DealFinder</span>
    </Link>
  );
}

/* ============================ Small menu ============================= */

/** Dropdown that closes on outside click, Escape, or route change. */
function Dropdown({
  button,
  label,
  children,
  align = "right",
  panelClassName,
}: {
  button: (props: { open: boolean; toggle: () => void }) => ReactNode;
  label: string;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {button({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          role="menu"
          aria-label={label}
          className={cn(
            "absolute top-full z-50 mt-2 w-72 animate-pop-in overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-2xl",
            align === "right" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/* ============================ Navigation ============================= */

interface NavItem {
  to: string;
  label: string;
  icon?: ReactNode;
}

/** Links shown in the navbar for the current role (W02-1 #1). */
function navItemsFor(role: Role | null): NavItem[] {
  const items: NavItem[] = [
    { to: "/", label: "Home" },
    { to: "/explore", label: "Explore" },
  ];
  if (role === "shopper") items.push({ to: "/favorites", label: "Favorites", icon: <Heart className="size-4" aria-hidden /> });
  if (role === "owner") items.push({ to: "/portal", label: "Store Portal", icon: <StoreIcon className="size-4" aria-hidden /> });
  if (role === "admin") items.push({ to: "/admin", label: "Admin", icon: <ShieldCheck className="size-4" aria-hidden /> });
  return items;
}

const ROLE_LABEL: Record<Role, string> = { shopper: "Shopper", owner: "Store owner", admin: "Administrator" };

function ThemeToggle({ className }: { className?: string }) {
  const [theme, toggle] = useTheme();
  return (
    <IconButton label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={toggle} className={className}>
      {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </IconButton>
  );
}

function Avatar({ user, className }: { user: User; className?: string }) {
  return (
    <span className={cn("flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-text", className)} aria-hidden>
      {initials(user.name)}
    </span>
  );
}

function NotificationsMenu({ user }: { user: User }) {
  const data = useData();
  const navigate = useNavigate();
  const mine = data.notifications.filter((n) => n.userId === user.id).sort((a, b) => b.at - a.at);
  const unread = mine.filter((n) => !n.read).length;

  const markRead = (id?: string) =>
    update((d) => {
      d.notifications.forEach((n) => {
        if (n.userId === user.id && (!id || n.id === id)) n.read = true;
      });
    });

  return (
    <Dropdown
      label="Notifications"
      button={({ open, toggle }) => (
        <IconButton label={unread ? `Notifications, ${unread} unread` : "Notifications"} onClick={toggle} aria-expanded={open} className="relative">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-bad px-1 text-[0.625rem] leading-4 font-bold text-white">
              {unread}
            </span>
          )}
        </IconButton>
      )}
      panelClassName="w-80"
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-semibold">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={() => markRead()} className="text-xs font-semibold text-brand-text hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          {mine.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">You are all caught up.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {mine.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      markRead(n.id);
                      close();
                      navigate(n.link);
                    }}
                    className="flex w-full gap-3 px-4 py-3 text-left hover:bg-surface-2"
                  >
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand-text")} aria-hidden />
                    <span className="min-w-0">
                      <span className={cn("block text-sm", !n.read && "font-semibold")}>{n.text}</span>
                      <span className="block truncate text-xs text-muted">{n.sub}</span>
                      <span className="mt-0.5 block text-xs text-subtle">{timeAgo(n.at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Dropdown>
  );
}

function AccountMenu({ user }: { user: User }) {
  const navigate = useNavigate();
  const toast = useToast();
  const items = navItemsFor(user.role).slice(2);
  return (
    <Dropdown
      label="Account"
      button={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex items-center gap-2 rounded-full border border-line py-1 pr-2.5 pl-1 transition-colors hover:bg-surface-2"
        >
          <Avatar user={user} />
          <span className="hidden max-w-28 truncate text-sm font-semibold lg:block">{user.name.split(" ")[0]}</span>
          <ChevronDown className={cn("size-4 text-muted transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center gap-3 border-b border-line px-4 py-4">
            <Avatar user={user} className="size-10 text-sm" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
              <Badge tone="brand" className="mt-1">
                {ROLE_LABEL[user.role]}
              </Badge>
            </div>
          </div>
          <div className="p-2">
            {items.map((item) => (
              <Link key={item.to} to={item.to} role="menuitem" onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-surface-2">
                {item.icon}
                {item.label}
              </Link>
            ))}
            <Link to="/profile" role="menuitem" onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-surface-2">
              <UserIcon className="size-4" aria-hidden />
              Profile settings
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                logout();
                navigate("/");
                toast({ title: "You have been logged out" });
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-bad hover:bg-bad-soft"
            >
              <LogOut className="size-4" aria-hidden />
              Log out
            </button>
          </div>
        </div>
      )}
    </Dropdown>
  );
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors", isActive ? "text-brand-text" : "text-muted hover:text-fg");

export function Navbar() {
  const user = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const items = navItemsFor(user?.role ?? null);

  useEffect(() => setMobileOpen(false), [location.pathname, location.search]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {user ? (
            <>
              <NotificationsMenu user={user} />
              <div className="hidden md:block">
                <AccountMenu user={user} />
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} variant="ghost" size="sm">
                Log in
              </Button>
              <Button to="/signup" variant="primary" size="sm">
                Sign up
              </Button>
            </div>
          )}
          <IconButton label={mobileOpen ? "Close menu" : "Open menu"} onClick={() => setMobileOpen((o) => !o)} aria-expanded={mobileOpen} aria-controls="mobile-menu" className="md:hidden">
            {mobileOpen ? <X className="size-5" /> : <MenuIcon className="size-5" />}
          </IconButton>
        </div>
      </Container>

      {/* Mobile menu */}
      {mobileOpen && (
        <div id="mobile-menu" className="animate-fade-in border-t border-line bg-bg md:hidden">
          <Container className="py-4">
            {user && (
              <div className="mb-3 flex items-center gap-3 rounded-2xl bg-surface p-3">
                <Avatar user={user} className="size-10 text-sm" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted">{ROLE_LABEL[user.role]}</p>
                </div>
              </div>
            )}
            <nav aria-label="Mobile" className="flex flex-col">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) => cn("flex items-center gap-3 rounded-xl px-3 py-3 font-medium", isActive ? "bg-brand-soft text-brand-text" : "hover:bg-surface-2")}
                >
                  {item.label}
                </NavLink>
              ))}
              {user && (
                <NavLink to="/profile" className={({ isActive }) => cn("rounded-xl px-3 py-3 font-medium", isActive ? "bg-brand-soft text-brand-text" : "hover:bg-surface-2")}>
                  Profile settings
                </NavLink>
              )}
            </nav>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4">
              {user ? (
                <Button
                  variant="soft-danger"
                  className="col-span-2"
                  icon={<LogOut className="size-4" />}
                  onClick={() => {
                    logout();
                    navigate("/");
                    toast({ title: "You have been logged out" });
                  }}
                >
                  Log out
                </Button>
              ) : (
                <>
                  <Button to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} variant="secondary">
                    Log in
                  </Button>
                  <Button to="/signup" variant="primary">
                    Sign up
                  </Button>
                </>
              )}
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}

/* ================================ Footer ============================== */

export function Footer() {
  const columns: Array<{ title: string; links: Array<{ to: string; label: string }> }> = [
    {
      title: "Shoppers",
      links: [
        { to: "/explore", label: "Explore stores" },
        { to: "/favorites", label: "My favorites" },
        { to: "/signup", label: "Create an account" },
      ],
    },
    {
      title: "Store owners",
      links: [
        { to: "/signup/owner", label: "Register as a store owner" },
        { to: "/portal/stores/new", label: "Submit a store" },
        { to: "/portal/support", label: "Platform support" },
      ],
    },
  ];
  return (
    <footer className="mt-24 border-t border-line">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            Find trusted online stores by category, compare ratings and price levels, then shop on the store&rsquo;s official website.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h2 className="text-xs font-semibold tracking-[0.14em] text-subtle uppercase">{col.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-muted hover:text-fg">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h2 className="text-xs font-semibold tracking-[0.14em] text-subtle uppercase">About this prototype</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Team 24 &middot; SWE 363-02 &middot; Milestone 4 front-end. All data is fictional and stays in your browser.
          </p>
          <Link to="/guide" className="mt-3 inline-block text-sm font-semibold text-brand-text hover:underline">
            Open the requirements guide
          </Link>
        </div>
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-col gap-2 py-6 text-xs text-subtle sm:flex-row sm:justify-between">
          <p>&copy; {new Date().getFullYear()} DealFinder. DealFinder lists stores; it does not sell products or process payments.</p>
          <p>KFUPM &middot; SWE 363 Web Engineering</p>
        </Container>
      </div>
    </footer>
  );
}

/* ============================ Prototype tools ======================== */

/**
 * Floating helper for testers and graders: sign in as a demo account,
 * reset the demo data, switch theme. Not part of the real product.
 */
export function PrototypeTools() {
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const user = useCurrentUser();
  const navigate = useNavigate();
  const toast = useToast();
  const [theme, toggleTheme] = useTheme();

  const signIn = (role: Role) => {
    const result = loginAsDemo(role);
    if (result.ok) {
      setOpen(false);
      toast({ title: `Signed in as ${result.user.name}`, description: ROLE_LABEL[role] });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition-colors hover:bg-orange-600"
      >
        <FlaskConical className="size-4" aria-hidden />
        <span className="hidden sm:inline">Prototype tools</span>
        <span className="sr-only sm:hidden">Prototype tools</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        icon={<FlaskConical />}
        title="Prototype tools"
        description="Helpers for testing the prototype. They are not part of the real product."
      >
        <section>
          <h3 className="text-sm font-semibold">Sign in as a demo user</h3>
          <div className="mt-3 grid gap-2">
            {(Object.keys(DEMO_ACCOUNTS) as Role[]).map((role) => {
              const account = DEMO_ACCOUNTS[role];
              const current = user?.email === account.email;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => signIn(role)}
                  disabled={current}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-left transition-colors hover:border-brand-text disabled:cursor-default disabled:border-ok/50"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {account.label} &middot; {account.name}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {account.email} / {account.password}
                    </span>
                  </span>
                  {current ? <Badge tone="ok">Signed in</Badge> : <LogIn className="size-4 shrink-0 text-muted" aria-hidden />}
                </button>
              );
            })}
          </div>
          {user && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              icon={<LogOut className="size-4" />}
              onClick={() => {
                logout();
                setOpen(false);
                navigate("/");
                toast({ title: "You have been logged out" });
              }}
            >
              Log out ({user.name})
            </Button>
          )}
        </section>

        <section className="mt-6 grid gap-2 border-t border-line pt-5 sm:grid-cols-2">
          <Button variant="secondary" icon={theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />} onClick={toggleTheme}>
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </Button>
          <Button variant="secondary" icon={<RotateCcw className="size-4" />} onClick={() => setConfirmReset(true)}>
            Reset demo data
          </Button>
          <Button
            variant="soft"
            className="sm:col-span-2"
            icon={<LayoutDashboard className="size-4" />}
            onClick={() => {
              setOpen(false);
              navigate("/guide");
            }}
          >
            Requirements guide
          </Button>
        </section>
      </Modal>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        size="sm"
        icon={<RotateCcw />}
        title="Reset demo data?"
        description="Every change made in this browser (favorites, reviews, coupons, decisions) is replaced with the original demo data."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetDemoData();
                setConfirmReset(false);
                setOpen(false);
                toast({ title: "Demo data restored" });
              }}
            >
              Reset data
            </Button>
          </>
        }
      />
    </>
  );
}

/* ========================= Error boundary ============================ */

/** Catches crashes in a page and shows a friendly screen instead of a blank app. */
class ErrorBoundary extends Component<{ resetKey: string; children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("DealFinder page error:", error, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Container className="py-20">
        <EmptyState
          icon={<RotateCcw />}
          title="This page hit a problem"
          action={
            <>
              <Button variant="primary" onClick={() => this.setState({ error: null })}>
                Try again
              </Button>
              <Button to="/">Go home</Button>
            </>
          }
        >
          Something unexpected happened while showing this screen. Nothing you saved was lost.
        </EmptyState>
      </Container>
    );
  }
}

/* ============================== App layout ============================ */

/** Saves a store a guest tried to save, once they are signed in as a shopper (W04-2 #4). */
function usePendingFavorite() {
  const user = useCurrentUser();
  const toast = useToast();
  useEffect(() => {
    if (user?.role !== "shopper") return;
    const storeId = takePendingFavorite();
    if (!storeId) return;
    const store = getData().stores.find((s) => s.id === storeId);
    if (store && !user.favorites.includes(storeId) && toggleFavorite(storeId) === "added") {
      toast({ title: `${store.name} saved to favorites`, description: "We saved it for you after you logged in." });
    }
  }, [user, toast]);
}

/** Every page renders inside this shell (see App.tsx). */
export function AppLayout() {
  const location = useLocation();
  usePendingFavorite();

  // New page: start at the top. (Filter changes on the same page keep the scroll position.)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-50 rounded-lg bg-brand px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to main content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        <ErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      <PrototypeTools />
    </div>
  );
}
