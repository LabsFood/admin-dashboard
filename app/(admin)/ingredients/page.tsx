"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Carrot, Loader2, Pencil, Plus, Save, Search, X } from "lucide-react";
import InfoPopover from "@/components/ui/InfoPopover";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";
import { adminErrorMessage } from "@/lib/api/errors";
import { refLabel, useComputedDiets } from "@/lib/api/referentials";
import { MONTHS, seasonsLine } from "@/lib/recipe-fields";
import {
  useCatalogIngredients,
  useCreateCatalogIngredient,
  useUpdateCatalogIngredient,
  type CatalogIngredient,
} from "@/lib/api/catalog";

/* ─────────────────────────────────────────────────────────────────────────────
   La liste commune d'ingrédients (module Recettes §4.10) — `/admin/ingredients`.

   La maison la remplit (BLK-33) ; le batch cooker y cherche ses ingrédients en
   écrivant une recette. C'est d'elle que se calculent les régimes et les saisons
   d'un plat : tant qu'une ligne n'y est pas reliée, rien ne se calcule. Pas
   d'allergènes ni d'unités d'achat dans cette version.
   ───────────────────────────────────────────────────────────────────────────── */

export default function IngredientsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<CatalogIngredient | "new" | null>(null);
  const liste = useCatalogIngredients(search, page);
  const diets = useComputedDiets();
  const meta = liste.data?.meta;

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card flex flex-wrap items-center justify-between gap-4 p-6"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/12 text-teal">
            <Carrot className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h2 className="flex items-center gap-1 font-display text-xl font-bold text-navy">
              {meta ? `${meta.total} ingrédient${meta.total > 1 ? "s" : ""}` : "Liste commune"}
              <InfoPopover label="À quoi sert la liste commune ?">
                Le batch cooker y choisit ses ingrédients. Un plat dont toutes les
                lignes y sont reliées affiche ses régimes (ceux que tous ses
                ingrédients permettent) et ses saisons (les mois communs aux
                ingrédients de saison). Modifier un ingrédient reclasse les plats qui
                l&apos;utilisent.
              </InfoPopover>
            </h2>
            <p className="text-sm text-ink-soft">
              Nom, autres noms, régimes compatibles et mois de saison.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => setEditing("new")} className="btn btn-primary">
          <Plus className="h-4 w-4" aria-hidden /> Ajouter un ingrédient
        </button>
      </motion.section>

      {editing && (
        <IngredientEditor
          initial={editing === "new" ? null : editing}
          onDone={() => setEditing(null)}
        />
      )}

      <section className="card space-y-4 p-6">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
            aria-hidden
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Chercher un nom, ou un autre nom"
            className="input-base pl-9"
          />
        </label>

        {liste.isPending ? (
          <div className="h-40 animate-pulse rounded-xl bg-cream-soft" />
        ) : liste.isError ? (
          <p role="alert" className="flex items-start gap-1.5 text-[13px] text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {adminErrorMessage(liste.error)}
          </p>
        ) : (liste.data?.data.length ?? 0) === 0 ? (
          <p className="text-[13px] text-ink-soft">
            {search ? `Rien ne correspond à « ${search} ».` : "La liste est vide : ajoutez le premier ingrédient."}
          </p>
        ) : (
          <ul className="divide-y divide-[rgba(31,42,55,0.06)]">
            {liste.data!.data.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy">{i.name}</p>
                  {i.aliases.length > 0 && (
                    <p className="text-[12px] text-ink-soft">{i.aliases.join(", ")}</p>
                  )}
                  <p className="mt-1 flex flex-wrap gap-1.5">
                    {i.diets.map((d) => (
                      <span key={d} className="chip-teal">
                        {refLabel(diets.data, d)}
                      </span>
                    ))}
                    <span className="chip-muted">{seasonsLine(i.seasonMonths.length ? i.seasonMonths : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(i)}
                  className="btn btn-sm btn-outline"
                >
                  <Pencil className="h-3 w-3" aria-hidden /> Modifier
                </button>
              </li>
            ))}
          </ul>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between text-[13px] text-ink-mid">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={!meta.hasPreviousPage}
              className="btn btn-sm btn-outline"
            >
              Précédente
            </button>
            Page {meta.page} sur {meta.totalPages}
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!meta.hasNextPage}
              className="btn btn-sm btn-outline"
            >
              Suivante
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function IngredientEditor({
  initial,
  onDone,
}: {
  initial: CatalogIngredient | null;
  onDone: () => void;
}) {
  const toast = useToast();
  const create = useCreateCatalogIngredient();
  const update = useUpdateCatalogIngredient();
  const diets = useComputedDiets();
  const [name, setName] = useState(initial?.name ?? "");
  const [aliases, setAliases] = useState(initial?.aliases.join(", ") ?? "");
  const [chosen, setChosen] = useState<string[]>(initial?.diets ?? []);
  const [months, setMonths] = useState<number[]>(initial?.seasonMonths ?? []);
  const saving = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      name: name.trim(),
      aliases: aliases
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      diets: chosen,
      seasonMonths: months,
    };
    const done = () => {
      toast.success(`« ${body.name} » enregistré`);
      onDone();
    };
    if (initial) update.mutate({ id: initial.id, patch: body }, { onSuccess: done });
    else create.mutate(body, { onSuccess: done });
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-navy">
          {initial ? `Modifier « ${initial.name} »` : "Nouvel ingrédient"}
        </h3>
        <button type="button" onClick={onDone} aria-label="Fermer" className="text-ink-soft">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Nom</span>
          <input
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tomate"
            className="input-base"
            required
          />
        </label>
        <label className="block">
          <span className="field-label">Autres noms (séparés par des virgules)</span>
          <input
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            placeholder="pomme d'amour"
            className="input-base"
          />
        </label>
      </div>
      <div>
        <p className="field-label flex items-center gap-1">
          Régimes compatibles
          <InfoPopover label="Que cocher ?">
            Les régimes que cet ingrédient permet. Un plat n&apos;affiche un régime que si
            tous ses ingrédients le permettent.
          </InfoPopover>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {diets.data.map((d) => {
            const on = chosen.includes(d.code);
            return (
              <button
                key={d.code}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setChosen(on ? chosen.filter((x) => x !== d.code) : [...chosen, d.code])
                }
                className={cn(on ? "chip-teal" : "chip-muted", "cursor-pointer")}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="field-label">Mois de saison (aucun : pas de saison)</p>
        <div className="flex flex-wrap gap-1.5">
          {MONTHS.map((m, i) => {
            const on = months.includes(i + 1);
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setMonths(
                    on
                      ? months.filter((x) => x !== i + 1)
                      : [...months, i + 1].sort((a, b) => a - b),
                  )
                }
                className={cn(on ? "chip-teal" : "chip-muted", "cursor-pointer")}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>
      {error != null && (
        <p role="alert" className="text-[12px] text-danger">
          {adminErrorMessage(error)}
        </p>
      )}
      <button type="submit" disabled={!name.trim() || saving} className="btn btn-primary">
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Save className="h-4 w-4" aria-hidden />
        )}
        Enregistrer
      </button>
    </form>
  );
}
