/* ─────────────────────────────────────────────────────────────────────────────
   « Prête » (module Recettes §4.11), en mots — les mêmes que batchcooking-web.

   L'API nomme chaque point manquant par un `code` et un `field` : on traduit
   d'après eux, jamais d'après `message`, qui reste en anglais.
   ───────────────────────────────────────────────────────────────────────────── */

import type { Problem, Readiness } from "@/lib/api/catalog";
import type { LineRow, StepRow, StorageForm } from "@/lib/recipe-fields";

const CHAMP: Record<string, string> = {
  name: "le nom",
  category: "la place dans le repas",
  portions: "le nombre de portions",
  cookMinutes: "le temps de cuisson (0 si le plat ne cuit pas)",
  "recipe.ingredients": "au moins un ingrédient",
  "recipe.steps": "au moins une étape",
  "recipe.storage": "la conservation : où, et combien de jours",
  "recipe.storage.freezable": "si la recette se congèle (oui ou non)",
  "recipe.storage.freezerMonths": "combien de mois elle se congèle",
  "recipe.storage.thawing": "comment la décongeler",
  "recipe.reheating.note": "le conseil de réchauffage",
  "recipe.reheating": "un mode de réchauffage",
  description: "une description courte",
};

const rang = (field: string) => {
  const m = /\[(\d+)\]$/.exec(field);
  return m ? Number(m[1]) : null;
};

/** Un point manquant, comme il s'écrit dans une liste. */
export function problemText(p: { code: string; field: string }): string {
  const i = rang(p.field);
  switch (p.code) {
    case "INGREDIENT_TO_VERIFY":
      return `l'ingrédient n° ${(i ?? 0) + 1}, encore à vérifier`;
    case "STEP_TYPE_MISSING":
      return `le type de l'étape ${(i ?? 0) + 1}`;
    case "INGREDIENT_NOT_LINKED":
      return `l'ingrédient n° ${(i ?? 0) + 1}, à relier à la liste commune`;
    case "INGREDIENT_INCOMPLETE":
      return `l'ingrédient n° ${(i ?? 0) + 1}, dont la fiche commune est à compléter`;
    case "ALLERGENS_REQUIRED":
      return "tous les ingrédients reliés à la liste commune, pour que les allergènes soient calculés";
    case "ALLERGENS_UNVERIFIED":
      return "la confirmation des allergènes";
    case "DECLARED_DIET_NOT_ALLOWED":
      return "un régime déclaré que les ingrédients ne permettent pas";
    case "PHOTO_MISSING":
      return "une vraie photo du plat";
    default:
      return CHAMP[p.field] ?? p.field;
  }
}

/* ── « Prête » pendant la saisie ──────────────────────────────────────────────
   Les mêmes règles que `readiness()` de l'API (dishes.rules.ts), pour ce que le
   formulaire connaît. Les points que seule l'API sait juger (allergènes
   vérifiés, régimes déclarés, saisons communes, réfrigérateur trop long)
   restent ceux de la fiche enregistrée. L'API reste l'autorité à l'enregistrement. */


/** Ce que seule l'API sait juger : repris tels quels de la fiche enregistrée. */
const SERVER_ONLY = new Set([
  "ALLERGENS_UNVERIFIED",
  "ALLERGENS_REQUIRED",
  "DECLARED_DIET_NOT_ALLOWED",
  "NO_COMMON_SEASON",
  "FRIDGE_LONG",
]);

export interface LiveForm {
  name: string;
  description: string;
  category: string;
  portions: number;
  cookTime: number | "";
  imageUrl: string;
  /** Les lignes remplies seulement. */
  lines: LineRow[];
  /** Les étapes écrites seulement. */
  steps: StepRow[];
  storage: StorageForm;
  reheat: { modes: string[]; note: string };
}

export function liveReadiness(form: LiveForm, saved?: Readiness): Readiness {
  const problems: Problem[] = [];
  const add = (code: string, field: string) => problems.push({ code, field, message: "" });
  const missing = (field: string) => add("VALIDATION_FAILED", field);

  if (!form.name.trim()) missing("name");
  if (!form.category) missing("category");
  if (!(form.portions >= 1)) missing("portions");
  if (form.cookTime === "") missing("cookMinutes");

  if (form.lines.length === 0) missing("recipe.ingredients");
  form.lines.forEach((l, i) => {
    const field = `recipe.ingredients[${i}]`;
    if (l.toVerify) add("INGREDIENT_TO_VERIFY", field);
    if (!l.catalogIngredientId) add("INGREDIENT_NOT_LINKED", field);
    else if (l.entryIncomplete === true) add("INGREDIENT_INCOMPLETE", field);
  });

  if (form.steps.length === 0) missing("recipe.steps");
  form.steps.forEach((st, i) => {
    if (!st.type) add("STEP_TYPE_MISSING", `recipe.steps[${i}]`);
  });

  const s = form.storage;
  if (!s.method || !s.days.trim()) missing("recipe.storage");
  if (!s.freezable) missing("recipe.storage.freezable");
  else if (s.freezable === "yes" && !s.freezerMonths.trim())
    missing("recipe.storage.freezerMonths");

  if (form.reheat.modes.length === 0) missing("recipe.reheating");
  if (!form.reheat.note.trim()) missing("recipe.reheating.note");

  for (const p of saved?.problems ?? []) if (SERVER_ONLY.has(p.code)) problems.push(p);

  const toPublish: Problem[] = [];
  if (!form.description.trim())
    toPublish.push({ code: "VALIDATION_FAILED", field: "description", message: "" });
  if (form.lines.length > 0 && form.lines.every((l) => l.hiddenFromClient === true))
    toPublish.push({ code: "VALIDATION_FAILED", field: "recipe.ingredients", message: "" });
  if (!form.imageUrl.trim()) toPublish.push({ code: "PHOTO_MISSING", field: "imageUrl", message: "" });

  return {
    ready: problems.length === 0,
    problems,
    toPublish,
    warnings: (saved?.warnings ?? []).filter((w) => SERVER_ONLY.has(w.code)),
  };
}
