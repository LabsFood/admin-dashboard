"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, useApiFetch } from "./client";

/* ─────────────────────────────────────────────────────────────────────────────
   Les messages de contact.

   Ce qu'envoient les formulaires des sites publics (labsfood.fr et
   batchcooking.labsfood.fr). L'expéditeur n'a pas de compte : on ne peut lui
   répondre que par email, à l'adresse qu'il a saisie.

   La boîte est partagée : un message a un seul statut, le même pour toute
   l'équipe. `replied` ne se pose jamais à la main — il suit une réponse
   réellement partie. Si l'email ne part pas, l'API refuse (503) et n'enregistre
   rien : la console n'affiche jamais « Répondu » pour une réponse perdue.
   ───────────────────────────────────────────────────────────────────────────── */

export type ContactStatus = "new" | "read" | "replied" | "archived";
export type ContactSource = "labsfood" | "batchcooking";

export interface ContactReply {
  id: string;
  body: string;
  /** L'admin qui a répondu ; `null` si son compte n'existe plus. */
  sentByName: string | null;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  source: ContactSource;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: ContactStatus;
  createdAt: string;
  replies: ContactReply[];
}

export type ContactCounts = Record<ContactStatus, number>;

interface ContactPage {
  data: ContactMessage[];
  meta: { total: number; hasNextPage: boolean };
}

export const CONTACT_STATUS_LABEL: Record<ContactStatus, string> = {
  new: "Nouveau",
  read: "Lu",
  replied: "Répondu",
  archived: "Archivé",
};

export const CONTACT_SOURCE_LABEL: Record<ContactSource, string> = {
  labsfood: "labsfood.fr",
  batchcooking: "Site batch cooking",
};

const ROOT = ["admin", "contact-messages"] as const;
const KEYS = {
  root: ROOT,
  list: (status: ContactStatus | "all") => [...ROOT, "list", status] as const,
  counts: [...ROOT, "counts"] as const,
  detail: (id: string) => [...ROOT, "detail", id] as const,
};

// Rien ne pousse les nouveaux messages vers la console : on relit à intervalle.
const REFRESH_MS = 60 * 1000;

export function useContactMessages(status: ContactStatus | "all") {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: KEYS.list(status),
    queryFn: () =>
      apiFetch<ContactPage>(
        `/admin/contact-messages?limit=100${status === "all" ? "" : `&status=${status}`}`,
      ),
    refetchInterval: REFRESH_MS,
  });
}

/** Le nombre de messages par statut : les onglets, et la pastille du menu. */
export function useContactCounts() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: KEYS.counts,
    queryFn: () => apiFetch<ContactCounts>("/admin/contact-messages/counts"),
    refetchInterval: REFRESH_MS,
  });
}

/** Un message par son id, pour l'ouvrir depuis le lien de l'email d'alerte. */
export function useContactMessage(id: string | null) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: KEYS.detail(id ?? ""),
    queryFn: () => apiFetch<ContactMessage>(`/admin/contact-messages/${id}`),
    enabled: !!id,
  });
}

export function useSetContactStatus() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: Exclude<ContactStatus, "replied">;
    }) =>
      apiFetch<ContactMessage>(`/admin/contact-messages/${id}`, {
        method: "PATCH",
        body: { status },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.root }),
  });
}

export function useReplyToContact() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      apiFetch<ContactMessage>(`/admin/contact-messages/${id}/reply`, {
        method: "POST",
        body: { body },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.root }),
  });
}

export function contactErrorText(error: unknown): string {
  const code =
    error instanceof ApiError
      ? (error.body as { code?: string } | null)?.code
      : undefined;
  if (code === "EMAIL_NOT_SENT") {
    return "L'email n'a pas pu partir, la réponse n'a donc pas été enregistrée. Vérifiez la configuration Brevo de l'API (BREVO_TPL_CONTACT_REPLY).";
  }
  if (code === "CONTACT_MESSAGE_NOT_FOUND") {
    return "Ce message n'existe plus.";
  }
  return error instanceof Error ? error.message : "L'action n'a pas abouti.";
}
