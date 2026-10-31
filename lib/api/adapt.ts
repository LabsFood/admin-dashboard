import type { AdminClientRow, ClientProfile, ClientStatus, Role } from "./types";

/* ─────────────────────────────────────────────────────────────────────────────
   Adaptation `client_profiles` (API) → modèle d'affichage de la console.

   Une ligne de `GET /admin/clients` n'est pas un profil : c'est un **couple**
   `{ user, clientProfile }`, et `clientProfile` vaut `null` tant que la
   personne n'a pas enregistré ses goûts. La console lisait ces lignes comme
   des profils plats : l'identité s'affichait (elle est au premier niveau),
   mais l'`id` n'existait pas — chaque carte pointait vers `/clients/undefined`.
   C'est ce que les testeurs voyaient en ne pouvant « pas voir le profil d'un
   client ».

   On distingue donc les deux cas, au lieu de les confondre : un compte sans
   profil est un vrai compte, il s'affiche avec ce qu'on sait de lui et dit ce
   qui manque, plutôt que de promettre une fiche qui répondra 404.

   Restent absents de l'API en lecture : l'adresse, le foyer, le CA et le
   nombre de sessions. Les deux premiers sont pourtant acceptés en écriture par
   `PATCH /admin/clients/{id}` — demande n° 6 au backend.
   ───────────────────────────────────────────────────────────────────────────── */

export interface ClientView {
  /** id du profil (`client_profiles.id`) — clé de route, `null` sans profil. */
  id: string | null;
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
  /** `false` quand la personne n'a pas encore enregistré ses goûts. */
  hasProfile: boolean;
  /** Photo de profil du compte, `null` quand il n'y en a pas. */
  avatarUrl: string | null;
  // ── Champs non fournis par l'API (placeholder « — ») ──────────────────────
  ordersCount: number | null;
  totalSpent: number | null;
  lastOrderAt: string | null;
}

/**
 * Une ligne de liste — `{ user, clientProfile }` — vers le modèle d'affichage.
 * L'identité vient toujours du compte ; les goûts, du profil s'il existe.
 */
export function rowToClientView(row: AdminClientRow): ClientView {
  const vue = toClientView({
    ...(row.clientProfile ?? {
      id: "",
      userId: row.user.id,
      dietaryPreferences: [],
      allergies: [],
      dislikes: [],
      favorites: [],
      spiceLevel: 0,
      kitchenNotes: null,
    }),
    user: row.user,
  });
  return {
    ...vue,
    id: row.clientProfile?.id ?? null,
    userId: row.user.id,
    hasProfile: row.clientProfile !== null,
    avatarUrl: row.user.avatarUrl ?? null,
  };
}

export function toClientView(p: ClientProfile): ClientView {
  return {
    id: p.id || null,
    hasProfile: Boolean(p.id),
    avatarUrl: p.user?.avatarUrl ?? null,
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
