/**
 * Shopper pages - Member 2 (Authentication and Shopper Features).
 *
 * Wireframes: W05 (review), W06 (favorites), W07 (profile). Requirements: FR01, FR06, FR07.
 * Ready to use: toggleFavorite() in src/lib/store.ts, StoreCard / StoreRow / FavoriteButton /
 * ReviewItem / LoginPrompt in src/ui/shared.tsx, containsContactDetails() in src/lib/format.ts,
 * storeRating() / visibleReviews() in src/lib/selectors.ts.
 */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Search, Trash2, TriangleAlert } from "lucide-react";
import type { Review, Store } from "../lib/types";
import { getData, toggleFavorite, update, useCurrentUser, useData } from "../lib/store";
import { getStore, isPublicStore, storeRating } from "../lib/selectors";
import { cn, isStrongPassword, isValidEmail, plural } from "../lib/format";
import { useDocumentTitle, useSimulatedLoading } from "../lib/hooks";
import { Alert, Button, Card, Container, EmptyState, Field, Input, Modal, PageHeader, Select, useToast } from "../ui/kit";
import { PlannedPage, StoreCard, StoreCardSkeleton } from "../ui/shared";
import { PasswordInput, PasswordRules, isValidPhone, wait } from "./auth";

const MEMBER = "Member 2 (Authentication and Shopper Features)";
const FILE = "src/pages/shopper.tsx";

/* ============================== Favorites ============================= */

type FavoriteSort = "recent" | "name" | "rating";

