"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useApiFetch } from "./client";
import { adminErrorMessage } from "./errors";
import type {
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
    queryFn: () => apiFetch<Paginated<ClientProfile>>(`/admin/clients${query}`),
    enabled: enabled ?? true,
  });
}

/** `GET /admin/clients/{id}` — un profil client par id de profil. */
export function useClient(id: string | undefined) {
  const apiFetch = useApiFetch();

  return useQuery({
    queryKey: ["clients", "detail", id],
    queryFn: async () => {
      const res = await apiFetch<ClientProfile | { data: ClientProfile }>(
        `/admin/clients/${id}`,
      );
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
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
 * `POST /admin/users` — crée le compte Clerk (Backend API) **et** la ligne
 * Postgres `users` avec le rôle demandé.
 *
 * À noter : aucun `client_profiles` n'est créé au passage. Le compte
 * n'apparaîtra donc pas dans `GET /admin/clients` tant que la personne n'a pas
 * enregistré son profil de goûts depuis l'espace client.
 */
export function useProvisionUser() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: ProvisionUserInput) =>
      apiFetch<Me>("/admin/users", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
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
export const SAP_EXTERNAL_STATUSES = [
  "not_requested",
  "requested",
  "approved",
  "refused",
] as const;

export type SapExternalStatus = (typeof SAP_EXTERNAL_STATUSES)[number];

export const SAP_EXTERNAL_LABEL: Record<string, string> = {
  not_requested: "Non demandée",
  requested: "Demandée",
  approved: "Approuvée",
  refused: "Refusée",
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
