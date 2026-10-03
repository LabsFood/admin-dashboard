"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarRange,
  Clock,
  Flame,
  LayoutList,
  Plus,
  RotateCw,
  ShoppingBasket,
  UtensilsCrossed,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import FilterTabs from "@/components/ui/FilterTabs";
import Drawer from "@/components/ui/Drawer";
import MealDrawer from "@/components/admin/MealDrawer";
import MenuDrawer from "@/components/admin/MenuDrawer";
import { cn, formatDate } from "@/lib/utils";
import { countryLabel } from "@/lib/countries";
import { catalogLabel, catalogTone, periodLabel } from "@/lib/catalog-labels";
import { useDiets, refLabel } from "@/lib/api/referentials";
import {
  currentIsoWeek,
  isoWeekRange,
  useLabsFoodMenus,
  useMeals,
  useMenuWeeks,
  type Meal,
  type MealStatus,
  type MenuWeek,
} from "@/lib/api/catalog";
import { adminErrorMessage } from "@/lib/api/errors";

/* ─────────────────────────────────────────────────────────────────────────────
   Plats & menus Lab's Food — trois patrimoines, trois onglets.

   - **Plats** (`GET /admin/meals`) : la bibliothèque de la maison.
   - **Menus** (`GET /admin/menus`) : des assemblages de ces plats, qu'un batch
     cooker peut adopter une fois publiés.
   - **Semaines** (`GET /admin/menu-weeks`) : l'ardoise d'une semaine ISO.

   Le contenu écrit par les batch cookers n'est pas ici : il ne s'édite pas, il
   se modère. Voir /moderation.
   ───────────────────────────────────────────────────────────────────────────── */

type Tab = "plats" | "menus" | "semaines";
type Filter = "all" | MealStatus;

/** Reference stable : `?? []` fabriquerait un tableau neuf a chaque rendu. */
const NONE: Meal[] = [];

