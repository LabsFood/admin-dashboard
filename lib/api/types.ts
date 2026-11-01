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
  /** Photo de profil, depuis `POST /me/avatar/*`. `null` quand il n'y en a pas. */
  avatarUrl?: string | null;
}

export type ClientStatus = "vip" | "active" | "prospect" | "inactive";

/** Ligne `client_profiles` telle que renvoyée par l'API. */
/**
 * Une ligne de `GET /admin/clients`.
 *
 * Ce n'est pas un profil : c'est le compte **et** son profil, qui vaut `null`
 * tant que la personne n'a pas enregistré ses goûts depuis l'espace client.
 * L'id attendu par `GET|PATCH /admin/clients/{id}` est celui du **profil**,
 * pas celui du compte — d'où le besoin de garder les deux.
 */
export interface AdminClientRow {
  user: NonNullable<ClientProfile["user"]> & { avatarUrl?: string | null };
  clientProfile: ClientProfile | null;
}

/** Une ligne de `GET /admin/users` : un compte de n'importe quel rôle. */
export interface AdminUserRow extends Me {
  createdAt: string;
  /** Clé de `/clients/{id}` ; `null` sans profil client enregistré. */
  clientProfileId: string | null;
  /** Clé de `/batchcookers/{id}` ; `null` pour qui n'est pas batch cooker. */
  chefProfileId: string | null;
}

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
    avatarUrl?: string | null;
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

/* ── Candidatures batch cooker ─────────────────────────────────────────────── */

export type ChefApplicationStatus =
  | "submitted"
  | "changes-requested"
  | "approved"
  | "rejected";

/**
 * Ligne de la file d'attente — `GET /admin/chef-applications`.
 * Champs relevés sur une réponse réelle de la pré-production (PR 38).
 */
export interface ChefApplicationRow {
  id: string;
  reference: string;
  name: string;
  city: string;
  status: ChefApplicationStatus;
  /** Candidature rouverte après refus, en attente d'un nouveau regard. */
  reactivatedPendingReview: boolean;
  pendingDocuments: number;
  submittedAt: string;
  /** Ce qui rend la promesse « réponse sous 48 h ouvrées » triable. */
  waitingSinceHours: number;
  /**
   * La vitrine est-elle en ligne. Présent dans la réponse réelle, absent du
   * Swagger — aucune réponse 2xx de ces routes n'a de schéma. D'où
   * l'optionnel : l'écran montre l'état quand l'API le donne, et se taît
   * plutôt que d'affirmer « hors ligne » sur un champ manquant.
   */
  isActive?: boolean;
  /** Vérification faite par la maison, indépendante de la mise en ligne. */
  isVerified?: boolean;
}

export type ChefDocumentType =
  | "identity"
  | "registration"
  | "residence-permit"
  | "renewal-receipt"
  | "status-proof"
  | "sap-declaration"
  /** Voie Type B : attestation d'adhésion à la coopérative SAP qui porte la déclaration. */
  | "sap-cooperative"
  | "rc-pro"
  | "haccp"
  | "ddpp"
  | "vigilance"
  /** Écrit par l'API quand Stripe confirme la signature : ni déposé, ni jugé. */
  | "sepa-mandate";

/** Famille d'une pièce, telle que l'API la classe. */
export type ChefDocumentFamily = "blocking" | "conditional" | "recommended";

export type ChefDocumentStatus =
  | "missing"
  | "submitted"
  | "valid"
  | "rejected"
  | "expired";

/** Pièce du dossier. Champs relevés sur une réponse réelle (PR 37). */
export interface ChefApplicationDocument {
  type: ChefDocumentType;
  /** Libellé fourni par l'API — fait foi sur notre table locale. */
  label: string;
  family: ChefDocumentFamily;
  required: boolean;
  status: ChefDocumentStatus;
  /** 0 tant qu'aucun fichier n'a été déposé. */
  version: number;
  fileName: string | null;
  sizeBytes: number | null;
  submittedAt: string | null;
  expiresOn: string | null;
  /** Motif de refus, lu verbatim par le candidat. */
  reason: string | null;
  reasonCode: string | null;
}

/**
 * `GET /admin/chef-applications/{id}`.
 *
 * Relevé sur une réponse réelle : le détail **ne reprend pas** les champs
 * calculés de la liste (`name`, `city`, `pendingDocuments`,
 * `waitingSinceHours`, `reactivatedPendingReview`). Le nom se recompose depuis
 * `identity`, la ville depuis `address`.
 */
export interface ChefApplicationDetail {
  id: string;
  /** `users.id` du compte créé au dépôt de la candidature ; sert à lui écrire. */
  userId?: string | null;
  reference: string;
  status: ChefApplicationStatus;
  identity: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  address: {
    street: string;
    line2: string | null;
    postcode: string;
    city: string;
    country: string;
  };
  interventionZones: {
    regionCode: string;
    regionLabel: string;
    scope: "region" | "cities";
    cities: { name: string; dept: string; insee: string }[];
  }[];
  workAuthorization: { status: string; details: string | null };
  company: {
    legalForm: string;
    siret: string | null;
    sap: { path: string; declarationNumber: string | null };
  };
  consent: { privacyPolicy: boolean; terms: boolean; acceptedAt: string };
  submittedAt: string;
  decidedAt: string | null;
  /** Profil chef créé dès la soumission, avant toute validation. */
  chefProfileId: string;
  /** Statut dérivé du dossier : `draft` tant que les pièces manquent. */
  dossierStatus: string;
  /** Voir `ChefApplicationRow.isActive` : lisible, non documenté. */
  isActive?: boolean;
  isVerified?: boolean;
  /** L'API dit elle-même si l'approbation est possible. */
  canApprove: boolean;
  documents: ChefApplicationDocument[];
  /** Présent sur un dossier refusé. */
  refusal?: {
    reason?: string;
    reasonCode?: string;
    allowReapplyAfter?: string;
  };
}

export interface ChefApplicationsQuery {
  page?: number;
  limit?: number;
  status?: ChefApplicationStatus;
  hasPendingDocuments?: boolean;
  q?: string;
}
