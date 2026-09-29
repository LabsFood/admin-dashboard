"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarRange,
  Wallet,
  Users,
  Sparkles,
  Flame,
  Milk,
  UtensilsCrossed,
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth";
import { euros, formatDateLong } from "@/lib/utils";
import { reservationTone, demandeTone } from "@/lib/status";
import {
  DASHBOARD_STATS,
  REVENUE_TREND,
  FORMULA_SPLIT,
  TOP_MEALS,
} from "@/lib/mock/stats";
import {
  RESERVATIONS,
  RESERVATION_STATUS_LABEL,
} from "@/lib/mock/reservations";
import { DEMANDES, DEMANDE_STATUS_LABEL } from "@/lib/mock/demandes";

const ACTIVE: string[] = ["pending", "confirmed", "shopping", "cooking"];

export default function OverviewPage() {
  const { user } = useAuth();
  const upcoming = [...RESERVATIONS]
    .filter((r) => ACTIVE.includes(r.status))
    .sort((a, b) => a.date.localeCompare(b.date));
  const next = upcoming[0];
  const recentDemandes = [...DEMANDES]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  const maxRevenue = Math.max(
    ...REVENUE_TREND.map((m) => m.batch + m.kossam),
  );
  const totalFormulas = FORMULA_SPLIT.reduce((n, f) => n + f.value, 0);
  const maxMeal = Math.max(...TOP_MEALS.map((m) => m.count));

  const revTrend = Math.round(
    ((DASHBOARD_STATS.revenueMonth - DASHBOARD_STATS.revenuePrevMonth) /
      DASHBOARD_STATS.revenuePrevMonth) *
      100,
  );
  const sessTrend = Math.round(
    ((DASHBOARD_STATS.sessionsMonth - DASHBOARD_STATS.sessionsPrevMonth) /
      DASHBOARD_STATS.sessionsPrevMonth) *
      100,
  );

  return (
    <div className="space-y-6">
      {/* ── Bannière ───────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white lg:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-terra/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-teal-soft/25 blur-3xl" />

        <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-terra/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-terra-soft">
              <Flame className="h-3 w-3" /> Console Lab&apos;s Food
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight lg:text-4xl">
              Bonjour {user?.name.split(" ")[0] ?? "Ivy"} 👋
            </h2>
            <p className="mt-2 max-w-lg text-sm text-white/65">
              {upcoming.length} session{upcoming.length > 1 ? "s" : ""} en
              cours, {DASHBOARD_STATS.pendingQuotes} devis à traiter. Voici
              l&apos;essentiel de la journée.
            </p>

            {next && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-terra-soft">
                  Prochaine session
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold">
                      {formatDateLong(next.date)}
                    </p>
                    <p className="text-xs text-white/60">
                      {next.timeSlot} · {next.clientName} · {next.chefName}
                    </p>
                  </div>
                  <Link
                    href={`/reservations/${next.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-terra px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-terra-deep"
                  >
                    Détail <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-terra-soft">
              Mai 2026
            </p>
            <StatRow label="Chiffre d'affaires" value={euros(DASHBOARD_STATS.revenueMonth)} accent />
            <StatRow label="Sessions réalisées" value={DASHBOARD_STATS.sessionsMonth} />
            <StatRow label="Nouveaux clients" value={DASHBOARD_STATS.newClientsMonth} />
            <StatRow
              label="CA Kossam"
              value={euros(DASHBOARD_STATS.kossamRevenueMonth)}
            />
          </div>
        </div>
      </motion.section>

      {/* ── KPIs ───────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          Icon={Wallet}
          label="CA du mois"
          value={euros(DASHBOARD_STATS.revenueMonth)}
          trend={revTrend}
          tone="terra"
          delay={0}
        />
        <StatCard
          Icon={CalendarRange}
          label="Sessions"
          value={DASHBOARD_STATS.sessionsMonth}
          trend={sessTrend}
          tone="navy"
          delay={0.05}
        />
        <StatCard
          Icon={Users}
          label="Clients actifs"
          value={DASHBOARD_STATS.activeClients}
          sub={`+${DASHBOARD_STATS.newClientsMonth} ce mois`}
          tone="teal"
          delay={0.1}
        />
        <StatCard
          Icon={Sparkles}
          label="Devis en attente"
          value={DASHBOARD_STATS.pendingQuotes}
          sub="à chiffrer"
          tone="success"
          delay={0.15}
        />
      </section>

      {/* ── CA + répartition ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="card p-6 lg:col-span-2"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="eyebrow">Tendance</p>
              <h3 className="mt-1 font-display text-lg font-bold text-navy">
                Chiffre d&apos;affaires — 7 mois
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-terra" /> Batch
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-teal" /> Kossam
              </span>
            </div>
          </div>
          <div className="flex h-52 items-end gap-2 lg:gap-3">
            {REVENUE_TREND.map((m, i) => {
              const total = m.batch + m.kossam;
              const h = (total / maxRevenue) * 100;
              return (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="flex w-full flex-col justify-end overflow-hidden rounded-lg"
                    style={{ height: `${h}%` }}
                    title={euros(total)}
                  >
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(m.kossam / total) * 100}%` }}
                      transition={{ duration: 0.6, delay: i * 0.05 }}
                      className="w-full bg-teal"
                    />
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(m.batch / total) * 100}%` }}
                      transition={{ duration: 0.6, delay: i * 0.05 }}
                      className="w-full bg-terra"
                    />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
                    {m.month}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="card p-6"
        >
          <p className="eyebrow">Ce mois-ci</p>
          <h3 className="mt-1 font-display text-lg font-bold text-navy">
            Sessions par formule
          </h3>
          <ul className="mt-4 space-y-3">
            {FORMULA_SPLIT.map((f) => {
              const pct = Math.round((f.value / totalFormulas) * 100);
              return (
                <li key={f.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-navy">{f.name}</span>
                    <span className="text-ink-soft">
                      {f.value} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-cream-deep">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full bg-terra"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </motion.section>
      </div>

      {/* ── Sessions à venir + activité ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-navy">
              Sessions à venir
            </h3>
            <Link
              href="/reservations"
              className="inline-flex items-center gap-1 text-xs font-semibold text-terra hover:underline"
            >
              Tout voir <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="divide-y divide-[rgba(0,35,75,0.06)]">
            {upcoming.slice(0, 5).map((r) => (
              <li key={r.id}>
                <Link
                  href={`/reservations/${r.id}`}
                  className="flex items-center gap-4 py-3 transition-colors hover:bg-cream-soft"
                >
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-cream-deep">
                    <span className="font-display text-sm font-bold text-navy">
                      {new Date(r.date).getDate()}
                    </span>
                    <span className="font-mono text-[8px] uppercase text-ink-soft">
                      {new Date(r.date).toLocaleDateString("fr-FR", {
                        month: "short",
                      })}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy">
                      {r.clientName}
                    </p>
                    <p className="truncate text-xs text-ink-soft">
                      {r.timeSlot} · Formule {r.formula} · {r.chefName}
                    </p>
                  </div>
                  <Badge tone={reservationTone[r.status]} dot>
                    {RESERVATION_STATUS_LABEL[r.status]}
                  </Badge>
                  <span className="hidden font-display text-sm font-bold text-navy sm:block">
                    {euros(r.amountTTC)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          {/* Top plats */}
          <section className="card p-6">
            <div className="mb-3 flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-terra" />
              <h3 className="font-display text-base font-bold text-navy">
                Plats les plus commandés
              </h3>
            </div>
            <ul className="space-y-2.5">
              {TOP_MEALS.map((m) => (
                <li key={m.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="truncate font-medium text-navy">
                      {m.name}
                    </span>
                    <span className="ml-2 font-mono text-ink-soft">
                      {m.count}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-cream-deep">
                    <div
                      className="h-full rounded-full bg-teal"
                      style={{ width: `${(m.count / maxMeal) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Demandes récentes */}
          <section className="card p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-navy">
                Demandes récentes
              </h3>
              <Link
                href="/demandes"
                className="text-xs font-semibold text-terra hover:underline"
              >
                Voir
              </Link>
            </div>
            <ul className="space-y-2.5">
              {recentDemandes.map((d) => (
                <li key={d.id}>
                  <Link
                    href="/demandes"
                    className="block rounded-xl border border-[rgba(0,35,75,0.06)] p-3 transition-colors hover:border-terra/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-navy">
                        {d.title}
                      </p>
                      <Badge tone={demandeTone[d.status]}>
                        {DEMANDE_STATUS_LABEL[d.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-ink-soft">
                      {d.clientName} · {d.persons} pers. · {d.mealsCount} plats
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Raccourci Kossam */}
          <Link
            href="/kossam"
            className="flex items-center gap-3 rounded-3xl bg-teal p-5 text-white transition-transform hover:-translate-y-0.5"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <Milk className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">Commandes Kossam</p>
              <p className="text-xs text-white/60">
                {euros(DASHBOARD_STATS.kossamRevenueMonth)} ce mois
              </p>
            </div>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-white/8 py-2 last:border-0">
      <span className="text-[11px] uppercase tracking-[0.1em] text-white/50">
        {label}
      </span>
      <span
        className={`font-display text-lg font-bold ${
          accent ? "text-terra-soft" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
