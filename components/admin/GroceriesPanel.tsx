"use client";

import { useState } from "react";
import { AlertTriangle, FileText, Gavel, ShieldCheck, Wallet } from "lucide-react";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import InfoPopover from "@/components/ui/InfoPopover";
import { Skeleton } from "@/components/ui/Skeleton";
import { adminErrorMessage } from "@/lib/api/errors";
import {
  GROCERY_STATUS,
  type GroceryDispute,
  type GroceryLine,
  useBookingGroceries,
  useDecideGroceryLine,
  useDisputeFault,
  useDisputeRecovered,
  useGroceryReceiptUrl,
} from "@/lib/api/groceries";
import { centimes } from "@/lib/api/money";
import { formatDateLong } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   Les courses d'une réservation (Recettes lot 6) : le mandat signé et sa
   preuve, l'empreinte, la remise du message avant les courses par canal, les
   tickets, les lignes contestées à trancher, le prélèvement et les
   remboursements, les contestations bancaires.
   ───────────────────────────────────────────────────────────────────────────── */

const quand = (iso: string | null | undefined) => (iso ? formatDateLong(iso) : "—");

export default function GroceriesPanel({ bookingId }: { bookingId: string }) {
  const query = useBookingGroceries(bookingId);
  const receipt = useGroceryReceiptUrl();
  const [arbitrage, setArbitrage] = useState<GroceryLine | null>(null);
  const g = query.data;

  if (query.isPending) return <Skeleton className="h-32 rounded-2xl" />;
  if (query.isError) {
    return (
      <p role="alert" className="text-[12px] text-danger">
        {adminErrorMessage(query.error)}
      </p>
    );
  }
  if (!g?.applies || !g.status) return null;

  return (
    <section className="card p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-navy">
          <Wallet className="h-4 w-4 text-terra" aria-hidden /> Courses (motif « courses »)
          <InfoPopover label="Comment les courses sont-elles payées ?">
            À part de la prestation, par carte seulement, sans commission ni facture. Une
            empreinte du Budget Courses est posée 48 h avant ; seul le total des tickets est
            prélevé, 24 h après leur dépôt. Le client conteste une ligne sous 48 h : vous
            tranchez.
          </InfoPopover>
        </h3>
        <Badge tone={g.status === "hold_failed" || g.status === "awaiting_client" ? "warning" : "neutral"}>
          {GROCERY_STATUS[g.status]}
        </Badge>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
        <Ligne label="Budget Courses (montant maximum)" value={centimes(g.budgetCents)} />
        <Ligne
          label="Mandat signé"
          value={
            g.mandate
              ? `Modèle ${g.mandate.version}, accepté le ${quand(g.mandate.acceptedAt)}`
              : "—"
          }
        />
        {g.mandate && (
          <Ligne
            label="Preuve"
            value={[
              g.mandate.documentSha256 ? `SHA-256 ${g.mandate.documentSha256.slice(0, 16)}…` : null,
              g.mandate.ip ? `IP ${g.mandate.ip}` : null,
              g.mandate.userAgent ? g.mandate.userAgent.slice(0, 60) : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          />
        )}
        <Ligne label="Carte" value={g.card ? `${g.card.brand ?? "carte"} ···· ${g.card.last4}` : "Pas encore enregistrée"} />
        <Ligne
          label="Empreinte"
          value={
            g.hold?.placedAt
              ? `Posée le ${quand(g.hold.placedAt)}, expire le ${quand(g.hold.expiresAt)}`
              : g.hold?.failedAt
                ? `Refusée le ${quand(g.hold.failedAt)} (${g.hold.failureCode ?? "?"})`
                : `Au Verrouillage, le ${quand(g.opensAt)}`
          }
        />
        {g.notice && (
          <>
            <Ligne
              label="Message avant les courses"
              value={`Courses le ${quand(g.notice.shoppingAt)}, annulables jusqu’au ${quand(g.notice.cancelDeadline)}`}
            />
            <Ligne
              label="Remise par canal"
              value={[
                `Application : envoyée le ${quand(g.notice.sentAt)}`,
                g.notice.email?.deliveredAt
                  ? `E-mail remis le ${quand(g.notice.email.deliveredAt)}`
                  : g.notice.email?.bouncedAt
                    ? `E-mail non remis (${g.notice.email.lastEvent ?? "rebond"})`
                    : `E-mail : ${g.notice.email?.lastEvent ?? "pas de nouvelle de Brevo"}`,
              ].join(" · ")}
            />
            <Ligne
              label="Confirmation"
              value={
                g.notice.confirmedAt
                  ? `${g.notice.confirmedBy === "silence" ? "Par le silence" : "Par le client"}, le ${quand(g.notice.confirmedAt)}`
                  : "—"
              }
            />
          </>
        )}
        {g.cancelled && (
          <Ligne
            label="Annulées"
            value={`Le ${quand(g.cancelled.at)} par ${g.cancelled.by === "system" ? "la plateforme" : g.cancelled.by === "client" ? "le client" : "l’équipe"}${g.forfaitWaivedCents ? `, forfait de ${centimes(g.forfaitWaivedCents)} retiré` : ""}`}
          />
        )}
        {g.capture && (
          <Ligne
            label="Prélèvement"
            value={`${centimes(g.capture.cents ?? 0)} le ${quand(g.capture.at)}, ${centimes(g.capture.releasedCents ?? 0)} libérés${g.capture.safety ? " (capture de sécurité avant expiration)" : ""}${g.refundedCents ? `, ${centimes(g.refundedCents)} remboursés` : ""}`}
          />
        )}
        {g.instantPayout?.chosen && (
          <Ligne
            label="Versement instantané"
            value={`${g.instantPayout.status ?? "demandé"}, frais ${centimes(g.instantPayout.feeCents ?? 0)} à la charge du chef`}
          />
        )}
      </dl>

      {g.receiptsSubmittedAt && (
        <div className="mt-4 border-t border-[rgba(0,35,75,0.08)] pt-4">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy">
            Tickets : {centimes(g.receiptsTotalCents ?? 0)} · déposés le {quand(g.receiptsSubmittedAt)}
            {g.receipts.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onClick={() =>
                  receipt.mutate(
                    { bookingId, receiptId: r.id },
                    { onSuccess: ({ url }) => window.open(url, "_blank", "noopener") },
                  )
                }
                className="btn btn-ghost text-xs"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden /> Ticket {i + 1}
              </button>
            ))}
          </p>
          <ul className="mt-2 space-y-1.5">
            {g.lines.map((line) => (
              <li key={line.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cream-soft px-3 py-2 text-[13px]">
                <span className="min-w-0 text-navy">
                  {line.label}
                  {!line.receiptId && (
                    <span className="ml-2 text-xs text-ink-soft">
                      {line.clientApprovedAt ? "sans ticket, accepté" : "sans ticket, non remboursé"}
                    </span>
                  )}
                  {line.contestedAt && (
                    <span className="mt-0.5 block text-[12px] italic text-ink-mid">
                      Contestée : « {line.contestReason} »
                      {line.decision && ` — ${line.decision === "upheld" ? "fondée" : "rejetée"}`}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums">{centimes(line.amountCents)}</span>
                  {line.contestedAt && !line.decision && (
                    <button type="button" onClick={() => setArbitrage(line)} className="btn btn-outline text-xs">
                      <Gavel className="h-3.5 w-3.5" aria-hidden /> Trancher
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(g.disputes?.length ?? 0) > 0 && (
        <div className="mt-4 border-t border-[rgba(0,35,75,0.08)] pt-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-navy">
            <AlertTriangle className="h-4 w-4 text-danger" aria-hidden /> Contestations bancaires
            <InfoPopover label="Qui paie une contestation bancaire ?">
              Lab’s Food la supporte pendant son traitement. Perdue, vous désignez le fautif : le
              batch cooker (son virement est repris), le client (à recouvrer à la main) ou la
              plateforme (passée en perte).
            </InfoPopover>
          </p>
          <ul className="mt-2 space-y-2">
            {g.disputes!.map((d) => (
              <Dispute key={d.id} dispute={d} />
            ))}
          </ul>
        </div>
      )}

      <Arbitrage bookingId={bookingId} line={arbitrage} onClose={() => setArbitrage(null)} />
    </section>
  );
}

function Ligne({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-soft">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function Arbitrage({
  bookingId,
  line,
  onClose,
}: {
  bookingId: string;
  line: GroceryLine | null;
  onClose: () => void;
}) {
  const decide = useDecideGroceryLine();
  const [decision, setDecision] = useState<"upheld" | "rejected">("upheld");
  const [note, setNote] = useState("");
  return (
    <ConfirmDialog
      open={line !== null}
      onClose={onClose}
      onConfirm={() =>
        line &&
        decide.mutate(
          { bookingId, lineId: line.id, decision, note: note.trim() || undefined },
          { onSuccess: () => { setNote(""); onClose(); } },
        )
      }
      pending={decide.isPending}
      error={decide.isError ? adminErrorMessage(decide.error) : null}
      title={`Trancher « ${line?.label ?? ""} »`}
      lead="Fondée : la ligne est remboursée au client et reprise sur le virement du batch cooker (ou laissée hors du prélèvement s’il n’a pas eu lieu)."
      confirmLabel="Enregistrer la décision"
    >
      <div className="mt-3 space-y-2 text-[13px]">
        <label className="flex items-center gap-2">
          <input type="radio" checked={decision === "upheld"} onChange={() => setDecision("upheld")} /> Fondée
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={decision === "rejected"} onChange={() => setDecision("rejected")} /> Rejetée
        </label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} placeholder="Note (facultatif)" className="input-base" />
      </div>
    </ConfirmDialog>
  );
}

function Dispute({ dispute }: { dispute: GroceryDispute }) {
  const fault = useDisputeFault();
  const recovered = useDisputeRecovered();
  const [reference, setReference] = useState("");
  return (
    <li className="rounded-xl bg-cream-soft px-3 py-2 text-[13px]">
      <p className="text-navy">
        {centimes(dispute.amountCents)} · ouverte le {quand(dispute.openedAt)} · {dispute.status === "open" ? "en cours à la banque" : dispute.status === "won" ? "gagnée" : dispute.status === "lost" ? "perdue" : dispute.status}
        {dispute.fault && ` · fautif : ${dispute.fault === "chef" ? "batch cooker" : dispute.fault === "client" ? "client" : "plateforme"}`}
        {dispute.recoveryStatus === "recovered" && ` · récupérée (${dispute.recoveryReference ?? "—"})`}
      </p>
      {dispute.status === "lost" && !dispute.fault && (
        <div className="mt-2 flex flex-wrap gap-2">
          {(["chef", "client", "platform"] as const).map((f) => (
            <button key={f} type="button" disabled={fault.isPending} onClick={() => fault.mutate({ disputeId: dispute.id, fault: f })} className="btn btn-outline text-xs">
              {f === "chef" ? "Fautif : batch cooker" : f === "client" ? "Fautif : client" : "Fautif : plateforme"}
            </button>
          ))}
        </div>
      )}
      {dispute.recoveryStatus === "pending" && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Référence du remboursement du client" className="input-base max-w-xs py-1.5 text-xs" />
          <button type="button" disabled={!reference.trim() || recovered.isPending} onClick={() => recovered.mutate({ disputeId: dispute.id, reference: reference.trim() })} className="btn btn-primary text-xs">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Récupérée
          </button>
        </div>
      )}
      {(fault.isError || recovered.isError) && (
        <p role="alert" className="mt-1 text-[12px] text-danger">
          {adminErrorMessage(fault.error ?? recovered.error)}
        </p>
      )}
    </li>
  );
}
