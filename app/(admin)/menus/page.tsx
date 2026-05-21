"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Flame, Plus, TrendingUp } from "lucide-react";
import Badge from "@/components/ui/Badge";
import FilterTabs from "@/components/ui/FilterTabs";
import { mealTone, mealLabel } from "@/lib/status";
import { MEALS } from "@/lib/mock/menus";
import type { MealStatus } from "@/lib/mock/types";

type Filter = "all" | MealStatus;
const CURRENT_WEEK = 21;

export default function MenusPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = MEALS.reduce<Record<string, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = MEALS.filter(
    (m) => filter === "all" || m.status === filter,
  );
  const weekMeals = MEALS.filter(
    (m) => m.weekNumber === CURRENT_WEEK && m.status === "published",
  );

  return (
    <div className="space-y-6">
      {/* Menu de la semaine */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl bg-teal p-6 text-white lg:p-7"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-terra/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-terra-soft">
              Semaine {CURRENT_WEEK}
            </p>
            <h2 className="mt-1.5 font-display text-2xl font-bold lg:text-3xl">
              Menu de la semaine en ligne
            </h2>
            <p className="mt-1 text-sm text-white/65">
              {weekMeals.length} plats publiés et proposés aux clients.
            </p>
          </div>
          <button className="btn bg-white text-teal hover:bg-cream">
            <Plus className="h-4 w-4" />
            Composer le menu
          </button>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2">
          {weekMeals.map((m) => (
            <span
              key={m.id}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs"
            >
              {m.name}
            </span>
          ))}
        </div>
      </motion.section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "Tous les plats", count: MEALS.length },
            { id: "published", label: "Publiés", count: counts.published ?? 0 },
            { id: "draft", label: "Brouillons", count: counts.draft ?? 0 },
            { id: "archived", label: "Archivés", count: counts.archived ?? 0 },
          ]}
        />
        <button className="btn btn-primary">
          <Plus className="h-4 w-4" /> Nouveau plat
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((m, i) => (
          <motion.article
            key={m.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: Math.min(i * 0.04, 0.32) }}
            className="card card-hover overflow-hidden"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.image}
                alt={m.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute left-3 top-3 flex gap-1.5">
                <Badge tone={mealTone[m.status]}>{mealLabel[m.status]}</Badge>
                {m.isFeatured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-navy/85 px-2 py-1 text-[10px] font-semibold uppercase text-terra-soft">
                    <Flame className="h-3 w-3" /> Vedette
                  </span>
                )}
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wide text-terra">
                  {m.country}
                </span>
                <span className="text-ink-soft">·</span>
                <span className="font-mono text-[10px] text-ink-soft">
                  {m.continent}
                </span>
              </div>
              <h3 className="mt-1 line-clamp-2 font-display text-sm font-bold leading-tight text-navy">
                {m.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-soft">
                {m.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {m.dietaryTags.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-teal-pale px-2 py-0.5 text-[10px] font-medium text-teal"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[rgba(0,35,75,0.06)] pt-2.5 text-[11px] text-ink-soft">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {m.prepTime} min
                </span>
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {m.timesOrdered} commandes
                </span>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
