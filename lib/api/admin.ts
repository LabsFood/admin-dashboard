"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ApiError, useApiFetch } from "./client";
import { adminErrorMessage } from "./errors";
import type {
  AdminClientRow,
  AdminUserRow,
  ChefApplicationDetail,
  ChefApplicationRow,
  ChefApplicationsQuery,
  ClientProfile,
  ClientProfilePatch,
  ClientStatus,
  Me,
  Paginated,
  Role,
} from "./types";
import type { ChefTier } from "./chefs";

/* ── Clients (client_profiles) ─────────────────────────────────────────────── */

export interface ClientsQuery {
  status?: ClientStatus;
  page?: number;
  limit?: number;
  /**
   * `false` garde la requête en sommeil, sans toucher à la clé de cache : la
   * palette de recherche s'en sert pour ne charger ses sources qu'à
   * l'ouverture, tout en partageant le cache des écrans.
   */
  enabled?: boolean;
}

/**
 * `GET /admin/clients` — liste paginée des profils clients.
 *
 * La réponse est l'enveloppe `{ data, meta }` : sans `page`/`limit`, l'API
 * applique ses valeurs par défaut (page 1, 20 éléments) et `meta.total` porte
 * le nombre réel de clients.
 */
export function useClients({ status, page, limit, enabled }: ClientsQuery = {}) {
  const apiFetch = useApiFetch();

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (page != null) params.set("page", String(page));
  if (limit != null) params.set("limit", String(limit));
  const qs = params.toString();
  const query = qs ? `?${qs}` : "";

  return useQuery({
    queryKey: ["clients", { status: status ?? "all", page, limit }],
    queryFn: () => apiFetch<Paginated<AdminClientRow>>(`/admin/clients${query}`),
    enabled: enabled ?? true,
  });
}

/**
 * `GET /admin/clients/{id}` — un profil client par id **de profil**.
 *
 * Deux pièges que l'API documente et qu'il faut absorber ici :
 *
 * - un id inconnu répond `200` **avec un corps vide**, pas `404`. Sans ce
 *   garde-fou, le corps `null` traversait l'adaptateur et la page affichait
 *   « Chargement impossible » suivi d'une erreur JavaScript ;
 * - l'id attendu est celui de `client_profiles`, jamais celui du compte.
 */
export function useClient(id: string | undefined) {
  const apiFetch = useApiFetch();

  return useQuery({
    queryKey: ["clients", "detail", id],
    queryFn: async () => {
      const res = await apiFetch<ClientProfile | { data: ClientProfile } | null>(
        `/admin/clients/${id}`,
      );
      // Corps vide : la ressource n'existe pas. On le dit comme tel plutôt que
      // de laisser un `null` se propager jusqu'à l'affichage.
      if (!res) {
        throw new ApiError(404, "Aucun profil client avec cet identifiant.");
      }
      // Tolérant : l'API enveloppe les listes dans `{ data, meta }`, on accepte
      // la même enveloppe sur la ressource unitaire si elle arrive un jour.
      return "data" in res ? res.data : res;
    },
    enabled: !!id,
  });
}

/** `PATCH /admin/clients/{id}` — met à jour statut / notes / préférences. */
export function useUpdateClient(id: string) {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (patch: ClientProfilePatch) =>
      apiFetch<ClientProfile>(`/admin/clients/${id}`, {
        method: "PATCH",
        body: patch,
      }),
    // Attendu : la fiche est relue avant que l'appelant referme son formulaire,
    // sinon les anciennes valeurs se réaffichent un instant.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

/* ── Users (provisioning / rôles) ──────────────────────────────────────────── */

/**
 * Corps de `POST /admin/users` (`CreateAdminUserDto`).
 * Seul `email` est requis ; omettre `password` crée un compte *passwordless*
 * (l'utilisateur finalise sa connexion via le lien magique Clerk).
 */
export interface ProvisionUserInput {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
}

/**
 * `GET /admin/users` — tous les comptes, admins compris, les plus récents
 * d'abord. Seule liste où figurent les admins, qui n'ont ni profil client ni
 * profil batch cooker.
 *
 * ponytail: une seule page de 100 (le maximum de l'API), triée et filtrée côté
 * console ; passer à la pagination serveur quand `meta.hasNextPage` devient vrai.
 */
export function useUsers() {
  const apiFetch = useApiFetch();

  return useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<Paginated<AdminUserRow>>("/admin/users?limit=100"),
  });
}

