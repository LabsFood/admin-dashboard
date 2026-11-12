"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarClock,
  Carrot,
  Check,
  CheckCheck,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import InfoPopover from "@/components/ui/InfoPopover";
import IngredientEditor from "@/components/admin/IngredientEditor";
import IngredientTabs from "@/components/admin/IngredientTabs";
import PropagationNotice, { useReplay } from "@/components/admin/PropagationNotice";
import { useToast } from "@/components/ui/Toaster";
import { adminErrorMessage } from "@/lib/api/errors";
import { refLabel, useAisles, useAllergens, useComputedDiets } from "@/lib/api/referentials";
import { seasonsLine } from "@/lib/recipe-fields";
import {
  isIncomplete,
  useCatalogIngredients,
  useMarkIngredientSeasonReviewed,
  useReviewIngredient,
  type CatalogIngredient,
  type IngredientFilters,
  type IngredientSeasonReview,
  type IngredientWrite,
} from "@/lib/api/catalog";

/* ─────────────────────────────────────────────────────────────────────────────
   La liste commune d'ingrédients (module Recettes §4.10) — `/admin/ingredients`.

   La maison la remplit (BLK-33) ; le batch cooker y cherche ses ingrédients en
   écrivant une recette. C'est d'elle que se calculent les allergènes, les
   régimes et les saisons d'un plat. Modifier une entrée reclasse les recettes
   qui la relient : l'impact se lit avant d'enregistrer, le bilan après.
   ───────────────────────────────────────────────────────────────────────────── */

const STATUTS: Record<string, string> = {
  active: "Actif",
  inactive: "Inactif",
  pending: "À valider",
  merged: "Fusionné",
};

const NO_FILTER: IngredientFilters = {
  search: "",
  status: "",
  aisle: "",
  incomplete: false,
  reviewed: "",
};

