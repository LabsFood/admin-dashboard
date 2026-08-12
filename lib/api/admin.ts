"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useApiFetch } from "./client";
import type { ClientProfile, ClientProfilePatch, ClientStatus, Role } from "./types";

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

/* ── Users (provisioning / rôles) — câblage UI ultérieur ──────────────────── */

export interface ProvisionUserInput {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: Role;
}

/** `POST /admin/users` — provisionne un compte Clerk + ligne Postgres. */
export function useProvisionUser() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: ProvisionUserInput) =>
      apiFetch("/admin/users", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

/** `PATCH /admin/users/{id}/role` — change le rôle applicatif d'un utilisateur. */
export function useSetUserRole() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      apiFetch(`/admin/users/${id}/role`, { method: "PATCH", body: { role } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}
