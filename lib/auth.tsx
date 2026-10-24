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
  /**
   * La sortie de secours, pour les écrans de panne.
   *
   * `clerk.signOut()` suppose que Clerk a fini de charger. Or les écrans qui
   * proposent « Se reconnecter » s'affichent **précisément** quand il n'a pas
   * fini : onglet réveillé après des heures, jeton que Clerk n'arrive plus à
   * rafraîchir. Le bouton appelait alors une instance qui n'était pas prête,
   * ne faisait rien, et ne disait rien — il fallait vider le stockage à la
   * main pour s'en sortir.
   *
   * Celle-ci tente la déconnexion propre, n'attend pas plus de quatre
   * secondes, puis fait à la place ce que la personne faisait elle-même :
   * effacer ce que Clerk a laissé, et repartir sur `/login`.
   */
  hardSignOut: () => void;
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
    hardSignOut: () => {
      void sortieDeSecours(() => clerk.signOut());
    },
  };
}

const MARQUEURS_CLERK = [
  "__session",
  "__client_uat",
  "__clerk_db_jwt",
  "__clerk_handshake",
];

async function sortieDeSecours(deconnexion: () => Promise<unknown>) {
  try {
    await Promise.race([
      // `.then` plutôt qu'un appel direct : si l'instance n'est pas prête,
      // elle lève de façon synchrone et la course ne démarrerait jamais.
      Promise.resolve().then(deconnexion),
      new Promise((_, rejeter) => setTimeout(() => rejeter(new Error("timeout")), 4000)),
    ]);
  } catch {
    // Tant pis : le nettoyage local suffit à repartir d'un état propre.
  }

  try {
    for (const stockage of [window.localStorage, window.sessionStorage]) {
      for (const clef of Object.keys(stockage)) {
        if (/clerk/i.test(clef)) stockage.removeItem(clef);
      }
    }
  } catch {
    // Navigation privée ou stockage bloqué : il n'y avait rien à effacer.
  }

  // Les cookies que Clerk pose côté navigateur. Ceux marqués httpOnly ne se
  // touchent pas d'ici, mais ils ne survivent pas à une session effacée.
  for (const nom of MARQUEURS_CLERK) {
    document.cookie = `${nom}=; Max-Age=0; path=/`;
  }

  window.location.replace("/login");
}
