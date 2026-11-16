"use client";

import { useState } from "react";
import { BadgeCheck, Eye, EyeOff, Star } from "lucide-react";
import Badge from "@/components/ui/Badge";
import FilterTabs from "@/components/ui/FilterTabs";
import { formatDate } from "@/lib/utils";
import { AVIS, AVIS_SERVICE_LABEL } from "@/lib/mock/avis";
import type { AvisService } from "@/lib/mock/types";

type Filter = "all" | "published" | "pending" | AvisService;

export default function AvisPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [published, setPublished] = useState<Record<string, boolean>>(
    Object.fromEntries(AVIS.map((a) => [a.id, a.published])),
  );

  const filtered = AVIS.filter((a) => {
    if (filter === "all") return true;
    if (filter === "published") return published[a.id];
    if (filter === "pending") return !published[a.id];
    return a.service === filter;
  });

  const avg = (
    AVIS.reduce((n, a) => n + a.rating, 0) / AVIS.length
  ).toFixed(1);
  const publishedCount = Object.values(published).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-terra/12 text-terra-deep">
            <Star className="h-5 w-5 fill-current" />
          </span>
          <div>
            <p className="font-display text-2xl font-bold text-navy">{avg}</p>
            <p className="text-xs uppercase tracking-wide text-ink-soft">
              Note moyenne
            </p>
          </div>
        </div>
        <MiniStat label="Avis reçus" value={AVIS.length} />
        <MiniStat label="Publiés" value={publishedCount} />
        <MiniStat label="À modérer" value={AVIS.length - publishedCount} />
      </div>

      <FilterTabs<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { id: "all", label: "Tous", count: AVIS.length },
          { id: "pending", label: "À modérer", count: AVIS.length - publishedCount },
          { id: "published", label: "Publiés", count: publishedCount },
          { id: "batch-cooking", label: "Batch cooking" },
          { id: "kossam", label: "Kossam" },
          { id: "atelier", label: "Atelier" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((a) => (
          <article
            key={a.id}
            className="card flex flex-col p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-display text-base font-bold text-navy">
                    {a.author}
                  </p>
                  {a.verified && (
                    <BadgeCheck className="h-4 w-4 text-info" />
                  )}
                </div>
                <p className="text-xs text-ink-soft tabular-nums">
                  {a.city} · {formatDate(a.date)} · {a.source}
                </p>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star
                    key={s}
                    className={`h-4 w-4 ${
                      s < a.rating
                        ? "fill-terra text-terra"
                        : "fill-cream-deep text-cream-deep"
                    }`}
                  />
                ))}
              </div>
            </div>

            <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-mid">
              “{a.text}”
            </p>

            <div className="mt-4 flex items-center justify-between border-t border-[rgba(0,35,75,0.06)] pt-3">
              <Badge tone="navy">{AVIS_SERVICE_LABEL[a.service]}</Badge>
              <button
                onClick={() =>
                  setPublished((p) => ({ ...p, [a.id]: !p[a.id] }))
                }
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  published[a.id]
                    ? "bg-success-soft text-success"
                    : "bg-cream-deep text-ink-mid hover:bg-warning-soft hover:text-[#9A6E15]"
                }`}
              >
                {published[a.id] ? (
                  <>
                    <Eye className="h-3.5 w-3.5" /> Publié sur le site
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3.5 w-3.5" /> Masqué
                  </>
                )}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="font-display text-2xl font-bold text-navy">{value}</p>
      <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
        {label}
      </p>
    </div>
  );
}
