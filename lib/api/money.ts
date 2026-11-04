"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, useApiFetch } from "./client";

/* ─────────────────────────────────────────────────────────────────────────────
   L'argent, vu de la console.

   Cinq circuits qui n'ont en commun que d'être de l'argent, et qu'il serait
   faux de fondre en une seule table :

   - **CESU** : le client déclare avoir remis des titres, le batch cooker
     confirme les avoir reçus. La plateforme ne voit jamais l'argent. Tant que
     personne ne confirme, la prestation reste impayée — d'où le solde forcé,
     réservé au batch cooker qui ne répond plus.
   - **Commissions** : la facture B que Lab's Food émet au batch cooker, et le
     prélèvement SEPA qui la suit. La facture précède toujours le prélèvement,
     et un prélèvement échoué ne l'annule pas : la créance survit, la relance
     réutilise le même numéro, et la série ne fait pas de trou.
   - **Avance immédiate** : rattachements et demandes de paiement URSSAF. Tant
     que l'accès API n'existe pas, la console répond à la place de l'URSSAF —
     et l'API refuse ces deux routes hors mode simulé.
   - **Factures clients** : la facture A, au nom du batch cooker, une par
     paiement par carte. Émise au paiement ; celles des paiements antérieurs
     à son ouverture se rattrapent depuis la console.
   - **Attestations fiscales** : ce que chaque client pourra déclarer, et la
     part que Lab's Food atteste réellement. Les deux diffèrent, et c'est la
     distinction la plus importante de ce module.

   Tous les montants sont en centimes. Aucun n'est arrondi ici.
   ───────────────────────────────────────────────────────────────────────────── */

export const centimes = (c?: number | null) =>
  `${((c ?? 0) / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;

/** Un taux en points de base : 1500 → « 15 % ». */
export const bps = (n?: number | null) =>
  `${((n ?? 0) / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;

const CLE = ["admin", "argent"] as const;

/* ── CESU ──────────────────────────────────────────────────────────────────── */

export type CesuSettlement = "declared" | "confirmed" | "rejected";

export interface CesuPayment {
  paymentId: string;
  bookingId: string;
  bookingReference?: string | null;
  amountTtc: number;
  currency: string;
  paymentStatus: string;
  medium: "ecesu" | "cesu_paper";
  issuer?: string | null;
  settlementStatus: CesuSettlement;
  clientProofRef?: string | null;
  proofUploadedAt?: string | null;
  confirmedAt?: string | null;
  rejectionReason?: string | null;
  /** `true` quand un admin a soldé à la place du batch cooker. */
  adminOverride: boolean;
  clientName?: string | null;
  chefDisplayName?: string | null;
  declaredAt: string;
}

export const CESU_SETTLEMENT: Record<CesuSettlement, string> = {
  declared: "En attente du batch cooker",
  confirmed: "Confirmé",
  rejected: "Refusé",
};

export const CESU_MEDIUM: Record<string, string> = {
  ecesu: "e-CESU",
  cesu_paper: "Titres papier",
};

export const CESU_ISSUER: Record<string, string> = {
  pluxee: "Pluxee",
  edenred: "Edenred",
  up: "Up",
  bimpli: "Bimpli",
  domiserve: "Domiserve",
  other: "Autre",
};

export function useCesuPayments(status?: CesuSettlement | "all") {
  const apiFetch = useApiFetch();
  const q = status && status !== "all" ? `?status=${status}` : "";
  return useQuery({
    queryKey: [...CLE, "cesu", status ?? "all"],
    queryFn: () => apiFetch<CesuPayment[]>(`/admin/cesu-payments${q}`),
  });
}

/** Lien signé valable 5 minutes vers le justificatif déposé par le client. */
export function useCesuProofUrl() {
  const apiFetch = useApiFetch();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ url: string; expiresAt: string }>(
        `/admin/cesu-payments/${id}/proof-url`,
      ),
  });
}

/**
 * Solder à la place du batch cooker.
 *
 * `proofRef` n'est pas une formalité : ce geste écrit une ligne de crédit
 * d'impôt au nom d'un batch cooker qui n'a rien confirmé. L'API exige donc la
 * référence de ce sur quoi l'admin s'est appuyé, et garde les deux.
 */
export function useForceSettleCesu() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, proofRef }: { id: string; proofRef: string }) =>
      apiFetch<CesuPayment>(`/admin/cesu-payments/${id}/force-settle`, {
        method: "POST",
        body: { proofRef },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...CLE, "cesu"] }),
  });
}

