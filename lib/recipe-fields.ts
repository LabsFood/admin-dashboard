/* ─────────────────────────────────────────────────────────────────────────────
   Le vocabulaire d'une recette : unités, rayons, réchauffage, conservation.

   Ces valeurs ne décorent pas un formulaire, elles voyagent. Un batch cooker
   qui adopte un plat de la maison hérite de sa recette telle quelle : si la
   console écrit « Boucherie » là où son espace écrit « boucherie », sa liste
   de courses se retrouve avec deux rayons pour la même allée. Les deux côtés
   écrivent donc les mêmes chaînes — c'est le seul rôle de ce fichier.

   `IngredientDto` exige ses quatre champs (`name`, `qty`, `unit`, `aisle`),
   `ReheatingDto` exige `mode` **et** `minutes`, `StorageDto` exige `method`
   **et** `days`. Un couple incomplet fait échouer tout l'enregistrement du
   plat, pas seulement la ligne fautive : d'où les deux gardes ci-dessous.
   ───────────────────────────────────────────────────────────────────────────── */

import type { Ingredient, Reheating, Storage } from "@/lib/api/catalog";

/** Unités de mesure. L'API les prend en texte libre ; la liste évite les doublons. */
export const UNITS = [
  "g",
  "kg",
  "ml",
  "cl",
  "l",
  "pièce",
  "c. à soupe",
  "c. à café",
  "pincée",
  "botte",
  "gousse",
] as const;

/** Rayons, dans l'ordre d'un parcours en magasin : la liste de courses s'y groupe. */
export const AISLES = [
  "Fruits et légumes",
  "Boucherie",
  "Poissonnerie",
  "Crèmerie",
  "Épicerie salée",
  "Épicerie sucrée",
  "Boulangerie",
  "Surgelés",
  "Boissons",
] as const;

export const REHEAT_MODES: { code: string; label: string }[] = [
  { code: "oven", label: "Four" },
  { code: "pan", label: "Poêle" },
  { code: "saucepan", label: "Casserole" },
  { code: "microwave", label: "Micro-ondes" },
  { code: "steam", label: "Vapeur" },
  { code: "bain-marie", label: "Bain-marie" },
  { code: "none", label: "Tel quel, sans réchauffer" },
];

export const STORAGE_METHODS: { code: string; label: string }[] = [
  { code: "fridge", label: "Réfrigérateur" },
  { code: "freezer", label: "Congélateur" },
  { code: "ambient", label: "Température ambiante" },
];

/**
 * Le libellé d'un code, ou le code lui-même.
 *
 * Les tout premiers plats ont pu stocker « Four » plutôt que `oven` : on
 * affiche alors ce qui est écrit au lieu d'afficher un vide.
 */
const labelOf = (liste: { code: string; label: string }[], valeur?: string | null) =>
  valeur ? (liste.find((x) => x.code === valeur)?.label ?? valeur) : null;

export const reheatModeLabel = (mode?: string | null) => labelOf(REHEAT_MODES, mode);
export const storageMethodLabel = (method?: string | null) =>
  labelOf(STORAGE_METHODS, method);

/** « Four · 160 °C · 15 min ». `null` quand il n'y a rien à dire. */
export function reheatingLine(r?: Reheating | null): string | null {
  if (!r?.mode) return null;
  return [
    reheatModeLabel(r.mode),
    r.temperature != null ? `${r.temperature} °C` : null,
    r.minutes != null ? `${r.minutes} min` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** « Réfrigérateur · 3 jours · Boîte hermétique ». */
export function storageLine(s?: Storage | null): string | null {
  if (!s?.method) return null;
  return [
    storageMethodLabel(s.method),
    s.days != null ? `${s.days} jour${s.days > 1 ? "s" : ""}` : null,
    s.container || null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/* ── Les gardes avant envoi ────────────────────────────────────────────────── */

/**
 * Une ligne d'ingrédient complète, ou rien.
 *
 * L'API exige les quatre champs. Envoyer « 200 » sans unité ferait échouer
 * l'enregistrement du plat entier : on préfère laisser tomber la ligne
 * incomplète, et l'écran dit laquelle.
 */
export function ingredientReady(i: Ingredient): boolean {
  return Boolean(
    i.name.trim() &&
      i.qty !== "" &&
      i.qty != null &&
      Number.isFinite(Number(i.qty)) &&
      i.unit?.trim() &&
      i.aisle?.trim(),
  );
}

/** Les lignes envoyables, `qty` en nombre comme l'API l'attend. */
export function cleanIngredients(list: Ingredient[]): Ingredient[] {
  return list.filter(ingredientReady).map((i) => ({
    name: i.name.trim(),
    qty: Number(i.qty),
    unit: (i.unit ?? "").trim(),
    aisle: (i.aisle ?? "").trim(),
  }));
}

/** `null` tant que le couple exigé n'est pas complet. */
export function cleanReheating(r: {
  mode: string;
  temperature: string;
  minutes: string;
  note: string;
}): Reheating | null {
  if (!r.mode || !r.minutes.trim()) return null;
  return {
    mode: r.mode,
    minutes: Number(r.minutes),
    temperature: r.temperature.trim() ? Number(r.temperature) : null,
    note: r.note.trim() || null,
  };
}

export function cleanStorage(s: {
  method: string;
  days: string;
  container: string;
}): Storage | null {
  if (!s.method || !s.days.trim()) return null;
  return {
    method: s.method,
    days: Number(s.days),
    container: s.container.trim() || null,
  };
}
