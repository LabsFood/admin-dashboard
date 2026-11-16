"use client";

import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  Play,
  Receipt,
  RotateCw,
  ScrollText,
  Ticket,
} from "lucide-react";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import FilterTabs from "@/components/ui/FilterTabs";
import { GROCERY_STATUS, type GroceryStatus, useGroceryRuns } from "@/lib/api/groceries";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ReasonDialog from "@/components/ui/ReasonDialog";
import InfoPopover from "@/components/ui/InfoPopover";
import { useToast } from "@/components/ui/Toaster";
import { adminErrorMessage } from "@/lib/api/errors";
import UrssafDossierDrawer from "@/components/money/UrssafDossierDrawer";
import {
  CESU_ISSUER,
  CESU_MEDIUM,
  CESU_SETTLEMENT,
  COLLECTION_METHOD,
  DEBIT_STATUS,
  DECLARATION_TYPE,
  INVOICE_STATUS,
  LINK_STATUS,
  PAYMENT_METHOD,
  bps,
  centimes,
  nonSimule,
  useAttestations,
  useBackfillPaymentInvoices,
  useCesuPayments,
  useCesuProofUrl,
  useCommissionInvoices,
  useDecideUrssafLink,
  useForceSettleCesu,
  useRetryDebit,
  useRunDueCommissions,
  URSSAF_PAYMENT_STATUS,
  demandeManuelle,
  useMarkUrssafTransmitted,
  useSetUrssafOutcome,
  useUrssafLinks,
  useUrssafPayments,
  useUrssafReprise,
  useCreditNoteRefunded,
  type UrssafLink,
  type UrssafPayment,
  type CesuPayment,
  type CesuSettlement,
  type CommissionInvoice,
  type DebitStatus,
  type InvoiceStatus,
} from "@/lib/api/money";

/* ─────────────────────────────────────────────────────────────────────────────
   L'argent de la plateforme.

   Cet écran affichait seize mouvements écrits en dur. Il lit maintenant les
   douze routes qui existaient depuis le début et que rien n'appelait — ce qui
   veut dire, entre autres, qu'aucune commission n'avait jamais été facturée.

   Cinq circuits, cinq volets, parce qu'ils ne se comparent pas : le CESU
   est un argent que la plateforme ne voit jamais, la commission est une
   créance qu'elle prélève, la facture client est un document que le batch
   cooker émet par la plateforme, l'avance immédiate est une avance qu'un tiers
   consent, et l'attestation fiscale n'est pas un mouvement du tout.
   ───────────────────────────────────────────────────────────────────────────── */

type Volet = "cesu" | "commissions" | "factures" | "urssaf" | "courses" | "attestations";

const dateCourte = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR") : "—";

const dateHeure = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export default function TransactionsPage() {
  const [volet, setVolet] = useState<Volet>("cesu");

  return (
    <div className="space-y-6">
      <FilterTabs<Volet>
        value={volet}
        onChange={setVolet}
        options={[
          { id: "cesu", label: "CESU" },
          { id: "commissions", label: "Commissions" },
          { id: "factures", label: "Factures clients" },
          { id: "urssaf", label: "Avance immédiate" },
          { id: "courses", label: "Courses" },
          { id: "attestations", label: "Attestations fiscales" },
        ]}
      />

      {volet === "cesu" && <VoletCesu />}
      {volet === "commissions" && <VoletCommissions />}
      {volet === "factures" && <VoletFacturesClients />}
      {volet === "urssaf" && <VoletUrssaf />}
      {volet === "courses" && <VoletCourses />}
      {volet === "attestations" && <VoletAttestations />}
    </div>
  );
}

/* ── CESU ──────────────────────────────────────────────────────────────────── */

const TON_CESU: Record<CesuSettlement, BadgeTone> = {
  declared: "warning",
  confirmed: "success",
  rejected: "danger",
};

