/* Types partagés reflétant les payloads de l'API Labs Food (Swagger v1.2.0). */

export type Role = "client" | "chef" | "admin";

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
