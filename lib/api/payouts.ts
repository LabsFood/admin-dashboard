"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiFetch } from "./client";

/* ─────────────────────────────────────────────────────────────────────────────
   Les versements aux batch cookers (« prix net », 25/11/2026).

   La SAS vend avec la TVA (10 %), encaisse le CESU sur son NAN et l'avance
   immédiate, garde sa part (sur le HT, sans TVA) et verse au batch cooker
   HT − part Lab’s Food − frais CESU, par virement. La carte n'apparaît pas ici :
   Stripe paie le batch cooker.

   Tous les montants sont en centimes.
   ───────────────────────────────────────────────────────────────────────────── */

export type PayoutView = "payable" | "awaiting" | "paid";
export type PayoutMethod = "cb" | "cesu" | "avance_immediate";

export interface PayoutsSummary {
  payableCents: number;
  payableChefs: number;
  vatCents: number;
  marginCents: number;
  awaitingCents: number;
  lateChefs: number;
  lateCents: number;
  lastReconciliation: { at: string; received: number; matched: number } | null;
  bankFeedConfigured: boolean;
  /** Le batch cooker à verser en premier : la cloche ouvre sa fiche. */
  nextChefProfileId: string | null;
}

export interface PayoutChefHit {
  chefProfileId: string;
  displayName: string;
  city: string | null;
  tierLabel: string;
  payableCents: number;
  awaitingCents: number;
}

export interface PayoutLine {
  id: string | null;
  paymentId: string;
  method: PayoutMethod;
  bookingReference: string | null;
  amountTtcCents: number;
  vatRateBps: number;
  amountHtCents: number;
  amountVatCents: number;
  commissionRateBps: number;
  commissionCents: number;
  cesuFeeBps: number;
  cesuFeeCents: number;
  netCents: number;
  receivedAt: string | null;
  paidAt: string | null;
  paidReference: string | null;
  /** L'autofacture sous laquelle la ligne a été versée. */
  statementId: string | null;
  late: boolean;
}

export type StatementBlocker = "name" | "siren" | "businessAddress" | "vatFranchise";

export const STATEMENT_BLOCKER_LABEL: Record<StatementBlocker, string> = {
  name: "nom ou raison sociale",
  siren: "SIREN",
  businessAddress: "adresse professionnelle",
  vatFranchise: "franchise de TVA (art. 293 B)",
};

export interface PayableLine {
  chefProfileId: string;
  chefName: string;
  bookingReference: string | null;
  method: PayoutMethod;
  amountTtcCents: number;
  vatRateBps: number;
  amountVatCents: number;
  amountHtCents: number;
  commissionRateBps: number;
  commissionCents: number;
  cesuFeeBps: number;
  cesuFeeCents: number;
  netCents: number;
  receivedAt: string;
  late: boolean;
}

export interface ChefPayouts {
  chef: {
    chefProfileId: string;
    displayName: string;
    city: string | null;
    tierLabel: string;
    ibanLast4: string | null;
    /** Vide quand l'autofacture peut être émise. */
    statementBlockers: StatementBlocker[];
  };
  counts: Record<PayoutView, number>;
  totalNetCents: number;
  lines: PayoutLine[];
}

export interface ReconciliationRun {
  at: string;
  configured: boolean;
  received: number;
  matched: number;
  exceptions: number;
}

export interface PayoutPeriod {
  /** AAAA-MM-JJ, inclus. */
  from?: string;
  /** AAAA-MM-JJ, exclu. */
  to?: string;
}

export const PAYMENT_METHOD_LABEL: Record<PayoutMethod, string> = {
  cb: "Carte",
  cesu: "CESU",
  avance_immediate: "Avance immédiate",
};

const CLE = ["admin", "versements"] as const;

export function usePayoutsSummary(options: { refetchInterval?: number } = {}) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: [...CLE, "resume"],
    queryFn: () => apiFetch<PayoutsSummary>("/admin/payouts/summary"),
    refetchInterval: options.refetchInterval,
  });
}

export function usePayoutChefSearch(q: string, enabled: boolean) {
  const apiFetch = useApiFetch();
  const query = q.trim();
  return useQuery({
    queryKey: [...CLE, "recherche", query],
    queryFn: () =>
      apiFetch<PayoutChefHit[]>(
        `/admin/payouts/chefs${query ? `?q=${encodeURIComponent(query)}` : ""}`,
      ),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useChefPayouts(
  chefProfileId: string | null,
  view: PayoutView,
  period: PayoutPeriod,
) {
  const apiFetch = useApiFetch();
  const params = new URLSearchParams({ view });
  if (period.from) params.set("from", period.from);
  if (period.to) params.set("to", period.to);
  return useQuery({
    queryKey: [...CLE, "fiche", chefProfileId, view, period.from ?? "", period.to ?? ""],
    queryFn: () =>
      apiFetch<ChefPayouts>(`/admin/payouts/chefs/${chefProfileId}?${params.toString()}`),
    enabled: chefProfileId !== null,
  });
}

export function useMarkPayoutsPaid() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { chefProfileId: string; payoutIds: string[]; reference?: string }) =>
      apiFetch<{
        paid: number;
        netCents: number;
        paidAt: string;
        statementId: string;
        statementNumber: string;
      }>(
        `/admin/payouts/chefs/${input.chefProfileId}/mark-paid`,
        {
          method: "POST",
          body: { payoutIds: input.payoutIds, reference: input.reference },
        },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLE }),
  });
}

export function useReconcileNow() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<ReconciliationRun>("/admin/payouts/reconcile", { method: "POST" }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

/** Le libellé du virement : il porte les références, pour s'y retrouver sur le relevé. */
export function transferLabel(lines: readonly PayoutLine[]): string {
  const refs = lines
    .map((l) => l.bookingReference?.replace(/[^A-Za-z0-9]/g, "").toUpperCase())
    .filter((r): r is string => Boolean(r));
  return `LF VERSEMENT ${refs.join(" ")}`.slice(0, 140).trim();
}

/** Toutes les lignes à verser, tous batch cookers : l'export de la journée. */
export function usePayableLinesExport() {
  const apiFetch = useApiFetch();
  return useMutation({
    mutationFn: () => apiFetch<PayableLine[]>("/admin/payouts/payable"),
  });
}

/** Un lien de 5 minutes vers l'autofacture et son relevé. */
export function useStatementDownload() {
  const apiFetch = useApiFetch();
  return useMutation({
    mutationFn: (statementId: string) =>
      apiFetch<{ url: string; expiresAt: string }>(
        `/admin/payouts/statements/${statementId}/download`,
      ),
  });
}
