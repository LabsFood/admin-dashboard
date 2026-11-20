"use client";

import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

type Tone = "terra" | "navy" | "teal" | "success";

const ICON_TONES: Record<Tone, string> = {
  terra: "bg-terra/12 text-terra-deep",
  navy: "bg-navy text-white",
  teal: "bg-teal-pale text-teal",
  success: "bg-success-soft text-success",
};

export default function StatCard({
  Icon,
  label,
  value,
  sub,
  trend,
  tone = "terra",
  loading = false,
}: {
  Icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;
  tone?: Tone;
  /** Chiffre en cours de chargement : un bloc à la hauteur du chiffre, pas un « … ». */
  loading?: boolean;
}) {
  const up = (trend ?? 0) >= 0;
  return (
    // Pas d'entrée animée : une console s'ouvre toute la journée (docs/ui-ux-guidelines.md, § 1).
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            ICON_TONES[tone],
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
        {!loading && trend !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
              up
                ? "bg-success-soft text-success"
                : "bg-danger-soft text-danger",
            )}
          >
            {up ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {loading ? (
        // Même hauteur que le chiffre (text-3xl = 36 px de ligne) : rien ne saute à l'arrivée.
        <Skeleton className="mt-4 h-9 w-24" />
      ) : (
        <p className="mt-4 font-display text-3xl font-bold tabular-nums text-navy">{value}</p>
      )}
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </p>
      {!loading && sub && <p className="mt-0.5 text-xs tabular-nums text-ink-soft">{sub}</p>}
    </div>
  );
}