/**
 * `POST /admin/users` — crée le compte Clerk (Backend API) **et** la ligne
 * Postgres `users` avec le rôle demandé.
 *
 * Aucun `client_profiles` n'est créé au passage : le compte apparaît dans
 * `GET /admin/users`, pas dans `GET /admin/clients` tant que la personne n'a
 * pas enregistré son profil de goûts depuis l'espace client.
 */
export function useProvisionUser() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: ProvisionUserInput) =>
      apiFetch<Me>("/admin/users", { method: "POST", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

/**
 * `PATCH /admin/users/{id}/role` — change le rôle applicatif (source de vérité
 * RBAC côté Postgres). `id` est l'uuid `users.id` — **pas** l'id Clerk ni l'id
 * du profil client.
 */
export function useSetUserRole() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      apiFetch<Me>(`/admin/users/${id}/role`, {
        method: "PATCH",
        body: { role },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      // Le rôle de l'admin courant peut avoir changé (auto-rétrogradation).
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

/* ── Candidatures batch cooker ─────────────────────────────────────────────── */

/**
 * `GET /admin/chef-applications` — file d'attente, la plus vieille d'abord.
 *
 * Enveloppe `{ data, meta }` comme les autres listes. Les filtres sont ceux de
 * l'API : statut, dossiers avec pièces en attente, recherche libre sur nom,
 * email, ville et référence.
 */
export function useChefApplications({
  page,
  limit,
  status,
  hasPendingDocuments,
  q,
  enabled,
}: ChefApplicationsQuery & { enabled?: boolean } = {}) {
  const apiFetch = useApiFetch();

  const params = new URLSearchParams();
  if (page != null) params.set("page", String(page));
  if (limit != null) params.set("limit", String(limit));
  if (status) params.set("status", status);
  if (hasPendingDocuments) params.set("hasPendingDocuments", "true");
  if (q?.trim()) params.set("q", q.trim());
  const qs = params.toString();

  return useQuery({
    queryKey: [
      "chef-applications",
      { page, limit, status: status ?? "all", hasPendingDocuments, q: q?.trim() ?? "" },
    ],
    queryFn: () =>
      apiFetch<Paginated<ChefApplicationRow>>(
        `/admin/chef-applications${qs ? `?${qs}` : ""}`,
      ),
    // Une file d'attente vieillit : `waitingSinceHours` n'a de sens que frais.
    staleTime: 30_000,
    enabled: enabled ?? true,
  });
}

/** `GET /admin/chef-applications/{id}` — dossier complet d'une candidature. */
export function useChefApplication(id: string | undefined) {
  const apiFetch = useApiFetch();

  return useQuery({
    queryKey: ["chef-applications", "detail", id],
    queryFn: async () => {
      const res = await apiFetch<
        ChefApplicationDetail | { data: ChefApplicationDetail }
      >(`/admin/chef-applications/${id}`);
      // Tolérant : la ressource unitaire pourrait arriver enveloppée comme
      // les listes.
      return res && typeof res === "object" && "data" in res ? res.data : res;
    },
    enabled: !!id,
  });
}

/* ── Décisions sur une candidature ─────────────────────────────────────────── */

/**
 * Ces routes passent par le proxy same-origin `/lf-api/*` : pas de préflight,
 * donc le `PATCH` d'une pièce fonctionne malgré le CORS de la pré-production
 * qui n'annonce que `GET, HEAD, POST`.
 */
function useApplicationMutation<TInput>(
  build: (input: TInput) => { path: string; method: "POST" | "PATCH"; body?: unknown },
  id: string,
) {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: TInput) => {
      const { path, method, body } = build(input);
      return apiFetch<unknown>(path, { method, body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chef-applications"] });
      qc.invalidateQueries({ queryKey: ["chef-applications", "detail", id] });
    },
  });
}

export interface DocumentDecision {
  type: string;
  decision: "valid" | "rejected";
  /** Obligatoire sur un refus : le candidat le lit mot pour mot. */
  reason?: string;
  reasonCode?: string;
}

/** `PATCH /admin/chef-applications/{id}/documents/{type}` */
export function useDecideDocument(id: string) {
  return useApplicationMutation<DocumentDecision>(
    ({ type, decision, reason, reasonCode }) => ({
      path: `/admin/chef-applications/${id}/documents/${type}`,
      method: "PATCH",
      body: {
        decision,
        ...(reason ? { reason } : {}),
        ...(reasonCode ? { reasonCode } : {}),
      },
    }),
    id,
  );
}

/** `POST /admin/chef-applications/{id}/request-changes` */
export function useRequestChanges(id: string) {
  return useApplicationMutation<{ message: string; documentTypes: string[] }>(
    (body) => ({
      path: `/admin/chef-applications/${id}/request-changes`,
      method: "POST",
      body,
    }),
    id,
  );
}

/** `POST /admin/chef-applications/{id}/approve` */
export function useApproveApplication(id: string) {
  return useApplicationMutation<{ isActive?: boolean; note?: string }>(
    (body) => ({
      path: `/admin/chef-applications/${id}/approve`,
      method: "POST",
      body,
    }),
    id,
  );
}

/** `POST /admin/chef-applications/{id}/reject` */
export function useRejectApplication(id: string) {
  return useApplicationMutation<{
    reason: string;
    reasonCode?: string;
    allowReapplyAfter?: string;
  }>(
    (body) => ({
      path: `/admin/chef-applications/${id}/reject`,
      method: "POST",
      body,
    }),
    id,
  );
}

/**
 * `GET /chefs/{id}/showcase` — quel menu le batch cooker montre chaque semaine.
 *
 * Route **publique** : elle ne rend que ce qu'un client verrait. Une semaine
 * dont le menu n'est pas publié arrive avec `menu: null`. Huit semaines par
 * défaut, vingt-six au plus.
 */
export interface ShowcaseWeek {
  weekStart?: string;
  menu?: { id?: string; title?: string; status?: string } | null;
}

export function useChefShowcase(chefProfileId: string | undefined) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: ["admin", "chef-showcase", chefProfileId],
    queryFn: async () => {
      const r = await apiFetch<ShowcaseWeek[] | { weeks?: ShowcaseWeek[] }>(
        `/chefs/${chefProfileId}/showcase`,
      );
      return Array.isArray(r) ? r : (r?.weeks ?? []);
    },
    enabled: !!chefProfileId,
    // La vitrine publique disparaît quand le batch cooker est hors ligne :
    // un 404 n'est pas une panne, c'est une information.
    retry: false,
  });
}

