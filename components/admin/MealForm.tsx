"use client";

import { useRef, useState } from "react";
import InfoPopover from "@/components/ui/InfoPopover";
import { problemText } from "@/lib/readiness";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
  useAisles,
  useAllergens,
  useComputedDiets,
  useDiets,
  useDishCategories,
  useRecipeProfiles,
  useReheatModes,
  useStepTypes,
} from "@/lib/api/referentials";
import {
  isIncomplete,
  useCreateMeal,
  useIngredientSearch,
  useUpdateMeal,
  type Continent,
  type Difficulty,
  type DishCategory,
  type Meal,
  type MealInput,
  type MealStatus,
} from "@/lib/api/catalog";
import {
  LINE_LIMITS,
  MAX_LINES,
  STORAGE_METHODS,
  TO_TASTE,
  UNITS,
  cleanLines,
  cleanReheating,
  cleanSteps,
  cleanStorage,
  draftAllergens,
  emptyLine,
  freezableOf,
  lineBlank,
  lineProblem,
  MONTHS,
  readLineRows,
  readSteps,
  seasonsLine,
  reheatModesOf,
  storageProblem,
  toStepRow,
  type DraftAllergens,
  type Freezable,
  type LineRow,
  type StepRow,
  type StorageForm,
} from "@/lib/recipe-fields";
import { ApiError } from "@/lib/api/client";
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
   sans pays ne colore pas sa carte culinaire, un plat dont les lignes ne sont
   pas toutes reliées à la liste commune n'a pas d'allergènes complets. L'écran
   le dit avant d'enregistrer, et n'empêche rien : c'est l'admin qui décide.

   Les allergènes ne s'écrivent plus : ils se calculent des lignes (Recettes
   §6.1). L'admin n'en ajoute que « à la main » (`addedAllergens`).
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

  // La version de la fiche telle que le formulaire l'a lue, figée comme ses champs :
  // une relecture de la bibliothèque (retour sur l'onglet, invalidation) apporte la
  // version d'un autre onglet, et l'envoyer avec nos champs anciens écraserait la
  // fiche plus récente sans 409.
  const [readLockVersion] = useState(meal?.lockVersion);
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
  const [addedAllergens, setAddedAllergens] = useState<string[]>(meal?.addedAllergens ?? []);
  const [customAllergens, setCustomAllergens] = useState(
    meal?.customAllergens?.join(", ") ?? "",
  );
  const [lines, setLines] = useState<LineRow[]>(() => readLineRows(meal?.ingredients));
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
  const [storage, setStorage] = useState<StorageForm>({
    method: meal?.storage?.method ?? "",
    days: meal?.storage?.days?.toString() ?? "",
    container: meal?.storage?.container ?? "",
    freezable: freezableOf(meal?.storage),
    freezerMonths: meal?.storage?.freezerMonths?.toString() ?? "",
    thawing: meal?.storage?.thawing ?? "",
  });
  // Après un premier essai d'enregistrement, les erreurs de saisie s'affichent.
  const [tried, setTried] = useState(false);
  // Ce que l'API a refusé, ligne par ligne (index du formulaire).
  const [issues, setIssues] = useState<LineIssues>(NO_ISSUES);

  const saving = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  /** Recettes §4.11, d'après l'API : la fiche enregistrée, pas le brouillon. */
  const readiness = meal?.readiness;
  const manques = readiness ? [...readiness.problems, ...readiness.toPublish] : [];

  /**
   * Les lignes que l'API refuserait. Elle rejette le plat entier pour une seule
   * ligne bancale : on ne l'envoie donc pas, et on dit laquelle, plutôt que de
   * laisser l'enregistrement échouer sans raison lisible.
   */
  const lineMessages = lines.map(lineProblem);
  const lignesInvalides = lineMessages.filter(Boolean).length;
  // Une ligne non reliée est permise en brouillon, mais ses allergènes manquent.
  const lignesNonReliees = lines.filter((l) => !lineBlank(l) && !l.catalogIngredientId).length;
  // Le réchauffage s'enregistre dès qu'un mode est coché.
  const reheatIncomplet = Boolean(
    (reheat.minutes.trim() || reheat.temperature.trim() || reheat.note.trim()) &&
      reheat.modes.length === 0,
  );
  const storageMessage = storageProblem(storage);
  const conflict = error instanceof ApiError && error.status === 409 && errorCode(error) === "RECIPE_CONFLICT";

  /** Ce que le formulaire refuse avant d'écrire à l'API (qui reste l'autorité). */
  function formProblems(): string[] {
    const out: string[] = [];
    const wholeAtLeast = (v: number | "", min: number) =>
      v === "" || (Number.isInteger(v) && v >= min);
    const csvOf = (s: string) =>
      s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    if (!name.trim()) out.push("Le nom du plat est obligatoire.");
    if (name.trim().length > 255) out.push("Le nom est limité à 255 caractères.");
    if (description.length > 2000) out.push("La description est limitée à 2 000 caractères.");
    if (!Number.isInteger(prepTime) || prepTime < 1)
      out.push("Le temps de préparation : un nombre entier d'au moins 1 minute.");
    if (!wholeAtLeast(portions, 1)) out.push("Les portions : un nombre entier d'au moins 1.");
    if (!wholeAtLeast(cookTime, 0)) out.push("La cuisson : un nombre entier de minutes.");
    if (!wholeAtLeast(calories, 0)) out.push("Les calories : un nombre entier.");
    const free = (label: string, s: string, max: number, each: number) => {
      const items = csvOf(s);
      if (items.length > max) out.push(`${label} : ${max} éléments au plus.`);
      if (items.some((x) => x.length > each))
        out.push(`${label} : ${each} caractères au plus par élément.`);
    };
    free("Autres régimes", customDiets, 10, 40);
    free("Autres allergènes", customAllergens, 10, 40);
    free("Matériel", equipment, 20, 60);
    if (lignesInvalides > 0)
      out.push(
        lignesInvalides === 1
          ? "Une ligne d'ingrédient est à corriger."
          : `${lignesInvalides} lignes d'ingrédient sont à corriger.`,
      );
    if (lines.filter((l) => !lineBlank(l)).length > MAX_LINES)
      out.push(`Une recette compte ${MAX_LINES} ingrédients au plus.`);
    if (reheatIncomplet) out.push("Le réchauffage ne s'enregistre qu'avec au moins un mode coché.");
    const t = reheat.temperature.trim();
    if (t && !(Number.isInteger(Number(t)) && Number(t) >= 0 && Number(t) <= 300))
      out.push("La température : un nombre entier de 0 à 300 °C.");
    const m = reheat.minutes.trim();
    if (m && !(Number.isInteger(Number(m)) && Number(m) >= 0 && Number(m) <= 600))
      out.push("La durée de réchauffage : un nombre entier de 0 à 600 minutes.");
    if (reheat.note.trim().length > 300)
      out.push("Le conseil de réchauffage est limité à 300 caractères.");
    if (storageMessage) out.push(storageMessage);
    return out;
  }
  const problems = formProblems();

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
      // Jamais un code hors des 14 : l'API les refuse, et garde les anciens d'elle-même.
      addedAllergens: addedAllergens.filter((c) => allergens.data.some((a) => a.code === c)),
      customAllergens: csv(customAllergens),
      ingredients: cleanLines(lines),
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
    setTried(true);
    setIssues(NO_ISSUES);
    if (problems.length > 0) {
      toast.error("Rien n'a été envoyé", problems[0]);
      return;
    }
    const input = buildInput();
    // La version lue : si la fiche a changé depuis (autre onglet), l'API répond 409.
    if (readLockVersion !== undefined) input.lockVersion = readLockVersion;
    // Les lignes vides ne partent pas : l'index de l'API n'est plus celui de l'écran.
    const sent = lines.flatMap((l, i) => (lineBlank(l) ? [] : [i]));
    const refused = (err: unknown, title: string) => {
      setIssues(lineIssuesOf(err, sent));
      toast.error(title, saveErrorMessage(err));
    };

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
          onError: (err) => refused(err, "Les modifications n'ont pas été enregistrées"),
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
        onError: (err) => refused(err, `${capitalize(noun)} n'a pas été créé`),
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
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
                Les 14 allergènes à déclaration obligatoire se calculent des
                ingrédients reliés à la liste commune. Vous ajoutez à la main
                ceux que le calcul ne peut pas voir. Un batch cooker qui adopte
                ce plat hérite de cette déclaration : elle doit être juste.
              </p>
            </div>

            <AllergenPanel
              meal={meal}
              catalog={allergens.data}
              added={addedAllergens}
              onToggle={(code) => toggle(addedAllergens, setAddedAllergens, code)}
              unlinked={lignesNonReliees}
              draft={draftAllergens(lines, addedAllergens)}
              custom={customAllergens}
              onCustom={setCustomAllergens}
            />
          </section>

          <section className="card space-y-4 p-6">
            <div>
              <h3 className="font-display text-base font-bold text-navy">Recette</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                Les listes de courses se calculent depuis les ingrédients, pour
                le nombre de portions indiqué plus haut, et se groupent par
                rayon (celui de la liste commune). Seuls les ingrédients communs
                se relient : jamais celui, privé, d&apos;un batch cooker.
              </p>
            </div>

            <IngredientRows
              value={lines}
              onChange={(v) => {
                // Les repères de l'API sont des index : ils ne valent plus une fois les lignes changées.
                setLines(v);
                setIssues(NO_ISSUES);
              }}
              messages={lineMessages}
              showMessages={tried}
              issues={issues}
            />
            {lignesNonReliees > 0 && (
              <p className="flex items-start gap-2 rounded-md bg-cream-soft px-3.5 py-2.5 text-[12px] leading-relaxed text-[#8A6212]">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {lignesNonReliees === 1
                  ? "Une ligne n'est pas reliée à la liste commune."
                  : `${lignesNonReliees} lignes ne sont pas reliées à la liste commune.`}{" "}
                C&apos;est permis en brouillon, mais les allergènes ne peuvent pas être complets, donc
                vérifiés, tant que toutes ne le sont pas.
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

            <fieldset>
              <legend className="field-label">Congelable</legend>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["yes", "Oui"],
                    ["no", "Non"],
                    ["", "Pas encore répondu"],
                  ] as [Freezable, string][]
                ).map(([v, label]) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={storage.freezable === v}
                    onClick={() => setStorage((s) => ({ ...s, freezable: v }))}
                    className={cn(
                      storage.freezable === v ? "chip-teal" : "chip-muted",
                      "cursor-pointer",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                La réponse fait partie de la conservation (lieu et jours). Une recette écrite
                avant garde « pas encore répondu » : rien n&apos;est envoyé tant que vous
                n&apos;y répondez pas. Pour être Prête, la fiche doit y répondre.
              </p>
            </fieldset>
            {storage.freezable === "yes" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Mois au congélateur" hint="De 1 à 24.">
                  <input
                    type="number"
                    min={1}
                    max={24}
                    step={1}
                    value={storage.freezerMonths}
                    onChange={(e) => setStorage((s) => ({ ...s, freezerMonths: e.target.value }))}
                    placeholder="3"
                    className="input-base"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Décongélation" hint="300 caractères au plus.">
                    <input
                      value={storage.thawing}
                      maxLength={300}
                      onChange={(e) => setStorage((s) => ({ ...s, thawing: e.target.value }))}
                      placeholder="Une nuit au réfrigérateur."
                      className="input-base"
                    />
                  </Field>
                </div>
              </div>
            )}

            <Field
              label="Conseil de réchauffage"
              hint="Une phrase, celle qu'un cuisinier dirait de vive voix. Obligatoire pour que la fiche soit Prête (300 caractères au plus)."
            >
              <input
                value={reheat.note}
                maxLength={300}
                onChange={(e) => setReheat((r) => ({ ...r, note: e.target.value }))}
                placeholder="Ajouter une cuillère de bouillon pour éviter le dessèchement."
                className="input-base"
              />
            </Field>

            {(reheatIncomplet || storageMessage) && (
              <p
                role={tried ? "alert" : undefined}
                className="flex items-start gap-2 rounded-md bg-cream-soft px-3.5 py-2.5 text-[12px] leading-relaxed text-[#8A6212]"
              >
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {[
                  reheatIncomplet && "Le réchauffage ne s'enregistre qu'avec au moins un mode coché.",
                  storageMessage,
                ]
                  .filter(Boolean)
                  .join(" ")}
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
                  l&apos;enregistrement vaut vérification dès que chaque ingrédient est relié à
                  la liste commune. L&apos;origine et le matériel ne sont jamais demandés.
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
                  : "Allergènes non vérifiés : le plat ne peut pas être réservé tant que chaque ingrédient n'est pas relié à la liste commune."}{" "}
                Calculé sur la fiche enregistrée.
              </p>
            </section>
          )}

          {tried && problems.length > 0 && (
            <div
              role="alert"
              className="rounded-md bg-danger-soft p-3.5 text-[13px] leading-relaxed text-danger"
            >
              <p className="flex items-start gap-2 font-semibold">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />À corriger avant
                d&apos;enregistrer
              </p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-9">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {error != null && (
            <div
              role="alert"
              className="rounded-md bg-danger-soft p-3.5 text-[13px] leading-relaxed text-danger"
            >
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {saveErrorMessage(error)}
              </p>
              {conflict && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="btn btn-sm mt-2.5 border border-danger/40 text-danger hover:bg-danger/10"
                >
                  Recharger la recette
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={saving || !name.trim() || conflict}
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

/* ── Allergènes ────────────────────────────────────────────────────────────── */

/**
 * Les allergènes d'un plat Lab's Food (Recettes §6.1) : calculés d'après les
 * lignes reliées à la liste commune, plus ceux que l'admin ajoute à la main.
 * Ce qui s'affiche comme calculé est celui de la fiche enregistrée, pas du
 * brouillon : il se met à jour à l'enregistrement.
 */
function AllergenPanel({
  meal,
  catalog,
  added,
  onToggle,
  unlinked,
  draft,
  custom,
  onCustom,
}: {
  meal?: Meal;
  draft: DraftAllergens;
  catalog: { code: string; label: string }[];
  added: string[];
  onToggle: (code: string) => void;
  unlinked: number;
  custom: string;
  onCustom: (v: string) => void;
}) {
  const computed = meal?.allergens ?? [];
  const conditional = new Set(meal?.conditionalAllergens ?? []);
  const sources = meal?.allergenSources ?? {};
  const savedAdded = new Set(meal?.addedAllergens ?? []);
  // Calculé : une ligne l'apporte (si l'API dit lesquelles), sinon tout ce
  // qui n'a pas été ajouté à la main.
  // Un code ancien, hors des 14 : lecture seule, jamais renvoyé à l'API.
  const legacy = [...new Set([...computed, ...(meal?.addedAllergens ?? [])])].filter(
    (c) => !catalog.some((a) => a.code === c),
  );
  const isComputed = (code: string) =>
    computed.includes(code) && ((sources[code]?.length ?? 0) > 0 || !savedAdded.has(code));

  return (
    <div className="space-y-4">
      {unlinked > 0 && (
        <p className="flex items-start gap-2 rounded-md bg-cream-soft px-3.5 py-2.5 text-[12px] leading-relaxed text-[#8A6212]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {unlinked === 1
            ? "Une ligne n'est pas reliée à la liste commune : elle n'apporte aucun allergène au calcul."
            : `${unlinked} lignes ne sont pas reliées à la liste commune : elles n'apportent aucun allergène au calcul.`}{" "}
          Tant que toutes ne le sont pas, les allergènes ne peuvent pas être complets, donc ne
          peuvent pas être vérifiés : le plat n&apos;est pas réservable.
        </p>
      )}

      <div className="rounded-md border border-[rgba(0,35,75,0.1)] bg-cream-soft/60 p-3">
        <p className="field-label">Aperçu, recalculé à l&apos;enregistrement</p>
        {draft.firm.length === 0 && draft.conditional.length === 0 ? (
          <p className="text-[13px] text-ink-mid">Aucun allergène d&apos;après le brouillon.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {draft.firm.map((code) => (
              <li key={code} className="chip-danger">
                {catalog.find((a) => a.code === code)?.label ?? code}
              </li>
            ))}
            {draft.conditional.map((code) => (
              <li key={code} className="chip-muted">
                {catalog.find((a) => a.code === code)?.label ?? code} · si l&apos;ingrédient facultatif est utilisé
              </li>
            ))}
          </ul>
        )}
        {draft.incomplete && (
          <p className="mt-2 flex items-start gap-2 text-[12px] leading-relaxed text-[#8A6212]">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Incomplet : l&apos;enregistrement ne vaudra pas vérification
            {draft.unlinked > 0 &&
              ` (${draft.unlinked} ligne${draft.unlinked > 1 ? "s" : ""} non reliée${draft.unlinked > 1 ? "s" : ""})`}
            {draft.incompleteEntries > 0 &&
              ` (${draft.incompleteEntries} fiche${draft.incompleteEntries > 1 ? "s" : ""} d'ingrédient à compléter)`}
            .
          </p>
        )}
        {meal && (
          <p className="mt-2 text-[11px] text-ink-soft">
            Ci-dessous : la fiche enregistrée, qui reste la référence jusqu&apos;à l&apos;enregistrement.
          </p>
        )}
      </div>

      {!meal ? (
        <p className="text-[13px] text-ink-soft">
          Calculés à l&apos;enregistrement, d&apos;après les ingrédients.
        </p>
      ) : meal.allergensNone ? (
        <p className="text-[13px] text-success">
          Aucun des 14 allergènes : chaque ligne est reliée et n&apos;en apporte aucun.
        </p>
      ) : computed.length === 0 ? (
        <p className="text-[13px] text-ink-mid">
          Aucun allergène calculé pour l&apos;instant sur la fiche enregistrée.
        </p>
      ) : null}

      <div>
        <p className="field-label">Les 14 allergènes</p>
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {catalog.map((a) => {
            const calc = isComputed(a.code);
            const on = calc || added.includes(a.code);
            const names = sources[a.code] ?? [];
            return (
              <li key={a.code}>
                <label
                  className={cn(
                    "flex items-start gap-2 rounded-md border px-3 py-2 text-[13px]",
                    calc
                      ? "border-danger/30 bg-danger-soft/50 text-navy"
                      : on
                        ? "cursor-pointer border-danger/40 bg-danger-soft text-navy"
                        : "cursor-pointer border-[rgba(0,35,75,0.1)] text-ink-mid hover:border-danger/30",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={calc}
                    onChange={() => onToggle(a.code)}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-navy"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium">{a.label}</span>
                    {calc && (
                      <span className="block text-[11px] leading-relaxed text-ink-soft">
                        Calculé
                        {names.length > 0 ? ` : ${names.join(", ")}` : ""}
                        {conditional.has(a.code) && " · si l'ingrédient facultatif est utilisé"}
                      </span>
                    )}
                    {!calc && on && (
                      <span className="block text-[11px] text-ink-soft">Ajouté à la main</span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
          Un allergène calculé ne se décoche pas : retirez ou changez l&apos;ingrédient qui
          l&apos;apporte.
        </p>
      </div>

      {legacy.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {legacy.map((code) => (
            <li key={code} className="chip-danger italic">
              Code ancien ({code}) : hors des 14 allergènes réglementaires, à corriger
              {(sources[code]?.length ?? 0) > 0 && ` · ${sources[code].join(", ")}`}
            </li>
          ))}
        </ul>
      )}

      <Field label="Autres allergènes" hint="Hors des 14, séparés par des virgules.">
        <input
          value={custom}
          onChange={(e) => onCustom(e.target.value)}
          placeholder="coriandre, piment"
          className="input-base"
        />
      </Field>

      <p className="text-[12px] leading-relaxed text-ink-soft">
        {meal?.allergensVerifiedAt
          ? `Allergènes vérifiés le ${new Date(meal.allergensVerifiedAt).toLocaleDateString("fr-FR")}. `
          : meal
            ? "Allergènes non vérifiés. "
            : ""}
        Pour une recette de la maison, votre enregistrement vaut vérification quand chaque ligne
        est reliée à un ingrédient de la liste commune dont la fiche est complète. Sinon la date
        reste vide, et le plat ne peut pas être réservé.
      </p>
    </div>
  );
}

/* ── Erreurs de l'API, ligne par ligne ─────────────────────────────────────── */

/** Les lignes que l'API a refusées : un motif par ligne, et les doublons. */
interface LineIssues {
  rows: Record<number, string>;
  duplicates: Set<number>;
}

const NO_ISSUES: LineIssues = { rows: {}, duplicates: new Set() };

const errorCode = (error: unknown): string | undefined =>
  error instanceof ApiError && error.body && typeof error.body === "object"
    ? (error.body as { code?: string }).code
    : undefined;

const LINE_REFUSALS: Record<string, string> = {
  "This ingredient is not available to you":
    "Cet ingrédient n'est pas disponible pour une recette Lab's Food (un ingrédient privé d'un batch cooker est refusé). Choisissez une entrée de la liste commune.",
  "This ingredient was merged into another":
    "Cet ingrédient a été fusionné dans un autre : cherchez-le à nouveau.",
  "This ingredient is no longer available":
    "Cet ingrédient n'est plus actif dans la liste commune.",
  "The ingredient needs a name": "Donnez un nom à l'ingrédient.",
  "The unit is required": "Choisissez une unité.",
  "Unknown unit": "Unité inconnue.",
  "The quantity must be above zero": "La quantité doit être supérieure à 0.",
  'A "to taste" line has no quantity': "« Selon le goût » n'a pas de quantité.",
  "The quantity is required": "Indiquez une quantité.",
};

/** `recipe.ingredients[3].unit` → 3 ; `sent` fait le pont avec les lignes de l'écran. */
function lineIssuesOf(error: unknown, sent: number[]): LineIssues {
  if (!(error instanceof ApiError) || error.status !== 422) return NO_ISSUES;
  const body = (error.body ?? {}) as { code?: string; lines?: unknown; errors?: unknown };
  const at = (i: number) => (Number.isInteger(i) ? sent[i] : undefined);
  const rows: Record<number, string> = {};
  const duplicates = new Set<number>();

  if (body.code === "DUPLICATE_INGREDIENT_LINE" && Array.isArray(body.lines)) {
    for (const group of body.lines) {
      if (!Array.isArray(group)) continue;
      for (const i of group) {
        const row = at(Number(i));
        if (row !== undefined) duplicates.add(row);
      }
    }
  } else if (body.code === "INGREDIENT_NOT_LINKED" && Array.isArray(body.lines)) {
    for (const i of body.lines) {
      const row = at(Number(i));
      if (row !== undefined) rows[row] = "Cette ligne n'est pas reliée à la liste commune.";
    }
  } else if (body.code === "VALIDATION_FAILED" && Array.isArray(body.errors)) {
    for (const e of body.errors) {
      const field = typeof e?.field === "string" ? e.field : "";
      const m = /^recipe\.ingredients\[(\d+)\]/.exec(field);
      if (!m) continue;
      const row = at(Number(m[1]));
      if (row === undefined) continue;
      const message = typeof e.message === "string" ? e.message : "";
      rows[row] = LINE_REFUSALS[message] || message || "Ligne refusée par l'API.";
    }
  }
  return { rows, duplicates };
}

/** Le message d'un échec d'enregistrement, avec les cas propres aux recettes. */
function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const code = errorCode(error);
    if (error.status === 409 && code === "RECIPE_CONFLICT") {
      return "Cette recette a été modifiée entre-temps (un ingrédient de la liste commune a peut-être été mis à jour). Rechargez avant d'enregistrer.";
    }
    if (error.status === 422 && code === "DUPLICATE_INGREDIENT_LINE") {
      return "Le même ingrédient apparaît sur plusieurs lignes (surlignées) : même groupe, même précision. Précisez-les ou fusionnez-les.";
    }
    if (error.status === 422 && code === "VALIDATION_FAILED") {
      const list = (error.body as { errors?: { field?: string; message?: string }[] } | null)
        ?.errors;
      if (Array.isArray(list) && list.length > 0) {
        const onLines = list.some((e) => /^recipe\.ingredients\[\d+\]/.test(e?.field ?? ""));
        if (onLines) return "Certaines lignes sont refusées : le motif est sous chacune.";
        return list.map((e) => e?.message).filter(Boolean).join(" ");
      }
    }
  }
  return adminErrorMessage(error);
}

/* ── Ingrédients ───────────────────────────────────────────────────────────── */

function IngredientRows({
  value,
  onChange,
  messages,
  showMessages,
  issues,
}: {
  value: LineRow[];
  onChange: (v: LineRow[]) => void;
  /** Ce que le formulaire reproche à chaque ligne. */
  messages: (string | null)[];
  /** Les montrer dès maintenant (après un premier essai d'enregistrement). */
  showMessages: boolean;
  issues: LineIssues;
}) {
  const aisles = useAisles();
  const set = (i: number, patch: Partial<LineRow>) =>
    onChange(value.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  return (
    <div>
      <p className="field-label flex items-center gap-1">
        Ingrédients
        <InfoPopover label="Que veulent dire ces champs ?">
          Cherchez l&apos;ingrédient dans la liste commune : c&apos;est ce lien qui calcule les
          allergènes, les régimes, les saisons et le rayon des courses. Une quantité fixe ne change
          pas avec les portions. « Facultatif » : ses allergènes ne sont que conditionnels. « Masqué
          au client » garde la ligne sur la fiche du batch cooker seulement ; elle est cochée
          d&apos;office pour un ingrédient de base (sel, huile). Une ligne « à vérifier » vient
          d&apos;une recette importée : tant qu&apos;elle l&apos;est, la fiche n&apos;est pas Prête.
        </InfoPopover>
      </p>
      {value.length === 0 ? (
        <p className="mb-2 text-[13px] text-ink-soft">
          Aucun ingrédient : pas de liste de courses pour ce plat.
        </p>
      ) : (
        <ul className="mb-2 space-y-2">
          {value.map((row, i) => {
            const message = (showMessages ? messages[i] : null) ?? issues.rows[i] ?? null;
            const duplicate = issues.duplicates.has(i);
            const toTaste = row.unit === TO_TASTE;
            const linked = Boolean(row.catalogIngredientId);
            return (
              <li
                key={i}
                className={cn(
                  "space-y-2 rounded-md border p-2.5",
                  message || duplicate
                    ? "border-danger/50 bg-danger-soft/40"
                    : "border-[rgba(0,35,75,0.08)]",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <GripVertical className="h-4 w-4 shrink-0 text-ink-soft/50" aria-hidden />
                  <IngredientName row={row} index={i} onChange={(patch) => set(i, patch)} />
                  {toTaste ? (
                    <span className="w-20 shrink-0 text-center text-[11px] text-ink-soft">
                      sans quantité
                    </span>
                  ) : (
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={row.qty}
                      onChange={(e) => set(i, { qty: e.target.value })}
                      placeholder="Qté"
                      aria-label={`Quantité de l'ingrédient ${i + 1}`}
                      aria-invalid={(showMessages && Boolean(messages[i])) || undefined}
                      className="input-base w-20 shrink-0"
                    />
                  )}
                  <select
                    value={row.unit}
                    onChange={(e) =>
                      set(i, {
                        unit: e.target.value,
                        qty: e.target.value === TO_TASTE ? "" : row.qty,
                      })
                    }
                    aria-label={`Unité de l'ingrédient ${i + 1}`}
                    className="input-base w-36 shrink-0"
                  >
                    <option value="">Unité</option>
                    {UNITS.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onChange(value.filter((_, j) => j !== i))}
                    aria-label={`Retirer l'ingrédient ${i + 1}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 pl-6 sm:grid-cols-3">
                  <input
                    value={row.precision}
                    maxLength={LINE_LIMITS.precision}
                    onChange={(e) => set(i, { precision: e.target.value })}
                    placeholder="Précision (bio, mûres…)"
                    aria-label={`Précision de l'ingrédient ${i + 1}`}
                    className="input-base py-1.5 text-[13px]"
                  />
                  <input
                    value={row.preparation}
                    maxLength={LINE_LIMITS.preparation}
                    onChange={(e) => set(i, { preparation: e.target.value })}
                    placeholder="Préparation (en dés…)"
                    aria-label={`Préparation de l'ingrédient ${i + 1}`}
                    className="input-base py-1.5 text-[13px]"
                  />
                  <input
                    value={row.group}
                    maxLength={LINE_LIMITS.group}
                    onChange={(e) => set(i, { group: e.target.value })}
                    placeholder="Groupe (Sauce…)"
                    aria-label={`Groupe de l'ingrédient ${i + 1}`}
                    className="input-base py-1.5 text-[13px]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-6">
                  <input
                    type="url"
                    value={row.link}
                    onChange={(e) => set(i, { link: e.target.value })}
                    placeholder="Lien (facultatif) : https://…"
                    aria-label={`Lien de l'ingrédient ${i + 1}`}
                    aria-invalid={(Boolean(row.link.trim()) && !/^https?:\/\/\S+$/i.test(row.link.trim())) || undefined}
                    className="input-base min-w-40 flex-1 py-1.5 text-[13px]"
                  />
                  {!linked && (
                    <select
                      value={row.aisle}
                      onChange={(e) => set(i, { aisle: e.target.value })}
                      aria-label={`Rayon de l'ingrédient ${i + 1}`}
                      className="input-base w-44 shrink-0 py-1.5 text-[13px]"
                    >
                      <option value="">Rayon (facultatif)</option>
                      {aisles.data.map((a) => (
                        <option key={a.code} value={a.code}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <label className="inline-flex items-center gap-1.5 text-xs text-ink-mid">
                    <input
                      type="checkbox"
                      checked={row.optional}
                      onChange={(e) => set(i, { optional: e.target.checked })}
                      className="h-3.5 w-3.5 accent-navy"
                    />
                    Facultatif
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-ink-mid">
                    <input
                      type="checkbox"
                      checked={row.fixedQuantity}
                      onChange={(e) => set(i, { fixedQuantity: e.target.checked })}
                      className="h-3.5 w-3.5 accent-navy"
                    />
                    Quantité fixe
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-ink-mid">
                    <input
                      type="checkbox"
                      checked={row.hiddenFromClient ?? false}
                      onChange={(e) => set(i, { hiddenFromClient: e.target.checked })}
                      className="h-3.5 w-3.5 accent-navy"
                    />
                    Masqué au client
                  </label>
                  {row.toVerify && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-[11px] font-semibold text-[#8A6212]">
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

                {!linked && row.name.trim() && (
                  <p className="pl-6 text-[11px] leading-relaxed text-[#8A6212]">
                    Non reliée à la liste commune : ses allergènes, régimes et saisons ne sont pas
                    comptés.
                  </p>
                )}
                {duplicate && (
                  <p role="alert" className="pl-6 text-[12px] leading-relaxed text-danger">
                    Le même ingrédient revient sur une autre ligne, avec le même groupe et la même
                    précision. Précisez l&apos;une des deux ou fusionnez-les.
                  </p>
                )}
                {message && (
                  <p role="alert" className="pl-6 text-[12px] leading-relaxed text-danger">
                    {message}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={() => onChange([...value, emptyLine()])}
        disabled={value.length >= MAX_LINES}
        className="btn btn-sm btn-outline"
      >
        <Plus className="h-3 w-3" aria-hidden /> Ajouter un ingrédient
      </button>
      {value.length >= MAX_LINES && (
        <p className="mt-1 text-[11px] text-ink-soft">
          {MAX_LINES} ingrédients au plus par recette.
        </p>
      )}
    </div>
  );
}

/**
 * Le nom d'un ingrédient, avec les suggestions de la liste commune (§4.10).
 * Choisir une suggestion relie la ligne ; retaper le nom la délie. Une recette
 * Lab's Food ne relie jamais l'ingrédient privé d'un batch cooker : on ne
 * propose que les entrées communes et actives.
 */
function IngredientName({
  row,
  index,
  onChange,
}: {
  row: LineRow;
  index: number;
  onChange: (patch: Partial<LineRow>) => void;
}) {
  const [open, setOpen] = useState(false);
  const search = useIngredientSearch(open && !row.catalogIngredientId ? row.name.trim().slice(0, 60) : "");
  const matches = (search.data ?? []).filter(
    // Explicite : une entrée sans ces champs n'est pas sélectionnable. La recherche
    // ne sert pas `chefProfileId` (champ interne) : `private` dit si l'entrée est
    // celle d'un batch cooker.
    (m) => m.private === false && m.status === "active",
  );
  const searched = open && !row.catalogIngredientId && row.name.trim().length >= 2;

  return (
    <div className="relative min-w-32 flex-1">
      <input
        value={row.name}
        maxLength={LINE_LIMITS.name}
        onChange={(e) => {
          onChange({
            name: e.target.value,
            catalogIngredientId: null,
            hiddenFromClient: row.catalogIngredientId ? undefined : row.hiddenFromClient,
            entryAllergens: undefined,
            entryIncomplete: undefined,
          });
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
        <span className="chip-teal pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px]">
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
                  // Le rayon vient de l'entrée ; « masqué au client » se préremplit
                  // d'après « de base » (sel, huile) et reste modifiable.
                  onChange({
                    name: m.name,
                    catalogIngredientId: m.id,
                    aisle: "",
                    hiddenFromClient: m.isBasic ?? false,
                    entryAllergens: m.allergensNone ? [] : (m.allergens ?? []),
                    entryIncomplete: isIncomplete(m),
                  });
                  setOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-[13px] text-navy hover:bg-cream-soft"
              >
                {m.name}
                {m.aliases.length > 0 && (
                  <span className="ml-1.5 text-[11px] text-ink-soft">{m.aliases.join(", ")}</span>
                )}
                {isIncomplete(m) && <span className="chip-danger ml-1.5 text-[10px]">à compléter</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {searched && !search.isFetching && search.data && matches.length === 0 && (
        <p role="status" className="absolute z-30 mt-1 w-full rounded-md border border-[rgba(31,42,55,0.1)] bg-white px-3 py-2 text-[12px] text-ink-soft shadow-lg">
          Aucune entrée commune. La ligne reste non reliée : ses allergènes ne seront pas comptés.
        </p>
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
                className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-xs bg-cream-deep font-mono text-[10px] font-semibold text-navy"
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
                  className="flex h-7 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-cream-soft disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                  aria-label={`Descendre l'étape ${i + 1}`}
                  className="flex h-7 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-cream-soft disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  aria-label={`Retirer l'étape ${i + 1}`}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
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
          <span className="text-[11px] text-ink-soft">
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
          <p className="text-[11px] leading-relaxed text-ink-soft">
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
