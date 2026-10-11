"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiFetch } from "./client";
import type { BadgeTone } from "@/components/ui/Badge";

/* ─────────────────────────────────────────────────────────────────────────────
   Les demandes sur-mesure — `GET /admin/quotes`, `PATCH /admin/quotes/{id}`.

   Un client décrit son événement, la console répond un prix. Deux montants,
   toujours : le prix TTC et ce que le client paie réellement après le crédit
   d'impôt de 50 %. Les deux partent dans le même corps, et l'API ne calcule
   pas le second — c'est à la console de ne pas les laisser diverger.

   La liste n'est pas paginée et arrive du plus récent au plus ancien.
   `assignedChefUserId` est lisible mais ne s'écrit pas : aucun champ du DTO ne
   permet d'affecter un batch cooker.
   ───────────────────────────────────────────────────────────────────────────── */

export type QuoteStatus =
  | "submitted"
  | "in_review"
  | "quoted"
  | "accepted"
  | "declined";

export interface Quote {
  id: string;
  reference: string;
  clientId: string;
  title: string;
  persons: number;
  mealsCount: number;
  cuisine: string | null;
  diet: string[];
  brief: string;
  status: QuoteStatus;
  /** Le compte du batch cooker qui prend la demande, ou `null`. */
  assignedChefUserId: string | null;
  /** Qui est ce compte : son nom et l'identifiant de sa fiche. */
  assignedChef?: {
    userId: string;
    chefProfileId: string;
    displayName: string;
  } | null;
  /** Centimes. `null` tant qu'aucun prix n'a été envoyé. */
  quoteAmountTtc: number | null;
  quoteAmountAfterTax: number | null;
  quoteNote: string | null;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    email: string | null;
    fullName: string | null;
    role?: string;
  } | null;
}

export interface QuotePatch {
  title?: string;
  persons?: number;
  mealsCount?: number;
  cuisine?: string;
  diet?: string[];
  brief?: string;
  status?: QuoteStatus;
  /** Centimes, avant crédit d'impôt. */
  quoteAmountTtc?: number;
  /** Centimes, après crédit d'impôt. */
  quoteAmountAfterTax?: number;
  quoteNote?: string;
  /** Un batch cooker vérifié (`userId`), ou `null` pour retirer l'affectation. */
  assignedChefUserId?: string | null;
}

const QUOTES = ["admin", "quotes"] as const;

/** Une réponse nue ou enveloppée : la route n'a pas de schéma documenté. */
function unwrap(res: unknown): Quote[] {
  if (Array.isArray(res)) return res as Quote[];
  if (res && typeof res === "object") {
    const o = res as Record<string, unknown>;
    for (const k of ["data", "items", "quotes"]) {
      if (Array.isArray(o[k])) return o[k] as Quote[];
    }
  }
  return [];
}

export function useQuotes({
  status,
  enabled,
}: { status?: QuoteStatus; enabled?: boolean } = {}) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: [...QUOTES, status ?? "all"],
    queryFn: async () =>
      unwrap(
        await apiFetch<unknown>(`/admin/quotes${status ? `?status=${status}` : ""}`),
      ),
    enabled: enabled ?? true,
  });
}

export function useUpdateQuote() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: QuotePatch }) =>
      apiFetch<Quote>(`/admin/quotes/${id}`, { method: "PATCH", body: patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUOTES }),
  });
}

/* ── Affichage ─────────────────────────────────────────────────────────────── */

export const quoteStatusLabel: Record<QuoteStatus, string> = {
  submitted: "À chiffrer",
  in_review: "En cours d'étude",
  quoted: "Prix envoyé",
  accepted: "Acceptée",
  declined: "Refusée",
};

export const quoteStatusTone: Record<QuoteStatus, BadgeTone> = {
  submitted: "warning",
  in_review: "info",
  quoted: "teal",
  accepted: "success",
  declined: "neutral",
};

/** Ce que la console fait de ce statut, dit du point de vue de l'admin. */
export const quoteStatusHint: Record<QuoteStatus, string> = {
  submitted: "Le client attend un prix.",
  in_review: "Quelqu'un s'en occupe, le client le voit.",
  quoted: "Le prix est parti : la balle est chez le client.",
  accepted: "Le client a dit oui. Reste à organiser la session.",
  declined: "Le client a renoncé.",
};

export const QUOTE_STATUSES = Object.keys(quoteStatusLabel) as QuoteStatus[];

/**
 * Le crédit d'impôt services à la personne : la moitié du TTC.
 *
 * C'est la valeur que la console propose, pas une règle que l'API applique —
 * les deux montants partent tels qu'ils sont saisis.
 */
export const TAX_CREDIT_RATE = 0.5;

export const afterTaxDefault = (ttcCents: number) =>
  Math.round(ttcCents * (1 - TAX_CREDIT_RATE));
