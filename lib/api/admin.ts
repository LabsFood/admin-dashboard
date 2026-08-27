"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useApiFetch } from "./client";
import type {
  ClientProfile,
  ClientProfilePatch,
  ClientStatus,
  Me,
  Role,
} from "./types";

/* ── Clients (client_profiles) ─────────────────────────────────────────────── */

/** `GET /admin/clients` — liste des profils clients, filtrable par statut CRM. */
export function useClients(status?: ClientStatus) {
  const apiFetch = useApiFetch();
  const query = status ? `?status=${encodeURIComponent(status)}` : "";

  return useQuery({
    queryKey: ["clients", status ?? "all"],
    queryFn: () => apiFetch<ClientProfile[]>(`/admin/clients${query}`),
  });
}

/** `GET /admin/clients/{id}` — un profil client par id de profil. */
export function useClient(id: string | undefined) {
  const apiFetch = useApiFetch();

  return useQuery({
    queryKey: ["clients", "detail", id],
    queryFn: () => apiFetch<ClientProfile>(`/admin/clients/${id}`),
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
