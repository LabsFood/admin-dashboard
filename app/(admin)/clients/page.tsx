"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  LayoutGrid,
  MapPin,
  Plus,
  Rows3,
  Search,
  Users,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import FilterTabs from "@/components/ui/FilterTabs";
import EmptyState from "@/components/ui/EmptyState";
import { cn, euros, formatDate, initials } from "@/lib/utils";
import { clientTone, clientLabel } from "@/lib/status";
import { CLIENTS } from "@/lib/mock/clients";
import type { ClientStatus } from "@/lib/mock/types";

type Filter = "all" | ClientStatus;
type View = "card" | "table";

export default function ClientsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("card");

  const counts = CLIENTS.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = CLIENTS.filter((c) => {
    const matchStatus = filter === "all" || c.status === filter;
    const q = query.toLowerCase();
    const matchQuery =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.address.city.toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  const totalRevenue = CLIENTS.reduce((n, c) => n + c.totalSpent, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <MiniStat label="Clients" value={CLIENTS.length} />
        <MiniStat label="VIP" value={counts.vip ?? 0} />
        <MiniStat label="Prospects" value={counts.prospect ?? 0} />
        <MiniStat label="CA total" value={euros(totalRevenue)} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "Tous", count: CLIENTS.length },
            { id: "vip", label: "VIP", count: counts.vip ?? 0 },
            { id: "active", label: "Actifs", count: counts.active ?? 0 },
            { id: "prospect", label: "Prospects", count: counts.prospect ?? 0 },
            { id: "inactive", label: "Inactifs", count: counts.inactive ?? 0 },
          ]}
        />
        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:w-60">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, email, ville…"
              className="input-base pl-9"
            />
          </div>
          <ViewToggle view={view} onChange={setView} />
          <button className="btn btn-primary shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Client</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            Icon={Users}
            title="Aucun client"
            text="Aucun client ne correspond à cette recherche."
          />
        </div>
      ) : view === "card" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: Math.min(i * 0.04, 0.3) }}
            >
              <Link
                href={`/clients/${c.id}`}
                className="card card-hover flex h-full flex-col p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy text-sm font-bold text-white">
                    {initials(c.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-bold text-navy">
                      {c.name}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-ink-soft">
                      <MapPin className="h-3 w-3" />
                      {c.address.city}
                    </p>
                  </div>
                  <Badge tone={clientTone[c.status]}>
                    {clientLabel[c.status]}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-cream-soft p-3 text-center">
                  <Cell label="Sessions" value={c.ordersCount} />
                  <Cell label="Dépensé" value={euros(c.totalSpent)} />
                  <Cell
                    label="Foyer"
                    value={`${c.household.adults + c.household.kids}`}
                  />
                </div>

                {(c.dietaryPreferences.length > 0 ||
                  c.allergies.length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.dietaryPreferences.map((d) => (
                      <span
                        key={d}
                        className="rounded-full bg-teal-pale px-2 py-0.5 text-[10px] font-medium text-teal"
                      >
                        {d}
                      </span>
                    ))}
                    {c.allergies.map((a) => (
                      <span
                        key={a}
                        className="rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-medium text-danger"
                      >
                        ⚠ {a}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-[rgba(0,35,75,0.06)] pt-3">
                  <span className="text-[11px] text-ink-soft">
                    {c.lastOrderAt
                      ? `Dernière session ${formatDate(c.lastOrderAt)}`
                      : "Aucune session"}
                  </span>
                  <ArrowRight className="h-4 w-4 text-terra" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[1.6fr_0.8fr_0.7fr_0.9fr_0.8fr_auto] gap-4 border-b border-[rgba(0,35,75,0.07)] bg-cream-soft px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft lg:grid">
            <span>Client</span>
            <span>Ville</span>
            <span>Sessions</span>
            <span>Dépensé</span>
            <span>Statut</span>
            <span />
          </div>
          <ul className="divide-y divide-[rgba(0,35,75,0.06)]">
            {filtered.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/clients/${c.id}`}
                  className="grid grid-cols-1 items-center gap-2 px-5 py-3.5 transition-colors hover:bg-cream-soft lg:grid-cols-[1.6fr_0.8fr_0.7fr_0.9fr_0.8fr_auto] lg:gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-xs font-bold text-white">
                      {initials(c.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-navy">
                        {c.name}
                      </p>
                      <p className="truncate font-mono text-[11px] text-ink-soft">
                        {c.email}
                      </p>
                    </div>
                  </div>
                  <p className="flex items-center gap-1 text-xs text-ink-mid">
                    <MapPin className="h-3 w-3 text-ink-soft" />
                    {c.address.city}
                  </p>
                  <p className="text-sm font-semibold text-navy">
                    {c.ordersCount}
                    <span className="ml-1 text-[11px] font-normal text-ink-soft lg:hidden">
                      sessions
                    </span>
                  </p>
                  <p className="text-sm font-semibold text-navy">
                    {euros(c.totalSpent)}
                  </p>
                  <Badge tone={clientTone[c.status]}>
                    {clientLabel[c.status]}
                  </Badge>
                  <ArrowRight className="hidden h-4 w-4 text-terra lg:block" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <div className="flex shrink-0 items-center rounded-full border border-[rgba(0,35,75,0.13)] bg-paper p-0.5">
      {(
        [
          { id: "card", Icon: LayoutGrid, label: "Cartes" },
          { id: "table", Icon: Rows3, label: "Tableau" },
        ] as const
      ).map(({ id, Icon, label }) => (
        <button
          key={id}
          type="button"
          aria-label={label}
          title={label}
          onClick={() => onChange(id)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
            view === id
              ? "bg-navy text-white"
              : "text-ink-soft hover:text-navy",
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-display text-sm font-bold text-navy">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-ink-soft">
        {label}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="font-display text-2xl font-bold text-navy">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
        {label}
      </p>
    </div>
  );
}
