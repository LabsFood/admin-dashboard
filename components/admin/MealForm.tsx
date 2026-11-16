"use client";

import { useRef, useState } from "react";
import InfoPopover from "@/components/ui/InfoPopover";
import { problemText } from "@/lib/readiness";
import Link from "next/link";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Flame,
  GripVertical,
  Info,
  Link2,
  Upload,
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
import {
  DECLARED_DIETS,
  refLabel,
  useAllergens,
  useComputedDiets,
  useDiets,
  useDishCategories,
  useRecipeProfiles,
  useReheatModes,
  useStepTypes,
} from "@/lib/api/referentials";
import {
  useCreateMeal,
  useIngredientSearch,
  useUpdateMeal,
  type Continent,
  type Difficulty,
  type DishCategory,
  type Ingredient,
  type Meal,
  type MealInput,
  type MealStatus,
} from "@/lib/api/catalog";
import {
  AISLES,
  STORAGE_METHODS,
  UNITS,
  cleanIngredients,
  cleanReheating,
  cleanSteps,
  cleanStorage,
  ingredientReady,
  aisleLabel,
  linkValid,
  MONTHS,
  readSteps,
  seasonsLine,
  reheatModesOf,
  toStepRow,
  type StepRow,
} from "@/lib/recipe-fields";
import { adminErrorMessage } from "@/lib/api/errors";
import {
  PHOTO_MAX_MB,
  checkPhoto,
  photoMessage,
  useDeleteMealPhoto,
  useMealPhoto,
} from "@/lib/api/photos";

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
  const reheatModes = useReheatModes();
  const computedDiets = useComputedDiets();
  const profileList = useRecipeProfiles();

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
  const [steps, setSteps] = useState<StepRow[]>(() => readSteps(meal?.steps).map(toStepRow));
  const [equipment, setEquipment] = useState(meal?.equipment?.join(", ") ?? "");
  const [declaredDiets, setDeclaredDiets] = useState<string[]>(meal?.declaredDiets ?? []);
  const [profiles, setProfiles] = useState<string[]>(meal?.profiles ?? []);
  const [seasonsOverride, setSeasonsOverride] = useState<number[]>(
    meal?.seasonsOverride ?? [],
  );
  const [isFeatured, setIsFeatured] = useState(meal?.isFeatured ?? false);
  const [status, setStatus] = useState<MealStatus>(meal?.status ?? "draft");

  // Réchauffage et conservation : tenus en chaînes pour qu'un champ vidé reste
  // vide au lieu de retomber sur 0, et convertis à l'envoi.
  const [reheat, setReheat] = useState({
    modes: reheatModesOf(meal?.reheating),
    temperature: meal?.reheating?.temperature?.toString() ?? "",
    minutes: meal?.reheating?.minutes?.toString() ?? "",
    note: meal?.reheating?.note ?? "",
    container: meal?.reheating?.container ?? "",
  });
  const [storage, setStorage] = useState({
    method: meal?.storage?.method ?? "",
    days: meal?.storage?.days?.toString() ?? "",
    container: meal?.storage?.container ?? "",
  });

  const saving = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  /** Recettes §4.11, d'après l'API : la fiche enregistrée, pas le brouillon. */
  const readiness = meal?.readiness;
  const manques = readiness ? [...readiness.problems, ...readiness.toPublish] : [];

  /**
   * Les lignes d'ingrédient que l'API refuserait. Elle exige les quatre champs
   * et rejette le plat entier pour une seule ligne bancale : on les écarte, et
   * on le dit, plutôt que de laisser l'enregistrement échouer sans raison
   * lisible.
   */
  const lignesIncompletes = ingredients.filter(
    (i) => (i.name.trim() || i.qty !== "" || i.unit || i.aisle) && !ingredientReady(i),
  ).length;

  const liensInvalides = ingredients.filter((i) => !linkValid(i.link)).length;
  // Le réchauffage s'enregistre dès qu'un mode est coché ; la conservation, elle,
  // exige toujours son couple.
  const reheatIncomplet = Boolean(
    (reheat.minutes.trim() || reheat.temperature.trim() || reheat.note.trim()) &&
      reheat.modes.length === 0,
  );
  const storageIncomplet = Boolean(
    (storage.method || storage.days.trim() || storage.container.trim()) &&
      (!storage.method || !storage.days.trim()),
  );

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
      ingredients: cleanIngredients(ingredients),
      steps: cleanSteps(steps),
      equipment: csv(equipment),
      declaredDiets,
      profiles,
      seasonsOverride,
      reheating: cleanReheating(reheat),
      storage: cleanStorage(storage),
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
            posthog.capture("meal_updated", {
              content_type: variant,
              status: input.status,
              is_featured: input.isFeatured,
              ingredient_count: input.ingredients?.length ?? 0,
            });
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
          posthog.capture("meal_created", {
            content_type: variant,
            status: input.status,
            is_featured: input.isFeatured,
            ingredient_count: input.ingredients?.length ?? 0,
          });
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

      <div
        className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white lg:p-7"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-terra/25 blur-3xl"
        />
        <p className="relative text-xs uppercase tracking-[0.2em] text-terra-soft">
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
      </div>

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
            <Field label="Photo du plat">
              <PhotoField
                mealId={meal?.id}
                value={imageUrl}
                onChange={setImageUrl}
              />
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
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
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
                le nombre de portions indiqué plus haut, et se groupent par
                rayon.
              </p>
            </div>

            <IngredientRows value={ingredients} onChange={setIngredients} />
            {lignesIncompletes > 0 && (
              <p className="flex items-start gap-2 rounded-md bg-cream-soft px-3.5 py-2.5 text-[12px] leading-relaxed text-[#8A6212]">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {lignesIncompletes === 1
                  ? "Une ligne d'ingrédient est incomplète : elle ne sera pas enregistrée. L'API exige nom, quantité, unité et rayon."
                  : `${lignesIncompletes} lignes d'ingrédient sont incomplètes : elles ne seront pas enregistrées. L'API exige nom, quantité, unité et rayon.`}
              </p>
            )}
            {liensInvalides > 0 && (
              <p className="flex items-start gap-2 rounded-md bg-cream-soft px-3.5 py-2.5 text-[12px] leading-relaxed text-[#8A6212]">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Un lien doit commencer par http:// ou https:// : sinon il n&apos;est pas
                enregistré.
              </p>
            )}
            <StepRows value={steps} onChange={setSteps} />
            <Field
              label="Matériel (facultatif)"
              hint="Séparé par des virgules. Jamais contrôlé : un mémo pour le cuisinier."
            >
              <input
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                placeholder="Cocotte en fonte, mixeur plongeant"
                className="input-base"
              />
            </Field>
          </section>

          {/* ── Classement (§4.8) ─────────────────────────────────────────── */}
          <section className="card space-y-4 p-6">
            <div>
              <h3 className="flex items-center gap-1 font-display text-base font-bold text-navy">
                Classement
                <InfoPopover label="Comment le classement est-il établi ?">
                  Les régimes et les saisons se calculent d&apos;après la liste commune
                  d&apos;ingrédients, dès que chaque ligne y est reliée. Halal et casher
                  se déclarent. Les saisons calculées peuvent être remplacées par vos
                  mois. Rien ici n&apos;empêche de publier.
                </InfoPopover>
              </h3>
            </div>
            <div>
              <p className="field-label">Régimes calculés</p>
              {!meal ? (
                <p className="text-[13px] text-ink-soft">Calculés à l&apos;enregistrement.</p>
              ) : !meal.classification ? (
                <p className="text-[13px] text-ink-mid">
                  Non calculé : reliez chaque ingrédient à la liste commune (choisissez-le
                  dans les suggestions).
                </p>
              ) : meal.classification.diets.length === 0 ? (
                <p className="text-[13px] text-ink-mid">Aucun régime commun à tous les ingrédients.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {meal.classification.diets.map((c) => (
                    <span key={c} className="chip-teal">
                      {refLabel(computedDiets.data, c)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="field-label">Régimes déclarés</p>
              <div className="flex flex-wrap gap-1.5">
                {DECLARED_DIETS.map((d) => {
                  const on = declaredDiets.includes(d.code);
                  return (
                    <button
                      key={d.code}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(declaredDiets, setDeclaredDiets, d.code)}
                      className={cn(on ? "chip-teal" : "chip-muted", "cursor-pointer")}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="field-label">Profils</p>
              <div className="flex flex-wrap gap-1.5">
                {profileList.data.map((p) => {
                  const on = profiles.includes(p.code);
                  return (
                    <button
                      key={p.code}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(profiles, setProfiles, p.code)}
                      className={cn(on ? "chip-teal" : "chip-muted", "cursor-pointer")}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="field-label">Saisons</p>
              <p className="mb-2 text-[12px] text-ink-mid">
                {seasonsOverride.length
                  ? `Vos mois : ${seasonsLine(seasonsOverride)}`
                  : meal?.classification
                    ? `Calculées : ${seasonsLine(meal.classification.seasonMonths)}`
                    : "Non calculées pour l'instant."}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MONTHS.map((m, i) => {
                  const on = seasonsOverride.includes(i + 1);
                  return (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setSeasonsOverride(
                          on
                            ? seasonsOverride.filter((x) => x !== i + 1)
                            : [...seasonsOverride, i + 1].sort((a, b) => a - b),
                        )
                      }
                      className={cn(on ? "chip-teal" : "chip-muted", "cursor-pointer")}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
              {seasonsOverride.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSeasonsOverride([])}
                  className="mt-2 text-xs text-ink-mid underline underline-offset-2"
                >
                  Revenir aux saisons calculées
                </button>
              )}
            </div>
          </section>

          {/* ── Ce que le client lit plusieurs jours après la session ─────── */}
          <section className="card space-y-4 p-6">
            <div>
              <h3 className="font-display text-base font-bold text-navy">
                Réchauffage et conservation
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                Ce que le client retrouve dans son espace quand il ouvre sa
                boîte, et ce qu&apos;un batch cooker hérite s&apos;il adopte ce
                plat.
              </p>
            </div>

            <div>
              <p className="field-label flex items-center gap-1">
                Se réchauffe au
                <InfoPopover label="Changer le réchauffage crée-t-il une version ?">
                  Non. Les modes et les consignes s&apos;appliquent dès
                  l&apos;enregistrement, sans nouvelle version et sans nouvelle
                  vérification des allergènes. La liste des modes se règle dans
                  Paramètres.
                </InfoPopover>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {reheatModes.data.map((m) => {
                  const on = reheat.modes.includes(m.code);
                  return (
                    <button
                      key={m.code}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setReheat((r) => ({
                          ...r,
                          modes: on ? r.modes.filter((x) => x !== m.code) : [...r.modes, m.code],
                        }))
                      }
                      className={cn(on ? "chip-teal" : "chip-muted", "cursor-pointer")}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Contenant conseillé">
                <input
                  value={reheat.container}
                  onChange={(e) => setReheat((r) => ({ ...r, container: e.target.value }))}
                  placeholder="Plat en verre"
                  className="input-base"
                />
              </Field>
              <Field label="Température (°C)">
                <input
                  type="number"
                  min={0}
                  value={reheat.temperature}
                  onChange={(e) =>
                    setReheat((r) => ({ ...r, temperature: e.target.value }))
                  }
                  placeholder="160"
                  className="input-base"
                />
              </Field>
              <Field label="Durée (min)">
                <input
                  type="number"
                  min={0}
                  value={reheat.minutes}
                  onChange={(e) => setReheat((r) => ({ ...r, minutes: e.target.value }))}
                  placeholder="15"
                  className="input-base"
                />
              </Field>
              <Field label="Conserver au">
                <select
                  value={storage.method}
                  onChange={(e) => setStorage((s) => ({ ...s, method: e.target.value }))}
                  className="input-base"
                >
                  <option value="">Non précisé</option>
                  {STORAGE_METHODS.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Jours de conservation" required={Boolean(storage.method)}>
                <input
                  type="number"
                  min={0}
                  value={storage.days}
                  onChange={(e) => setStorage((s) => ({ ...s, days: e.target.value }))}
                  placeholder="3"
                  aria-invalid={
                    (Boolean(storage.method) && !storage.days.trim()) || undefined
                  }
                  className="input-base"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Contenant">
                  <input
                    value={storage.container}
                    onChange={(e) =>
                      setStorage((s) => ({ ...s, container: e.target.value }))
                    }
                    placeholder="Boîte hermétique"
                    className="input-base"
                  />
                </Field>
              </div>
            </div>

            <Field
              label="Conseil de réchauffage"
              hint="Une phrase, celle qu'un cuisinier dirait de vive voix."
            >
              <input
                value={reheat.note}
                onChange={(e) => setReheat((r) => ({ ...r, note: e.target.value }))}
                placeholder="Ajouter une cuillère de bouillon pour éviter le dessèchement."
                className="input-base"
              />
            </Field>

            {(reheatIncomplet || storageIncomplet) && (
              <p className="flex items-start gap-2 rounded-md bg-cream-soft px-3.5 py-2.5 text-[12px] leading-relaxed text-[#8A6212]">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {reheatIncomplet && storageIncomplet
                  ? "Le réchauffage demande au moins un mode ; la conservation, un lieu et un nombre de jours. Incomplets, les deux ne seront pas enregistrés."
                  : reheatIncomplet
                    ? "Le réchauffage ne s'enregistre qu'avec au moins un mode coché."
                    : "La conservation ne s'enregistre qu'avec un lieu et un nombre de jours : l'API exige les deux."}
              </p>
            )}
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

          {meal && readiness && (
            <section className="card p-5">
              <p className="flex items-center gap-1 text-[13px] font-semibold text-navy">
                {readiness.ready ? "Fiche Prête" : "Fiche pas encore Prête"}
                {meal.recipeVersion != null && (
                  <span className="font-normal text-ink-soft">· version {meal.recipeVersion}</span>
                )}
                <InfoPopover label="Que veut dire « Prête » ?">
                  Tout ce qui sert à cuisiner et à faire les courses est rempli, et les
                  allergènes sont vérifiés. Pour une recette de la maison,
                  l&apos;enregistrement vaut vérification dès que les allergènes sont
                  déclarés. L&apos;origine et le matériel ne sont jamais demandés.
                </InfoPopover>
              </p>
              {manques.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {manques.map((m) => (
                    <li
                      key={`${m.code}-${m.field}`}
                      className="flex items-start gap-2 text-[12px] leading-relaxed text-[#8A6212]"
                    >
                      <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                      {problemText(m)}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                {meal.allergensVerifiedAt
                  ? `Allergènes vérifiés le ${new Date(meal.allergensVerifiedAt).toLocaleDateString("fr-FR")}.`
                  : "Allergènes non vérifiés : le plat ne peut pas être réservé."}{" "}
                Calculé sur la fiche enregistrée.
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
      <p className="field-label flex items-center gap-1">
        Ingrédients
        <InfoPopover label="Quantité fixe, lien, à vérifier : de quoi s'agit-il ?">
          Une quantité fixe ne change pas avec les portions. Le lien, facultatif, dit
          où acheter l&apos;ingrédient. Une ligne « à vérifier » vient d&apos;une
          recette importée : tant qu&apos;elle l&apos;est, la fiche n&apos;est pas
          Prête.
        </InfoPopover>
      </p>
      {value.length === 0 ? (
        <p className="mb-2 text-[13px] text-ink-soft">
          Aucun ingrédient : pas de liste de courses pour ce plat.
        </p>
      ) : (
        <ul className="mb-2 space-y-2">
          {value.map((row, i) => {
            const complet = ingredientReady(row);
            const amorcee = Boolean(row.name.trim() || row.qty !== "" || row.unit || row.aisle);
            return (
              <li
                key={i}
                className={cn(
                  "flex flex-wrap items-center gap-2 rounded-md",
                  amorcee && !complet && "bg-cream-soft px-2 py-2",
                )}
              >
                <GripVertical
                  className="h-4 w-4 shrink-0 text-ink-soft/50"
                  aria-hidden
                />
                <IngredientName row={row} index={i} onChange={(patch) => set(i, patch)} />
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={row.qty ?? ""}
                  onChange={(e) => set(i, { qty: e.target.value })}
                  placeholder="Qté"
                  aria-label={`Quantité de l'ingrédient ${i + 1}`}
                  className="input-base w-20 shrink-0"
                />
                <select
                  value={row.unit ?? ""}
                  onChange={(e) => set(i, { unit: e.target.value })}
                  aria-label={`Unité de l'ingrédient ${i + 1}`}
                  className="input-base w-28 shrink-0"
                >
                  <option value="">Unité</option>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <select
                  value={row.aisle ?? ""}
                  onChange={(e) => set(i, { aisle: e.target.value })}
                  aria-label={`Rayon de l'ingrédient ${i + 1}`}
                  className="input-base w-40 shrink-0"
                >
                  <option value="">Rayon</option>
                  {AISLES.map((a) => (
                    <option key={a} value={a}>
                      {aisleLabel(a)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  aria-label={`Retirer l'ingrédient ${i + 1}`}
                  className="hit flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <div className="flex w-full flex-wrap items-center gap-2 pl-6">
                  <input
                    type="url"
                    value={row.link ?? ""}
                    onChange={(e) => set(i, { link: e.target.value })}
                    placeholder="Lien (facultatif) : https://…"
                    aria-label={`Lien de l'ingrédient ${i + 1}`}
                    aria-invalid={!linkValid(row.link) || undefined}
                    className="input-base min-w-40 flex-1 py-1.5 text-[13px]"
                  />
                  <label className="inline-flex items-center gap-1.5 text-xs text-ink-mid">
                    <input
                      type="checkbox"
                      checked={row.fixedQuantity ?? false}
                      onChange={(e) => set(i, { fixedQuantity: e.target.checked })}
                      className="h-3.5 w-3.5 accent-navy"
                    />
                    Quantité fixe
                  </label>
                  {row.toVerify && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-[#8A6212]">
                      À vérifier
                      <button
                        type="button"
                        onClick={() => set(i, { toVerify: false })}
                        className="underline underline-offset-2"
                      >
                        C&apos;est vérifié
                      </button>
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...value,
            { name: "", qty: "", unit: "g", aisle: AISLES[0], link: "", fixedQuantity: false },
          ])
        }
        className="btn btn-sm btn-outline"
      >
        <Plus className="h-3 w-3" aria-hidden /> Ajouter un ingrédient
      </button>
    </div>
  );
}

/**
 * Le nom d'un ingrédient, avec les suggestions de la liste commune (§4.10).
 * Choisir une suggestion relie la ligne ; retaper le nom la délie.
 */
function IngredientName({
  row,
  index,
  onChange,
}: {
  row: Ingredient;
  index: number;
  onChange: (patch: Partial<Ingredient>) => void;
}) {
  const [open, setOpen] = useState(false);
  const search = useIngredientSearch(open && !row.catalogIngredientId ? row.name : "");
  const matches = search.data ?? [];

  return (
    <div className="relative min-w-32 flex-1">
      <input
        value={row.name}
        onChange={(e) => {
          onChange({ name: e.target.value, catalogIngredientId: null });
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Poulet fermier"
        aria-label={`Ingrédient ${index + 1}`}
        aria-autocomplete="list"
        className={cn("input-base w-full", row.catalogIngredientId && "pr-14")}
      />
      {row.catalogIngredientId && (
        <span className="chip-teal pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs">
          liste
        </span>
      )}
      {open && matches.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-[rgba(31,42,55,0.1)] bg-white py-1 shadow-lg"
        >
          {matches.map((m) => (
            <li key={m.id} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ name: m.name, catalogIngredientId: m.id });
                  setOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-[13px] text-navy hover:bg-cream-soft"
              >
                {m.name}
                {m.aliases.length > 0 && (
                  <span className="ml-1.5 text-xs text-ink-soft">{m.aliases.join(", ")}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StepRows({
  value,
  onChange,
}: {
  value: StepRow[];
  onChange: (v: StepRow[]) => void;
}) {
  const types = useStepTypes();
  const set = (i: number, patch: Partial<StepRow>) =>
    onChange(value.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, by: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
  };

  return (
    <div>
      <p className="field-label flex items-center gap-1">
        Étapes de préparation
        <InfoPopover label="Pourquoi un type par étape ?">
          Préparation, cuisson, refroidissement ou mise en boîte : une étape sans
          type empêche la fiche d&apos;être Prête. La durée est facultative.
        </InfoPopover>
      </p>
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
                className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-xs bg-cream-deep tabular-nums text-xs font-semibold text-navy"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <textarea
                  value={step.text}
                  onChange={(e) => set(i, { text: e.target.value })}
                  rows={2}
                  aria-label={`Étape ${i + 1}`}
                  className="input-base w-full resize-y"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={step.type}
                    onChange={(e) => set(i, { type: e.target.value })}
                    aria-label={`Type de l'étape ${i + 1}`}
                    aria-invalid={(step.text.trim() !== "" && !step.type) || undefined}
                    className="input-base w-44 py-1.5 text-[13px]"
                  >
                    <option value="">Type à choisir</option>
                    {types.data.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={step.minutes}
                    onChange={(e) => set(i, { minutes: e.target.value })}
                    placeholder="Durée"
                    aria-label={`Durée de l'étape ${i + 1}, en minutes`}
                    className="input-base w-24 py-1.5 text-[13px]"
                  />
                  <span className="text-xs text-ink-soft">min</span>
                </div>
              </div>
              <div className="mt-1 flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Monter l'étape ${i + 1}`}
                  className="hit flex h-7 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-cream-soft disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                  aria-label={`Descendre l'étape ${i + 1}`}
                  className="hit flex h-7 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-cream-soft disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  aria-label={`Retirer l'étape ${i + 1}`}
                  className="hit flex h-9 w-9 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <button
        type="button"
        onClick={() => onChange([...value, { text: "", type: "", minutes: "" }])}
        className="btn btn-sm btn-outline"
      >
        <Plus className="h-3 w-3" aria-hidden /> Ajouter une étape
      </button>
    </div>
  );
}

/* ── Photo ─────────────────────────────────────────────────────────────────── */

/**
 * La photo d'un plat de la maison.
 *
 * L'envoi passe par le trio habituel — ticket, transfert direct, confirmation —
 * mais il lui faut l'id du plat. À la création, le plat n'en a pas encore : on
 * garde alors le champ URL, que `POST /admin/meals` accepte, et on dit que
 * l'envoi d'un fichier sera possible une fois le plat enregistré.
 *
 * Un plat adopté par un batch cooker montre la même photo. La retirer ici ne
 * supprime le fichier que si plus aucune copie ne s'en sert.
 */
function PhotoField({
  mealId,
  value,
  onChange,
}: {
  mealId?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const envoi = useMealPhoto<{ imageUrl?: string | null }>();
  const retrait = useDeleteMealPhoto<{ imageUrl?: string | null }>();
  const [erreur, setErreur] = useState<string | null>(null);
  const champ = useRef<HTMLInputElement>(null);

  const broken = value.startsWith("data:");

  function choisir(file: File | null) {
    setErreur(null);
    if (!file || !mealId) return;
    const probleme = checkPhoto(file);
    if (probleme) {
      setErreur(probleme);
      return;
    }
    envoi.mutate(
      { id: mealId, file },
      {
        onSuccess: (r) => {
          if (r?.imageUrl) onChange(r.imageUrl);
          if (champ.current) champ.current.value = "";
        },
        onError: (e) => setErreur(photoMessage(e)),
      },
    );
  }

  return (
    <div className="space-y-3">
      {mealId ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={champ}
            id={`photo-${mealId}`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => choisir(e.target.files?.[0] ?? null)}
          />
          <label
            htmlFor={`photo-${mealId}`}
            className={cn(
              "btn btn-outline btn-sm cursor-pointer",
              envoi.isPending && "pointer-events-none opacity-50",
            )}
          >
            {envoi.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <Upload className="h-3 w-3" aria-hidden />
            )}
            {value ? "Remplacer la photo" : "Envoyer une photo"}
          </label>
          {value && !broken && (
            <button
              type="button"
              onClick={() =>
                retrait.mutate(mealId, {
                  onSuccess: () => onChange(""),
                  onError: (e) => setErreur(photoMessage(e)),
                })
              }
              disabled={retrait.isPending}
              className="btn btn-sm text-danger hover:bg-danger-soft"
            >
              {retrait.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <X className="h-3 w-3" aria-hidden />
              )}
              Retirer
            </button>
          )}
          <span className="text-xs text-ink-soft">
            JPG, PNG ou WebP, {PHOTO_MAX_MB} Mo au plus
          </span>
        </div>
      ) : (
        <>
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
          <p className="text-xs leading-relaxed text-ink-soft">
            Vous pouvez coller une URL déjà hébergée. Pour envoyer un fichier,
            enregistrez d&apos;abord le plat : l&apos;envoi a besoin de son
            identifiant.
          </p>
        </>
      )}

      {erreur && (
        <p role="alert" className="text-[12px] leading-relaxed text-danger">
          {erreur}
        </p>
      )}

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
        {required && <span className="text-terra-ink"> *</span>}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
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