/**
 * `PATCH /admin/chefs/{id}/verification` — met une vitrine en ligne, ou la retire.
 *
 * `{id}` est l'id de la **page du batch cooker** (`chefProfileId` du dossier),
 * pas celui du compte.
 *
 * Approuver une candidature vérifie le batch cooker mais le laisse **hors
 * ligne**, sauf si l'approbation portait `isActive: true` : c'est ce qui
 * permet de relire sa page avant de l'exposer aux clients. Cette route est
 * donc le second geste, celui qui le rend réservable.
 *
 * `409 CHEF_NOT_VERIFIED` : on ne met en ligne que quelqu'un de vérifié.
 * `409 APPLICATION_NOT_APPROVED` : la candidature n'est pas encore approuvée.
 */
export function useSetChefVerification(chefProfileId: string | undefined) {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: { isActive?: boolean; isVerified?: boolean }) =>
      apiFetch<unknown>(`/admin/chefs/${chefProfileId}/verification`, {
        method: "PATCH",
        body,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chef-applications"] });
      // La liste des batch cookers, ses compteurs et la fiche.
      qc.invalidateQueries({ queryKey: ["admin", "chefs"] });
    },
  });
}

/** Le refus de l'API, dit à l'admin qui vient de cliquer. */
export function verificationMessage(error: unknown): string {
  const e = error as { status?: number; message?: string; body?: unknown } | null;
  const code = ((e?.body ?? {}) as { code?: string }).code ?? "";
  if (e?.status === 409) {
    if (code === "CHEF_NOT_VERIFIED" || /NOT_VERIFIED/.test(e?.message ?? "")) {
      return "Ce batch cooker n'est pas vérifié : approuvez d'abord sa candidature.";
    }
    if (code === "APPLICATION_NOT_APPROVED" || /NOT_APPROVED/.test(e?.message ?? "")) {
      return "La candidature n'est pas approuvée : la vitrine ne peut pas être mise en ligne.";
    }
  }
  return adminErrorMessage(error);
}

/**
 * `GET /admin/chef-applications/{id}/documents/{type}/download-url`
 * URL signée valable 5 minutes. Chaque consultation est journalisée côté API :
 * on ne la demande donc qu'au moment où l'admin clique, jamais en avance.
 */