export default function IngredientsPage() {
  const toast = useToast();
  const [filters, setFilters] = useState<IngredientFilters>(NO_FILTER);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<CatalogIngredient | "new" | null>(null);
  const [saved, setSaved] = useState<{ name: string; write: IngredientWrite } | null>(null);
  const liste = useCatalogIngredients(filters, page);
  const diets = useComputedDiets();
  const allergens = useAllergens();
  const aisles = useAisles();
  const review = useReviewIngredient();
  const meta = liste.data?.meta;

  function setFilter(patch: Partial<IngredientFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }
  const filtered = JSON.stringify(filters) !== JSON.stringify(NO_FILTER);

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
                Le batch cooker y choisit ses ingrédients. Une recette dont toutes les lignes y sont
                reliées affiche ses allergènes, ses régimes (ceux que tous ses ingrédients permettent)
                et ses saisons. Modifier un ingrédient reclasse les recettes qui l&apos;utilisent.
              </InfoPopover>
            </h2>
            <p className="text-sm text-ink-soft">
              Nom, rayon, allergènes, régimes compatibles et mois de saison.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setSaved(null);
            setEditing("new");
          }}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4" aria-hidden /> Ajouter un ingrédient
        </button>
      </motion.section>

      <IngredientTabs current="/ingredients" />

      {liste.data?.seasonReview?.due && <RappelSaison review={liste.data.seasonReview} />}

      {saved && (
        <section className="card space-y-2 p-5">
          <p className="font-semibold text-navy">« {saved.name} » enregistré</p>
          <PropagationNotice
            key={saved.write.ingredient.id + (saved.write.propagation?.failed ?? "")}
            propagation={saved.write.propagation}
            ingredientId={saved.write.ingredient.id}
          />
        </section>
      )}

      {editing && (
        <IngredientEditor
          initial={editing === "new" ? null : editing}
          onDone={() => setEditing(null)}
          onSaved={(write) => {
            setEditing(null);
            setSaved({ name: write.ingredient.name, write });
          }}
        />
      )}

      <section className="card space-y-4 p-6">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
            aria-hidden
          />
          <input
            value={filters.search}
            aria-label="Chercher un ingrédient"
            onChange={(e) => setFilter({ search: e.target.value })}
            placeholder="Chercher un nom, ou un autre nom"
            maxLength={60}
            className="input-base pl-9"
          />
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="field-label">Statut</span>
            <select
              value={filters.status}
              onChange={(e) => setFilter({ status: e.target.value })}
              className="input-base"
            >
              <option value="">Tous</option>
              {Object.entries(STATUTS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Rayon</span>
            <select
              value={filters.aisle}
              onChange={(e) => setFilter({ aisle: e.target.value })}
              className="input-base"
            >
              <option value="">Tous</option>
              {aisles.data.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Relecture</span>
            <select
              value={filters.reviewed}
              onChange={(e) => setFilter({ reviewed: e.target.value as IngredientFilters["reviewed"] })}
              className="input-base"
            >
              <option value="">Toutes</option>
              <option value="yes">Relus</option>
              <option value="no">Pas encore relus</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-ink-mid">
            <input
              type="checkbox"
              checked={filters.incomplete}
              onChange={(e) => setFilter({ incomplete: e.target.checked })}
            />
            À compléter
          </label>
          {filtered && (
            <button type="button" onClick={() => setFilter(NO_FILTER)} className="btn btn-sm btn-ghost mb-1">
              Effacer les filtres
            </button>
          )}
        </div>

        {liste.isPending ? (
          <div className="h-40 animate-pulse rounded-xl bg-cream-soft" />
        ) : liste.isError ? (
          <p role="alert" className="flex items-start gap-1.5 text-[13px] text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {adminErrorMessage(liste.error)}
          </p>
        ) : (liste.data?.data.length ?? 0) === 0 ? (
          <p className="text-[13px] text-ink-soft">
            {filtered ? "Rien ne correspond à ces filtres." : "La liste est vide : ajoutez le premier ingrédient."}
          </p>
        ) : (
          <ul className="divide-y divide-[rgba(31,42,55,0.06)]">
            {liste.data!.data.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-navy">
                    {i.name}
                    {i.status && i.status !== "active" && <span className="chip-muted">{STATUTS[i.status]}</span>}
                    {i.chefProfileId && <span className="chip-muted">Privé</span>}
                    {isIncomplete(i) && <span className="chip-danger">À compléter</span>}
                    {i.isBasic && <span className="chip-muted">De base</span>}
                  </p>
                  {i.aliases.length > 0 && <p className="text-[12px] text-ink-soft">{i.aliases.join(", ")}</p>}
                  <p className="mt-1 flex flex-wrap gap-1.5">
                    <span className="chip-muted">
                      {i.aisle ? refLabel(aisles.data, i.aisle) : "Sans rayon"}
                    </span>
                    {i.allergensNone ? (
                      <span className="chip-muted">Aucun allergène</span>
                    ) : (
                      (i.allergens ?? []).map((a) => (
                        <span key={a} className="chip-danger">
                          {refLabel(allergens.data, a)}
                        </span>
                      ))
                    )}
                    {i.diets.map((d) => (
                      <span key={d} className="chip-teal">
                        {refLabel(diets.data, d)}
                      </span>
                    ))}
                    <span className="chip-muted">
                      {seasonsLine(i.seasonMonths.length ? i.seasonMonths : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {i.reviewedAt ? (
                    <span className="chip-teal">
                      <Check className="h-3 w-3" aria-hidden /> Relu
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={review.isPending && review.variables === i.id}
                      onClick={() =>
                        review.mutate(i.id, {
                          onSuccess: () => toast.success(`« ${i.name} » marqué comme relu`),
                          onError: (e) => toast.error("Relecture impossible", adminErrorMessage(e)),
                        })
                      }
                      className="btn btn-sm btn-outline"
                    >
                      <CheckCheck className="h-3 w-3" aria-hidden /> Marquer comme relu
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSaved(null);
                      setEditing(i);
                    }}
                    className="btn btn-sm btn-outline"
                  >
                    <Pencil className="h-3 w-3" aria-hidden /> Modifier
                  </button>
                  <RelanceReport ingredient={i} />
                </div>
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

/**
 * Rejoue le report d'une entrée dans les recettes (idempotent) : utile après un
 * import dont des recettes ont échoué, qui ne désigne pas une entrée seule.
 */
function RelanceReport({ ingredient }: { ingredient: CatalogIngredient }) {
  const toast = useToast();
  const replay = useReplay();
  if (ingredient.chefProfileId || ingredient.status === "merged") return null;
  return (
    <button
      type="button"
      disabled={replay.pending}
      onClick={async () => {
        const p = await replay.run([ingredient.id]);
        if (!p) return toast.error("Report impossible", "Le report n'a pas pu être relancé.");
        if (p.failed > 0)
          toast.error("Report incomplet", `${p.failed} recette(s) n'ont pas pu être mises à jour.`);
        else toast.success(`Report relancé pour « ${ingredient.name} »`, `${p.dishes} recette(s) mise(s) à jour.`);
      }}
      className="btn btn-sm btn-ghost"
      title="Relancer le report dans les recettes"
    >
      {replay.pending ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      ) : (
        <RefreshCw className="h-3 w-3" aria-hidden />
      )}
      <span className="sr-only">Relancer le report de {ingredient.name}</span>
    </button>
  );
}

const SAISONS: Record<IngredientSeasonReview["season"], string> = {
  winter: "l’hiver",
  spring: "le printemps",
  summer: "l’été",
  autumn: "l’automne",
};

/**
 * BLK-33 : la liste se construit en début de saison, puis se relit à chaque
 * nouvelle saison (1er mars, juin, septembre, décembre). L'API dit quand ; le
 * bouton efface le rappel jusqu'à la saison suivante. Modifier un ingrédient ne
 * l'efface pas : seule la confirmation le fait.
 */
function RappelSaison({ review }: { review: IngredientSeasonReview }) {
  const confirmer = useMarkIngredientSeasonReviewed();
  const saison = SAISONS[review.season];
  const message =
    review.reason === "empty"
      ? `La liste commune est vide. Construisez-la pour ${saison} : sans elle, aucun plat n’affiche ses régimes ni ses saisons.`
      : review.reason === "new_season"
        ? `C’est ${saison} depuis le ${new Date(review.seasonStartsAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}. Relisez les mois de saison et les régimes, puis confirmez.`
        : `La liste n’a encore jamais été relue. Vérifiez qu’elle convient à ${saison}, puis confirmez.`;

  return (
    <section
      role="status"
      className="card flex flex-wrap items-start justify-between gap-4 border-l-4 border-l-warning p-5"
    >
      <div className="flex items-start gap-3">
        <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
        <div>
          <p className="flex items-center gap-1 font-semibold text-navy">
            Relecture de saison
            <InfoPopover label="Quand ce rappel revient-il ?">
              À chaque début de saison : le 1er mars, le 1er juin, le 1er septembre
              et le 1er décembre. Il reste affiché jusqu&apos;à votre confirmation ;
              modifier un ingrédient ne suffit pas à l&apos;effacer. La liste se
              modifie à tout moment.
            </InfoPopover>
          </p>
          <p className="mt-1 text-sm text-ink-mid">{message}</p>
          {confirmer.isError && (
            <p role="alert" className="mt-1 text-[12px] text-danger">
              {adminErrorMessage(confirmer.error)}
            </p>
          )}
        </div>
      </div>
      {review.reason !== "empty" && (
        <button
          type="button"
          onClick={() => confirmer.mutate()}
          disabled={confirmer.isPending}
          className="btn btn-primary btn-sm"
        >
          {confirmer.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden />
          )}
          La liste convient à la saison
        </button>
      )}
    </section>
  );
}
