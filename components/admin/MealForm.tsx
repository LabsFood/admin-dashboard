"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Flame,
  GripVertical,
  Info,
  Link2,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";
import { COUNTRIES } from "@/lib/countries";
import { CONTINENTS, catalogLabel, continentLabel, difficultyLabel } from "@/lib/catalog-labels";
import { useAllergens, useDiets, useDishCategories } from "@/lib/api/referentials";
import {
  useCreateMeal,
  useUpdateMeal,
  type Continent,
  type Difficulty,
  type DishCategory,
  type Ingredient,
  type Meal,
  type MealInput,
  type MealStatus,
} from "@/lib/api/catalog";
import { adminErrorMessage } from "@/lib/api/errors";

/* ─────────────────────────────────────────────────────────────────────────────
   Écrire un plat Lab's Food — `POST /admin/meals`, `PATCH /admin/meals/{id}`.

   L'API n'exige que le nom et le temps de préparation. Tout le reste est
   facultatif de son point de vue, mais pas du point de vue du client : un plat
   sans pays ne colore pas sa carte culinaire, un plat sans allergènes
   déclarés ne devrait pas être publié. L'écran le dit avant d'enregistrer, et
   n'empêche rien : c'est l'admin qui décide.
   ───────────────────────────────────────────────────────────────────────────── */

