import type { ClientProfile, ClientStatus, Role } from "./types";

/* ─────────────────────────────────────────────────────────────────────────────
   Adaptation `client_profiles` (API) → modèle d'affichage de la console.

   L'API fournit désormais l'adresse, la composition du foyer et les dates de
   création. Restent absents : le CA et le nombre de sessions (endpoints
   commandes/réservations non exposés). Ces derniers sont laissés à `null` et
   rendus par un placeholder « — » côté page.
   ───────────────────────────────────────────────────────────────────────────── */

export interface ClientView {
  /** id du profil (`client_profiles.id`) — sert de clé de route. */
  id: string;
  /** uuid `users.id` — attendu par `PATCH /admin/users/{id}/role`. */
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  /** Rôle applicatif (`users.role`), source de vérité RBAC. */
  role: Role;
  status: ClientStatus;
  dietaryPreferences: string[];
  allergies: string[];
  dislikes: string[];
  favorites: string[];
  spiceLevel: number;
  kitchenNotes: string | null;
  /** Ville seule — colonne « Ville » de la liste. */
  city: string | null;
  /** Adresse complète formatée — affichée sur la fiche client. */
  address: string | null;
  /** Adultes + enfants, `null` si l'API ne renseigne ni l'un ni l'autre. */
  householdSize: number | null;
  /** Date de création du profil (`client_profiles.created_at`). */
  createdAt: string | null;
  // ── Champs non fournis par l'API (placeholder « — ») ──────────────────────
  ordersCount: number | null;
  totalSpent: number | null;
  lastOrderAt: string | null;
}

export function toClientView(p: ClientProfile): ClientView {
  return {
    id: p.id,
    userId: p.userId,
    name: p.user?.fullName?.trim() || p.user?.email || "Client",
    email: p.user?.email ?? "",
    phone: p.user?.phone ?? null,
    role: p.user?.role ?? "client",
    status: p.status ?? "prospect",
    dietaryPreferences: p.dietaryPreferences ?? [],
    allergies: p.allergies ?? [],
    dislikes: p.dislikes ?? [],
    favorites: p.favorites ?? [],
    spiceLevel: p.spiceLevel ?? 0,
    kitchenNotes: p.kitchenNotes ?? null,
    city: p.addressCity ?? null,
    address: formatAddress(p),
    householdSize: householdSize(p),
    createdAt: p.createdAt ?? null,
    ordersCount: null,
    totalSpent: null,
    lastOrderAt: null,
  };
}

/** « 12 rue de Bepanda, 75002 Paris » — les parties absentes sont omises. */
function formatAddress(p: ClientProfile): string | null {
  const cityLine = [p.addressPostalCode, p.addressCity]
    .filter(Boolean)
    .join(" ");
  const parts = [p.addressStreet, cityLine].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

/** `null` tant qu'aucune des deux composantes n'est renseignée (≠ foyer vide). */
function householdSize(p: ClientProfile): number | null {
  if (p.householdAdults == null && p.householdKids == null) return null;
  return (p.householdAdults ?? 0) + (p.householdKids ?? 0);
}