export default function MenusPage() {
  const [tab, setTab] = useState<Tab>("plats");
  const [filter, setFilter] = useState<Filter>("all");
  const [mealId, setMealId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [week, setWeek] = useState<MenuWeek | null>(null);

  const meals = useMeals();
  const menus = useLabsFoodMenus();
  const weeks = useMenuWeeks();
  const diets = useDiets();

  const allMeals = meals.data ?? NONE;
  const allMenus = menus.data ?? [];
  const allWeeks = weeks.data ?? [];

  const selectedMeal = allMeals.find((m) => m.id === mealId) ?? null;
  const selectedMenu = allMenus.find((m) => m.id === menuId) ?? null;

  const counts = useMemo(
    () =>
      allMeals.reduce<Record<string, number>>((acc, m) => {
        acc[m.status] = (acc[m.status] ?? 0) + 1;
        return acc;
      }, {}),
    [allMeals],
  );

  const filtered =
    filter === "all" ? allMeals : allMeals.filter((m) => m.status === filter);

  // La semaine en cours, telle que l'API la connaît.
  const now = currentIsoWeek();
  const thisWeek = allWeeks.find(
    (w) => w.year === now.year && w.weekNumber === now.week,
  );
  const thisWeekMeals = weekMeals(thisWeek, allMeals);

  return (
    <div className="space-y-6">
      {/* ── La semaine en cours ─────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl bg-teal p-6 text-white lg:p-7"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-terra/25 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-terra-soft">
              Semaine {now.week} · {now.year}
            </p>
            <h2 className="mt-1.5 font-display text-2xl font-bold lg:text-3xl">
              {weeks.isPending
                ? "Lecture de la semaine…"
                : thisWeek
                  ? "Menu de la semaine en ligne"
                  : "Aucun menu pour cette semaine"}
            </h2>
            <p className="mt-1 text-sm text-white/65">
              {weeks.isPending
                ? " "
                : thisWeek
                  ? `${thisWeekMeals.length} plat${thisWeekMeals.length > 1 ? "s" : ""} proposé${thisWeekMeals.length > 1 ? "s" : ""} aux clients.`
                  : "Les clients ne voient rien tant que la semaine n'est pas composée."}
            </p>
          </div>
          <Link href="/menus/composer" className="btn bg-white text-teal hover:bg-cream">
            <Plus className="h-4 w-4" aria-hidden />
            {thisWeek ? "Composer une semaine" : "Composer la semaine"}
          </Link>
        </div>
        {thisWeekMeals.length > 0 && (
          <div className="relative mt-5 flex flex-wrap gap-2">
            {thisWeekMeals.map((m) => (
              <span
                key={m.id}
                className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs"
              >
                {m.name}
              </span>
            ))}
          </div>
        )}
      </motion.section>

      {/* ── Onglets ─────────────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Patrimoine du catalogue"
        className="hairline flex w-full items-center gap-1 rounded-full border bg-paper p-1 sm:w-auto sm:self-start"
      >
        {(
          [
            { id: "plats", Icon: UtensilsCrossed, label: "Plats", n: allMeals.length },
            { id: "menus", Icon: LayoutList, label: "Menus", n: allMenus.length },
            { id: "semaines", Icon: CalendarRange, label: "Semaines", n: allWeeks.length },
          ] as const
        ).map(({ id, Icon, label, n }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors sm:flex-none",
              tab === id ? "bg-navy text-white" : "text-ink-mid hover:text-navy",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
            <span
              className={cn(
                "font-mono text-[11px]",
                tab === id ? "text-white/60" : "text-ink-soft",
              )}
            >
              {n}
            </span>
          </button>
        ))}
      </div>

      {/* ── Plats ───────────────────────────────────────────────────────────── */}
      {tab === "plats" && (
        <Section
          query={meals}
          empty={{
            Icon: UtensilsCrossed,
            title: "La bibliothèque est vide",
            text: "Les plats écrits ici composent les menus Lab's Food et les semaines proposées aux clients.",
            href: "/menus/nouveau",
            cta: "Écrire un plat",
          }}
          count={allMeals.length}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <FilterTabs<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { id: "all", label: "Tous les plats", count: allMeals.length },
                { id: "published", label: "Publiés", count: counts.published ?? 0 },
                { id: "draft", label: "Brouillons", count: counts.draft ?? 0 },
                { id: "archived", label: "Archivés", count: counts.archived ?? 0 },
              ]}
            />
            <Link href="/menus/nouveau" className="btn btn-primary">
              <Plus className="h-4 w-4" aria-hidden /> Nouveau plat
            </Link>
          </div>

          {filtered.length === 0 ? (
            <p className="card p-6 text-sm text-ink-soft">
              Aucun plat dans cet état.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((m, i) => (
                <motion.article
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: Math.min(i * 0.04, 0.32) }}
                  className="card card-hover overflow-hidden text-left"
                >
                  <button
                    type="button"
                    onClick={() => setMealId(m.id)}
                    className="block w-full text-left"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-cream-deep">
                      {m.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={m.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-ink-soft">
                          <UtensilsCrossed className="h-7 w-7" aria-hidden />
                        </span>
                      )}
                      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-paper/92 px-2 py-1">
                        <Badge tone={catalogTone[m.status]} dot>
                          {catalogLabel[m.status]}
                        </Badge>
                      </div>
                      {m.isFeatured && (
                        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-navy/85 px-2 py-1 text-[10px] font-semibold uppercase text-terra-soft">
                          <Flame className="h-3 w-3" aria-hidden /> Vedette
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="font-mono text-[10px] uppercase tracking-wide text-terra">
                        {countryLabel(m.country) || "Origine à renseigner"}
                      </p>
                      <h3 className="mt-1 line-clamp-2 font-display text-sm font-bold leading-tight text-navy">
                        {m.name}
                      </h3>
                      {m.description && (
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-soft">
                          {m.description}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {m.dietaryTags.slice(0, 3).map((t) => (
                          <span key={t} className="chip-teal">
                            {refLabel(diets.data, t)}
                          </span>
                        ))}
                      </div>
                      <div className="hairline mt-3 flex items-center justify-between border-t pt-2.5 text-[11px] text-ink-soft">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden />
                          {m.prepTime} min
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <UtensilsCrossed className="h-3 w-3" aria-hidden />
                          {m.portions ?? "—"} portions
                        </span>
                      </div>
                    </div>
                  </button>
                </motion.article>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── Menus Lab's Food ────────────────────────────────────────────────── */}
      {tab === "menus" && (
        <Section
          query={menus}
          empty={{
            Icon: LayoutList,
            title: "Aucun menu Lab's Food",
            text: "Un menu assemble des plats de la maison. Publié, il devient une suggestion que tout batch cooker peut adopter.",
            href: "/menus/composer",
            cta: "Composer un menu",
          }}
          count={allMenus.length}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-mid">
              {allMenus.length} menu{allMenus.length > 1 ? "s" : ""} au catalogue.
            </p>
            <Link href="/menus/composer" className="btn btn-primary">
              <Plus className="h-4 w-4" aria-hidden /> Composer un menu
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allMenus.map((menu, i) => {
              const dishes =
                menu.dishes ??
                (menu.dishIds ?? [])
                  .map((id) => allMeals.find((m) => m.id === id))
                  .filter((m): m is NonNullable<typeof m> => m !== undefined);
              return (
                <motion.article
                  key={menu.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: Math.min(i * 0.05, 0.3) }}
                  className="card card-hover"
                >
                  <button
                    type="button"
                    onClick={() => setMenuId(menu.id)}
                    className="block w-full p-5 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-terra">
                          {menu.period ? periodLabel[menu.period] : "Menu"}
                        </p>
                        <h3 className="mt-0.5 font-display text-base font-bold leading-tight text-navy">
                          {menu.title}
                        </h3>
                      </div>
                      <Badge tone={catalogTone[menu.status]} dot>
                        {catalogLabel[menu.status]}
                      </Badge>
                    </div>

                    {menu.pitch && (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-soft">
                        {menu.pitch}
                      </p>
                    )}

                    <div className="mt-4 flex -space-x-2">
                      {dishes.slice(0, 5).map((m) =>
                        m.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            key={m.id}
                            src={m.imageUrl}
                            alt=""
                            className="h-9 w-9 rounded-lg border-2 border-paper object-cover"
                          />
                        ) : (
                          <span
                            key={m.id}
                            aria-hidden
                            className="h-9 w-9 rounded-lg border-2 border-paper bg-cream-deep"
                          />
                        ),
                      )}
                      {dishes.length > 5 && (
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-paper bg-cream-deep text-[11px] font-semibold text-ink-mid">
                          +{dishes.length - 5}
                        </span>
                      )}
                    </div>

                    <div className="hairline mt-3 flex items-center justify-between border-t pt-3 text-[11px] text-ink-soft">
                      <span className="inline-flex items-center gap-1.5">
                        <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden />
                        {dishes.length} plat{dishes.length > 1 ? "s" : ""}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <ShoppingBasket className="h-3.5 w-3.5" aria-hidden />
                        {menu.shoppingIncluded ? "Courses incluses" : "Sans courses"}
                      </span>
                    </div>
                  </button>
                </motion.article>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Semaines ────────────────────────────────────────────────────────── */}
      {tab === "semaines" && (
        <Section
          query={weeks}
          empty={{
            Icon: CalendarRange,
            title: "Aucune semaine composée",
            text: "Une semaine rassemble les plats que les clients verront sur l'ardoise, du lundi au dimanche.",
            href: "/menus/composer",
            cta: "Composer une semaine",
          }}
          count={allWeeks.length}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-mid">
              {allWeeks.length} semaine{allWeeks.length > 1 ? "s" : ""} composée
              {allWeeks.length > 1 ? "s" : ""}.
            </p>
            <Link href="/menus/composer" className="btn btn-primary">
              <Plus className="h-4 w-4" aria-hidden /> Composer une semaine
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...allWeeks]
              .sort((a, b) => b.year - a.year || b.weekNumber - a.weekNumber)
              .map((w, i) => {
                const list = weekMeals(w, allMeals);
                const range = isoWeekRange(w.year, w.weekNumber);
                const isNow = w.year === now.year && w.weekNumber === now.week;
                return (
                  <motion.article
                    key={w.id ?? `${w.year}-${w.weekNumber}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, delay: Math.min(i * 0.05, 0.3) }}
                    className={cn("card card-hover", isNow && "ring-1 ring-teal/35")}
                  >
                    <button
                      type="button"
                      onClick={() => setWeek(w)}
                      className="block w-full p-5 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-terra">
                            Semaine {w.weekNumber} · {w.year}
                          </p>
                          <h3 className="mt-0.5 font-display text-base font-bold text-navy">
                            {formatDate(range.start.toISOString())}
                          </h3>
                          <p className="mt-0.5 text-xs text-ink-soft">
                            jusqu&apos;au {formatDate(range.end.toISOString())}
                          </p>
                        </div>
                        {isNow ? (
                          <Badge tone="teal" dot>
                            En cours
                          </Badge>
                        ) : w.status ? (
                          <Badge tone={catalogTone[w.status]} dot>
                            {catalogLabel[w.status]}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="mt-4 flex -space-x-2">
                        {list.slice(0, 5).map((m) =>
                          m.imageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              key={m.id}
                              src={m.imageUrl}
                              alt=""
                              className="h-9 w-9 rounded-lg border-2 border-paper object-cover"
                            />
                          ) : (
                            <span
                              key={m.id}
                              aria-hidden
                              className="h-9 w-9 rounded-lg border-2 border-paper bg-cream-deep"
                            />
                          ),
                        )}
                        {list.length > 5 && (
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-paper bg-cream-deep text-[11px] font-semibold text-ink-mid">
                            +{list.length - 5}
                          </span>
                        )}
                      </div>

                      <p className="hairline mt-3 flex items-center gap-1.5 border-t pt-3 text-[11px] text-ink-soft">
                        <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden />
                        {list.length} plat{list.length > 1 ? "s" : ""} à l&apos;ardoise
                      </p>
                    </button>
                  </motion.article>
                );
              })}
          </div>
        </Section>
      )}

      <MealDrawer
        meal={selectedMeal}
        open={selectedMeal !== null}
        onClose={() => setMealId(null)}
        editHref={selectedMeal ? `/menus/nouveau?id=${selectedMeal.id}` : "/menus/nouveau"}
      />

      <MenuDrawer
        menu={selectedMenu}
        open={selectedMenu !== null}
        onClose={() => setMenuId(null)}
      />

      <WeekDrawer week={week} onClose={() => setWeek(null)} meals={allMeals} />
    </div>
  );
}

/** L'ardoise d'une semaine : ce que l'API déplie, ou ce que les ids désignent. */
interface WeekDish {
  id: string;
  name: string;
  imageUrl: string | null;
  country: string | null;
}

function weekMeals(week: MenuWeek | undefined | null, library: Meal[]): WeekDish[] {
  if (!week) return [];
  if (week.meals && week.meals.length > 0) return week.meals;
  return (week.mealIds ?? [])
    .map((id) => library.find((m) => m.id === id))
    .filter((m): m is Meal => m !== undefined)
    .map(({ id, name, imageUrl, country }) => ({ id, name, imageUrl, country }));
}

/**
 * L'enveloppe commune des trois onglets : chargement, panne, vide. Un écran
 * qui ne dit pas pourquoi il est vide envoie l'admin chercher la réponse
 * ailleurs.
 */
function Section({
  query,
  empty,
  count,
  children,
}: {
  query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => void };
  empty: {
    Icon: typeof UtensilsCrossed;
    title: string;
    text: string;
    href: string;
    cta: string;
  };
  count: number;
  children: React.ReactNode;
}) {
  if (query.isError) {
    return (
      <section className="card p-6">
        <p className="flex items-start gap-2 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {adminErrorMessage(query.error)}
        </p>
        <button onClick={() => query.refetch()} className="btn btn-outline btn-sm mt-4">
          <RotateCw className="h-3 w-3" aria-hidden /> Réessayer
        </button>
      </section>
    );
  }

  if (query.isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-64 animate-pulse" />
        ))}
      </div>
    );
  }

  if (count === 0) {
    return (
      <section className="card">
        <EmptyState Icon={empty.Icon} title={empty.title} text={empty.text} />
        <div className="flex justify-center pb-10">
          <Link href={empty.href} className="btn btn-primary">
            <Plus className="h-4 w-4" aria-hidden /> {empty.cta}
          </Link>
        </div>
      </section>
    );
  }

  return <div className="space-y-5">{children}</div>;
}

/**
 * Une semaine se lit, elle ne se modifie pas encore : l'API n'expose que
 * `GET` et `POST` sur `/admin/menu-weeks`. L'écran le dit plutôt que d'offrir
 * un bouton qui échouerait.
 */
function WeekDrawer({
  week,
  onClose,
  meals,
}: {
  week: MenuWeek | null;
  onClose: () => void;
  meals: Meal[];
}) {
  const list = weekMeals(week, meals);
  const range = week ? isoWeekRange(week.year, week.weekNumber) : null;

  return (
    <Drawer
      open={week !== null}
      onClose={onClose}
      eyebrow={week ? `Semaine ${week.weekNumber} · ${week.year}` : undefined}
      title={
        range
          ? `${formatDate(range.start.toISOString())} → ${formatDate(range.end.toISOString())}`
          : undefined
      }
      footer={
        <button onClick={onClose} className="btn btn-ghost w-full">
          Fermer
        </button>
      }
    >
      {week && (
        <div className="space-y-5">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden /> Plats à
              l&apos;ardoise ({list.length})
            </p>
            {list.length === 0 ? (
              <p className="rounded-xl bg-cream-soft px-3.5 py-3 text-[13px] text-ink-soft">
                Aucun plat : les clients ne verront rien cette semaine-là.
              </p>
            ) : (
              <ul className="space-y-2">
                {list.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 rounded-xl bg-paper p-2.5"
                  >
                    {m.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={m.imageUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="h-10 w-10 shrink-0 rounded-lg bg-cream-deep"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-navy">{m.name}</p>
                      <p className="font-mono text-[10px] text-ink-soft">
                        {countryLabel(m.country) || "—"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="rounded-md bg-cream-soft px-3.5 py-3 text-[12px] leading-relaxed text-ink-mid">
            Une semaine ne se modifie pas depuis la console :
            l&apos;API expose la lecture et la création, pas la mise à jour.
            Pour changer cette semaine, composez-la de nouveau.
          </p>
        </div>
      )}
    </Drawer>
  );
}
