"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiFetch } from "./client";
import type { BadgeTone } from "@/components/ui/Badge";

/* ─────────────────────────────────────────────────────────────────────────────
   Les demandes sur-mesure — `GET /admin/quotes`, `PATCH /admin/quotes/{id}`,
   `POST /admin/quotes/{id}/offers`.

   Un client décrit son événement, un batch cooker lui propose son prix, le
   client accepte : l'acceptation crée la prestation. La console veille :
   elle confie la demande à un batch cooker quand le client n'en a pas choisi
   ou que le sien a décliné, et peut chiffrer à sa place, en son nom.

   Un prix se saisit en **net** (ce que touche le batch cooker). Le prix client
   et le reste à charge sont calculés par l'API, au taux de commission en
   vigueur — réglable ici, `PATCH /admin/settings/commission`. Une offre garde
   le taux avec lequel elle a été chiffrée.

   Les montants sont en centimes. La liste n'est pas paginée et arrive du plus
   récent au plus ancien.
   ───────────────────────────────────────────────────────────────────────────── */

export type QuoteStatus =
  | "submitted"
  | "in_review"
  | "quoted"
  | "accepted"
  | "declined"
  | "chef_declined"
  | "cancelled"
  /** Classé sans suite par Lab's Food. Définitif, et distinct d'un refus. */
  | "closed";

export type OfferStatus =
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "expired"
  | "withdrawn";

export type TimeSlot = "morning" | "afternoon" | "evening";

export interface QuoteOffer {
  id: string;
  status: OfferStatus;
  netCents: number;
  /** Le taux appliqué à cette offre, en points de base (1500 = 15 %). */
  commissionBps: number;
  clientPriceCents: number;
  afterTaxCreditCents: number;
  proposedDate: string | null;
  proposedTimeSlot: TimeSlot | null;
  conditions: string | null;
  validUntil: string;
  viewedAt: string | null;
  decidedAt: string | null;
  declineReason: string | null;
  createdAt: string;
}

export interface Quote {
  id: string;
  reference: string;
  clientId: string;
  title: string;
  occasion: string | null;
  persons: number;
  mealsCount: number;
  cuisine: string | null;
  diet: string[];
  allergies: string[];
  brief: string;
  desiredDate: string | null;
  timeSlot: TimeSlot | null;
  address: { line: string | null; city: string | null; postalCode: string | null };
  budgetCents: number | null;
  status: QuoteStatus;
  /** Le compte du batch cooker qui a la demande, ou `null`. */
  assignedChefUserId: string | null;
  /** Qui est ce compte : son nom et l'identifiant de sa fiche. */
  assignedChef?: {
    userId: string;
    chefProfileId: string;
    displayName: string;
  } | null;
  chefDeclinedAt: string | null;
  /** Ce que le batch cooker a écrit en déclinant. Jamais montré au client. */
  chefDeclineReason?: string | null;
  /** Toutes les offres, de la plus récente à la plus ancienne. */
  offers: QuoteOffer[];
  /** Celle que le client peut encore accepter, s'il y en a une. */
  activeOffer: QuoteOffer | null;
  /** La prestation née de l'offre acceptée. */
  booking: { id: string; reference: string | null; startsAt: string; endsAt: string } | null;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

export interface QuotePatch {
  title?: string;
  persons?: number;
  mealsCount?: number;
  cuisine?: string;
  diet?: string[];
  brief?: string;
  /**
   * Les seuls statuts qui se posent à la main ; les autres suivent les offres.
   *
   * `closed` classe la demande sans suite : possible depuis n'importe quel
   * statut ouvert, **même quand une offre attend le client** — elle est alors
   * retirée. C'est définitif (`409 QUOTE_CLOSED` ensuite), et cela ne se
   * combine pas avec une affectation (`422 CLOSE_OR_ASSIGN`).
   */
  status?: "submitted" | "in_review" | "closed";
  /** Un batch cooker vérifié (`userId`), ou `null` pour retirer l'affectation. */
  assignedChefUserId?: string | null;
}

export interface OfferInput {
  /** Ce que touche le batch cooker, en centimes. */
  netCents: number;
  validityDays?: number;
  conditions?: string;
}

const QUOTES = ["admin", "quotes"] as const;
const COMMISSION = ["admin", "settings", "commission"] as const;

/** Une réponse nue ou enveloppée. */
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

/** Chiffrer au nom du batch cooker affecté. Le client reçoit l'offre comme la sienne. */
export function useCreateQuoteOffer() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, offer }: { id: string; offer: OfferInput }) =>
      apiFetch<Quote>(`/admin/quotes/${id}/offers`, { method: "POST", body: offer }),
    onSettled: () => qc.invalidateQueries({ queryKey: QUOTES }),
  });
}

