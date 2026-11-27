"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Banknote, CheckCircle2, Clock, RotateCw } from "lucide-react";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import StatCard from "@/components/ui/StatCard";
import { useToast } from "@/components/ui/Toaster";
import { adminErrorMessage } from "@/lib/api/errors";
import {
  COMMISSION_STATUS,
  DEBIT_STATUS,
  PAYMENT_METHOD,
  centimes,
  useChefTransactions,
  useCollectCommissions,
  type ChefTransaction,
} from "@/lib/api/money";
import { formatDateShort } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   Ce que le batch cooker a encaissé, et ce que Lab's Food lui prélève.

   En avance immédiate (mode manuel), la commission ne se prélève pas seule
   quand l'URSSAF paie : l'admin la choisit ici et lance le prélèvement. Seules
   les commissions « à prélever » sur une prestation déjà payée se cochent ;
   l'API refuse les autres (`COMMISSION_NOT_COLLECTABLE`).
   ───────────────────────────────────────────────────────────────────────────── */

const PAYMENT_STATUS: Record<string, string> = {
  pending: "En attente",
  succeeded: "Payé",
  failed: "Échoué",
  refunded: "Remboursé",
};

export default function ChefTransactions({ chefProfileId }: { chefProfileId: string }) {
  const toast = useToast();
  const q = useChefTransactions(chefProfileId);
  const prelever = useCollectCommissions(chefProfileId);
  const [choix, setChoix] = useState<Set<string>>(new Set());
  const [aConfirmer, setAConfirmer] = useState(false);

  if (q.isPending) {
    return (
      <SkeletonGroup className="space-y-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <StatCard key={i} Icon={Banknote} label="" value="" loading />
          ))}
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-20 p-4">
            <Skeleton className="h-full rounded-[10px]" />
          </div>
        ))}
      </SkeletonGroup>
    );
  }

  if (q.isError) {
    return (
      <section className="card p-5">
        <p className="flex items-start gap-2 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {adminErrorMessage(q.error)}
        </p>
        <button onClick={() => q.refetch()} className="btn btn-outline btn-sm mt-4">
          <RotateCw className="h-3 w-3" /> Réessayer
        </button>
      </section>
    );
  }

  const { totals, transactions } = q.data;
  const choisies = transactions.filter(
    (t) => t.commission?.collectable && choix.has(t.commission.id),
  );
  const montant = choisies.reduce((s, t) => s + (t.commission?.amountTtcCents ?? 0), 0);

  const basculer = (id: string) =>
    setChoix((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard
          Icon={Banknote}
          label="À prélever maintenant"
          value={centimes(totals.collectable.amountTtcCents)}
          sub={`${totals.collectable.count} commission${totals.collectable.count > 1 ? "s" : ""}`}
        />
        <StatCard
          Icon={Clock}
          label="Prélèvements en cours"
          value={centimes(
            (totals.byStatus.invoiced?.amountTtcCents ?? 0) +
              (totals.byStatus.processing?.amountTtcCents ?? 0),
          )}
        />
        <StatCard
          Icon={CheckCircle2}
          label="Encaissées"
          value={centimes(totals.byStatus.collected?.amountTtcCents ?? 0)}
        />
      </div>

      {transactions.length === 0 ? (
        <section className="card">
          <EmptyState
            Icon={Banknote}
            title="Aucune transaction"
            text="Les paiements de ses prestations, et les commissions prises dessus, apparaîtront ici."
          />
        </section>
      ) : (
        <section className="card divide-y divide-[rgba(0,35,75,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-ink-mid">
              {choisies.length > 0
                ? `${choisies.length} commission${choisies.length > 1 ? "s" : ""} choisie${choisies.length > 1 ? "s" : ""} · ${centimes(montant)}`
                : "Cochez les commissions à prélever."}
            </p>
            <button
              disabled={choisies.length === 0 || prelever.isPending}
              onClick={() => setAConfirmer(true)}
              className="btn btn-sm btn-primary disabled:opacity-40"
            >
              Prélever la sélection
            </button>
          </div>
          {transactions.map((t) => (
            <Ligne
              key={t.paymentId}
              t={t}
              coche={!!t.commission && choix.has(t.commission.id)}
              onBasculer={basculer}
            />
          ))}
        </section>
      )}

      <ConfirmDialog
        open={aConfirmer}
        onClose={() => setAConfirmer(false)}
        title={`Prélever ${centimes(montant)} ?`}
        lead={`Une facture de commission est émise pour ${choisies.length} commission${choisies.length > 1 ? "s" : ""}, puis prélevée sur le mandat SEPA du batch cooker.`}
        detail="La facture ne se retire plus. Un prélèvement refusé laisse la facture due : il se relance depuis l'onglet Commissions des transactions."
        confirmLabel="Émettre et prélever"
        pending={prelever.isPending}
        error={prelever.error ? adminErrorMessage(prelever.error) : null}
        onConfirm={() =>
          prelever.mutate(
            choisies.map((t) => t.commission!.id),
            {
              onSuccess: (r) => {
                setAConfirmer(false);
                setChoix(new Set());
                if (r.debit.status === "failed") {
                  toast.error(
                    `Facture ${r.invoice.invoiceNumber} émise, prélèvement refusé`,
                    r.debit.failureReason ?? "La facture reste due.",
                  );
                } else {
                  toast.success(
                    `Facture ${r.invoice.invoiceNumber} émise`,
                    `Prélèvement de ${centimes(r.invoice.amountTtcCents)} envoyé.`,
                  );
                }
              },
            },
          )
        }
      />
    </div>
  );
}

