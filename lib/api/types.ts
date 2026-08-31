/* Types partagés reflétant les payloads de l'API Labs Food (Swagger v1.2.0). */

export type Role = "client" | "chef" | "admin";

/** Métadonnées de pagination accompagnant les endpoints de liste. */
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Enveloppe renvoyée par les endpoints de liste (`GET /admin/clients`, …).
 * Les listes ne sont plus des tableaux nus : `{ data, meta }`.
 */
export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

/** Réponse de `GET /me` — utilisateur applicatif persisté. */
export interface Me {
  id: string;
  clerkUserId: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: Role;
}

export type ClientStatus = "vip" | "active" | "prospect" | "inactive";

/** Ligne `client_profiles` telle que renvoyée par l'API. */
export interface ClientProfile {
  id: string;
  userId: string;
  dietaryPreferences: string[];
  allergies: string[];
  dislikes: string[];
  favorites: string[];
  spiceLevel: number;
  kitchenNotes: string | null;
  householdAdults?: number | null;
  householdKids?: number | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressPostalCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
  status?: ClientStatus;
  user?: {
    id: string;
    clerkUserId: string;
    email: string;
    fullName: string | null;
    phone: string | null;
    role: Role;
  };
}

/** Réponse de `GET /me/profile` — user + profil de goûts optionnel. */
export interface MeProfile {
  user: Me;
  profile: ClientProfile | null;
}

/** Corps de `PATCH /me/profile` et `PATCH /admin/clients/{id}` (partiel). */
export interface ClientProfilePatch {
  dietaryPreferences?: string[];
  allergies?: string[];
  dislikes?: string[];
  favorites?: string[];
  spiceLevel?: number;
  kitchenNotes?: string;
  status?: ClientStatus;
}