export function useDocumentDownload(id: string) {
  const apiFetch = useApiFetch();
  return useMutation({
    mutationFn: (type: string) =>
      apiFetch<{ url: string; expiresAt?: string; fileName?: string; mimeType?: string }>(
        `/admin/chef-applications/${id}/documents/${type}/download-url`,
      ),
  });
}

/* ── Renvoyer le lien de connexion ─────────────────────────────────────────── */

export interface Invitation {
  /** `magic-link` : l'API n'envoie pas de mot de passe. */
  channel: string;
  sentTo: string;
  /** `false` : l'email n'est pas parti — service d'envoi muet ou mal configuré. */
  delivered: boolean;
  expiresAt: string | null;
}

/**
 * `POST /admin/chef-users/{id}/resend-invitation` — l'identifiant attendu est
 * celui du **compte** (`userId`), pas celui de la page ni de la candidature.
 *
 * C'est le recours de la fiche DEM-01 : un batch cooker qui n'a jamais reçu
 * son lien, ou dont le lien a expiré, ne peut rien faire seul — il n'a pas de
 * mot de passe à réinitialiser. La réponse dit si l'email est **parti**, et
 * l'écran le répète : un `delivered: false` silencieux est précisément ce qui
 * avait fait croire à un candidat sans suite.
 */
export function useResendInvitation() {
  const apiFetch = useApiFetch();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<Invitation>(`/admin/chef-users/${userId}/resend-invitation`, {
        method: "POST",
      }),
  });
}

/* ── Les statuts SAP instruits par l'équipe ────────────────────────────────── */

/** Ce que l'API accepte pour les deux statuts externes. */
/**
 * Les trois valeurs que l'API accepte — l'énumération Prisma `SapExternalStatus`.
 *
 * La console en envoyait quatre autres, inventées : `approved`, `requested`,
 * `not_requested`, `refused`. L'API les refusait toutes, et chaque
 * enregistrement échouait sur « le champ crcesuAffiliationStatus n'est pas
 * accepté ». Il n'y a pas de « refusée » : un refus se note en revenant à
 * `not_started`, la démarche étant à refaire.
 */
export const SAP_EXTERNAL_STATUSES = ["not_started", "pending", "active"] as const;

export type SapExternalStatus = (typeof SAP_EXTERNAL_STATUSES)[number];

export const SAP_EXTERNAL_LABEL: Record<string, string> = {
  not_started: "Pas de démarche",
  pending: "Demande en cours",
  active: "Affiliation active",
};

/**
 * `PATCH /admin/chefs/{id}/sap-external-status`.
 *
 * L'affiliation CRCESU et l'avance immédiate URSSAF ne se décident pas chez
 * nous : elles s'obtiennent auprès du CRCESU et de l'URSSAF. La console note
 * ici ce que ces organismes ont répondu — et l'espace du batch cooker, qui
 * affiche ces deux statuts en lecture seule, cesse d'être un cul-de-sac.
 */
export function useSetSapExternalStatus(chefProfileId: string | undefined) {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      crcesuAffiliationStatus?: SapExternalStatus;
      urssafTiersPrestationStatus?: SapExternalStatus;
    }) =>
      apiFetch<unknown>(`/admin/chefs/${chefProfileId}/sap-external-status`, {
        method: "PATCH",
        body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "chefs"] }),
  });
}

/* ── Les paliers des batch cookers (module Recettes, R34) ──────────────────── */

/**
 * Ce qu'un palier permet et la commission qu'il paie (BLK-26, 10/11) : le palier 1
 * a tout, au taux de la plateforme ; les paliers 2 à 4 ne sont pas décidés
 * (`decided: false`) et ne restreignent rien pour l'instant.
 */
export interface ChefTierRule {
  decided: boolean;
  /** En points de base : `1500` = 15 %. */
  commissionBps: number;
  capabilities: { code: string; label: string }[];
}

export interface ChefTierNames {
  labels: Record<ChefTier, string>;
  /** Absent de la réponse du PUT, qui ne renvoie que les noms. */
  rules?: Record<ChefTier, ChefTierRule>;
  /** `null` : jamais renommés, les noms neutres s'appliquent (« Palier 1 »…). */
  updatedAt: string | null;
}

const CHEF_TIER_NAMES = ["admin", "settings", "chef-tiers"] as const;