/* ── Commissions ───────────────────────────────────────────────────────────── */

export type InvoiceStatus = "issued" | "settled" | "written_off";
export type DebitStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled"
  | "reversed";

export interface CommissionDebit {
  id: string;
  status: DebitStatus;
  attemptNumber: number;
  amountTtcCents: number;
  failureReason?: string | null;
  initiatedAt?: string | null;
  settledAt?: string | null;
  /** Fin de la fenêtre de révocation SEPA CORE : 8 semaines. */
  clawbackWindowEndsAt?: string | null;
}

export interface CommissionInvoice {
  id: string;
  invoiceNumber: string;
  chefProfileId: string;
  chefDisplayName?: string | null;
  issuedAt: string;
  amountHtCents: number;
  amountVatCents: number;
  amountTtcCents: number;
  rateBps: number;
  vatRateBps: number;
  paymentMethod: "cb" | "avance_immediate" | "cesu";
  collectionMethod: "stripe_application_fee" | "sepa_direct_debit";
  status: InvoiceStatus;
  periodStart?: string | null;
  periodEnd?: string | null;
  commissionsCount: number;
  debits: CommissionDebit[];
}

export const INVOICE_STATUS: Record<InvoiceStatus, string> = {
  issued: "Due",
  settled: "Réglée",
  written_off: "Passée en perte",
};

export const DEBIT_STATUS: Record<DebitStatus, string> = {
  pending: "Envoyé",
  processing: "En cours",
  succeeded: "Encaissé",
  failed: "Échoué",
  canceled: "Annulé",
  reversed: "Révoqué",
};

export const PAYMENT_METHOD: Record<string, string> = {
  cb: "Carte",
  avance_immediate: "Avance immédiate",
  cesu: "CESU",
};

export const COLLECTION_METHOD: Record<string, string> = {
  stripe_application_fee: "Retenue à la source (Stripe)",
  sepa_direct_debit: "Prélèvement SEPA",
};

export function useCommissionInvoices(status?: InvoiceStatus | "all") {
  const apiFetch = useApiFetch();
  const q = status && status !== "all" ? `?status=${status}` : "";
  return useQuery({
    queryKey: [...CLE, "factures", status ?? "all"],
    queryFn: () => apiFetch<CommissionInvoice[]>(`/admin/commission-invoices${q}`),
  });
}

export interface RunDueResult {
  invoicesIssued: number;
  debitsStarted: number;
  invoiceNumbers: string[];
  /** Une autre instance tenait le verrou : ce passage n'a rien fait. */
  skippedBecauseLocked: boolean;
}

/**
 * Facturer et prélever les commissions dues d'une période.
 *
 * Sans dates, l'API prend le mois précédent. Le verrou Postgres garantit qu'un
 * second passage simultané ne facture pas deux fois : il revient avec
 * `skippedBecauseLocked`, et ce n'est pas une erreur.
 */
export function useRunDueCommissions() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (periode: { periodStart?: string; periodEnd?: string }) =>
      apiFetch<RunDueResult>("/admin/commission-invoices/run-due", {
        method: "POST",
        body: periode,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...CLE, "factures"] }),
  });
}

export interface InvoiceBackfillResult {
  dryRun: boolean;
  /** Paiements par carte soldés qui n'avaient pas de facture. */
  pending: number;
  issued: { paymentId: string; invoiceNumber: string }[];
  /** Le code de l'API (`INVOICE_AMOUNT_INVALID`, `P2002`…), jamais un message. */
  failed: { paymentId: string; code: string }[];
}

/**
 * Rattraper les factures A des paiements par carte réglés sans elle.
 *
 * `dryRun: true` ne fait que compter. `false` émet, du plus ancien paiement au
 * plus récent : une facture ne se retire jamais, d'où le comptage d'abord.
 * Chacune est datée du jour du rattrapage, avec la vraie date de paiement sur
 * le PDF. Relancer n'émet que ce qui manque encore.
 */
export function useBackfillPaymentInvoices() {
  const apiFetch = useApiFetch();
  return useMutation({
    mutationFn: (dryRun: boolean) =>
      apiFetch<InvoiceBackfillResult>("/admin/payment-invoices/backfill", {
        method: "POST",
        body: { dryRun },
      }),
  });
}

/** Relance : même facture, même numéro, tentative suivante. */
export function useRetryDebit() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<CommissionDebit>(
        `/admin/commission-invoices/${id}/retry-debit`,
        { method: "POST" },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...CLE, "factures"] }),
  });
}

