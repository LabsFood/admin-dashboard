"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Info, Receipt, Search } from "lucide-react";
import Badge from "@/components/ui/Badge";
import FilterTabs from "@/components/ui/FilterTabs";
import EmptyState from "@/components/ui/EmptyState";
import { cn, euros } from "@/lib/utils";
import {
  BC_TRANSACTIONS,
  paymentMethodLabel,
  txStatusLabel,
  txStatusTone,
  txTypeLabel,
  type BcTransaction,
} from "@/lib/mock/batchcookers";

type Filter = "all" | BcTransaction["type"];

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

/**
 * Vue consolidée des mouvements financiers (AD-08).
 *
 * Deux circuits d'argent coexistent : en carte la plateforme encaisse et
 * prélève sa commission par split ; en avance immédiate et CESU l'argent va
 * directement au batch cooker et la commission est prélevée après coup.
 */
export default function TransactionsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () =>
      BC_TRANSACTIONS.reduce<Record<string, number>>((acc, t) => {
        acc[t.type] = (acc[t.type] ?? 0) + 1;
        return acc;
      }, {}),
    [],
  );

  const totals = useMemo(() => {
    const sessions = BC_TRANSACTIONS.filter((t) => t.type === "session");
    return {
      gross: sessions.reduce((n, t) => n + t.amount, 0),
      commission: sessions.reduce((n, t) => n + t.commission, 0),
      net: sessions.reduce((n, t) => n + t.net, 0),
      pending: BC_TRANSACTIONS.filter((t) => t.status === "pending").length,
      failed: BC_TRANSACTIONS.filter((t) => t.status === "failed").length,
    };
  }, []);

  const rows = BC_TRANSACTIONS.filter((t) => {
    const matchType = filter === "all" || t.type === filter;
    const q = query.toLowerCase();
    const matchQuery =
      !q || t.chefName.toLowerCase().includes(q) || t.reference.toLowerCase().includes(q);
    return matchType && matchQuery;
  }).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat label="Volume encaissé" value={euros(totals.gross)} />
        <Stat label="Commissions" value={euros(totals.commission)} accent />
        <Stat label="Net reversé" value={euros(totals.net)} />
        <Stat label="En attente / échecs" value={`${totals.pending} / ${totals.failed}`} />
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-cream-soft px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />
        <p className="text-xs leading-relaxed text-ink-mid">
          <strong className="text-navy">Deux circuits d&apos;argent.</strong> En{" "}
          <strong>carte bancaire</strong>, la plateforme encaisse et retient sa commission
          par split. En <strong>avance immédiate</strong> et <strong>CESU</strong>,
          l&apos;argent va directement au batch cooker : la commission est prélevée ensuite
          sur son compte pro (mandat SEPA B2B) — d&apos;où les lignes « Commission »
          séparées.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "Tout", count: BC_TRANSACTIONS.length },
            { id: "session", label: "Prestations", count: counts.session ?? 0 },
            { id: "commission", label: "Commissions", count: counts.commission ?? 0 },
            { id: "payout", label: "Versements", count: counts.payout ?? 0 },
            { id: "subscription", label: "Abonnements", count: counts.subscription ?? 0 },
          ]}
        />
        <div className="relative lg:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chef, référence…"
            className="input-base pl-9"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            Icon={Receipt}
            title="Aucune transaction"
            text="Aucun mouvement ne correspond à ce filtre."
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-[rgba(0,35,75,0.07)] bg-cream-soft text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                  <th className="px-5 py-3 font-normal">Date</th>
                  <th className="px-5 py-3 font-normal">Batch cooker</th>
                  <th className="px-5 py-3 font-normal">Référence</th>
                  <th className="px-5 py-3 font-normal">Type</th>
                  <th className="px-5 py-3 font-normal">Moyen</th>
                  <th className="px-5 py-3 font-normal text-right">Montant</th>
                  <th className="px-5 py-3 font-normal text-right">Commission</th>
                  <th className="px-5 py-3 font-normal">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(0,35,75,0.06)]">
                {rows.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-cream-soft">
                    <td className="px-5 py-3 text-xs text-ink-mid">{shortDate(t.date)}</td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/batchcookers/${t.chefId}`}
                        className="inline-flex items-center gap-1 font-semibold text-navy hover:text-terra"
                      >
                        {t.chefName}
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-ink-soft">
                      {t.reference}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={t.type === "commission" ? "terra" : "neutral"}>
                        {txTypeLabel[t.type]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-ink-mid">
                      {t.paymentMethod ? paymentMethodLabel[t.paymentMethod] : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-5 py-3 text-right font-display font-bold",
                        t.amount < 0 ? "text-danger" : "text-navy",
                      )}
                    >
                      {euros(t.amount)}
                    </td>
                    <td className="px-5 py-3 text-right text-ink-soft">
                      {t.commission ? euros(t.commission) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={txStatusTone[t.status]} dot>
                        {txStatusLabel[t.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className={cn("font-display text-2xl font-bold", accent ? "text-terra" : "text-navy")}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
        {label}
      </p>
    </div>
  );
}