const STATUSES: MealStatus[] = ["draft", "published", "archived"];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export default function MealForm({
  meal,
  variant,
  backHref,
}: {
  meal?: Meal;
  variant: "menu" | "recette";
  backHref: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateMeal();
  const update = useUpdateMeal();
  const diets = useDiets();
  const allergens = useAllergens();
  const categories = useDishCategories();

  const isEdit = Boolean(meal);
  const isRecette = variant === "recette";
  const noun = isRecette ? "la recette" : "le plat";

  const [name, setName] = useState(meal?.name ?? "");
  const [description, setDescription] = useState(meal?.description ?? "");
  const [country, setCountry] = useState(meal?.country ?? "");
  const [continent, setContinent] = useState<Continent | "">(meal?.continent ?? "");
  const [imageUrl, setImageUrl] = useState(meal?.imageUrl ?? "");
  const [portions, setPortions] = useState(meal?.portions ?? 4);
  const [prepTime, setPrepTime] = useState(meal?.prepTime ?? 45);
  const [cookTime, setCookTime] = useState<number | "">(meal?.cookTime ?? "");
  const [calories, setCalories] = useState<number | "">(meal?.calories ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty | "">(meal?.difficulty ?? "");
  const [category, setCategory] = useState<DishCategory | "">(meal?.category ?? "");
  const [dietaryTags, setDietaryTags] = useState<string[]>(meal?.dietaryTags ?? []);
  const [customDiets, setCustomDiets] = useState(meal?.customDiets?.join(", ") ?? "");
  const [allergenCodes, setAllergenCodes] = useState<string[]>(meal?.allergens ?? []);
  const [allergensNone, setAllergensNone] = useState(meal?.allergensNone ?? false);
  const [customAllergens, setCustomAllergens] = useState(
    meal?.customAllergens?.join(", ") ?? "",
  );
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    () => normalizeIngredients(meal?.ingredients),
  );
  const [steps, setSteps] = useState<string[]>(meal?.steps ?? []);
  const [isFeatured, setIsFeatured] = useState(meal?.isFeatured ?? false);
  const [status, setStatus] = useState<MealStatus>(meal?.status ?? "draft");

  const saving = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  /** Ce qui manquera au client si on publie en l'état. */
  const gaps: string[] = [];
  if (!description.trim()) gaps.push("une description");
  if (!country) gaps.push("le pays d'origine");
  if (!imageUrl.trim()) gaps.push("une photo");
  if (!allergensNone && allergenCodes.length === 0 && !customAllergens.trim()) {
    gaps.push("les allergènes, ou la mention « aucun »");
  }

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((t) => t !== value) : [...list, value]);

  function buildInput(): MealInput {
    const csv = (s: string) =>
      s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

    return {
      name: name.trim(),
      prepTime,
      description: description.trim() || null,
      country: country || null,
      continent: continent || null,
      imageUrl: imageUrl.trim() || null,
      portions: portions || null,
      cookTime: cookTime === "" ? null : cookTime,
      calories: calories === "" ? null : calories,
      difficulty: difficulty || null,
      category: category || null,
      dietaryTags,
      customDiets: csv(customDiets),
      allergens: allergensNone ? [] : allergenCodes,
      allergensNone,
      customAllergens: allergensNone ? [] : csv(customAllergens),
      ingredients: ingredients.filter((i) => i.name.trim()),
      steps: steps.map((s) => s.trim()).filter(Boolean),
      isFeatured,
      status,
    };
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = buildInput();

    if (meal) {
      update.mutate(
        { id: meal.id, patch: input },
        {
          onSuccess: (saved) => {
            toast.success(`« ${saved?.name ?? input.name} » enregistré`);
            router.push(backHref);
          },
          onError: (err) =>
            toast.error("Les modifications n'ont pas été enregistrées", adminErrorMessage(err)),
        },
      );
    } else {
      create.mutate(input, {
        onSuccess: (saved) => {
          toast.success(
            `« ${saved?.name ?? input.name} » créé`,
            status === "draft"
              ? "En brouillon : rien n'est proposé tant qu'il n'est pas publié."
              : undefined,
          );
          router.push(backHref);
        },
        onError: (err) => toast.error(`${capitalize(noun)} n'a pas été créé`, adminErrorMessage(err)),
      });
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {isRecette ? "Toutes les recettes" : "Tous les plats"}
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white lg:p-7"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-terra/25 blur-3xl"
        />
        <p className="relative font-mono text-[10px] uppercase tracking-[0.2em] text-terra-soft">
          {isRecette ? "Carte des recettes" : "Catalogue de plats"}
        </p>
        <h2 className="relative mt-1.5 font-display text-2xl font-bold lg:text-3xl">
          {isEdit
            ? `Modifier ${noun}`
            : isRecette
              ? "Ajouter une recette"
              : "Nouveau plat"}
        </h2>
        <p className="relative mt-1 text-sm text-white/65">
          Le nom et le temps de préparation suffisent pour enregistrer. Le reste
          se complète à tout moment.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          <section className="card space-y-4 p-6">
            <h3 className="font-display text-base font-bold text-navy">
              Informations générales
            </h3>
            <Field label="Nom du plat" required>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Poulet rôti aux herbes de Provence"
                className="input-base"
              />
            </Field>
            <Field label="Description" hint="Lue par le client sur la carte.">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Ingrédients principaux, préparation, particularités…"
                className="input-base resize-y"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Pays d'origine"
                hint="Colore la carte culinaire du client."
              >
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="input-base"
                >
                  <option value="">À renseigner</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Région culinaire">
                <select
                  value={continent}
                  onChange={(e) => setContinent(e.target.value as Continent | "")}
                  className="input-base"
                >
                  <option value="">À renseigner</option>
                  {CONTINENTS.map((c) => (
                    <option key={c} value={c}>
                      {continentLabel[c]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label="Photo du plat"
              hint="L'API attend une URL déjà hébergée : il n'y a pas encore d'envoi de fichier côté console."
            >
              <ImageField value={imageUrl} onChange={setImageUrl} />
            </Field>
          </section>

          <section className="card space-y-4 p-6">
            <h3 className="font-display text-base font-bold text-navy">
              Caractéristiques
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Portions">
                <input
                  type="number"
                  min={1}
                  value={portions}
                  onChange={(e) => setPortions(Number(e.target.value))}
                  className="input-base"
                />
              </Field>
              <Field label="Prépa (min)" required>
                <input
                  type="number"
                  min={1}
                  required
                  value={prepTime}
                  onChange={(e) => setPrepTime(Number(e.target.value))}
                  className="input-base"
                />
              </Field>
              <Field label="Cuisson (min)">
                <input
                  type="number"
                  min={0}
                  value={cookTime}
                  onChange={(e) =>
                    setCookTime(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="input-base"
                />
              </Field>
              <Field label="Calories">
                <input
                  type="number"
                  min={0}
                  value={calories}
                  onChange={(e) =>
                    setCalories(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="input-base"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Difficulté">
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty | "")}
                  className="input-base"
                >
                  <option value="">Non précisée</option>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {difficultyLabel[d]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Place dans le repas">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DishCategory | "")}
                  className="input-base"
                >
                  <option value="">Non précisée</option>
                  {categories.data.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Régimes">
              <ChipGroup
                options={diets.data}
                selected={dietaryTags}
                onToggle={(v) => toggle(dietaryTags, setDietaryTags, v)}
                tone="teal"
              />
            </Field>
            <Field
              label="Autres régimes"
              hint="Hors liste de référence, séparés par des virgules."
            >
              <input
                value={customDiets}
                onChange={(e) => setCustomDiets(e.target.value)}
                placeholder="sans porc, faible en sel"
                className="input-base"
              />
            </Field>
          </section>

          <section className="card space-y-4 p-6">
            <div>
              <h3 className="font-display text-base font-bold text-navy">
                Allergènes
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                Les 14 allergènes à déclaration obligatoire. Un batch cooker qui
                adopte ce plat hérite de cette déclaration : elle doit être
                juste.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAllergensNone((v) => !v)}
              aria-pressed={allergensNone}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-md border px-3.5 py-3 text-left transition-colors",
                allergensNone
                  ? "border-success/40 bg-success-soft"
                  : "border-[rgba(0,35,75,0.12)] hover:border-success/40",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border",
                  allergensNone
                    ? "border-success bg-success text-white"
                    : "border-ink-soft/40",
                )}
              >
                {allergensNone && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-navy">
                  Ce plat ne contient aucun des 14 allergènes
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-soft">
                  Une déclaration explicite, pas un oubli — c&apos;est ce qui
                  distingue « vérifié, aucun » de « pas encore renseigné ».
                </span>
              </span>
            </button>

            {!allergensNone && (
              <>
                <ChipGroup
                  options={allergens.data}
                  selected={allergenCodes}
                  onToggle={(v) => toggle(allergenCodes, setAllergenCodes, v)}
                  tone="danger"
                />
                <Field
                  label="Autres allergènes"
                  hint="Hors des 14, séparés par des virgules."
                >
                  <input
                    value={customAllergens}
                    onChange={(e) => setCustomAllergens(e.target.value)}
                    placeholder="coriandre, piment"
                    className="input-base"
                  />
                </Field>
              </>
            )}
          </section>

          <section className="card space-y-4 p-6">
            <div>
              <h3 className="font-display text-base font-bold text-navy">Recette</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                Les listes de courses se calculent depuis les ingrédients, pour
                le nombre de portions indiqué plus haut.
              </p>
            </div>

            <IngredientRows value={ingredients} onChange={setIngredients} />
            <StepRows value={steps} onChange={setSteps} />
          </section>
        </div>

        {/* Publication */}
        <aside className="space-y-6">
          <section className="card space-y-4 p-6">
            <h3 className="font-display text-base font-bold text-navy">Publication</h3>
            <Field label="Statut">
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                      s === status
                        ? "bg-navy text-white"
                        : "bg-cream-soft text-ink-mid hover:bg-cream-deep",
                    )}
                  >
                    {catalogLabel[s]}
                  </button>
                ))}
              </div>
            </Field>
            <p className="text-[12px] leading-relaxed text-ink-soft">
              {status === "published"
                ? "Publié, ce plat peut entrer dans une semaine de menu ou être proposé à un batch cooker."
                : status === "draft"
                  ? "Un brouillon n'est vu par personne d'autre que la console."
                  : "Archivé, il n'est plus proposé mais reste lisible dans l'historique."}
            </p>

            <button
              type="button"
              onClick={() => setIsFeatured((v) => !v)}
              aria-pressed={isFeatured}
              className={cn(
                "flex w-full items-center justify-between rounded-md border px-3.5 py-3 text-sm font-semibold transition-colors",
                isFeatured
                  ? "border-terra/40 bg-terra/10 text-terra-deep"
                  : "border-[rgba(0,35,75,0.12)] text-ink-mid hover:border-terra/40",
              )}
            >
              <span className="flex items-center gap-2">
                <Flame className="h-4 w-4" aria-hidden />
                Mettre en vedette
              </span>
              <span
                aria-hidden
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border",
                  isFeatured ? "border-terra bg-terra text-white" : "border-ink-soft/40",
                )}
              >
                {isFeatured && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
            </button>
          </section>

          {gaps.length > 0 && (
            <section className="card p-5">
              <p className="flex items-start gap-2 text-[13px] font-semibold text-[#8A6212]">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Il manquera {gaps.join(", ")}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
                L&apos;API accepte l&apos;enregistrement sans. C&apos;est le
                client qui s&apos;en apercevra.
              </p>
            </section>
          )}

          {error != null && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md bg-danger-soft p-3.5 text-[13px] leading-relaxed text-danger"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {adminErrorMessage(error)}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="btn btn-primary w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Enregistrement…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden />
                  {isEdit ? "Enregistrer les modifications" : `Créer ${noun}`}
                </>
              )}
            </button>
            <Link href={backHref} className="btn btn-ghost w-full">
              Annuler
            </Link>
          </div>
        </aside>
      </div>
    </form>
  );
}