/* ── La commission ─────────────────────────────────────────────────────────── */

export interface Commission {
  /** Points de base : 1500 = 15 % du prix client. */
  commissionBps: number;
  updatedAt: string | null;
}

export function useCommission() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: COMMISSION,
    queryFn: () => apiFetch<Commission>("/admin/settings/commission"),
  });
}

/** Vaut pour ce qui sera chiffré ensuite : les offres déjà envoyées ne bougent pas. */
export function useSetCommission() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commissionBps: number) =>
      apiFetch<Commission>("/admin/settings/commission", {
        method: "PATCH",
        body: { commissionBps },
      }),
    onSuccess: (data) => qc.setQueryData(COMMISSION, data),
  });
}

/** Le plafond que l'API accepte : 50 %. */
export const MAX_COMMISSION_BPS = 5000;

/** Le crédit d'impôt services à la personne : la moitié du prix client. */
const TAX_CREDIT_BPS = 5000;

/**
 * Du net au prix client — le calcul de l'API (`priceOffer`) : la commission est
 * prise sur le prix client. Un aperçu ; ce qui fait foi est l'offre renvoyée.
 */
export function previewOffer(netCents: number, commissionBps: number) {
  const clientPriceCents = Math.round((netCents * 10_000) / (10_000 - commissionBps));
  return {
    clientPriceCents,
    commissionCents: clientPriceCents - netCents,
    afterTaxCreditCents: Math.round(
      (clientPriceCents * (10_000 - TAX_CREDIT_BPS)) / 10_000,
    ),
  };
}

/* ── Affichage ─────────────────────────────────────────────────────────────── */

export const quoteStatusLabel: Record<QuoteStatus, string> = {
  submitted: "En attente d'offre",
  in_review: "En cours d'étude",
  quoted: "Offre envoyée",
  accepted: "Acceptée",
  declined: "Offre refusée",
  chef_declined: "Déclinée par le batch cooker",
  cancelled: "Retirée",
  closed: "Classée sans suite",
};

export const quoteStatusTone: Record<QuoteStatus, BadgeTone> = {
  submitted: "warning",
  in_review: "info",
  quoted: "teal",
  accepted: "success",
  declined: "neutral",
  chef_declined: "danger",
  cancelled: "neutral",
  closed: "neutral",
};

/** Ce que ce statut demande, dit du point de vue de l'admin. */
export const quoteStatusHint: Record<QuoteStatus, string> = {
  submitted: "Le batch cooker doit répondre au client.",
  in_review: "Quelqu'un de l'équipe s'en occupe.",
  quoted: "L'offre est partie : la balle est chez le client.",
  accepted: "Le client a dit oui. La prestation est créée et inscrite aux deux agendas.",
  declined: "Le client a refusé la dernière offre. Le batch cooker peut en refaire une.",
  chef_declined: "Le batch cooker a décliné. Le client attend qu'on lui en propose un autre.",
  cancelled: "Le client a retiré sa demande.",
  closed: "Classée par la maison. Elle ne se rouvre pas et ne se réaffecte plus.",
};

export const QUOTE_STATUSES = Object.keys(quoteStatusLabel) as QuoteStatus[];

/** Une demande encore vivante : ni conclue, ni retirée, ni classée. */
export const isQuoteOpen = (q: Quote) =>
  q.status !== "accepted" && q.status !== "cancelled" && q.status !== "closed";

/** Personne pour répondre : à confier à un batch cooker. */
export const needsChef = (q: Quote) => !q.assignedChefUserId && isQuoteOpen(q);

export const offerStatusLabel: Record<OfferStatus, string> = {
  sent: "Envoyée",
  viewed: "Vue par le client",
  accepted: "Acceptée",
  declined: "Refusée",
  expired: "Expirée",
  withdrawn: "Retirée",
};

export const slotLabel: Record<TimeSlot, string> = {
  morning: "matin (9 h – 13 h)",
  afternoon: "après-midi (14 h – 18 h)",
  evening: "soir (18 h – 22 h)",
};

export const centsToEuros = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });

/** `2026-11-10` → « 10 novembre 2026 ». Une date de calendrier, sans fuseau. */
export const dayLabel = (isoDay: string) =>
  new Date(`${isoDay.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
