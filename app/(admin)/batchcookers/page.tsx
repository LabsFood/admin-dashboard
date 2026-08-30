"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, ChefHat, MapPin, Search, Star } from "lucide-react";
import Badge from "@/components/ui/Badge";
import FilterTabs from "@/components/ui/FilterTabs";
import EmptyState from "@/components/ui/EmptyState";
import { initials } from "@/lib/utils";
import {
  BATCH_COOKERS,
  completion,
  dossierStatusLabel,
  dossierStatusTone,
  pendingReview,
  sapPathLabel,
  type DossierStatus,
} from "@/lib/mock/batchcookers";

type Filter = "all" | DossierStatus;

export default function BatchCookersPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () =>
      BATCH_COOKERS.reduce<Record<string, number>>((acc, b) => {
        acc[b.dossier] = (acc[b.dossier] ?? 0) + 1;
        return acc;
      }, {}),
    [],
  );

  const toReview = useMemo(
    () => BATCH_COOKERS.reduce((n, b) => n + pendingReview(b).length, 0),
    [],
  );

  const filtered = BATCH_COOKERS.filter((b) => {
    const matchStatus = filter === "all" || b.dossier === filter;
    const q = query.toLowerCase();
    const matchQuery =
      !q ||
      b.name.toLowerCase().includes(q) ||
      b.email.toLowerCase().includes(q) ||
      b.city.toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <MiniStat label="Batch cookers" value={BATCH_COOKERS.length} />
        <MiniStat label="Validés" value={counts.validated ?? 0} />
        <MiniStat label="Pièces à revoir" value={toReview} accent />
        <MiniStat label="Suspendus" value={counts.suspended ?? 0} />
      </div>

      {toReview > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning-soft px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#9A6E15]" />
          <p className="text-xs leading-relaxed text-[#9A6E15]">
            <strong>{toReview} pièce{toReview > 1 ? "s" : ""}</strong> en attente de
            vérification. Chaque refus doit être accompagné d&apos;un motif — il est
            affiché au batch cooker dans son espace.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "Tous", count: BATCH_COOKERS.length },
            { id: "reviewing", label: "En vérification", count: counts.reviewing ?? 0 },
            { id: "incomplete", label: "À compléter", count: counts.incomplete ?? 0 },
            { id: "awaiting-registration", label: "Sans SIRET", count: counts["awaiting-registration"] ?? 0 },
            { id: "validated", label: "Validés", count: counts.validated ?? 0 },
            { id: "suspended", label: "Suspendus", count: counts.suspended ?? 0 },
          ]}
        />
        <div className="relative lg:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, email, ville…"
            className="input-base pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            Icon={ChefHat}
            title="Aucun batch cooker"
            text="Aucun profil ne correspond à cette recherche."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((b, i) => {
            const score = completion(b);
            const pending = pendingReview(b).length;
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
              >
                <Link href={`/batchcookers/${b.id}`} className="card card-hover flex h-full flex-col p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy text-sm font-bold text-white">
                      {initials(b.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-bold text-navy">{b.name}</p>
                      <p className="flex items-center gap-1 truncate text-xs text-ink-soft">
                        <MapPin className="h-3 w-3 shrink-0" /> {b.city}
                      </p>
                    </div>
                    <Badge tone={dossierStatusTone[b.dossier]} dot>
                      {dossierStatusLabel[b.dossier]}
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-[11px] text-ink-soft">
                      <span>Pièces bloquantes</span>
                      <span className="font-semibold text-navy">{score} %</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-cream-deep">
                      <div className="h-full rounded-full bg-terra" style={{ width: `${score}%` }} />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-cream-soft px-2 py-0.5 text-[10px] font-medium text-navy">
                      {sapPathLabel[b.sapPath]}
                    </span>
                    {b.acceptsCesu && (
                      <span className="rounded-full bg-teal-pale px-2 py-0.5 text-[10px] font-medium text-teal">
                        CESU
                      </span>
                    )}
                    {pending > 0 && (
                      <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-medium text-[#9A6E15]">
                        {pending} à revoir
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[rgba(0,35,75,0.06)] pt-3">
                    <span className="inline-flex items-center gap-1 text-[11px] text-ink-soft">
                      {b.rating != null ? (
                        <>
                          <Star className="h-3 w-3 fill-terra text-terra" /> {b.rating} ·{" "}
                          {b.missionsCount} prestations
                        </>
                      ) : (
                        "Aucune prestation"
                      )}
                    </span>
                    <ArrowRight className="h-4 w-4 text-terra" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="card p-4">
      <p className={`font-display text-2xl font-bold ${accent ? "text-terra" : "text-navy"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
        {label}
      </p>
    </div>
  );
}
