"use client";

import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  ChevronRight,
  Clock,
  Globe2,
  Plus,
  RotateCw,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import FilterTabs from "@/components/ui/FilterTabs";
import MealDrawer from "@/components/admin/MealDrawer";
import { countryLabel } from "@/lib/countries";
import {
  CONTINENTS,
  catalogLabel,
  catalogTone,
  continentLabel,
  difficultyLabel,
  difficultyTone,
} from "@/lib/catalog-labels";
import { useDiets, refLabel } from "@/lib/api/referentials";
import { useMeals, type Continent, type Meal } from "@/lib/api/catalog";
import { adminErrorMessage } from "@/lib/api/errors";

/* ─────────────────────────────────────────────────────────────────────────────
   La carte des cuisines — `GET /admin/meals`, regroupé par région culinaire.

   Même patrimoine que l'onglet « Plats » de Plats & menus, lu autrement :
   là-bas par état de publication, ici par origine. C'est la vue qui répond à
   « quelles cuisines nous manquent ? ».

   Un plat dont l'API ne connaît pas le continent n'est pas perdu : il tombe
   dans « Origine à renseigner », qui est précisément la liste de travail.
   ───────────────────────────────────────────────────────────────────────────── */

type Filter = "all" | Continent | "unsorted";

/** Reference stable : `?? []` fabriquerait un tableau neuf a chaque rendu. */
const NONE: Meal[] = [];

