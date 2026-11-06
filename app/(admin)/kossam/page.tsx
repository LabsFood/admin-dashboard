"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Milk, Package, Search, Truck } from "lucide-react";
import Badge from "@/components/ui/Badge";
import FilterTabs from "@/components/ui/FilterTabs";
import EmptyState from "@/components/ui/EmptyState";
import { euros, formatDate } from "@/lib/utils";
import { kossamTone, paymentTone, paymentLabel } from "@/lib/status";
import { KOSSAM_ORDERS, KOSSAM_STATUS_LABEL } from "@/lib/mock/kossam";
import type { KossamStatus } from "@/lib/mock/types";

type Filter = "all" | KossamStatus;

/** @deprecated Retired from the console on 2026-11-01: linked from nowhere, kept for a possible return. */
export default function KossamPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const counts = KOSSAM_ORDERS.reduce<Record<string, number>>((acc, k) => {
    acc[k.status] = (acc[k.status] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = KOSSAM_ORDERS.filter((k) => {
    const matchStatus = filter === "all" || k.status === filter;
    const q = query.toLowerCase();
    const matchQuery =
      !q ||
      k.customerName.toLowerCase().includes(q) ||
      k.reference.toLowerCase().includes(q);
    return matchStatus && matchQuery;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const revenue = KOSSAM_ORDERS.filter((k) => k.status !== "cancelled").reduce(
    (n, k) => n + k.total,
    0,
  );
  const bottles = KOSSAM_ORDERS.filter((k) => k.status !== "cancelled").reduce(
    (n, k) => n + k.items.reduce((s, it) => s + it.qty, 0),
    0,
  );
  const toShip = KOSSAM_ORDERS.filter((k) =>
    ["new", "preparing"].includes(k.status),
  ).length;

  return (
    <div className="space-y-6">
      {/* Bandeau produit */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white lg:p-7"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-teal-soft/35 blur-3xl" />
        <div className="relative grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-terra-soft">
              <Milk className="h-3 w-3" /> Kossam
            </span>
            <p className="mt-3 font-display text-lg font-bold leading-tight">
              Boisson lactée
              <br />
              fermentée
            </p>
          </div>
          <HeroStat label="CA du mois" value={euros(revenue)} accent />
          <HeroStat label="Bouteilles" value={bottles} />
          <HeroStat label="À expédier" value={toShip} />
        </div>
      </motion.section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "Toutes", count: KOSSAM_ORDERS.length },
            { id: "new", label: "Nouvelles", count: counts.new ?? 0 },
            {
              id: "preparing",
              label: "Préparation",
              count: counts.preparing ?? 0,
            },
            {
              id: "delivering",
              label: "Livraison",
              count: counts.delivering ?? 0,
            },
            { id: "delivered", label: "Livrées", count: counts.delivered ?? 0 },
          ]}
        />
        <div className="relative lg:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Client, référence…"
            className="input-base pl-9"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="hidden grid-cols-[1.3fr_1.4fr_1fr_1fr_0.9fr_2.2rem] gap-4 border-b border-[rgba(0,35,75,0.07)] bg-cream-soft px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft lg:grid">
          <span>Client / Réf.</span>
          <span>Articles</span>
          <span>Livraison</span>
          <span>Total</span>
          <span>Statut</span>
          <span />
        </div>

        {filtered.length === 0 && (
          <EmptyState
            Icon={Package}
            title="Aucune commande"
            text="Aucune commande Kossam dans cette catégorie."
          />
        )}

        <ul className="divide-y divide-[rgba(0,35,75,0.06)]">
          {filtered.map((k, i) => (
            <motion.li
              key={k.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3), ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href={`/kossam/${k.id}`}
                className="grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-cream-soft lg:grid-cols-[1.3fr_1.4fr_1fr_1fr_0.9fr_2.2rem] lg:items-center lg:gap-4"
              >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy">
                  {k.customerName}
                </p>
                <p className="font-mono text-[11px] text-ink-soft">
                  {k.reference}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {k.items.map((it) => (
                  <span
                    key={it.format}
                    className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-2.5 py-1 text-[11px] font-medium text-ink-mid"
                  >
                    <Milk className="h-3 w-3 text-teal" />
                    {it.qty} × {it.format}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-ink-mid">
                <MapPin className="h-3.5 w-3.5 text-terra" />
                <span>
                  {k.deliveryZone}
                  <span className="text-ink-soft">
                    {" "}
                    · {formatDate(k.deliveryDate)}
                  </span>
                </span>
              </div>
              <div>
                <p className="font-display text-sm font-bold text-navy">
                  {euros(k.total)}
                </p>
                <Badge tone={paymentTone[k.paymentStatus]} className="mt-0.5">
                  {paymentLabel[k.paymentStatus]}
                </Badge>
              </div>
              <Badge tone={kossamTone[k.status]} dot>
                {KOSSAM_STATUS_LABEL[k.status]}
              </Badge>
                <ArrowRight className="hidden h-4 w-4 text-ink-soft lg:block" />
              </Link>
            </motion.li>
          ))}
        </ul>
      </div>

      <p className="flex items-center justify-center gap-2 text-xs text-ink-soft">
        <Truck className="h-3.5 w-3.5" />
        Livraison disponible sur la Côte d&apos;Azur uniquement.
      </p>
    </div>
  );
}

function HeroStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p
        className={`font-display text-2xl font-bold ${
          accent ? "text-terra-soft" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-white/50">
        {label}
      </p>
    </div>
  );
}
