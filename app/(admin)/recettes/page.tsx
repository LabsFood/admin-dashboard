"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Globe2, Plus } from "lucide-react";
import Badge from "@/components/ui/Badge";
import FilterTabs from "@/components/ui/FilterTabs";
import MealDrawer from "@/components/admin/MealDrawer";
import { MEALS } from "@/lib/mock/menus";
import type { Continent, Difficulty, Meal, MealStatus } from "@/lib/mock/types";

const CONTINENTS: Continent[] = [
  "Europe",
  "Afrique",
  "Asie",
  "Amériques",
  "Moyen-Orient",
];

const DIFF_TONE: Record<Difficulty, "success" | "warning" | "danger"> = {
  Facile: "success",
  Moyen: "warning",
  Difficile: "danger",
};

type Filter = "all" | Continent;

export default function RecettesPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [overrides, setOverrides] = useState<Record<string, MealStatus>>({});
  const [selected, setSelected] = useState<Meal | null>(null);

  const statusOf = (m: Meal): MealStatus => overrides[m.id] ?? m.status;

  const counts = MEALS.reduce<Record<string, number>>((acc, m) => {
    acc[m.continent] = (acc[m.continent] ?? 0) + 1;
    return acc;
  }, {});

  const visibleContinents =
    filter === "all" ? CONTINENTS : [filter as Continent];

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card flex flex-wrap items-center justify-between gap-4 p-6"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-terra/12 text-terra-deep">
            <Globe2 className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold text-navy">
              {MEALS.length} recettes du monde
            </h2>
            <p className="text-sm text-ink-soft">
              La carte des cuisines proposées par les chefs Lab&apos;s Food.
            </p>
          </div>
        </div>
        <Link href="/recettes/nouvelle" className="btn btn-primary">
          <Plus className="h-4 w-4" /> Ajouter une recette
        </Link>
      </motion.section>

      <FilterTabs<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { id: "all", label: "Tous les continents", count: MEALS.length },
          ...CONTINENTS.map((c) => ({
            id: c,
            label: c,
            count: counts[c] ?? 0,
          })),
        ]}
      />

      <div className="space-y-6">
        {visibleContinents.map((continent) => {
          const recipes = MEALS.filter((m) => m.continent === continent);
          if (recipes.length === 0) return null;
          return (
            <section key={continent} className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-[rgba(0,35,75,0.07)] bg-cream-soft px-5 py-3">
                <h3 className="flex items-center gap-2 font-display text-base font-bold text-navy">
                  <Globe2 className="h-4 w-4 text-terra" />
                  {continent}
                </h3>
                <span className="font-mono text-[11px] text-ink-soft">
                  {recipes.length} recette{recipes.length > 1 ? "s" : ""}
                </span>
              </div>
              <ul className="divide-y divide-[rgba(0,35,75,0.06)]">
                {recipes.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(m)}
                      className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-cream-soft"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.image}
                        alt={m.name}
                        className="h-12 w-12 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-navy">
                          {m.name}
                        </p>
                        <p className="font-mono text-[11px] text-ink-soft">
                          {m.country}
                        </p>
                      </div>
                      <div className="hidden items-center gap-1.5 sm:flex">
                        {m.dietaryTags.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-teal-pale px-2 py-0.5 text-[10px] font-medium text-teal"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      <span className="hidden items-center gap-1 text-[11px] text-ink-soft md:inline-flex">
                        <Clock className="h-3 w-3" />
                        {m.prepTime} min
                      </span>
                      <Badge tone={DIFF_TONE[m.difficulty]}>{m.difficulty}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <MealDrawer
        meal={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
        status={selected ? statusOf(selected) : "draft"}
        onStatusChange={(s) =>
          selected && setOverrides((o) => ({ ...o, [selected.id]: s }))
        }
        editHref={
          selected ? `/recettes/nouvelle?id=${selected.id}` : "/recettes/nouvelle"
        }
      />
    </div>
  );
}
