"use client";

import { useUser, useClerk } from "@clerk/nextjs";

/* ─────────────────────────────────────────────────────────────────────────────
   Authentification admin adossée à Clerk.

   La console réutilise l'instance Clerk de l'espace client. L'accès est réservé
   aux comptes dont `publicMetadata.role === "admin"` (garde appliquée par le
   middleware et par le layout `(admin)`).

   Ce hook conserve volontairement l'ancienne interface `useAuth()` — `user`,
   `signOut`, `isAuthenticated`, `isReady` — pour que la Sidebar, la Topbar et le
   layout restent inchangés. Il ajoute `isAdmin`.
   ───────────────────────────────────────────────────────────────────────────── */

export interface AdminUser {
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  isAdmin: boolean;
  signOut: () => void;
}

export function useAuth(): AuthState {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();

  const role =
    (user?.publicMetadata?.role as string | undefined) ?? undefined;
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  const mapped: AdminUser | null = user
    ? {
        name: user.fullName?.trim() || email || "Admin",
        email,
        role: role ?? "Administrateur",
      }
    : null;

  return {
    user: mapped,
    isAuthenticated: !!isSignedIn,
    isReady: isLoaded,
    isAdmin: role === "admin",
    signOut: () => clerk.signOut({ redirectUrl: "/login" }),
  };
}