/** `GET /admin/settings/chef-tiers` — le nom de chacun des quatre codes. */
export function useChefTierNames() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: CHEF_TIER_NAMES,
    queryFn: () => apiFetch<ChefTierNames>("/admin/settings/chef-tiers"),
  });
}

/**
 * `PUT /admin/settings/chef-tiers` — les quatre noms à chaque fois, 40
 * caractères au plus. Seuls les noms changent : chacun garde son palier.
 */
export function useSetChefTierNames() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (labels: Record<ChefTier, string>) =>
      apiFetch<ChefTierNames>("/admin/settings/chef-tiers", {
        method: "PUT",
        body: { labels },
      }),
    onSuccess: (data) => {
      // Le PUT ne renvoie que les noms : les règles déjà lues restent.
      qc.setQueryData<ChefTierNames>(CHEF_TIER_NAMES, (old) => ({ ...old, ...data }));
      // Chaque fiche affiche le nom de son palier.
      qc.invalidateQueries({ queryKey: ["admin", "chefs"] });
    },
  });
}

/**
 * `PATCH /admin/chefs/{id}/tier` — le palier d'un batch cooker, tracé dans le
 * journal d'audit. `{id}` est l'identifiant de la page batch cooker.
 */
export function useSetChefTier(chefProfileId: string) {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tier: ChefTier) =>
      apiFetch<unknown>(`/admin/chefs/${chefProfileId}/tier`, {
        method: "PATCH",
        body: { tier },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "chefs"] }),
  });
}

/* ── Supprimer un compte ───────────────────────────────────────────────────── */

export interface DeletedUser {
  id: string;
  /** `deleted` : la ligne est partie. `anonymised` : elle reste, vidée. */
  outcome: string;
}

/** Ce que l'API renvoie quand elle refuse : les prestations qui bloquent. */
export interface DeleteRefused {
  code: string;
  message: string;
  bookings: { id?: string; reference?: string | null; status?: string; startsAt?: string }[];
}

/**
 * `DELETE /admin/users/{id}` — supprime un compte, quel que soit son rôle.
 *
 * Ce que l'API fait vraiment, et qu'il faut dire avant de cliquer :
 *
 * - **le compte Clerk est supprimé** : la personne ne peut plus se connecter,
 *   et rien ne la fera revenir ;
 * - la ligne en base part avec, **sauf si des prestations passées la
 *   référencent** : elle reste alors vidée de son nom, de son email et de son
 *   téléphone (`outcome: anonymised`), et la page publique d'un batch cooker
 *   passe hors ligne ;
 * - **refusé tant qu'une réservation est ouverte** (`409
 *   USER_HAS_OPEN_BOOKINGS`), et la réponse dit lesquelles.
 *
 * L'identifiant attendu est celui du **compte** (`userId`), pas celui de la
 * page d'un batch cooker ni de sa candidature.
 */
export function useDeleteUser() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<DeletedUser>(`/admin/users/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "chefs"] });
      qc.invalidateQueries({ queryKey: ["chef-applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "clients"] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

/** Les prestations qui empêchent la suppression, s'il y en a. */
export function blockingBookings(error: unknown): DeleteRefused["bookings"] {
  const body = (error as { body?: unknown })?.body;
  if (!body || typeof body !== "object") return [];
  const list = (body as DeleteRefused).bookings;
  return Array.isArray(list) ? list : [];
}

/* ── Les zones d'un batch cooker ───────────────────────────────────────────── */

export interface InterventionCity {
  name: string;
  dept: string;
  insee: string;
}

export interface InterventionZoneInput {
  regionCode: string;
  regionLabel: string;
  scope: "region" | "cities";
  cities: InterventionCity[];
}

/**
 * `PATCH /admin/chefs/{id}/zones` — arrivée le 24/10.
 *
 * Le batch cooker ne peut pas le faire lui-même : ses zones ont été vérifiées
 * sur pièces pendant la candidature. La console le peut, et c'est audité.
 *
 * **La liste est remplacée en entier**, et il y a un piège : l'API rend les
 * villes d'une zone comme de simples noms (`cities: string[]`) alors qu'elle
 * attend des objets complets (`{ name, dept, insee }`). On ne peut donc pas
 * renvoyer telle quelle une zone au scope `cities` lue sur la fiche — le code
 * INSEE manque. Tant que la lecture ne rend pas ces objets, l'éditeur ne
 * propose que des régions entières, et prévient de ce qu'il remplace.
 */
export function useUpdateChefZones(chefProfileId: string) {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (interventionZones: InterventionZoneInput[]) =>
      apiFetch(`/admin/chefs/${chefProfileId}/zones`, {
        method: "PATCH",
        body: { interventionZones },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chefs"] });
      qc.invalidateQueries({ queryKey: ["chef", chefProfileId] });
    },
  });
}

/**
 * `DELETE /admin/users/{id}/avatar` — retirer la photo de profil de quelqu'un.
 *
 * Pour une photo qui n'a rien à faire sur une vitrine publique. Le compte
 * n'est pas touché : la personne peut en déposer une autre. `{id}` est
 * l'identifiant du **compte**, pas celui de la fiche.
 */
export function useDeleteUserAvatar() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/admin/users/${userId}/avatar`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chefs"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

/* ── Modes de réchauffage (module Recettes §4.6) ───────────────────────────── */

export interface ReheatModeSetting {
  modes: { code: string; label: string }[];
  /** `null` : jamais modifiée, la liste par défaut s'applique. */
  updatedAt: string | null;
}

const REHEAT_MODES_SETTING = ["admin", "settings", "reheat-modes"] as const;

/** `GET /admin/settings/reheat-modes` */
export function useReheatModeSetting() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: REHEAT_MODES_SETTING,
    queryFn: () => apiFetch<ReheatModeSetting>("/admin/settings/reheat-modes"),
  });
}

