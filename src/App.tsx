/**
 * All application routes.
 *
 * Team agreement: coordinate before editing this file. When you build a screen,
 * replace the placeholder component in YOUR page file and add any extra routes
 * in your own section below, so merges stay small.
 *
 *   Member 1  Public UI        src/pages/public.tsx
 *   Member 2  Auth + shopper   src/pages/auth.tsx, src/pages/shopper.tsx
 *   Member 3  Owner portal     src/pages/owner.tsx, ownerParts.tsx, ownerTools.tsx
 *   Member 4  Admin + system   src/pages/admin.tsx, admin2.tsx, system.tsx
 */
import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { Role } from "./lib/types";
import { useCurrentUser } from "./lib/store";
import { AppLayout } from "./ui/layout";

// Member 1 - public pages
import { ExplorePage, HomePage, NotFoundPage, StoreDetailsPage } from "./pages/public";
// Member 2 - authentication and shopper
import { ActivatePage, ForgotPasswordPage, LoginPage, OwnerSignUpPage, SignUpPage } from "./pages/auth";
import { FavoritesPage, ProfilePage, WriteReviewPage } from "./pages/shopper";
// Member 3 - store owner portal
import { OwnerDashboardPage, OwnerPortalPage } from "./pages/owner";
import { AddStorePage, ClaimStorePage } from "./pages/ownerParts";
import { SupportPage } from "./pages/ownerTools";
// Member 4 - administrator and system pages
import { AdminApplicationPage, AdminCatalogPage, AdminDashboardPage, AdminQueuePage, AdminStoreFormPage } from "./pages/admin";
import {
  AdminAnalyticsPage,
  AdminCategoriesPage,
  AdminFeaturedPage,
  AdminModerationPage,
  AdminSectionPage,
  AdminSupportPage,
} from "./pages/admin2";
import { AccessDeniedPage, GuidePage } from "./pages/system";

/**
 * Protects a route by role (NFR security: role-based access control).
 * Guests are sent to Log in and brought back afterwards; signed-in users
 * with the wrong role see Access denied.
 */
export function RequireRole({ role, children }: { role: Role | "any"; children: ReactNode }) {
  const user = useCurrentUser();
  const location = useLocation();
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}&reason=login`} replace />;
  }
  if (role !== "any" && user.role !== role) return <AccessDeniedPage need={role} />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* ---------- Member 1: public pages (FR02-FR05, FR08) ---------- */}
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="stores/:storeId" element={<StoreDetailsPage />} />

        {/* ---------- Member 2: authentication (FR01, FR09) ---------- */}
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignUpPage />} />
        <Route path="signup/owner" element={<OwnerSignUpPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="activate" element={<ActivatePage />} />

        {/* ---------- Member 2: shopper features (FR01, FR06, FR07) ---------- */}
        <Route path="favorites" element={<RequireRole role="shopper"><FavoritesPage /></RequireRole>} />
        <Route path="profile" element={<RequireRole role="any"><ProfilePage /></RequireRole>} />
        <Route path="stores/:storeId/review" element={<RequireRole role="shopper"><WriteReviewPage /></RequireRole>} />

        {/* ---------- Member 3: store owner portal (FR09-FR16) ---------- */}
        <Route path="portal" element={<RequireRole role="owner"><OwnerDashboardPage /></RequireRole>} />
        <Route path="portal/stores/new" element={<RequireRole role="owner"><AddStorePage /></RequireRole>} />
        <Route path="portal/claim/:storeId" element={<RequireRole role="owner"><ClaimStorePage /></RequireRole>} />
        <Route path="portal/support/*" element={<RequireRole role="owner"><SupportPage /></RequireRole>} />
        <Route path="portal/*" element={<RequireRole role="owner"><OwnerPortalPage /></RequireRole>} />

        {/* ---------- Member 4: administrator portal (FR17-FR24) ---------- */}
        <Route path="admin" element={<RequireRole role="admin"><AdminDashboardPage /></RequireRole>} />
        <Route path="admin/queue" element={<RequireRole role="admin"><AdminQueuePage /></RequireRole>} />
        <Route path="admin/queue/:appId" element={<RequireRole role="admin"><AdminApplicationPage /></RequireRole>} />
        <Route path="admin/catalog" element={<RequireRole role="admin"><AdminCatalogPage /></RequireRole>} />
        <Route path="admin/catalog/new" element={<RequireRole role="admin"><AdminStoreFormPage /></RequireRole>} />
        <Route path="admin/catalog/:storeId" element={<RequireRole role="admin"><AdminStoreFormPage /></RequireRole>} />
        <Route path="admin/categories" element={<RequireRole role="admin"><AdminCategoriesPage /></RequireRole>} />
        <Route path="admin/moderation" element={<RequireRole role="admin"><AdminModerationPage /></RequireRole>} />
        <Route path="admin/featured" element={<RequireRole role="admin"><AdminFeaturedPage /></RequireRole>} />
        <Route path="admin/analytics" element={<RequireRole role="admin"><AdminAnalyticsPage /></RequireRole>} />
        <Route path="admin/support" element={<RequireRole role="admin"><AdminSupportPage /></RequireRole>} />
        <Route path="admin/support/:ticketId" element={<RequireRole role="admin"><AdminSupportPage /></RequireRole>} />
        <Route path="admin/*" element={<RequireRole role="admin"><AdminSectionPage /></RequireRole>} />

        {/* ---------- Member 4: system pages ---------- */}
        <Route path="guide" element={<GuidePage />} />

        {/* ---------- Member 1: 404 ---------- */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
