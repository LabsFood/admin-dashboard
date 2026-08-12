import type { ClientProfile, ClientStatus } from "./types";

/* ─────────────────────────────────────────────────────────────────────────────
   Adaptation `client_profiles` (API) → modèle d'affichage de la console.

   L'API ne fournit pas encore certains champs que l'UI mock affichait
   (adresse/ville, CA, nombre de sessions, composition du foyer, dates). Ils
   sont exposés ici en `null` et rendus par un placeholder « — » côté page —
   cf. la liste « Payloads manquants » remise au backend.
   ───────────────────────────────────────────────────────────────────────────── */

export interface ClientView {
  /** id du profil (`client_profiles.id`) — sert de clé de route. */
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  status: ClientStatus;
  dietaryPreferences: string[];
  allergies: string[];
  dislikes: string[];
  favorites: string[];
  spiceLevel: number;
  kitchenNotes: string | null;
  // ── Champs non fournis par l'API (placeholder « — ») ──────────────────────
  city: string | null;
  ordersCount: number | null;
  totalSpent: number | null;
  householdSize: number | null;
  lastOrderAt: string | null;
}

export function toClientView(p: ClientProfile): ClientView {
  return {
    id: p.id,
    userId: p.userId,
    name: p.user?.fullName?.trim() || p.user?.email || "Client",
    email: p.user?.email ?? "",
    phone: p.user?.phone ?? null,
    status: p.status ?? "prospect",
    dietaryPreferences: p.dietaryPreferences ?? [],
    allergies: p.allergies ?? [],
    dislikes: p.dislikes ?? [],
    favorites: p.favorites ?? [],
    spiceLevel: p.spiceLevel ?? 0,
    kitchenNotes: p.kitchenNotes ?? null,
    city: null,
    ordersCount: null,
    totalSpent: null,
    householdSize: null,
    lastOrderAt: null,
  };
}
