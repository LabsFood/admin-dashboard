"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useMe } from "./api/me";

/* ─────────────────────────────────────────────────────────────────────────────
   Identité admin adossée à Clerk.

   `useAuth()` fournit l'identité (nom, email), l'état de session Clerk et
   `signOut`. Le **rôle applicatif** provient désormais de l'API (`GET /me`,
   source de vérité Postgres) et non plus de `publicMetadata` Clerk — il est
   exposé ici pour l'affichage (Sidebar, Paramètres).

   La garde d'accès autoritaire (loading / erreur / rôle) est appliquée par le
   layout `(admin)` via `useMe()` directement, afin de distinguer un rôle non
   admin d'une API injoignable.
   ───────────────────────────────────────────────────────────────────────────── */

export interface AdminUser {
  name: string;
  email: string;
  /** Rôle applicatif issu de `/me` ; `undefined` tant que la requête charge. */
  role?: string;
}

interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  signOut: () => void;
}

export function useAuth(): AuthState {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  const me = useMe();

  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  const mapped: AdminUser | null = user
    ? {
        name: user.fullName?.trim() || email || "Admin",
        email,
        role: me.data?.role,
      }
    : null;

  return {
    user: mapped,
    isAuthenticated: !!isSignedIn,
    isReady: isLoaded,
    signOut: () => clerk.signOut({ redirectUrl: "/login" }),
  };
}