/** W06-1, FR06: the shopper's saved stores with filter, sort, remove and undo. */
export function FavoritesPage() {
  useDocumentTitle("My favorites");
  const data = useData();
  const user = useCurrentUser()!; // the route only lets shoppers in
  const toast = useToast();
  const loading = useSimulatedLoading();
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<FavoriteSort>("recent");

  // Newest saves are at the end of the list, so reverse it for "Recently saved".
  const saved = [...user.favorites].reverse().map((id) => ({ id, store: getStore(data, id) }));
  const available = saved.filter((x): x is { id: string; store: Store } => !!x.store && isPublicStore(x.store));
  const unavailable = saved.filter((x) => !x.store || !isPublicStore(x.store));
  const usedCategories = data.categories.filter((c) => available.some((x) => x.store.categoryId === c.id));

  let shown = available.map((x) => x.store).filter((st) => category === "all" || st.categoryId === category);
  if (sort === "name") shown = [...shown].sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "rating") shown = [...shown].sort((a, b) => (storeRating(data, b).average ?? 0) - (storeRating(data, a).average ?? 0));

  const removeUnavailable = (id: string, name: string) => {
    toggleFavorite(id);
    toast({ title: `${name} removed from favorites`, action: { label: "Undo", onClick: () => toggleFavorite(id) } });
  };

  return (
    <Container className="py-8 sm:py-12">
      <PageHeader
        title="My favorites"
        subtitle={loading ? "Loading your saved stores…" : `${plural(user.favorites.length, "saved store")}. Press the heart on a card to remove it.`}
        actions={
          <Button to="/explore" icon={<Search className="size-4" />}>
            Find more stores
          </Button>
        }
      />

      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <StoreCardSkeleton key={i} />
          ))}
        </div>
      ) : user.favorites.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<Heart />}
          title="No favorites yet"
          action={
            <Button variant="primary" to="/explore">
              Explore stores
            </Button>
          }
        >
          Tap the heart on any store to keep it here, so you can find it again quickly.
        </EmptyState>
      ) : (
        <>
          {available.length > 0 && (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field label="Category" htmlFor="fav-category" className="sm:w-60">
                <Select id="fav-category" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="all">All categories</option>
                  {usedCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Sort by" htmlFor="fav-sort" className="sm:w-60">
                <Select id="fav-sort" value={sort} onChange={(e) => setSort(e.target.value as FavoriteSort)}>
                  <option value="recent">Recently saved</option>
                  <option value="name">Name (A to Z)</option>
                  <option value="rating">Highest rating</option>
                </Select>
              </Field>
              <p className="text-sm text-muted sm:ml-auto sm:pb-3" aria-live="polite">
                Showing {plural(shown.length, "store")}
              </p>
            </div>
          )}

          {available.length > 0 && shown.length === 0 && (
            <EmptyState
              className="mt-6"
              icon={<Search />}
              title="No saved stores in this category"
              action={<Button onClick={() => setCategory("all")}>Show all favorites</Button>}
            >
              Pick another category or clear the filter.
            </EmptyState>
          )}

          {shown.length > 0 && (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((st) => (
                <StoreCard key={st.id} store={st} />
              ))}
            </div>
          )}

          {unavailable.length > 0 && (
            <section className="mt-10" aria-labelledby="fav-unavailable">
              <h2 id="fav-unavailable" className="text-lg font-semibold">
                No longer available
              </h2>
              <p className="mt-1 text-sm text-muted">These stores were hidden or removed by the store or by DealFinder.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {unavailable.map(({ id, store }) => (
                  <Card key={id} className="flex items-center gap-3 border-dashed p-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-muted">
                      <TriangleAlert className="size-5" aria-hidden />
                    </span>
                    <p className="min-w-0 flex-1 truncate font-semibold">{store?.name ?? "Removed store"}</p>
                    <Button size="sm" variant="soft-danger" onClick={() => removeUnavailable(id, store?.name ?? "The store")}>
                      Remove
                    </Button>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </Container>
  );
}

/* =============================== Profile ============================== */

/** W07-1, W07-2, FR01: edit details, change email and password, delete the account. */
export function ProfilePage() {
  useDocumentTitle("Profile settings");
  const user = useCurrentUser()!; // the route requires a signed-in user
  const roleLabel = user.role === "owner" ? "Store owner" : user.role === "admin" ? "Administrator" : "Shopper";
  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Profile settings" subtitle={`${user.email} · ${roleLabel}`} />
        <div className="mt-8 space-y-6">
          <DetailsSection />
          <EmailSection />
          <PasswordSection />
          {user.role !== "admin" && <DeleteAccountSection />}
        </div>
      </div>
    </Container>
  );
}

/** Card with a title and short description, used by every profile section. */
function Section({ title, description, children, danger }: { title: string; description?: ReactNode; children: ReactNode; danger?: boolean }) {
  return (
    <Card as="section" className={cn("p-5 sm:p-6", danger && "border-bad/40")}>
      <h2 className={cn("text-xl font-semibold", danger && "text-bad")}>{title}</h2>
      {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function DetailsSection() {
  const user = useCurrentUser()!;
  const toast = useToast();
  const owner = user.role === "owner";
  const original = { name: user.name, businessName: user.businessName ?? "", phone: user.phone ?? "" };
  const [v, setV] = useState(original);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof v, string>>>({});
  const [busy, setBusy] = useState(false);
  const dirty = v.name !== original.name || v.businessName !== original.businessName || v.phone !== original.phone;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!v.name.trim()) found.name = "Enter your full name.";
    else if (v.name.trim().length < 2) found.name = "Use at least 2 characters.";
    if (owner) {
      if (v.businessName.trim().length < 2) found.businessName = "Enter your business name.";
      if (!isValidPhone(v.phone)) found.phone = "Use 9 to 15 digits, for example +966 50 123 4567.";
    }
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    await wait(450);
    update((d) => {
      const u = d.users.find((x) => x.id === user.id);
      if (!u) return;
      u.name = v.name.trim();
      if (owner) {
        u.businessName = v.businessName.trim();
        u.phone = v.phone.trim();
      }
    });
    setV((s) => ({ ...s, name: s.name.trim(), businessName: s.businessName.trim(), phone: s.phone.trim() }));
    setBusy(false);
    toast({ title: "Your details were saved" });
  };

  return (
    <Section title="Your details" description="Your name appears on the reviews you write.">
      <form onSubmit={save} noValidate className="space-y-4">
        <Field label="Full name" htmlFor="pf-name" required error={errors.name}>
          <Input id="pf-name" autoComplete="name" maxLength={60} value={v.name} onChange={(e) => setV((s) => ({ ...s, name: e.target.value }))} invalid={!!errors.name} disabled={busy} />
        </Field>
        {owner && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name" htmlFor="pf-business" required error={errors.businessName}>
              <Input id="pf-business" maxLength={80} value={v.businessName} onChange={(e) => setV((s) => ({ ...s, businessName: e.target.value }))} invalid={!!errors.businessName} disabled={busy} />
            </Field>
            <Field label="Phone" htmlFor="pf-phone" required error={errors.phone}>
              <Input id="pf-phone" type="tel" autoComplete="tel" value={v.phone} onChange={(e) => setV((s) => ({ ...s, phone: e.target.value }))} invalid={!!errors.phone} disabled={busy} />
            </Field>
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted" aria-live="polite">
            {dirty ? "You have unsaved changes." : "All changes are saved."}
          </span>
          <div className="flex gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
            <Button
              variant="ghost"
              disabled={!dirty || busy}
              onClick={() => {
                setV(original);
                setErrors({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={busy} disabled={!dirty}>
              Save changes
            </Button>
          </div>
        </div>
      </form>
    </Section>
  );
}

function EmailSection() {
  const user = useCurrentUser()!;
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    const next = email.trim();
    if (!next) found.email = "Enter the new email address.";
    else if (!isValidEmail(next)) found.email = "Enter a valid email address, like name@example.com.";
    else if (next.toLowerCase() === user.email.toLowerCase()) found.email = "This is already your email address.";
    else if (getData().users.some((u) => u.email.toLowerCase() === next.toLowerCase())) found.email = "Another account already uses this email address.";
    if (!password) found.password = "Enter your current password to confirm.";
    else if (password !== user.password) found.password = "Your current password is not correct.";
    setErrors(found);
    if (found.email || found.password) return;
    setBusy(true);
    await wait(500);
    update((d) => {
      const u = d.users.find((x) => x.id === user.id);
      if (u) u.email = next;
    });
    setBusy(false);
    setEmail("");
    setPassword("");
    toast({ title: "Email address updated", description: `Log in with ${next} from now on.` });
  };

  return (
    <Section
      title="Email address"
      description={
        <>
          You log in with <strong className="text-fg">{user.email}</strong>. Enter your password to change it.
        </>
      }
    >
      <form onSubmit={save} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New email" htmlFor="pf-email" error={errors.email}>
            <Input id="pf-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} disabled={busy} />
          </Field>
          <Field label="Current password" htmlFor="pf-email-password" error={errors.password}>
            <PasswordInput id="pf-email-password" autoComplete="current-password" value={password} onChange={setPassword} invalid={!!errors.password} disabled={busy} />
          </Field>
        </div>
        <div className="flex sm:justify-end">
          <Button type="submit" variant="secondary" className="w-full sm:w-auto" loading={busy}>
            Change email
          </Button>
        </div>
      </form>
    </Section>
  );
}

function PasswordSection() {
  const user = useCurrentUser()!;
  const toast = useToast();
  const [v, setV] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof v, string>>>({});
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!v.current) found.current = "Enter your current password.";
    else if (v.current !== user.password) found.current = "Your current password is not correct.";
    if (!isStrongPassword(v.next)) found.next = "Choose a stronger password: every rule below must be met.";
    else if (v.next === user.password) found.next = "The new password must be different from the current one.";
    if (!v.confirm) found.confirm = "Type the new password again.";
    else if (v.confirm !== v.next) found.confirm = "The two passwords do not match.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    await wait(500);
    update((d) => {
      const u = d.users.find((x) => x.id === user.id);
      if (u) u.password = v.next;
    });
    setBusy(false);
    setV({ current: "", next: "", confirm: "" });
    toast({ title: "Password changed", description: "Use the new password the next time you log in." });
  };

  const set = (key: keyof typeof v) => (value: string) => setV((s) => ({ ...s, [key]: value }));
  return (
    <Section title="Password">
      <form onSubmit={save} noValidate className="space-y-4">
        <Field label="Current password" htmlFor="pf-current" error={errors.current}>
          <PasswordInput id="pf-current" autoComplete="current-password" value={v.current} onChange={set("current")} invalid={!!errors.current} disabled={busy} />
        </Field>
        <Field label="New password" htmlFor="pf-new" error={errors.next}>
          <PasswordInput id="pf-new" autoComplete="new-password" value={v.next} onChange={set("next")} invalid={!!errors.next} disabled={busy} />
          <PasswordRules value={v.next} />
        </Field>
        <Field label="Confirm new password" htmlFor="pf-confirm" error={errors.confirm}>
          <PasswordInput id="pf-confirm" autoComplete="new-password" value={v.confirm} onChange={set("confirm")} invalid={!!errors.confirm} disabled={busy} />
        </Field>
        <div className="flex sm:justify-end">
          <Button type="submit" variant="primary" className="w-full sm:w-auto" loading={busy}>
            Change password
          </Button>
        </div>
      </form>
    </Section>
  );
}

/** Removes the account and signs out. Reviews stay on the stores but are no longer linked to a person. */
function deleteAccount(userId: string) {
  update((d) => {
    d.users = d.users.filter((u) => u.id !== userId);
    for (const r of d.reviews) {
      if (r.userId === userId) {
        r.userId = null;
        r.userName = "Former member";
      }
    }
    if (d.session?.userId === userId) d.session = null;
  });
}

function DeleteAccountSection() {
  const user = useCurrentUser()!;
  const data = useData();
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Owners must hand over or close their live stores through support first.
  const liveStores = data.stores.filter((s) => s.ownerId === user.id && s.approval === "approved" && s.listing !== "closed");
  const pendingDelete = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (pendingDelete.current) deleteAccount(pendingDelete.current);
    },
    [],
  );

  const close = () => {
    setOpen(false);
    setPassword("");
    setTyped("");
    setError("");
  };

  const confirmDelete = async () => {
    if (password !== user.password) return setError("Your password is not correct.");
    setBusy(true);
    await wait(700);
    // Leave the page first. The account is removed when this page closes (see the effect above),
    // otherwise this signed-in-only page would send us to Log in as soon as the session ends.
    pendingDelete.current = user.id;
    navigate("/", { replace: true });
    toast({ title: "Your account was deleted", description: "We are sorry to see you go." });
  };

  return (
    <Section
      danger
      title="Delete account"
      description="This permanently removes your profile and favorites. Your reviews stay on the stores as “Former member”."
    >
      {liveStores.length > 0 ? (
        <Alert tone="warn" title="Close or hand over your stores first">
          You still manage {liveStores.map((s) => s.name).join(", ")}.{" "}
          <Link to="/portal/support" className="font-semibold underline">
            Contact support
          </Link>{" "}
          to transfer or close {liveStores.length === 1 ? "it" : "them"} before deleting your account.
        </Alert>
      ) : (
        <Button variant="soft-danger" icon={<Trash2 className="size-4" />} onClick={() => setOpen(true)}>
          Delete my account…
        </Button>
      )}
      <Modal
        open={open}
        onClose={close}
        icon={<TriangleAlert />}
        title="Delete your account?"
        description="This cannot be undone. Enter your password and type DELETE to confirm."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Keep my account
            </Button>
            <Button variant="danger" loading={busy} disabled={typed !== "DELETE" || !password} onClick={confirmDelete}>
              Delete forever
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Your password" htmlFor="del-password" error={error}>
            <PasswordInput id="del-password" autoComplete="current-password" value={password} onChange={setPassword} invalid={!!error} disabled={busy} />
          </Field>
          <Field label="Type DELETE" htmlFor="del-confirm">
            <Input id="del-confirm" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={busy} />
          </Field>
        </div>
      </Modal>
    </Section>
  );
}

export const WriteReviewPage = () => (
  <PlannedPage
    title="Write a review"
    member={MEMBER}
    file={FILE}
    requirements="W05-1, W05-2, FR07"
    tasks={[
      "Star selector (1-5) and review text with a 1,000 character counter",
      "Reject links, emails and phone numbers; one review per shopper per store",
      "Save with inBase: false so the store's average rating updates immediately",
      "Edit an existing review",
    ]}
  />
);

/**
 * Buttons shown under each review on the Store details page (Report, Edit).
 * TODO (Member 2): return a Report button (one report per review per user; guests get the
 * LoginPrompt) and an Edit button on the shopper's own review.
 */
export function ReviewActions(_props: { review: Review; store: Store }) {
  return null;
}