export default function RecettesPage() {
  const [filter, setFilter] = useState<Filter>("all");
  // On garde l'id, pas l'objet : apres un changement de statut depuis le
  // tiroir, la ligne relue dans la liste est fraiche, une copie ne l'est pas.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const meals = useMeals();
  const diets = useDiets();

  const all = meals.data ?? NONE;
  const selected = all.find((m) => m.id === selectedId) ?? null;

  const byContinent = useMemo(() => {
    const map = new Map<Filter, Meal[]>();
    for (const m of all) {
      const key: Filter = m.continent ?? "unsorted";
      const list = map.get(key);
      if (list) list.push(m);
      else map.set(key, [m]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    }
    return map;
  }, [all]);

  const groups: Filter[] =
    filter === "all"
      ? [...CONTINENTS, "unsorted" as const].filter((c) => (byContinent.get(c)?.length ?? 0) > 0)
      : [filter];

  const groupLabel = (g: Filter) =>
    g === "unsorted" || g === "all" ? "Origine à renseigner" : continentLabel[g];

  return (
    <div className="space-y-6">
      <section
        className="card flex flex-wrap items-center justify-between gap-4 p-6"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-terra/12 text-terra-deep">
            <Globe2 className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold text-navy tabular-nums">
              {meals.isPending
                ? "Chargement de la carte…"
                : `${all.length} ${all.length > 1 ? "recettes" : "recette"} au catalogue`}
            </h2>
            <p className="text-sm text-ink-soft">
              Les plats écrits par la maison, rangés par région culinaire.
            </p>
          </div>
        </div>
        <Link href="/recettes/nouvelle" className="btn btn-primary">
          <Plus className="h-4 w-4" aria-hidden /> Ajouter une recette
        </Link>
      </section>

      {meals.isError ? (
        <section className="card p-6">
          <p className="flex items-start gap-2 text-sm text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {adminErrorMessage(meals.error)}
          </p>
          <button onClick={() => meals.refetch()} className="btn btn-outline btn-sm mt-4">
            <RotateCw className="h-3 w-3" aria-hidden /> Réessayer
          </button>
        </section>
      ) : meals.isPending ? (
        /* Une région : bandeau de titre (h-12) puis des lignes de 76 px (vignette 48 + py-3.5). */
        <SkeletonGroup className="card space-y-px overflow-hidden">
          <Skeleton className="h-12 rounded-none" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[76px] rounded-none" />
          ))}
        </SkeletonGroup>
      ) : all.length === 0 ? (
        <section className="card">
          <EmptyState
            Icon={BookOpen}
            title="Aucune recette au catalogue"
            text="Les plats écrits ici alimentent les menus Lab's Food et les semaines proposées aux clients. Commencez par en ajouter un."
          />
          <div className="flex justify-center pb-10">
            <Link href="/recettes/nouvelle" className="btn btn-primary">
              <Plus className="h-4 w-4" aria-hidden /> Ajouter une recette
            </Link>
          </div>
        </section>
      ) : (
        <>
          <FilterTabs<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { id: "all", label: "Toutes les régions", count: all.length },
              ...CONTINENTS.filter((c) => (byContinent.get(c)?.length ?? 0) > 0).map((c) => ({
                id: c,
                label: continentLabel[c],
                count: byContinent.get(c)?.length ?? 0,
              })),
              ...((byContinent.get("unsorted")?.length ?? 0) > 0
                ? [
                    {
                      id: "unsorted" as const,
                      label: "À renseigner",
                      count: byContinent.get("unsorted")?.length ?? 0,
                    },
                  ]
                : []),
            ]}
          />

          <div className="space-y-6">
            {groups.map((group) => {
              const recipes = byContinent.get(group) ?? [];
              if (recipes.length === 0) return null;
              return (
                <section key={group} className="card overflow-hidden">
                  <div className="hairline flex items-center justify-between border-b bg-cream-soft px-5 py-3">
                    <h3 className="flex items-center gap-2 font-display text-base font-bold text-navy">
                      <Globe2 className="h-4 w-4 text-terra" aria-hidden />
                      {groupLabel(group)}
                    </h3>
                    <span className="tabular-nums text-xs text-ink-soft">
                      {recipes.length} recette{recipes.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  {group === "unsorted" && (
                    <p className="hairline border-b bg-warning-soft px-5 py-2.5 text-[12px] leading-relaxed text-[#8A6212]">
                      Sans région, ces plats ne colorent pas la carte culinaire
                      du client. Ouvrez-les pour renseigner le pays d&apos;origine.
                    </p>
                  )}
                  <ul className="divide-y divide-[rgba(0,35,75,0.06)]">
                    {recipes.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(m.id)}
                          className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-cream-soft"
                        >
                          {m.imageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={m.imageUrl}
                              alt=""
                              className="h-12 w-12 shrink-0 rounded-xl object-cover"
                            />
                          ) : (
                            <span
                              aria-hidden
                              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cream-deep text-ink-soft"
                            >
                              <BookOpen className="h-4 w-4" />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-navy">
                              {m.name}
                            </p>
                            <p className="text-xs text-ink-soft">
                              {countryLabel(m.country) || "Pays non renseigné"}
                            </p>
                          </div>
                          <div className="hidden items-center gap-1.5 sm:flex">
                            {m.dietaryTags.slice(0, 2).map((t) => (
                              <span key={t} className="chip-teal">
                                {refLabel(diets.data, t)}
                              </span>
                            ))}
                          </div>
                          <span className="hidden items-center gap-1 text-xs text-ink-soft md:inline-flex">
                            <Clock className="h-3 w-3" aria-hidden />
                            {m.prepTime} min
                          </span>
                          {m.difficulty && (
                            <Badge tone={difficultyTone[m.difficulty]}>
                              {difficultyLabel[m.difficulty]}
                            </Badge>
                          )}
                          {m.readiness && (
                            <Badge tone={m.readiness.ready ? "success" : "warning"}>
                              {m.readiness.ready ? "Prête" : "Pas Prête"}
                            </Badge>
                          )}
                          <Badge tone={catalogTone[m.status]}>
                            {catalogLabel[m.status]}
                          </Badge>
                          <ChevronRight
                            className="h-4 w-4 shrink-0 text-ink-soft"
                            aria-hidden
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}

      <MealDrawer
        meal={selected}
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        editHref={
          selected ? `/recettes/nouvelle?id=${selected.id}` : "/recettes/nouvelle"
        }
      />
    </div>
  );
}
