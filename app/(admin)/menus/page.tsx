"use client";

import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarRange,
  Clock,
  Flame,
  LayoutList,
  Loader2,
  Plus,
  RotateCw,
  Save,
  Search,
  ShoppingBasket,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import FilterTabs from "@/components/ui/FilterTabs";
import Drawer from "@/components/ui/Drawer";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toaster";
import MealDrawer from "@/components/admin/MealDrawer";
import MenuDrawer from "@/components/admin/MenuDrawer";
import { cn, formatDate } from "@/lib/utils";
import { countryLabel } from "@/lib/countries";
import { chercherPlats } from "@/lib/plats-recherche";
import { catalogLabel, catalogTone, periodLabel } from "@/lib/catalog-labels";
import { useDiets, refLabel } from "@/lib/api/referentials";
import {
  currentIsoWeek,
  isoWeekRange,
  useDeleteMenuWeek,
  useLabsFoodMenus,
  useMeals,
  useMenuWeeks,
  useUpdateMenuWeek,
  type Meal,
  type MealStatus,
  type MenuWeek,
  type MenuWeekInput,
} from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
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
  // Retour de recette du 26/11 : retrouver un plat dans la bibliothèque.
  const [recherche, setRecherche] = useState("");
  const [mealId, setMealId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  /* L'id, pas l'objet : après un PATCH la semaine ouverte doit se relire dans
     la liste rafraîchie, pas rester sur l'instantané du clic. */
  const [weekId, setWeekId] = useState<string | null>(null);

  const meals = useMeals();
  const menus = useLabsFoodMenus();
  const weeks = useMenuWeeks();
  const diets = useDiets();

  const allMeals = meals.data ?? NONE;
  const allMenus = menus.data ?? [];
  const allWeeks = weeks.data ?? [];

  const selectedMeal = allMeals.find((m) => m.id === mealId) ?? null;
  const selectedMenu = allMenus.find((m) => m.id === menuId) ?? null;
  const selectedWeek = allWeeks.find((w) => w.id === weekId) ?? null;

  const counts = useMemo(
    () =>
      allMeals.reduce<Record<string, number>>((acc, m) => {
        acc[m.status] = (acc[m.status] ?? 0) + 1;
        return acc;
      }, {}),
    [allMeals],
  );

  const filtered = chercherPlats(
    filter === "all" ? allMeals : allMeals.filter((m) => m.status === filter),
    recherche,
    (code) => countryLabel(code) || "",
  );

  // La semaine en cours, telle que l'API la connaît.
  const now = currentIsoWeek();
  const thisWeek = allWeeks.find(
    (w) => w.year === now.year && w.weekNumber === now.week,
  );
  const thisWeekMeals = weekMeals(thisWeek, allMeals);

  return (
    <div className="space-y-6">
      {/* ── La semaine en cours ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden rounded-3xl bg-teal p-6 text-white lg:p-7"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-terra/25 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-terra-soft">
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
          <Link
            href="/menus/composer"
            className="btn bg-white text-teal hover:bg-cream"
          >
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
      </section>

      {/* ── Onglets ─────────────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Patrimoine du catalogue"
        className="hairline flex w-full items-center gap-1 rounded-full border bg-paper p-1 sm:w-auto sm:self-start"
      >
        {(
          [
            {
              id: "plats",
              Icon: UtensilsCrossed,
              label: "Plats",
              n: allMeals.length,
            },
            {
              id: "menus",
              Icon: LayoutList,
              label: "Menus",
              n: allMenus.length,
            },
            {
              id: "semaines",
              Icon: CalendarRange,
              label: "Semaines",
              n: allWeeks.length,
            },
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
              tab === id
                ? "bg-navy text-white"
                : "text-ink-mid hover:text-navy",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
            <span
              className={cn(
                "tabular-nums text-xs",
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <FilterTabs<Filter>
                value={filter}
                onChange={setFilter}
                options={[
                  { id: "all", label: "Tous les plats", count: allMeals.length },
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
              <div className="relative w-full sm:w-64">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
                  aria-hidden
                />
                <input
                  type="search"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Rechercher un plat…"
                  aria-label="Rechercher un plat par son nom, sa description ou son pays"
                  maxLength={80}
                  className="input-base w-full pl-9"
                />
              </div>
            </div>
            <Link href="/menus/nouveau" className="btn btn-primary">
              <Plus className="h-4 w-4" aria-hidden /> Nouveau plat
            </Link>
          </div>

          {filtered.length === 0 ? (
            recherche.trim() ? (
              <div className="card flex flex-wrap items-center justify-between gap-3 p-6">
                <p className="text-sm text-ink-soft">
                  Aucun plat ne correspond à « {recherche.trim()} ».
                </p>
                <button
                  type="button"
                  onClick={() => setRecherche("")}
                  className="btn btn-outline btn-sm"
                >
                  Effacer la recherche
                </button>
              </div>
            ) : (
              <p className="card p-6 text-sm text-ink-soft">
                Aucun plat dans cet état.
              </p>
            )
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((m) => (
                <article
                  key={m.id}
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
                        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-navy/85 px-2 py-1 text-xs font-semibold uppercase text-terra-soft">
                          <Flame className="h-3 w-3" aria-hidden /> Vedette
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-xs uppercase tracking-wide text-terra-ink">
                        {countryLabel(m.country) || "Origine à renseigner"}
                      </p>
                      <h3 className="mt-1 line-clamp-2 font-display text-sm font-bold leading-tight text-navy">
                        {m.name}
                      </h3>
                      {m.description && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-soft">
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
                      <div className="hairline mt-3 flex items-center justify-between border-t pt-2.5 text-xs text-ink-soft">
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
                </article>
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
            <p className="text-sm text-ink-mid tabular-nums">
              {allMenus.length} menu{allMenus.length > 1 ? "s" : ""} au
              catalogue.
            </p>
            <Link href="/menus/composer" className="btn btn-primary">
              <Plus className="h-4 w-4" aria-hidden /> Composer un menu
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allMenus.map((menu) => {
              const dishes =
                menu.dishes ??
                (menu.dishIds ?? [])
                  .map((id) => allMeals.find((m) => m.id === id))
                  .filter((m): m is NonNullable<typeof m> => m !== undefined);
              return (
                <article
                  key={menu.id}
                  className="card card-hover"
                >
                  <button
                    type="button"
                    onClick={() => setMenuId(menu.id)}
                    className="block w-full text-left"
                  >
                    {menu.imageUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={menu.imageUrl}
                        alt=""
                        className="aspect-[16/9] w-full object-cover"
                      />
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.16em] text-terra-ink">
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
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-paper bg-cream-deep text-xs font-semibold text-ink-mid tabular-nums">
                            +{dishes.length - 5}
                          </span>
                        )}
                      </div>

                      <div className="hairline mt-3 flex items-center justify-between border-t pt-3 text-xs text-ink-soft">
                        <span className="inline-flex items-center gap-1.5">
                          <UtensilsCrossed
                            className="h-3.5 w-3.5"
                            aria-hidden
                          />
                          {dishes.length} plat{dishes.length > 1 ? "s" : ""}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <ShoppingBasket className="h-3.5 w-3.5" aria-hidden />
                          {menu.shoppingIncluded
                            ? "Courses incluses"
                            : "Sans courses"}
                        </span>
                      </div>
                    </div>
                  </button>
                </article>
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
            <p className="text-sm text-ink-mid tabular-nums">
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
              .map((w) => {
                const list = weekMeals(w, allMeals);
                const range = isoWeekRange(w.year, w.weekNumber);
                const isNow = w.year === now.year && w.weekNumber === now.week;
                return (
                  <article
                    key={w.id ?? `${w.year}-${w.weekNumber}`}
                    className={cn(
                      "card card-hover",
                      isNow && "ring-1 ring-teal/35",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setWeekId(w.id)}
                      className="block w-full p-5 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-terra-ink">
                            Semaine {w.weekNumber} · {w.year}
                          </p>
                          <h3 className="mt-0.5 font-display text-base font-bold text-navy tabular-nums">
                            {formatDate(range.start.toISOString())}
                          </h3>
                          <p className="mt-0.5 text-xs text-ink-soft tabular-nums">
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
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-paper bg-cream-deep text-xs font-semibold text-ink-mid tabular-nums">
                            +{list.length - 5}
                          </span>
                        )}
                      </div>

                      <p className="hairline mt-3 flex items-center gap-1.5 border-t pt-3 text-xs text-ink-soft">
                        <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden />
                        {list.length} plat{list.length > 1 ? "s" : ""} à
                        l&apos;ardoise
                      </p>
                    </button>
                  </article>
                );
              })}
          </div>
        </Section>
      )}

      <MealDrawer
        meal={selectedMeal}
        open={selectedMeal !== null}
        onClose={() => setMealId(null)}
        editHref={
          selectedMeal
            ? `/menus/nouveau?id=${selectedMeal.id}`
            : "/menus/nouveau"
        }
      />

      <MenuDrawer
        menu={selectedMenu}
        open={selectedMenu !== null}
        onClose={() => setMenuId(null)}
      />

      <WeekDrawer
        week={selectedWeek}
        onClose={() => setWeekId(null)}
        meals={allMeals}
        weeks={allWeeks}
      />
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

function weekMeals(
  week: MenuWeek | undefined | null,
  library: Meal[],
): WeekDish[] {
  if (!week) return [];
  if (week.meals && week.meals.length > 0) return week.meals;
  return (week.mealIds ?? [])
    .map((id) => library.find((m) => m.id === id))
    .filter((m): m is Meal => m !== undefined)
    .map(({ id, name, imageUrl, country }) => ({
      id,
      name,
      imageUrl,
      country,
    }));
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
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => void;
  };
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
        <button
          onClick={() => query.refetch()}
          className="btn btn-outline btn-sm mt-4"
        >
          <RotateCw className="h-3 w-3" aria-hidden /> Réessayer
        </button>
      </section>
    );
  }

  if (query.isPending) {
    return (
      <SkeletonGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-64 p-4">
            <Skeleton className="h-full rounded-[10px]" />
          </div>
        ))}
      </SkeletonGroup>
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
 * L'ardoise d'une semaine s'édite depuis le 16/10 : `PATCH` et
 * `DELETE /admin/menu-weeks/{id}` existent enfin, et ce tiroir cesse d'être
 * une vitrine. Deux choses se disent mieux ici qu'à travers une erreur d'API :
 *
 * - `mealIds` **remplace** la liste côté serveur. Le tiroir envoie donc
 *   toujours l'ardoise entière, jamais un ajout isolé ;
 * - déplacer une semaine échoue si la cible a déjà la sienne. La console a
 *   déjà la liste des semaines : autant le dire avant d'envoyer.
 */
function WeekDrawer({
  week,
  onClose,
  meals,
  weeks,
}: {
  week: MenuWeek | null;
  onClose: () => void;
  meals: Meal[];
  weeks: MenuWeek[];
}) {
  const toast = useToast();
  const update = useUpdateMenuWeek();
  const remove = useDeleteMenuWeek();

  const [picked, setPicked] = useState<string[]>([]);
  const [year, setYear] = useState(0);
  const [weekNumber, setWeekNumber] = useState(0);
  const [q, setQ] = useState("");
  const [aSupprimer, setASupprimer] = useState(false);

  /* Le tiroir reste monté d'une semaine à l'autre : le brouillon se recale sur
     la semaine ouverte, et seulement quand elle change. Un refetch qui renvoie
     le même id ne doit pas effacer une ardoise en cours de composition. */
  const chargee = useRef<string | null>(null);
  useEffect(() => {
    if (!week) {
      chargee.current = null;
      return;
    }
    if (chargee.current === week.id) return;
    chargee.current = week.id;
    setPicked(weekMealIds(week));
    setYear(week.year);
    setWeekNumber(week.weekNumber);
    setQ("");
    setASupprimer(false);
  }, [week]);

  /* Un plat retenu peut venir de la semaine (que l'API déplie) comme de la
     bibliothèque (quand elle ne renvoie que des ids). */
  const connus = useMemo(() => {
    const map = new Map<string, WeekDish>();
    for (const m of meals) {
      map.set(m.id, {
        id: m.id,
        name: m.name,
        imageUrl: m.imageUrl,
        country: m.country,
      });
    }
    for (const m of week?.meals ?? []) map.set(m.id, m);
    return map;
  }, [meals, week]);

  const retenus = picked.map(
    (id) =>
      connus.get(id) ?? {
        id,
        name: "Plat absent du catalogue",
        imageUrl: null,
        country: null,
      },
  );

  const terme = q.trim().toLowerCase();
  const suggestions = useMemo(() => {
    const dedans = new Set(picked);
    return meals
      .filter((m) => !dedans.has(m.id))
      .filter(
        (m) =>
          !terme ||
          m.name.toLowerCase().includes(terme) ||
          (countryLabel(m.country) || "").toLowerCase().includes(terme),
      )
      .slice(0, 12);
  }, [meals, picked, terme]);

  const range = isoWeekRange(year, weekNumber);
  const cible = year > 2000 && weekNumber >= 1 && weekNumber <= 53;
  const occupee = week
    ? (weeks.find(
        (w) => w.id !== week.id && w.year === year && w.weekNumber === weekNumber,
      ) ?? null)
    : null;

  const deplacee = week
    ? year !== week.year || weekNumber !== week.weekNumber
    : false;
  const recomposee = week ? !memeOrdre(picked, weekMealIds(week)) : false;
  const modifiee = deplacee || recomposee;
  const envoyable = modifiee && cible && !occupee && !update.isPending;

  function enregistrer() {
    if (!week || !envoyable) return;
    const patch: Partial<MenuWeekInput> = {};
    if (deplacee) {
      patch.year = year;
      patch.weekNumber = weekNumber;
    }
    if (recomposee) patch.mealIds = picked;

    update.mutate(
      { id: week.id, patch },
      {
        onSuccess: () =>
          toast.success(
            `Semaine ${weekNumber} · ${year} enregistrée`,
            picked.length === 0
              ? "L'ardoise est vide : les clients ne verront rien cette semaine-là."
              : `${picked.length} plat${picked.length > 1 ? "s" : ""} à l'ardoise.`,
          ),
        onError: (e) => toast.error("Enregistrement refusé", semaineErreur(e)),
      },
    );
  }

  return (
    <Drawer
      open={week !== null}
      onClose={onClose}
      eyebrow={
        week ? `Semaine ${week.weekNumber} · ${week.year}` : undefined
      }
      title={
        week
          ? `${formatDate(isoWeekRange(week.year, week.weekNumber).start.toISOString())} → ${formatDate(isoWeekRange(week.year, week.weekNumber).end.toISOString())}`
          : undefined
      }
      footer={
        <div className="flex gap-2">
          <button onClick={onClose} className="btn btn-ghost flex-1">
            Fermer
          </button>
          <button
            onClick={enregistrer}
            disabled={!envoyable}
            className="btn btn-primary flex-1"
          >
            {update.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            {modifiee ? "Enregistrer" : "Aucun changement"}
          </button>
        </div>
      }
    >
      {week && (
        <div className="space-y-5">
          {/* ── Ce que les clients verront, dans l'ordre ── */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden /> À
              l&apos;ardoise ({retenus.length})
            </p>
            {retenus.length === 0 ? (
              <p className="rounded-xl bg-cream-soft px-3.5 py-3 text-[13px] text-ink-soft">
                Aucun plat : les clients ne verront rien cette semaine-là.
                Ajoutez-en ci-dessous, ou supprimez l&apos;ardoise.
              </p>
            ) : (
              <ul className="space-y-2">
                {retenus.map((m, i) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-2.5 rounded-xl bg-paper p-2.5"
                  >
                    <span
                      aria-hidden
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xs bg-cream-soft tabular-nums text-xs font-semibold text-navy"
                    >
                      {i + 1}
                    </span>
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
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream-deep text-ink-soft"
                      >
                        <UtensilsCrossed className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-navy">
                        {m.name}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {countryLabel(m.country) || "—"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPicked(picked.filter((p) => p !== m.id))}
                      aria-label={`Retirer ${m.name} de l'ardoise`}
                      className="hit shrink-0 rounded-md p-1.5 text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── La bibliothèque de la maison, filtrée ── */}
          <div>
            <label className="field-label" htmlFor="week-search">
              Ajouter un plat
            </label>
            <div className="relative mt-1.5">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft"
                aria-hidden
              />
              <input
                id="week-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nom du plat, pays…"
                className="input-base w-full pl-9"
              />
            </div>

            {suggestions.length === 0 ? (
              <p className="mt-2 text-[12px] text-ink-soft">
                {terme
                  ? "Aucun plat de la maison ne correspond."
                  : "Toute la bibliothèque est déjà à l'ardoise."}
              </p>
            ) : (
              <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {suggestions.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setPicked([...picked, m.id])}
                      className="flex w-full items-center gap-2.5 rounded-xl bg-cream-soft p-2 text-left transition-colors hover:bg-cream-deep"
                    >
                      {m.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={m.imageUrl}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper text-ink-soft"
                        >
                          <UtensilsCrossed className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-navy">
                          {m.name}
                        </span>
                        <span className="block truncate text-xs text-ink-soft">
                          {[
                            countryLabel(m.country) || null,
                            m.status !== "published"
                              ? catalogLabel[m.status]
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </span>
                      </span>
                      {m.status !== "published" && (
                        <Badge tone="warning" dot>
                          Pas en ligne
                        </Badge>
                      )}
                      <Plus
                        className="h-4 w-4 shrink-0 text-ink-soft"
                        aria-hidden
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Déplacer l'ardoise sur une autre semaine ISO ── */}
          <div className="hairline border-t pt-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <CalendarRange className="h-3.5 w-3.5" aria-hidden /> Semaine ISO
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="field-label" htmlFor="week-number">
                  Semaine
                </label>
                <input
                  id="week-number"
                  type="number"
                  min={1}
                  max={53}
                  value={weekNumber || ""}
                  onChange={(e) => setWeekNumber(Number(e.target.value))}
                  aria-invalid={!cible}
                  className="input-base mt-1.5 w-full"
                />
              </div>
              <div className="flex-1">
                <label className="field-label" htmlFor="week-year">
                  Année
                </label>
                <input
                  id="week-year"
                  type="number"
                  min={2024}
                  max={2100}
                  value={year || ""}
                  onChange={(e) => setYear(Number(e.target.value))}
                  aria-invalid={!cible}
                  className="input-base mt-1.5 w-full"
                />
              </div>
            </div>
            {cible && (
              <p className="mt-2 tabular-nums text-xs text-ink-soft">
                {formatDate(range.start.toISOString())} →{" "}
                {formatDate(range.end.toISOString())}
              </p>
            )}
            {occupee && (
              <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-relaxed text-danger">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                La semaine {weekNumber} · {year} a déjà son ardoise
                {occupee.mealIds?.length
                  ? ` (${occupee.mealIds.length} plats)`
                  : ""}
                . Supprimez-la d&apos;abord, ou choisissez une autre semaine.
              </p>
            )}
          </div>

          {/* ── Zone sans retour ── */}
          <div className="hairline border-t pt-4">
            <button
              onClick={() => setASupprimer(true)}
              disabled={remove.isPending}
              className="btn btn-sm text-danger hover:bg-danger-soft"
            >
              {remove.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-3 w-3" aria-hidden />
              )}
              Supprimer cette ardoise
            </button>
          </div>

          <ConfirmDialog
            open={aSupprimer}
            onClose={() => setASupprimer(false)}
            onConfirm={() =>
              remove.mutate(week.id, {
                onSuccess: () => {
                  toast.success(
                    `Semaine ${week.weekNumber} · ${week.year} supprimée`,
                  );
                  setASupprimer(false);
                  onClose();
                },
                onError: (e) =>
                  toast.error("La suppression a échoué", semaineErreur(e)),
              })
            }
            pending={remove.isPending}
            tone="danger"
            title={`Supprimer l'ardoise de la semaine ${week.weekNumber} ?`}
            lead={`Les clients ne verront plus rien pour la semaine du ${formatDate(isoWeekRange(week.year, week.weekNumber).start.toISOString())}.`}
            detail="Les plats restent au catalogue : seule leur place sur cette ardoise disparaît. Il faudra recomposer la semaine pour la reproposer."
            confirmLabel="Supprimer l'ardoise"
          />
        </div>
      )}
    </Drawer>
  );
}

/** Les ids d'une ardoise, que l'API les déplie ou non. */
function weekMealIds(week: MenuWeek): string[] {
  if (week.mealIds && week.mealIds.length > 0) return week.mealIds;
  return (week.meals ?? []).map((m) => m.id);
}

/** L'ordre compte : c'est celui que les clients liront. */
function memeOrdre(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/**
 * `adminErrorMessage` parle des comptes : son message de `409` évoque une
 * adresse email. Ici un conflit n'a qu'une cause, et elle se nomme.
 */
function semaineErreur(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return "Cette semaine ISO a déjà son ardoise côté API. Rechargez l'écran : une autre session vient peut-être de la créer.";
  }
  return adminErrorMessage(error);
}