function Ligne({
  t,
  coche,
  onBasculer,
}: {
  t: ChefTransaction;
  coche: boolean;
  onBasculer: (commissionId: string) => void;
}) {
  const c = t.commission;
  return (
    <div className="flex flex-wrap items-center gap-3 p-4">
      <label className="hit flex h-10 w-10 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          disabled={!c?.collectable}
          checked={coche}
          onChange={() => c && onBasculer(c.id)}
          aria-label={c ? `Choisir la commission de ${centimes(c.amountTtcCents)}` : "Pas de commission"}
          className="h-4 w-4 accent-navy disabled:opacity-30"
        />
      </label>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-navy tabular-nums">
          {centimes(t.amountCents)}{" "}
          <span className="font-normal text-ink-mid">
            · {PAYMENT_METHOD[t.method] ?? t.method}
            {t.purpose === "courses" ? " · courses" : ""}
          </span>
        </p>
        <p className="text-xs text-ink-soft">
          {t.booking.clientName} ·{" "}
          <Link
            href={`/reservations/${t.booking.id}`}
            className="font-mono hover:text-terra-ink"
          >
            {t.booking.reference ?? "—"}
          </Link>{" "}
          · {formatDateShort(t.paidAt ?? t.createdAt)}
          {t.externalReference && (
            <>
              {" "}· Réf. <span className="font-mono">{t.externalReference}</span>
            </>
          )}
        </p>
      </div>
      <Badge tone={t.status === "succeeded" ? "success" : t.status === "pending" ? "warning" : "danger"}>
        {PAYMENT_STATUS[t.status] ?? t.status}
      </Badge>
      <div className="w-full text-right text-xs text-ink-mid sm:w-56">
        {c ? (
          <>
            <p className="tabular-nums">
              Commission {centimes(c.amountTtcCents)} ·{" "}
              <span className={c.collectable ? "font-semibold text-terra-ink" : ""}>
                {COMMISSION_STATUS[c.status] ?? c.status}
              </span>
            </p>
            {c.invoice && (
              <p>
                <span className="font-mono">{c.invoice.invoiceNumber}</span>
                {c.lastDebit && ` · ${DEBIT_STATUS[c.lastDebit.status]}`}
                {c.lastDebit?.failureReason ? ` · ${c.lastDebit.failureReason}` : ""}
              </p>
            )}
            {c.status === "pending" && !c.collectable && t.status === "pending" && (
              <p>Attend le paiement de la prestation</p>
            )}
          </>
        ) : (
          <p>Sans commission</p>
        )}
      </div>
    </div>
  );
}