/* ── Avance immédiate ──────────────────────────────────────────────────────── */

export type LinkStatus = "pending" | "active" | "refused";

export interface UrssafLink {
  id: string;
  chefProfileId: string;
  chefName: string;
  status: LinkStatus;
  refusalReason?: string | null;
  requestedAt: string;
  decidedAt?: string | null;
  client: { id: string; name: string; email: string };
}

export interface UrssafPayment {
  paymentId: string;
  status: string;
  amountCents: number;
  debitedCents: number;
  urssafReference: string;
  failureReason?: string | null;
  createdAt: string;
  paidAt?: string | null;
  booking: {
    id: string;
    reference: string;
    clientName: string;
    chefName: string;
  };
}

export const LINK_STATUS: Record<LinkStatus, string> = {
  pending: "En attente",
  active: "Rattaché",
  refused: "Refusé",
};

export function useUrssafLinks(status?: LinkStatus | "all") {
  const apiFetch = useApiFetch();
  const q = status && status !== "all" ? `?status=${status}` : "";
  return useQuery({
    queryKey: [...CLE, "rattachements", status ?? "all"],
    queryFn: () => apiFetch<UrssafLink[]>(`/admin/urssaf-links${q}`),
  });
}

export function useUrssafPayments() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: [...CLE, "paiements-urssaf"],
    queryFn: () => apiFetch<UrssafPayment[]>("/admin/urssaf-payments"),
  });
}

/**
 * Répondre à la place de l'URSSAF.
 *
 * L'API refuse ces deux routes (`403 URSSAF_NOT_SIMULATED`) dès que la
 * passerelle n'est pas en mode simulé : c'est voulu, et l'écran doit le dire
 * plutôt que d'afficher « erreur ».
 */
export function useDecideUrssafLink() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: "active" | "refused";
      reason?: string;
    }) =>
      apiFetch<UrssafLink>(`/admin/urssaf-links/${id}/decision`, {
        method: "POST",
        body: reason ? { status, reason } : { status },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...CLE, "rattachements"] }),
  });
}

export function useSetUrssafOutcome() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      outcome,
      reason,
    }: {
      id: string;
      outcome: "paid" | "refused";
      reason?: string;
    }) =>
      apiFetch<{ paymentId: string; status: string }>(
        `/admin/urssaf-payments/${id}/outcome`,
        { method: "POST", body: reason ? { outcome, reason } : { outcome } },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...CLE, "paiements-urssaf"] }),
  });
}

/** `true` quand l'API a refusé parce que la passerelle n'est pas simulée. */
export const nonSimule = (e: unknown) =>
  e instanceof ApiError &&
  e.status === 403 &&
  JSON.stringify(e.body ?? "").includes("URSSAF_NOT_SIMULATED");

/* ── Attestations fiscales ─────────────────────────────────────────────────── */

export interface AttestationProvider {
  chefProfileId: string;
  chefDisplayName: string;
  /** `false` : le batch cooker n'a déclaré aucune voie SAP. */
  sapDeclared: boolean;
  declarationType?: "type_a_nova" | "type_b_cooperative" | null;
  novaCode?: string | null;
  cooperativeName?: string | null;
  eligibleAmountCents: number;
  platformAttestedAmountCents: number;
  paymentMethods: string[];
  /** Pourquoi une part n'est pas attestée, en clair. */
  notes: string[];
  paymentsCount: number;
  currency: string;
}

export interface Attestation {
  clientId: string;
  clientName?: string | null;
  clientEmail: string;
  year: number;
  /** Ce que le client pourrait déclarer, tous prestataires confondus. */
  eligibleAmountCents: number;
  /** Ce que Lab's Food atteste réellement. Les deux diffèrent souvent. */
  platformAttestedAmountCents: number;
  paymentsCount: number;
  currency: string;
  providers: AttestationProvider[];
}

export function useAttestations(year: number) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: [...CLE, "attestations", year],
    queryFn: () =>
      apiFetch<Attestation[]>(`/admin/fiscal-attestations?year=${year}`),
  });
}

export function useAttestation(clientId: string | undefined, year: number) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: [...CLE, "attestation", clientId, year],
    queryFn: () =>
      apiFetch<Attestation>(
        `/admin/fiscal-attestations/${clientId}?year=${year}`,
      ),
    enabled: !!clientId,
  });
}

export const DECLARATION_TYPE: Record<string, string> = {
  type_a_nova: "NOVA à son nom",
  type_b_cooperative: "Sa coopérative SAP",
};