function VoletCesu() {
  const toast = useToast();
  const [filtre, setFiltre] = useState<CesuSettlement | "all">("declared");
  const liste = useCesuPayments(filtre);
  const preuve = useCesuProofUrl();
  const solder = useForceSettleCesu();
  const [aSolder, setASolder] = useState<CesuPayment | null>(null);

  const paiements = liste.data ?? [];
  const enAttente = paiements.filter((p) => p.settlementStatus === "declared");

  const voirPreuve = (id: string) =>
    preuve.mutate(id, {
      onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
      onError: (e) =>
        toast.error("Justificatif indisponible", adminErrorMessage(e)),
    });

  return (
    <div className="space-y-5">
      <Entete
        Icon={Ticket}
        titre="Déclarations CESU"
        texte="Le client déclare avoir remis ses titres, le batch cooker confirme les avoir reçus. La plateforme ne voit jamais cet argent — elle ne fait qu'en tenir le compte."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs<CesuSettlement | "all">
          value={filtre}
          onChange={setFiltre}
          options={[
            { id: "declared", label: "À confirmer", count: enAttente.length },
            { id: "confirmed", label: "Confirmées" },
            { id: "rejected", label: "Refusées" },
            { id: "all", label: "Toutes" },
          ]}
        />
      </div>

      <Corps
        query={liste}
        vide={{
          Icon: Ticket,
          title: "Aucune déclaration",
          text: "Les règlements en titres CESU déclarés par les clients apparaîtront ici.",
        }}
      >
        <ul className="space-y-3">
          {paiements.map((p) => (
            <li key={p.paymentId} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-lg font-bold text-navy tabular-nums">
                      {centimes(p.amountTtc)}
                    </p>
                    <Badge tone={TON_CESU[p.settlementStatus]}>
                      {CESU_SETTLEMENT[p.settlementStatus]}
                    </Badge>
                    {p.adminOverride && <Badge tone="terra">Soldé par un admin</Badge>}
                  </div>
                  <p className="mt-1.5 text-sm text-ink-mid">
                    {p.clientName ?? "Client"} → {p.chefDisplayName ?? "Batch cooker"}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {CESU_MEDIUM[p.medium] ?? p.medium}
                    {p.issuer ? ` · ${CESU_ISSUER[p.issuer] ?? p.issuer}` : ""}
                    {" · déclaré le "}
                    {dateCourte(p.declaredAt)}
                    {p.bookingReference ? ` · ${p.bookingReference}` : ""}
                  </p>
                  {p.rejectionReason && (
                    <p className="mt-2 text-xs text-danger">
                      Motif du refus : {p.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link
                    href={`/reservations/${p.bookingId}`}
                    className="btn btn-sm btn-outline"
                  >
                    La réservation <ArrowUpRight className="h-3 w-3" />
                  </Link>
                  {p.proofUploadedAt && (
                    <button
                      onClick={() => voirPreuve(p.paymentId)}
                      disabled={preuve.isPending}
                      className="btn btn-sm btn-outline"
                    >
                      {preuve.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      Le justificatif
                    </button>
                  )}
                  {p.settlementStatus === "declared" && (
                    <button
                      onClick={() => setASolder(p)}
                      className="btn btn-sm btn-navy"
                    >
                      Solder
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Corps>

      <ReasonDialog
        open={aSolder !== null}
        onClose={() => setASolder(null)}
        title={`Solder ${aSolder ? centimes(aSolder.amountTtc) : ""} à la place du batch cooker ?`}
        lead={
          aSolder
            ? `${aSolder.chefDisplayName ?? "Le batch cooker"} n'a pas confirmé avoir reçu les titres de ${aSolder.clientName ?? "ce client"}. Solder écrit une ligne de crédit d'impôt à son nom sans son accord : la référence que vous indiquez est conservée avec votre identité.`
            : ""
        }
        placeholder="Référence du justificatif : ticket de support, relevé de l'émetteur…"
        confirmLabel="Solder la déclaration"
        minLength={3}
        pending={solder.isPending}
        error={solder.error ? adminErrorMessage(solder.error) : null}
        onConfirm={(proofRef) =>
          aSolder &&
          solder.mutate(
            { id: aSolder.paymentId, proofRef },
            {
              onSuccess: () => {
                setASolder(null);
                toast.success(
                  "Déclaration soldée",
                  "La prestation est réglée et la ligne porte votre nom.",
                );
              },
            },
          )
        }
      />
    </div>
  );
}

/* ── Commissions ───────────────────────────────────────────────────────────── */

const TON_FACTURE: Record<InvoiceStatus, BadgeTone> = {
  issued: "warning",
  settled: "success",
  written_off: "neutral",
};

const TON_DEBIT: Record<DebitStatus, BadgeTone> = {
  pending: "info",
  processing: "info",
  succeeded: "success",
  failed: "danger",
  canceled: "neutral",
  reversed: "danger",
};

function VoletCommissions() {
  const toast = useToast();
  const [filtre, setFiltre] = useState<InvoiceStatus | "all">("issued");
  const liste = useCommissionInvoices(filtre);
  const lancer = useRunDueCommissions();
  const [aLancer, setALancer] = useState(false);
  const [periode, setPeriode] = useState({ periodStart: "", periodEnd: "" });

  const factures = useMemo(() => liste.data ?? [], [liste.data]);
  const du = useMemo(
    () =>
      factures
        .filter((f) => f.status === "issued")
        .reduce((n, f) => n + f.amountTtcCents, 0),
    [factures],
  );

  return (
    <div className="space-y-5">
      <Entete
        Icon={Receipt}
        titre="Factures de commission"
        texte="La facture précède toujours le prélèvement. Un prélèvement échoué ne l'annule pas : la créance survit, la relance réutilise le même numéro, et la série ne fait pas de trou."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs<InvoiceStatus | "all">
          value={filtre}
          onChange={setFiltre}
          options={[
            { id: "issued", label: "Dues" },
            { id: "settled", label: "Réglées" },
            { id: "written_off", label: "En perte" },
            { id: "all", label: "Toutes" },
          ]}
        />
        <button onClick={() => setALancer(true)} className="btn btn-navy btn-sm">
          <Play className="h-3.5 w-3.5" /> Facturer une période
        </button>
      </div>

      {filtre === "issued" && factures.length > 0 && (
        <p className="text-sm text-ink-mid">
          <span className="font-display text-lg font-bold text-navy tabular-nums">
            {centimes(du)}
          </span>{" "}
          dus sur {factures.length} facture{factures.length > 1 ? "s" : ""}.
        </p>
      )}

      <Corps
        query={liste}
        vide={{
          Icon: Receipt,
          title: "Aucune facture",
          text: "Lancez la facturation d'une période pour émettre les commissions dues.",
        }}
      >
        <ul className="space-y-3">
          {factures.map((f) => (
            <Facture key={f.id} facture={f} />
          ))}
        </ul>
      </Corps>

      <ConfirmDialog
        open={aLancer}
        onClose={() => setALancer(false)}
        onConfirm={() =>
          lancer.mutate(
            {
              periodStart: periode.periodStart || undefined,
              periodEnd: periode.periodEnd || undefined,
            },
            {
              onSuccess: (r) => {
                setALancer(false);
                if (r.skippedBecauseLocked) {
                  toast.info(
                    "Passage ignoré",
                    "Une autre instance facturait déjà : rien n'a été émis en double.",
                  );
                } else {
                  toast.success(
                    `${r.invoicesIssued} facture${r.invoicesIssued > 1 ? "s" : ""} émise${r.invoicesIssued > 1 ? "s" : ""}`,
                    `${r.debitsStarted} prélèvement${r.debitsStarted > 1 ? "s" : ""} envoyé${r.debitsStarted > 1 ? "s" : ""}.`,
                  );
                }
              },
              onError: (e) =>
                toast.error("Facturation impossible", adminErrorMessage(e)),
            },
          )
        }
        pending={lancer.isPending}
        title="Facturer les commissions d'une période ?"
        lead="Chaque batch cooker reçoit une facture groupée, puis le prélèvement part. Les prélèvements sont étalés sur la plage autorisée pour ne pas buter sur le plafond SEPA de 10 000 €."
        detail="Sans dates, l'API prend le mois précédent. Deux lancements simultanés ne facturent jamais deux fois : le second repart sans rien faire."
        confirmLabel="Lancer la facturation"
      >
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink-mid">
              Début de période
            </span>
            <input
              type="date"
              value={periode.periodStart}
              onChange={(e) =>
                setPeriode((p) => ({ ...p, periodStart: e.target.value }))
              }
              className="input-base w-full text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink-mid">
              Fin (exclue)
            </span>
            <input
              type="date"
              value={periode.periodEnd}
              onChange={(e) =>
                setPeriode((p) => ({ ...p, periodEnd: e.target.value }))
              }
              className="input-base w-full text-sm"
            />
          </label>
        </div>
      </ConfirmDialog>
    </div>
  );
}

function Facture({ facture: f }: { facture: CommissionInvoice }) {
  const toast = useToast();
  const rembourser = useCreditNoteRefunded();
  const relancer = useRetryDebit();
  const [ouvert, setOuvert] = useState(false);

  const dernier = f.debits[f.debits.length - 1];
  const echoue = dernier?.status === "failed";

  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-sm font-semibold text-navy">
              {f.invoiceNumber}
            </p>
            {f.kind === "credit_note" ? (
              <>
                <Badge tone="success">
                  Avoir {f.appliedToInvoiceId ? "déduit" : f.refundedAt ? "remboursé" : "à déduire"}
                </Badge>
                {!f.appliedToInvoiceId && !f.refundedAt && (
                  <button
                    type="button"
                    disabled={rembourser.isPending}
                    onClick={() =>
                      rembourser.mutate(f.id, {
                        onSuccess: () => toast.info("Avoir marqué remboursé"),
                        onError: (e) => toast.error("Impossible", adminErrorMessage(e)),
                      })
                    }
                    className="btn btn-sm btn-outline"
                  >
                    Remboursé à la main
                  </button>
                )}
              </>
            ) : (
              <Badge tone={TON_FACTURE[f.status]}>{INVOICE_STATUS[f.status]}</Badge>
            )}
            {echoue && <Badge tone="danger">Prélèvement échoué</Badge>}
          </div>
          <p className="mt-1.5 text-sm text-ink-mid">
            <Link
              href={`/batchcookers/${f.chefProfileId}`}
              className="font-semibold text-navy hover:text-terra-ink"
            >
              {f.chefDisplayName ?? "Batch cooker"}
            </Link>
            {" · "}
            {f.commissionsCount} prestation{f.commissionsCount > 1 ? "s" : ""}
            {f.periodStart ? ` · ${dateCourte(f.periodStart)} → ${dateCourte(f.periodEnd)}` : ""}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            {PAYMENT_METHOD[f.paymentMethod] ?? f.paymentMethod} ·{" "}
            {COLLECTION_METHOD[f.collectionMethod] ?? f.collectionMethod} ·
            commission {bps(f.rateBps)} · émise le {dateCourte(f.issuedAt)}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-display text-lg font-bold text-navy tabular-nums">
            {centimes(f.amountTtcCents)}
          </p>
          <p className="text-xs text-ink-soft tabular-nums">
            dont {centimes(f.amountVatCents)} de TVA
          </p>
          {echoue && (
            <button
              onClick={() =>
                relancer.mutate(f.id, {
                  onSuccess: () =>
                    toast.success(
                      "Prélèvement relancé",
                      "Même facture, même numéro, tentative suivante.",
                    ),
                  onError: (e) =>
                    toast.error("Relance refusée", adminErrorMessage(e)),
                })
              }
              disabled={relancer.isPending}
              className="btn btn-sm btn-navy mt-2"
            >
              {relancer.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RotateCw className="h-3 w-3" />
              )}
              Relancer
            </button>
          )}
        </div>
      </div>

      {f.debits.length > 0 && (
        <>
          <button
            onClick={() => setOuvert((o) => !o)}
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ink-mid hover:text-navy"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${ouvert ? "rotate-180" : ""}`}
            />
            {f.debits.length} tentative{f.debits.length > 1 ? "s" : ""} de prélèvement
          </button>

          {ouvert && (
            <ul className="mt-2 space-y-1.5 border-t border-[rgba(31,42,55,0.06)] pt-3">
              {f.debits.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center gap-2 text-xs text-ink-mid"
                >
                  <span className="font-mono text-ink-soft">#{d.attemptNumber}</span>
                  <Badge tone={TON_DEBIT[d.status]}>{DEBIT_STATUS[d.status]}</Badge>
                  <span>{centimes(d.amountTtcCents)}</span>
                  <span className="text-ink-soft">{dateHeure(d.initiatedAt)}</span>
                  {d.failureReason && (
                    <span className="text-danger">{d.failureReason}</span>
                  )}
                  {d.clawbackWindowEndsAt && d.status === "succeeded" && (
                    <span className="text-ink-soft">
                      révocable jusqu&apos;au {dateCourte(d.clawbackWindowEndsAt)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </li>
  );
}

/* ── Avance immédiate ──────────────────────────────────────────────────────── */

function VoletUrssaf() {
  const toast = useToast();
  const rattachements = useUrssafLinks("pending");
  const paiements = useUrssafPayments();
  const decider = useDecideUrssafLink();
  const repondre = useSetUrssafOutcome();
  const saisir = useMarkUrssafTransmitted();

  const [dossier, setDossier] = useState<UrssafLink | null>(null);
  const [aRefuserLien, setARefuserLien] = useState<UrssafLink | null>(null);
  const [aSaisir, setASaisir] = useState<UrssafPayment | null>(null);
  const [aRefuser, setARefuser] = useState<UrssafPayment | null>(null);
  const [aReprendre, setAReprendre] = useState<UrssafPayment | null>(null);
  const reprise = useUrssafReprise();

  const ouvert = !nonSimule(decider.error) && !nonSimule(repondre.error);

  return (
    <div className="space-y-5">
      <Entete
        Icon={Banknote}
        titre="Avance immédiate"
        texte="L'accès à l'API de l'URSSAF n'est pas encore ouvert. En mode manuel, Lab's Food saisit chaque rattachement et chaque demande sur l'espace Unipros, puis note ici la référence et la réponse. En mode simulé (jamais en production), la console répond à la place de l'URSSAF."
      />

      {!ouvert && (
        <div className="card flex items-start gap-3 border-warning/30 bg-warning/5 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#8A6212]" />
          <p className="text-sm leading-relaxed text-[#8A6212]">
            La passerelle URSSAF n&apos;est ni en mode manuel ni simulé sur ce
            serveur : l&apos;API refuse de noter une réponse. Les listes restent
            consultables, les décisions non.
          </p>
        </div>
      )}

      <section>
        <h3 className="mb-3 font-display text-base font-bold text-navy">
          Rattachements en attente
        </h3>
        <Corps
          query={rattachements}
          vide={{
            Icon: Banknote,
            title: "Aucun rattachement en attente",
            text: "Les demandes des clients pour l'avance immédiate apparaîtront ici.",
          }}
        >
          <ul className="space-y-3">
            {(rattachements.data ?? []).map((l) => (
              <li
                key={l.id}
                className="card flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-navy">{l.client.name}</p>
                  <p className="text-sm text-ink-mid">
                    avec {l.chefName} · demandé le {dateCourte(l.requestedAt)}
                  </p>
                  <p className="text-xs text-ink-soft">{l.client.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={l.status === "pending" ? "warning" : "success"}>
                    {LINK_STATUS[l.status]}
                  </Badge>
                  <button
                    onClick={() => setDossier(l)}
                    className="btn btn-sm btn-outline"
                  >
                    <FileText className="h-3 w-3" /> Dossier
                  </button>
                  <button
                    disabled={decider.isPending || !ouvert}
                    onClick={() => setARefuserLien(l)}
                    className="btn btn-sm btn-outline disabled:opacity-40"
                  >
                    Refuser
                  </button>
                  <button
                    disabled={decider.isPending || !ouvert}
                    onClick={() =>
                      decider.mutate(
                        { id: l.id, status: "active" },
                        {
                          onSuccess: () =>
                            toast.success(
                              "Rattachement actif",
                              "Le client peut régler avec l'avance immédiate.",
                            ),
                          onError: (e) =>
                            toast.error("Rattachement impossible", adminErrorMessage(e)),
                        },
                      )
                    }
                    className="btn btn-sm btn-navy disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Rattacher
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Corps>
      </section>

      <section>
        <h3 className="mb-3 font-display text-base font-bold text-navy">
          Demandes de paiement
        </h3>
        <Corps
          query={paiements}
          vide={{
            Icon: Banknote,
            title: "Aucune demande de paiement",
            text: "Les demandes d'avance immédiate apparaîtront ici, à saisir sur Unipros en mode manuel.",
          }}
        >
          <ul className="space-y-3">
            {(paiements.data ?? []).map((p) => {
              const manuel = demandeManuelle(p);
              const enAttente = p.status === "pending";
              const aSaisirSurUnipros = manuel && enAttente && !p.transmittedAt;
              return (
                <li
                  key={p.paymentId}
                  className="card flex flex-wrap items-center justify-between gap-4 p-5"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-navy tabular-nums">
                      {centimes(p.amountCents)}
                      {p.debitedCents > 0 && p.debitedCents !== p.amountCents && (
                        <span className="ml-2 text-sm font-normal text-ink-mid">
                          dont {centimes(p.debitedCents)} prélevés au client
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-ink-mid">
                      {p.booking.clientName} →{" "}
                      <Link
                        href={`/batchcookers/${p.booking.chefProfileId}`}
                        className="hover:text-terra-ink"
                      >
                        {p.booking.chefName}
                      </Link>{" "}
                      ·{" "}
                      <Link
                        href={`/reservations/${p.booking.id}`}
                        className="font-mono text-xs hover:text-terra-ink"
                      >
                        {p.booking.reference}
                      </Link>
                    </p>
                    <p className="text-xs text-ink-soft">
                      {manuel ? (
                        <>
                          NOVA{" "}
                          <span className="font-mono">
                            {p.booking.chefNovaCode ?? "non renseigné"}
                          </span>
                          {p.externalReference && (
                            <>
                              {" "}· Unipros{" "}
                              <span className="font-mono">{p.externalReference}</span>
                            </>
                          )}
                        </>
                      ) : (
                        <span className="font-mono">{p.urssafReference}</span>
                      )}{" "}
                      · {dateCourte(p.createdAt)}
                      {p.failureReason ? ` · ${p.failureReason}` : ""}
                    </p>
                    {p.lines && p.lines.length > 0 && (
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {p.lines.map((l) => `${l.label} ${centimes(l.amountCents)}`).join(" · ")}
                      </p>
                    )}
                    {p.reprise && (
                      <p className="mt-0.5 text-xs text-danger">
                        Reprise URSSAF (statut 120) le {dateCourte(p.reprise.at)}
                        {p.reprise.reason ? ` : ${p.reprise.reason}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={p.paidAt ? "success" : enAttente ? "warning" : "danger"}>
                      {aSaisirSurUnipros
                        ? "À saisir sur Unipros"
                        : (URSSAF_PAYMENT_STATUS[p.status] ?? p.status)}
                    </Badge>
                    {p.paidAt && p.status === "succeeded" && !p.reprise && (
                      <button
                        disabled={reprise.isPending}
                        onClick={() => setAReprendre(p)}
                        className="btn btn-sm btn-outline disabled:opacity-40"
                      >
                        Reprise URSSAF
                      </button>
                    )}
                    {aSaisirSurUnipros && (
                      <button
                        disabled={saisir.isPending || !ouvert}
                        onClick={() => setASaisir(p)}
                        className="btn btn-sm btn-navy disabled:opacity-40"
                      >
                        Noter la saisie
                      </button>
                    )}
                    {enAttente && !aSaisirSurUnipros && (
                      <>
                        <button
                          disabled={repondre.isPending || !ouvert}
                          onClick={() => setARefuser(p)}
                          className="btn btn-sm btn-outline disabled:opacity-40"
                        >
                          Refuser
                        </button>
                        <button
                          disabled={repondre.isPending || !ouvert}
                          onClick={() =>
                            repondre.mutate(
                              { id: p.paymentId, outcome: "paid" },
                              {
                                onSuccess: () =>
                                  toast.success(
                                    "Paiement validé",
                                    manuel
                                      ? "La prestation est réglée. La commission attend : prélevez-la depuis la fiche du batch cooker."
                                      : "La prestation est réglée et la commission devient due.",
                                  ),
                                onError: (e) =>
                                  toast.error("Validation impossible", adminErrorMessage(e)),
                              },
                            )
                          }
                          className="btn btn-sm btn-navy disabled:opacity-40"
                        >
                          Marquer payé
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Corps>
      </section>

      <UrssafDossierDrawer
        linkId={dossier?.id ?? null}
        clientName={dossier?.client.name}
        chefName={dossier?.chefName}
        onClose={() => setDossier(null)}
      />

      <ReasonDialog
        open={aRefuserLien !== null}
        onClose={() => setARefuserLien(null)}
        title="Refuser le rattachement ?"
        lead="Notez le motif donné par Unipros ou l'URSSAF. Le client pourra refaire sa demande, et payer autrement en attendant."
        placeholder="Motif du refus : compte bancaire non vérifié, identité incohérente…"
        confirmLabel="Refuser le rattachement"
        minLength={5}
        pending={decider.isPending}
        error={decider.error ? adminErrorMessage(decider.error) : null}
        onConfirm={(reason) =>
          aRefuserLien &&
          decider.mutate(
            { id: aRefuserLien.id, status: "refused", reason },
            {
              onSuccess: () => {
                setARefuserLien(null);
                toast.info("Rattachement refusé");
              },
            },
          )
        }
      />

      <ReasonDialog
        open={aSaisir !== null}
        onClose={() => setASaisir(null)}
        title="Noter la saisie sur Unipros"
        lead={
          aSaisir
            ? `Saisissez la demande de ${centimes(aSaisir.amountCents)} sur l'espace Unipros (NOVA du batch cooker : ${aSaisir.booking.chefNovaCode ?? "non renseigné"}), puis recopiez ici la référence qu'Unipros lui a donnée. Une demande ne se note qu'une fois.`
            : ""
        }
        placeholder="Référence Unipros de la demande"
        confirmLabel="Noter la saisie"
        minLength={3}
        maxLength={100}
        pending={saisir.isPending}
        error={saisir.error ? adminErrorMessage(saisir.error) : null}
        onConfirm={(externalReference) =>
          aSaisir &&
          saisir.mutate(
            { id: aSaisir.paymentId, externalReference },
            {
              onSuccess: () => {
                setASaisir(null);
                toast.success("Saisie notée", "La demande attend la réponse de l'URSSAF.");
              },
            },
          )
        }
      />

      <ReasonDialog
        open={aReprendre !== null}
        onClose={() => setAReprendre(null)}
        title="L’URSSAF a repris cette prestation (statut 120) ?"
        lead="Le paiement est marqué remboursé et la prestation redevient due. La commission revient au batch cooker : retirée si elle n’était pas facturée, sinon un avoir dans la suite des factures B, déduit de sa prochaine facture."
        placeholder="Motif donné par Unipros : contestation du particulier…"
        confirmLabel="Enregistrer la reprise"
        minLength={5}
        pending={reprise.isPending}
        error={reprise.error ? adminErrorMessage(reprise.error) : null}
        onConfirm={(reason) =>
          aReprendre &&
          reprise.mutate(
            { id: aReprendre.paymentId, reason },
            {
              onSuccess: (r) => {
                setAReprendre(null);
                toast.info(
                  "Reprise enregistrée",
                  r.creditNote
                    ? `Avoir ${r.creditNote.invoiceNumber} de ${centimes(r.creditNote.amountTtcCents)} émis au batch cooker.`
                    : "La commission, pas encore facturée, est retirée.",
                );
              },
            },
          )
        }
      />

      <ReasonDialog
        open={aRefuser !== null}
        onClose={() => setARefuser(null)}
        title="Refuser la demande de paiement ?"
        lead="La prestation redevient due : le client pourra payer par un autre moyen. Le motif est gardé sur le paiement."
        placeholder="Motif : prélèvement rejeté, demande refusée par le client…"
        confirmLabel="Refuser la demande"
        minLength={5}
        pending={repondre.isPending}
        error={repondre.error ? adminErrorMessage(repondre.error) : null}
        onConfirm={(reason) =>
          aRefuser &&
          repondre.mutate(
            { id: aRefuser.paymentId, outcome: "refused", reason },
            {
              onSuccess: () => {
                setARefuser(null);
                toast.info("Paiement refusé");
              },
            },
          )
        }
      />
    </div>
  );
}

/* ── Courses (Recettes lot 6) ──────────────────────────────────────────────── */

/**
 * Le motif « courses » : jamais facturé, jamais commissionné, payé par carte à
 * part. Une ligne par prestation ; le détail (tickets, contestations, litiges)
 * est sur la réservation.
 */
function VoletCourses() {
  const [filtre, setFiltre] = useState<GroceryStatus | "all">("all");
  const liste = useGroceryRuns(filtre === "all" ? undefined : filtre);
  const lignes = liste.data ?? [];
  return (
    <div className="space-y-4">
      <FilterTabs<GroceryStatus | "all">
        value={filtre}
        onChange={setFiltre}
        options={[
          { id: "all", label: "Toutes" },
          { id: "hold_failed", label: "Empreinte refusée" },
          { id: "awaiting_client", label: "En attente du client" },
          { id: "receipts_submitted", label: "Tickets déposés" },
          { id: "captured", label: "Prélevées" },
          { id: "settled", label: "Soldées" },
        ]}
      />
      <p className="text-xs text-ink-mid">
        Motif « courses » : payé par carte à part, sans commission ni facture, hors crédit
        d’impôt et hors déclarations DAC7.
      </p>
      {liste.isPending ? (
        <Skeleton className="h-24 rounded-2xl" />
      ) : liste.isError ? (
        <p role="alert" className="text-[12px] text-danger">{adminErrorMessage(liste.error)}</p>
      ) : lignes.length === 0 ? (
        <p className="text-sm text-ink-soft">Aucunes courses ici.</p>
      ) : (
        <ul className="space-y-2">
          {lignes.map((r) => (
            <li key={r.id} className="card flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-navy">
                  <Link href={`/reservations/${r.booking.id}`} className="hover:text-terra-ink">
                    {r.booking.reference ?? "Réservation"}
                  </Link>
                  {" · "}
                  {r.booking.clientName} · {r.booking.chefName}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Prestation le {dateCourte(r.booking.startsAt)} · Budget {centimes(r.budgetCents)}
                  {r.holdPlacedAt ? ` · empreinte le ${dateHeure(r.holdPlacedAt)}` : ""}
                  {r.holdFailureCode ? ` · refusée (${r.holdFailureCode})` : ""}
                  {r.instantPayout ? " · versement instantané" : ""}
                </p>
                {(r.openContests > 0 || r.disputesToRecover > 0) && (
                  <p className="mt-0.5 text-xs font-semibold text-danger">
                    {r.openContests > 0 && `${r.openContests} ligne(s) à trancher`}
                    {r.openContests > 0 && r.disputesToRecover > 0 && " · "}
                    {r.disputesToRecover > 0 && `${r.disputesToRecover} contestation(s) bancaire(s) à traiter`}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <Badge tone={r.status === "hold_failed" || r.status === "awaiting_client" ? "warning" : r.status === "settled" ? "success" : "neutral"}>
                  {GROCERY_STATUS[r.status]}
                </Badge>
                <p className="mt-1 text-sm font-semibold text-navy tabular-nums">
                  {r.capturedCents != null ? centimes(r.capturedCents) : r.receiptsTotalCents != null ? centimes(r.receiptsTotalCents) : "—"}
                </p>
                {r.refundedCents > 0 && (
                  <p className="text-xs text-ink-soft">dont {centimes(r.refundedCents)} remboursés</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Attestations fiscales ─────────────────────────────────────────────────── */

function VoletAttestations() {
  const [annee, setAnnee] = useState(() => new Date().getFullYear() - 1);
  const liste = useAttestations(annee);
  const [ouvert, setOuvert] = useState<string | null>(null);

  const clients = liste.data ?? [];
  const annees = [0, 1, 2].map((n) => new Date().getFullYear() - n);

  return (
    <div className="space-y-5">
      <Entete
        Icon={ScrollText}
        titre="Attestations fiscales"
        texte="Deux montants, et il ne faut pas les confondre : ce que le client pourrait déclarer, et la part que Lab's Food atteste réellement. Un batch cooker sans voie SAP déclarée n'ouvre aucun droit attesté."
      />

      <div className="flex flex-wrap items-center gap-2">
        {annees.map((a) => (
          <button
            key={a}
            onClick={() => setAnnee(a)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              a === annee
                ? "bg-navy text-white"
                : "bg-cream-soft text-navy hover:bg-cream-deep"
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      <Corps
        query={liste}
        vide={{
          Icon: ScrollText,
          title: `Aucune attestation pour ${annee}`,
          text: "Les clients ayant réglé une prestation dans l'année apparaîtront ici.",
        }}
      >
        <ul className="space-y-3">
          {clients.map((c) => {
            const deplie = ouvert === c.clientId;
            const ecart = c.eligibleAmountCents - c.platformAttestedAmountCents;
            return (
              <li key={c.clientId} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy">
                      {c.clientName ?? c.clientEmail}
                    </p>
                    <p className="text-xs text-ink-soft tabular-nums">
                      {c.clientEmail} · {c.paymentsCount} paiement
                      {c.paymentsCount > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-lg font-bold text-navy tabular-nums">
                      {centimes(c.platformAttestedAmountCents)}
                    </p>
                    <p className="text-xs text-ink-soft">attestés par Lab&apos;s Food</p>
                    {ecart > 0 && (
                      <p className="mt-0.5 text-xs text-[#8A6212] tabular-nums">
                        {centimes(ecart)} éligibles non attestés
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setOuvert(deplie ? null : c.clientId)}
                  className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ink-mid hover:text-navy"
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${deplie ? "rotate-180" : ""}`}
                  />
                  {c.providers.length} batch cooker
                  {c.providers.length > 1 ? "s" : ""}
                </button>

                {deplie && (
                  <ul className="mt-2 space-y-2 border-t border-[rgba(31,42,55,0.06)] pt-3">
                    {c.providers.map((p) => (
                      <li key={p.chefProfileId} className="text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Link
                            href={`/batchcookers/${p.chefProfileId}`}
                            className="font-semibold text-navy hover:text-terra-ink"
                          >
                            {p.chefDisplayName}
                          </Link>
                          <span className="text-ink-mid tabular-nums">
                            {centimes(p.platformAttestedAmountCents)}
                            {p.eligibleAmountCents !== p.platformAttestedAmountCents && (
                              <span className="text-ink-soft tabular-nums">
                                {" "}
                                / {centimes(p.eligibleAmountCents)} éligibles
                              </span>
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-ink-soft">
                          {p.sapDeclared
                            ? `${DECLARATION_TYPE[p.declarationType ?? ""] ?? "SAP déclarée"}${
                                p.novaCode ? ` · ${p.novaCode}` : ""
                              }${p.cooperativeName ? ` · ${p.cooperativeName}` : ""}`
                            : "Aucune voie SAP déclarée"}
                        </p>
                        {p.notes.map((n, i) => (
                          <p key={i} className="mt-0.5 text-xs text-[#8A6212]">
                            {n}
                          </p>
                        ))}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </Corps>
    </div>
  );
}

/* ── Factures clients ──────────────────────────────────────────────────────── */

/** Ce que veut dire un code d'échec du rattrapage, pour qui doit décider quoi faire. */
const ECHEC_RATTRAPAGE: Record<string, string> = {
  P2002: "numéro pris par un paiement réglé au même moment : relancez",
  INVOICE_AMOUNT_INVALID: "montant nul ou invalide sur ce paiement",
};

/**
 * La facture A est émise au paiement. Seuls les paiements par carte réglés
 * avant son ouverture n'en ont pas : ce volet les compte, puis les émet.
 * Compter d'abord n'est pas une précaution de style — une facture émise ne se
 * retire plus.
 */
function VoletFacturesClients() {
  const toast = useToast();
  const compter = useBackfillPaymentInvoices();
  const emettre = useBackfillPaymentInvoices();
  const [aEmettre, setAEmettre] = useState(false);
  const enAttente = compter.data?.pending;
  const resultat = emettre.data;

  const lancerComptage = () =>
    compter.mutate(true, {
      onError: (e) => toast.error("Comptage impossible", adminErrorMessage(e)),
    });

  return (
    <div className="space-y-5">
      <Entete
        Icon={ScrollText}
        titre="Factures clients"
        texte="La facture que le client reçoit pour chaque paiement par carte, au nom du batch cooker. Elle est émise au moment du paiement et se télécharge depuis la commande, côté client comme côté batch cooker. Les paiements réglés avant l'ouverture des factures n'en ont pas : ils se rattrapent ici."
      />

      <div className="card space-y-4 p-5">
        <h3 className="flex items-center gap-1 font-display text-base font-bold text-navy">
          Rattrapage des paiements sans facture
          <InfoPopover label="Comment la facture rattrapée est-elle datée ?">
            Elle est datée du jour du rattrapage et prend le numéro suivant de la
            série de l’année (LF-CUS26-00001…), du plus ancien paiement au plus
            récent. Le PDF indique la vraie date du paiement : une facture n’est
            jamais antidatée. Seuls les paiements par carte soldés sont concernés :
            ni CESU ni avance immédiate pour l’instant, ni paiement remboursé.
          </InfoPopover>
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={lancerComptage}
            disabled={compter.isPending}
            className="btn btn-outline btn-sm"
          >
            {compter.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCw className="h-3.5 w-3.5" />
            )}
            Compter
          </button>
          {enAttente !== undefined && (
            <p className="text-sm text-ink-mid">
              <span className="font-display text-lg font-bold text-navy">{enAttente}</span>{" "}
              paiement{enAttente > 1 ? "s" : ""} par carte sans facture.
            </p>
          )}
          {!!enAttente && (
            <button onClick={() => setAEmettre(true)} className="btn btn-navy btn-sm">
              <Play className="h-3.5 w-3.5" /> Émettre {enAttente} facture
              {enAttente > 1 ? "s" : ""}
            </button>
          )}
        </div>

        {resultat && (
          <div className="rounded-xl bg-cream-soft px-4 py-3 text-sm text-ink-mid">
            <p>
              <span className="font-semibold text-navy tabular-nums">
                {resultat.issued.length} facture{resultat.issued.length > 1 ? "s" : ""}{" "}
                émise{resultat.issued.length > 1 ? "s" : ""}
              </span>
              {resultat.issued.length > 0 &&
                ` : ${resultat.issued[0].invoiceNumber}${
                  resultat.issued.length > 1
                    ? ` à ${resultat.issued[resultat.issued.length - 1].invoiceNumber}`
                    : ""
                }`}
              .
            </p>
            {resultat.failed.length > 0 && (
              <>
                <p className="mt-2 flex items-center gap-1.5 font-semibold text-navy">
                  <AlertTriangle className="h-4 w-4 text-terra" />
                  {resultat.failed.length} paiement
                  {resultat.failed.length > 1 ? "s" : ""} sans facture
                </p>
                <ul className="mt-1 space-y-0.5 text-xs">
                  {resultat.failed.map((f) => (
                    <li key={f.paymentId}>
                      <span className="font-mono">{f.paymentId}</span> —{" "}
                      {ECHEC_RATTRAPAGE[f.code] ?? f.code}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs">
                  Relancer n’émet que ce qui manque encore.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={aEmettre}
        onClose={() => setAEmettre(false)}
        onConfirm={() =>
          emettre.mutate(false, {
            onSuccess: (r) => {
              setAEmettre(false);
              compter.reset();
              toast.success(
                `${r.issued.length} facture${r.issued.length > 1 ? "s" : ""} émise${r.issued.length > 1 ? "s" : ""}`,
                r.failed.length > 0
                  ? `${r.failed.length} paiement${r.failed.length > 1 ? "s" : ""} en échec : voir le détail.`
                  : undefined,
              );
            },
            onError: (e) => toast.error("Rattrapage impossible", adminErrorMessage(e)),
          })
        }
        pending={emettre.isPending}
        title={`Émettre ${enAttente ?? 0} facture${(enAttente ?? 0) > 1 ? "s" : ""} ?`}
        lead="Chaque paiement par carte sans facture en reçoit une, au nom de son batch cooker, du plus ancien au plus récent. Le client et le batch cooker la voient aussitôt sur la commande."
        detail="Une facture émise ne se retire plus. Elle est datée d'aujourd'hui et porte la vraie date du paiement."
        confirmLabel="Émettre les factures"
      />
    </div>
  );
}

/* ── Pièces communes ───────────────────────────────────────────────────────── */

function Entete({
  Icon,
  titre,
  texte,
}: {
  Icon: typeof Receipt;
  titre: string;
  texte: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cream-deep text-navy">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h2 className="font-display text-lg font-bold text-navy">{titre}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-mid">{texte}</p>
      </div>
    </div>
  );
}

/** Attente, échec, vide : les trois états qu'une liste doit savoir dire. */
function Corps({
  query,
  vide,
  children,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => void;
    data?: unknown[];
  };
  vide: { Icon: typeof Receipt; title: string; text: string };
  children: React.ReactNode;
}) {
  if (query.isPending) {
    return (
      <SkeletonGroup className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-24 p-4">
            <Skeleton className="h-full rounded-[10px]" />
          </div>
        ))}
      </SkeletonGroup>
    );
  }

  if (query.isError) {
    return (
      <div className="card p-8 text-center">
        <p className="font-display text-base font-bold text-navy">
          Chargement impossible
        </p>
        <p className="mt-1 text-sm text-ink-mid">
          {adminErrorMessage(query.error)}
        </p>
        <button onClick={() => query.refetch()} className="btn btn-navy mt-4">
          <RotateCw className="h-4 w-4" /> Réessayer
        </button>
      </div>
    );
  }

  if ((query.data ?? []).length === 0) {
    return (
      <div className="card">
        <EmptyState Icon={vide.Icon} title={vide.title} text={vide.text} />
      </div>
    );
  }

  return <>{children}</>;
}
