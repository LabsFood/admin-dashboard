"use client";

/* ─────────────────────────────────────────────────────────────────────────────
   Courses payées à part (Recettes lot 6), côté console.

   Le motif « courses » de l'argent : l'empreinte posée 48 h avant la séance,
   les tickets, le prélèvement au centime, les contestations que l'admin
   tranche, et les contestations bancaires (supportées par Lab's Food puis
   récupérées auprès du fautif).
   ───────────────────────────────────────────────────────────────────────────── */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiFetch } from "./client";

export type GroceryStatus =
  | "awaiting_card"
  | "card_saved"
  | "hold_placed"
  | "hold_failed"
  | "notice_sent"
  | "awaiting_client"
  | "confirmed"
  | "cancelled"
  | "receipts_submitted"
  | "captured"
  | "settled";

export const GROCERY_STATUS: Record<GroceryStatus, string> = {
  awaiting_card: "Carte attendue",
  card_saved: "Carte enregistrée",
  hold_placed: "Empreinte posée",
  hold_failed: "Empreinte refusée",
  notice_sent: "Message envoyé",
  awaiting_client: "En attente du client",
  confirmed: "Courses confirmées",
  cancelled: "Annulées",
  receipts_submitted: "Tickets déposés",
  captured: "Prélevées",
  settled: "Soldées",
};

export interface GroceryLine {
  id: string;
  label: string;
  amountCents: number;
  receiptId: string | null;
  clientApprovedAt: string | null;
  contestedAt: string | null;
  contestReason: string | null;
  decision: "upheld" | "rejected" | null;
  decidedAt: string | null;
  decisionNote: string | null;
  refundedCents: number;
}

export interface GroceryDispute {
  id: string;
  amountCents: number;
  reason: string | null;
  status: string;
  openedAt: string;
  closedAt: string | null;
  fault: "chef" | "client" | "platform" | null;
  recoveryStatus: "none" | "pending" | "recovered" | "written_off";
  recoveryReference: string | null;
  recoveredAt: string | null;
}

export interface BookingGroceries {
  bookingId: string;
  applies: boolean;
  status: GroceryStatus | null;
  budgetCents: number;
  guaranteed: boolean;
  opensAt: string;
  mandate: {
    version: string;
    acceptedAt: string;
    maxCents: number;
    documentSha256?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  } | null;
  card: { brand: string | null; last4: string; expMonth: number | null; expYear: number | null } | null;
  hold: {
    placedAt: string | null;
    expiresAt: string | null;
    failedAt: string | null;
    failureCode: string | null;
    fixBefore: string;
  } | null;
  notice: {
    sentAt: string;
    shoppingAt: string | null;
    cancelDeadline: string | null;
    email?: { deliveredAt: string | null; bouncedAt: string | null; lastEvent: string | null };
    confirmedAt: string | null;
    confirmedBy: "client" | "silence" | null;
  } | null;
  cancelled: { at: string; by: string | null; reason: string | null } | null;
  forfaitWaivedCents: number;
  receipts: { id: string; purchasedAt: string; mimeType: string }[];
  lines: GroceryLine[];
  receiptsSubmittedAt: string | null;
  receiptsTotalCents: number | null;
  contestClosesAt: string | null;
  captureDueAt: string | null;
  capture: { at: string; cents: number | null; releasedCents: number | null; safety: boolean } | null;
  refundedCents: number;
  instantPayout?: { chosen: boolean; feeCents: number | null; status: string | null } | null;
  disputes?: GroceryDispute[];
  settledAt: string | null;
}

export interface GroceryRunRow {
  id: string;
  purpose: "courses";
  status: GroceryStatus;
  budgetCents: number;
  holdPlacedAt: string | null;
  holdExpiresAt: string | null;
  holdFailureCode: string | null;
  receiptsTotalCents: number | null;
  capturedCents: number | null;
  capturedAt: string | null;
  refundedCents: number;
  openContests: number;
  disputes: number;
  disputesToRecover: number;
  instantPayout: boolean;
  booking: {
    id: string;
    reference: string | null;
    startsAt: string;
    clientName: string;
    chefProfileId: string;
    chefName: string;
  };
}

const CLE = ["admin", "courses"] as const;

/** `GET /admin/bookings/{id}/groceries`. */
export function useBookingGroceries(bookingId: string | undefined) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: [...CLE, "reservation", bookingId],
    queryFn: () => apiFetch<BookingGroceries>(`/admin/bookings/${bookingId}/groceries`),
    enabled: !!bookingId,
  });
}

/** `GET /admin/groceries` : le motif « courses », une ligne par prestation. */
export function useGroceryRuns(status?: GroceryStatus) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: [...CLE, "liste", status ?? "toutes"],
    queryFn: () =>
      apiFetch<GroceryRunRow[]>(`/admin/groceries${status ? `?status=${status}` : ""}`),
  });
}

export function useDecideGroceryLine() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      bookingId: string;
      lineId: string;
      decision: "upheld" | "rejected";
      note?: string;
    }) =>
      apiFetch<BookingGroceries>(
        `/admin/bookings/${input.bookingId}/groceries/lines/${input.lineId}/decision`,
        { method: "POST", body: { decision: input.decision, note: input.note } },
      ),
    onSuccess: (data) => {
      qc.setQueryData([...CLE, "reservation", data.bookingId], data);
      qc.invalidateQueries({ queryKey: [...CLE, "liste"] });
    },
  });
}

export function useDisputeFault() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { disputeId: string; fault: "chef" | "client" | "platform"; note?: string }) =>
      apiFetch(`/admin/groceries/disputes/${input.disputeId}/fault`, {
        method: "POST",
        body: { fault: input.fault, note: input.note },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLE }),
  });
}

export function useDisputeRecovered() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { disputeId: string; reference: string }) =>
      apiFetch(`/admin/groceries/disputes/${input.disputeId}/recovered`, {
        method: "POST",
        body: { reference: input.reference },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLE }),
  });
}

export function useGroceryReceiptUrl() {
  const apiFetch = useApiFetch();
  return useMutation({
    mutationFn: ({ bookingId, receiptId }: { bookingId: string; receiptId: string }) =>
      apiFetch<{ url: string }>(`/admin/bookings/${bookingId}/groceries/receipts/${receiptId}/url`),
  });
}