/* ── Ingrédients ───────────────────────────────────────────────────────────── */

/**
 * Les plats écrits avant que le format soit fixé peuvent porter autre chose
 * qu'une liste de `{ name, qty, unit }`. On ramène ce qu'on peut à des lignes
 * éditables plutôt que de perdre le contenu.
 */
function normalizeIngredients(raw: unknown): Ingredient[] {
  if (Array.isArray(raw)) {
    return raw
      .map((v): Ingredient | null => {
        if (typeof v === "string") return v.trim() ? { name: v.trim() } : null;
        if (v && typeof v === "object") {
          const o = v as Record<string, unknown>;
          const name = typeof o.name === "string" ? o.name : "";
          if (!name.trim()) return null;
          return {
            name,
            qty: typeof o.qty === "number" || typeof o.qty === "string" ? o.qty : null,
            unit: typeof o.unit === "string" ? o.unit : null,
            aisle: typeof o.aisle === "string" ? o.aisle : null,
          };
        }
        return null;
      })
      .filter((i): i is Ingredient => i !== null);
  }
  if (raw && typeof raw === "object") {
    const items = (raw as Record<string, unknown>).items;
    if (Array.isArray(items)) return normalizeIngredients(items);
  }
  return [];
}

function IngredientRows({
  value,
  onChange,
}: {
  value: Ingredient[];
  onChange: (v: Ingredient[]) => void;
}) {
  const set = (i: number, patch: Partial<Ingredient>) =>
    onChange(value.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  return (
    <div>
      <p className="field-label">Ingrédients</p>
      {value.length === 0 ? (
        <p className="mb-2 text-[13px] text-ink-soft">
          Aucun ingrédient : pas de liste de courses pour ce plat.
        </p>
      ) : (
        <ul className="mb-2 space-y-2">
          {value.map((row, i) => (
            <li key={i} className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 shrink-0 text-ink-soft/50" aria-hidden />
              <input
                value={row.name}
                onChange={(e) => set(i, { name: e.target.value })}
                placeholder="Ingrédient"
                aria-label={`Ingrédient ${i + 1}`}
                className="input-base flex-1"
              />
              <input
                value={row.qty ?? ""}
                onChange={(e) => set(i, { qty: e.target.value })}
                placeholder="Qté"
                aria-label={`Quantité de l'ingrédient ${i + 1}`}
                className="input-base w-20"
              />
              <input
                value={row.unit ?? ""}
                onChange={(e) => set(i, { unit: e.target.value })}
                placeholder="Unité"
                aria-label={`Unité de l'ingrédient ${i + 1}`}
                className="input-base w-24"
              />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                aria-label={`Retirer l'ingrédient ${i + 1}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => onChange([...value, { name: "", qty: "", unit: "" }])}
        className="btn btn-sm btn-outline"
      >
        <Plus className="h-3 w-3" aria-hidden /> Ajouter un ingrédient
      </button>
    </div>
  );
}

function StepRows({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div>
      <p className="field-label">Étapes de préparation</p>
      {value.length === 0 ? (
        <p className="mb-2 text-[13px] text-ink-soft">
          Aucune étape écrite pour l&apos;instant.
        </p>
      ) : (
        <ol className="mb-2 space-y-2">
          {value.map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-xs bg-cream-deep font-mono text-[10px] font-semibold text-navy"
              >
                {i + 1}
              </span>
              <textarea
                value={step}
                onChange={(e) =>
                  onChange(value.map((s, j) => (j === i ? e.target.value : s)))
                }
                rows={2}
                aria-label={`Étape ${i + 1}`}
                className="input-base flex-1 resize-y"
              />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                aria-label={`Retirer l'étape ${i + 1}`}
                className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ol>
      )}
      <button
        type="button"
        onClick={() => onChange([...value, ""])}
        className="btn btn-sm btn-outline"
      >
        <Plus className="h-3 w-3" aria-hidden /> Ajouter une étape
      </button>
    </div>
  );
}

/* ── Photo ─────────────────────────────────────────────────────────────────── */

/**
 * L'API stocke une URL publique, pas un fichier : il n'existe pas d'endpoint
 * d'envoi pour les plats de la maison (contrairement aux plats des batch
 * cookers, qui ont leur ticket d'upload). On ne propose donc pas un
 * téléversement qui n'irait nulle part.
 */
function ImageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const broken = value.startsWith("data:");

  return (
    <div className="space-y-3">
      <div className="relative">
        <Link2
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
          aria-hidden
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
          inputMode="url"
          aria-invalid={broken || undefined}
          className="input-base pl-9"
        />
      </div>

      {broken && (
        <p role="alert" className="text-[12px] leading-relaxed text-danger">
          Une image encodée dans la page ne peut pas être enregistrée :
          l&apos;API attend une URL que le client pourra charger.
        </p>
      )}

      {value && !broken && (
        <div className="relative overflow-hidden rounded-2xl bg-cream-deep">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Aperçu de la photo du plat"
            className="aspect-[16/9] w-full object-cover"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Retirer l'image"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-navy/80 text-white transition-colors hover:bg-navy"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Petits blocs ──────────────────────────────────────────────────────────── */

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">
        {label}
        {required && <span className="text-terra"> *</span>}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-[11px] leading-relaxed text-ink-soft">
          {hint}
        </span>
      )}
    </label>
  );
}

function ChipGroup({
  options,
  selected,
  onToggle,
  tone,
}: {
  options: { code: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  tone: "teal" | "danger";
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt.code);
        return (
          <button
            key={opt.code}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(opt.code)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? tone === "teal"
                  ? "bg-teal-pale text-teal"
                  : "bg-danger-soft text-danger"
                : "bg-cream-soft text-ink-mid hover:bg-cream-deep",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
