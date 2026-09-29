"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CalendarRange,
  Clock,
  Flame,
  Plus,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import FilterTabs from "@/components/ui/FilterTabs";
import MealDrawer from "@/components/admin/MealDrawer";
import MenuDrawer from "@/components/admin/MenuDrawer";
import { cn, formatDate } from "@/lib/utils";
import { mealTone, mealLabel } from "@/lib/status";
import { MEALS } from "@/lib/mock/menus";
import { WEEKLY_MENUS } from "@/lib/mock/weeklyMenus";
import type { Meal, MealStatus, WeeklyMenu } from "@/lib/mock/types";

type Filter = "all" | MealStatus;
type Tab = "plats" | "menus";
const CURRENT_WEEK = 21;

export default function MenusPage() {
  const [tab, setTab] = useState<Tab>("plats");
  const [filter, setFilter] = useState<Filter>("all");
  const [overrides, setOverrides] = useState<Record<string, MealStatus>>({});
  const [menuOverrides, setMenuOverrides] = useState<
    Record<string, MealStatus>
  >({});
  const [selected, setSelected] = useState<Meal | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<WeeklyMenu | null>(null);

  const statusOf = (m: Meal): MealStatus => overrides[m.id] ?? m.status;
  const menuStatusOf = (m: WeeklyMenu): MealStatus =>
    menuOverrides[m.id] ?? m.status;

  const counts = MEALS.reduce<Record<string, number>>((acc, m) => {
    const s = statusOf(m);
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = MEALS.filter(
    (m) => filter === "all" || statusOf(m) === filter,
  );
  const weekMeals = MEALS.filter(
    (m) => m.weekNumber === CURRENT_WEEK && statusOf(m) === "published",
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
          <Link
            href="/menus/composer"
            className="btn bg-white text-teal hover:bg-cream"
          >
            <Plus className="h-4 w-4" />
            Composer le menu
          </Link>
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

      {/* Onglets principaux */}
      <div className="flex w-full items-center gap-1 rounded-full border border-[rgba(0,35,75,0.1)] bg-paper p-1 sm:w-auto sm:self-start">
        {(
          [
            { id: "plats", Icon: UtensilsCrossed, label: "Plats" },
            { id: "menus", Icon: CalendarRange, label: "Menus de la semaine" },
          ] as const
        ).map(({ id, Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors sm:flex-none",
              tab === id
                ? "bg-navy text-white"
                : "text-ink-mid hover:text-navy",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "plats" ? (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <FilterTabs<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { id: "all", label: "Tous les plats", count: MEALS.length },
                {
                  id: "published",
                  label: "Publiés",
                  count: counts.published ?? 0,
                },
                { id: "draft", label: "Brouillons", count: counts.draft ?? 0 },
                {
                  id: "archived",
                  label: "Archivés",
                  count: counts.archived ?? 0,
                },
              ]}
            />
            <Link href="/menus/nouveau" className="btn btn-primary">
              <Plus className="h-4 w-4" /> Nouveau plat
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((m, i) => {
              const status = statusOf(m);
              return (
                <motion.article
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: Math.min(i * 0.04, 0.32) }}
                  onClick={() => setSelected(m)}
                  className="card card-hover cursor-pointer overflow-hidden text-left"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.image}
                      alt={m.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute left-3 top-3 flex gap-1.5">
                      <Badge tone={mealTone[status]}>{mealLabel[status]}</Badge>
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
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-mid">
              {WEEKLY_MENUS.length} menus composés.
            </p>
            <Link href="/menus/composer" className="btn btn-primary">
              <Plus className="h-4 w-4" /> Composer un menu
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WEEKLY_MENUS.map((menu, i) => {
              const status = menuStatusOf(menu);
              const meals = menu.mealIds
                .map((id) => MEALS.find((m) => m.id === id))
                .filter((m) => m !== undefined);
              return (
                <motion.article
                  key={menu.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: Math.min(i * 0.05, 0.3) }}
                  onClick={() => setSelectedMenu(menu)}
                  className="card card-hover cursor-pointer p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-terra">
                        Semaine {menu.weekNumber}
                      </p>
                      <h3 className="mt-0.5 font-display text-base font-bold text-navy">
                        {menu.title}
                      </h3>
                    </div>
                    <Badge tone={mealTone[status]}>{mealLabel[status]}</Badge>
                  </div>

                  <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-mid">
                    <CalendarRange className="h-3.5 w-3.5 text-ink-soft" />
                    {formatDate(menu.startDate)} → {formatDate(menu.endDate)}
                  </p>

                  <div className="mt-4 flex -space-x-2">
                    {meals.slice(0, 5).map((m) => m ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={m.id}
                        src={m.image}
                        alt={m.name}
                        className="h-9 w-9 rounded-lg border-2 border-paper object-cover"
                      />
                    ) : null)}
                    {meals.length > 5 && (
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-paper bg-cream-deep text-[11px] font-semibold text-ink-mid">
                        +{meals.length - 5}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 flex items-center gap-1.5 border-t border-[rgba(0,35,75,0.06)] pt-3 text-[11px] text-ink-soft">
                    <UtensilsCrossed className="h-3.5 w-3.5" />
                    {meals.length} plat{meals.length > 1 ? "s" : ""} au menu
                  </p>
                </motion.article>
              );
            })}
          </div>
        </>
      )}

      <MealDrawer
        meal={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
        status={selected ? statusOf(selected) : "draft"}
        onStatusChange={(s) =>
          selected && setOverrides((o) => ({ ...o, [selected.id]: s }))
        }
        editHref={
          selected ? `/menus/nouveau?id=${selected.id}` : "/menus/nouveau"
        }
      />

      <MenuDrawer
        menu={selectedMenu}
        open={selectedMenu !== null}
        onClose={() => setSelectedMenu(null)}
        status={selectedMenu ? menuStatusOf(selectedMenu) : "draft"}
        onStatusChange={(s) =>
          selectedMenu &&
          setMenuOverrides((o) => ({ ...o, [selectedMenu.id]: s }))
        }
      />
    </div>
  );
}
