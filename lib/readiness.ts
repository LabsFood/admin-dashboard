/* ─────────────────────────────────────────────────────────────────────────────
   « Prête » (module Recettes §4.11), en mots — les mêmes que batchcooking-web.

   L'API nomme chaque point manquant par un `code` et un `field` : on traduit
   d'après eux, jamais d'après `message`, qui reste en anglais.
   ───────────────────────────────────────────────────────────────────────────── */

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
    case "PHOTO_MISSING":
      return "une vraie photo du plat";
    default:
      return CHAMP[p.field] ?? p.field;
  }
}