/**
 * `PUT /admin/settings/reheat-modes` — la liste entière, chaque code une fois.
 * Un plat garde un code retiré ; il est refusé au prochain enregistrement.
 */
export function useSetReheatModes() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (modes: { code: string; label: string }[]) =>
      apiFetch<ReheatModeSetting>("/admin/settings/reheat-modes", {
        method: "PUT",
        body: { modes },
      }),
    onSuccess: (data) => {
      qc.setQueryData(REHEAT_MODES_SETTING, data);
      // `useReheatModes` (referentials.ts) range la liste sous cette clé.
      qc.invalidateQueries({ queryKey: ["referentials", "modes"] });
    },
  });
}

/* ── Rayons (module Recettes §5.4) ─────────────────────────────────────────── */

export interface AisleSetting {
  aisles: { code: string; label: string }[];
  updatedAt: string | null;
}

const AISLES_SETTING = ["admin", "settings", "aisles"] as const;

/** `GET /admin/settings/aisles` */
export function useAisleSetting() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: AISLES_SETTING,
    queryFn: () => apiFetch<AisleSetting>("/admin/settings/aisles"),
  });
}

/**
 * `PUT /admin/settings/aisles` — la liste entière (1 à 30 rayons), chaque code
 * une fois. L'ordre de la liste est l'ordre du parcours en magasin.
 */
export function useSetAisles() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (aisles: { code: string; label: string }[]) =>
      apiFetch<AisleSetting>("/admin/settings/aisles", {
        method: "PUT",
        body: { aisles },
      }),
    onSuccess: (data) => {
      qc.setQueryData(AISLES_SETTING, data);
      // `useAisles` (referentials.ts) range la liste sous cette clé.
      qc.invalidateQueries({ queryKey: ["referentials", "aisles"] });
    },
  });
}

/* ── Profils de recette (module Recettes §4.8) ─────────────────────────────── */

export interface RecipeProfileSetting {
  profiles: { code: string; label: string }[];
  updatedAt: string | null;
}

const RECIPE_PROFILES_SETTING = ["admin", "settings", "recipe-profiles"] as const;

/** `GET /admin/settings/recipe-profiles` */
export function useRecipeProfileSetting() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: RECIPE_PROFILES_SETTING,
    queryFn: () => apiFetch<RecipeProfileSetting>("/admin/settings/recipe-profiles"),
  });
}

/** `PUT /admin/settings/recipe-profiles` — la liste entière, chaque code une fois. */
export function useSetRecipeProfiles() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profiles: { code: string; label: string }[]) =>
      apiFetch<RecipeProfileSetting>("/admin/settings/recipe-profiles", {
        method: "PUT",
        body: { profiles },
      }),
    onSuccess: (data) => {
      qc.setQueryData(RECIPE_PROFILES_SETTING, data);
      // `useRecipeProfiles` (referentials.ts) range la liste sous cette clé.
      qc.invalidateQueries({ queryKey: ["referentials", "profiles"] });
    },
  });
}
