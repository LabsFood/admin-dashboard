"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarRange,
  ChefHat,
  Plus,
  Search,
  Users,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import FilterTabs from "@/components/ui/FilterTabs";
import EmptyState from "@/components/ui/EmptyState";
import { euros, formatDate } from "@/lib/utils";
import { reservationTone, paymentTone, paymentLabel } from "@/lib/status";
import {
  RESERVATIONS,
  RESERVATION_STATUS_LABEL,
} from "@/lib/mock/reservations";
import type { ReservationStatus } from "@/lib/mock/types";

type Filter = "all" | ReservationStatus;

export default function ReservationsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const counts = RESERVATIONS.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = RESERVATIONS.filter((r) => {
    const matchStatus = filter === "all" || r.status === filter;
    const q = query.toLowerCase();
    const matchQuery =
      !q ||
      r.clientName.toLowerCase().includes(q) ||
      r.reference.toLowerCase().includes(q) ||
      r.chefName.toLowerCase().includes(q);
    return matchStatus && matchQuery;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const revenue = RESERVATIONS.filter((r) => r.status !== "cancelled").reduce(
    (n, r) => n + r.amountTTC,
    0,
  );
  const upcoming = RESERVATIONS.filter((r) =>
    ["pending", "confirmed", "shopping", "cooking"].includes(r.status),
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <MiniStat label="Réservations" value={RESERVATIONS.length} />
        <MiniStat label="À venir" value={upcoming} />
        <MiniStat label="CA cumulé" value={euros(revenue)} />
      </div>

      {/* Barre d'outils */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "Toutes", count: RESERVATIONS.length },
            { id: "pending", label: "En attente", count: counts.pending ?? 0 },
            {
              id: "confirmed",
              label: "Confirmées",
              count: counts.confirmed ?? 0,
            },
            { id: "cooking", label: "En cuisine", count: counts.cooking ?? 0 },
            {
              id: "delivered",
              label: "Livrées",
              count: counts.delivered ?? 0,
            },
          ]}
        />
        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Client, référence, chef…"
              className="input-base pl-9"
            />
          </div>
          <button className="btn btn-primary shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouvelle</span>
          </button>
        </div>
      </div>

      {/* Liste */}
      <div className="card overflow-hidden">
        {/* En-tête tableau (desktop) */}
        <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_0.7fr_0.9fr_2.2rem] gap-4 border-b border-[rgba(0,35,75,0.07)] bg-cream-soft px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft lg:grid">
          <span>Client / Réf.</span>
          <span>Date & créneau</span>
          <span>Chef</span>
          <span>Montant</span>
          <span>Statut</span>
          <span />
        </div>

        {filtered.length === 0 && (
          <EmptyState
            Icon={CalendarRange}
            title="Aucune réservation"
            text="Aucune session ne correspond à ce filtre."
          />
        )}

        <ul className="divide-y divide-[rgba(0,35,75,0.06)]">
          {filtered.map((r, i) => (
            <motion.li
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
            >
              <Link
                href={`/reservations/${r.id}`}
                className="grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-cream-soft lg:grid-cols-[1.4fr_1fr_0.8fr_0.7fr_0.9fr_2.2rem] lg:items-center lg:gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy">
                    {r.clientName}
                  </p>
                  <p className="font-mono text-[11px] text-ink-soft">
                    {r.reference} · Formule {r.formula}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-mid">
                  <CalendarRange className="h-3.5 w-3.5 text-terra" />
                  <span>
                    {formatDate(r.date)}
                    <span className="text-ink-soft"> · {r.timeSlot}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-mid">
                  <ChefHat className="h-3.5 w-3.5 text-ink-soft" />
                  {r.chefName.split(" ")[0]}
                  <span className="ml-1 inline-flex items-center gap-0.5 text-ink-soft">
                    <Users className="h-3 w-3" />
                    {r.persons}
                  </span>
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-navy">
                    {euros(r.amountTTC)}
                  </p>
                  <Badge tone={paymentTone[r.paymentStatus]} className="mt-0.5">
                    {paymentLabel[r.paymentStatus]}
                  </Badge>
                </div>
                <div>
                  <Badge tone={reservationTone[r.status]} dot>
                    {RESERVATION_STATUS_LABEL[r.status]}
                  </Badge>
                </div>
                <ArrowRight className="hidden h-4 w-4 text-ink-soft lg:block" />
              </Link>
            </motion.li>
          ))}
        </ul>
      </div>
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
