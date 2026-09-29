"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useApiFetch } from "./client";
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
}

/**
 * `GET /admin/clients` — liste paginée des profils clients.
 *
 * La réponse est l'enveloppe `{ data, meta }` : sans `page`/`limit`, l'API
 * applique ses valeurs par défaut (page 1, 20 éléments) et `meta.total` porte
 * le nombre réel de clients.
 */
export function useClients({ status, page, limit }: ClientsQuery = {}) {
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
}: ChefApplicationsQuery = {}) {
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
