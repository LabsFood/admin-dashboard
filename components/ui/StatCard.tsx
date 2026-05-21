"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  delay = 0,
}: {
  Icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;
  tone?: Tone;
  delay?: number;
}) {
  const up = (trend ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className="card p-5"
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            ICON_TONES[tone],
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
        {trend !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
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
      <p className="mt-4 font-display text-3xl font-bold text-navy">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </p>
      {sub && <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>}
    </motion.div>
  );
}
