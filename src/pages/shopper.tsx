/**
 * Shopper pages - Member 2 (Authentication and Shopper Features).
 *
 * Wireframes: W05 (review), W06 (favorites), W07 (profile). Requirements: FR01, FR06, FR07.
 * Ready to use: toggleFavorite() in src/lib/store.ts, StoreCard / StoreRow / FavoriteButton /
 * ReviewItem / LoginPrompt in src/ui/shared.tsx, containsContactDetails() in src/lib/format.ts,
 * storeRating() / visibleReviews() in src/lib/selectors.ts.
 */
import { useState } from "react";
import { Heart, Search, TriangleAlert } from "lucide-react";
import type { Review, Store } from "../lib/types";
import { toggleFavorite, useCurrentUser, useData } from "../lib/store";
import { getStore, isPublicStore, storeRating } from "../lib/selectors";
import { plural } from "../lib/format";
import { useDocumentTitle, useSimulatedLoading } from "../lib/hooks";
import { Button, Card, Container, EmptyState, Field, PageHeader, Select, useToast } from "../ui/kit";
import { PlannedPage, StoreCard, StoreCardSkeleton } from "../ui/shared";

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

export const ProfilePage = () => (
  <PlannedPage
    title="Profile settings"
    member={MEMBER}
    file={FILE}
    requirements="W07-1, W07-2, FR01"
    tasks={["Edit name and contact details", "Change email and password", "Delete account with password and DELETE confirmation"]}
  />
);

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
