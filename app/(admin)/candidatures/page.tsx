"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  FileText,
  MapPin,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import FilterTabs from "@/components/ui/FilterTabs";
import EmptyState from "@/components/ui/EmptyState";
import { formatDate, initials } from "@/lib/utils";
import { candidatureTone } from "@/lib/status";
import {
  CANDIDATURES,
  CANDIDATURE_STATUS_LABEL,
} from "@/lib/mock/candidatures";
import type { CandidatureStatus } from "@/lib/mock/types";

type Filter = "all" | CandidatureStatus;

export default function CandidaturesPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = CANDIDATURES.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = CANDIDATURES.filter(
    (c) => filter === "all" || c.status === filter,
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <MiniStat label="Candidatures" value={CANDIDATURES.length} />
        <MiniStat label="Nouvelles" value={counts.new ?? 0} />
        <MiniStat label="En entretien" value={counts.interview ?? 0} />
        <MiniStat label="Recrutées" value={counts.accepted ?? 0} />
      </div>

      <FilterTabs<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { id: "all", label: "Toutes", count: CANDIDATURES.length },
          { id: "new", label: "Nouvelles", count: counts.new ?? 0 },
          { id: "reviewing", label: "En étude", count: counts.reviewing ?? 0 },
          { id: "interview", label: "Entretien", count: counts.interview ?? 0 },
          { id: "accepted", label: "Recrutées", count: counts.accepted ?? 0 },
        ]}
      />

      {filtered.length === 0 && (
        <div className="card">
          <EmptyState
            Icon={UserPlus}
            title="Aucune candidature"
            text="Aucune candidature dans cette catégorie."
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, delay: Math.min(i * 0.05, 0.3) }}
          >
            <Link
              href={`/candidatures/${c.id}`}
              className="card card-hover flex h-full flex-col p-5"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy text-sm font-bold text-white">
                  {initials(c.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-display text-base font-bold text-navy">
                      {c.name}
                    </p>
                    {c.hasHaccp && (
                      <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
                    )}
                  </div>
                  <p className="flex items-center gap-1 text-xs text-ink-soft">
                    <MapPin className="h-3 w-3" />
                    {c.city} · {c.experienceYears} an
                    {c.experienceYears > 1 ? "s" : ""} d&apos;expérience
                  </p>
                </div>
                <Badge tone={candidatureTone[c.status]} dot>
                  {CANDIDATURE_STATUS_LABEL[c.status]}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.specialties.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full bg-terra/10 px-2.5 py-1 text-[11px] font-medium text-terra-deep"
                  >
                    <Award className="h-3 w-3" />
                    {s}
                  </span>
                ))}
              </div>

              <p className="mt-3 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-mid">
                {c.motivation}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-[rgba(0,35,75,0.06)] pt-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-soft">
                  <FileText className="h-3.5 w-3.5" />
                  {c.documents.length} document
                  {c.documents.length > 1 ? "s" : ""} · reçue le{" "}
                  {formatDate(c.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-terra">
                  Dossier <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
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
