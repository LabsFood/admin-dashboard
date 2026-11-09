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

import type { Ingredient, Reheating, Step, Storage } from "@/lib/api/catalog";

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

/**
 * Les rayons, par identifiant.
 *
 * Ce ne sont pas des libellés : la liste de courses d'une prestation
 * (`GET /chef-missions/{id}/shopping-list`) groupe **par la chaîne stockée**,
 * et les exemples de l'API écrivent `boucherie`, `fruits-legumes`. Écrire
 * « Boucherie » ici et `boucherie` là-bas, c'est deux rayons pour la même
 * allée. Aucun référentiel ne les expose : ces valeurs sont notre convention,
 * alignée sur ce que le backend écrit déjà.
 */
export const AISLE_LABEL: Record<string, string> = {
  "fruits-legumes": "Fruits et légumes",
  boucherie: "Boucherie",
  poissonnerie: "Poissonnerie",
  cremerie: "Crèmerie",
  "epicerie-salee": "Épicerie salée",
  "epicerie-sucree": "Épicerie sucrée",
  boulangerie: "Boulangerie",
  surgeles: "Surgelés",
  boissons: "Boissons",
};

/** Dans l'ordre d'un parcours en magasin. */
export const AISLES = Object.keys(AISLE_LABEL);

/** Le libellé d'un rayon, ou la valeur telle quelle si elle nous est inconnue. */
export const aisleLabel = (code?: string | null) =>
  code ? (AISLE_LABEL[code] ?? code) : null;

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
/** Les modes d'une fiche : la liste, ou le mode unique d'avant (§4.6). */
export const reheatModesOf = (r?: Reheating | null): string[] =>
  r?.modes?.length ? r.modes : r?.mode ? [r.mode] : [];

export function reheatingLine(
  r?: Reheating | null,
  modes: { code: string; label: string }[] = REHEAT_MODES,
): string | null {
  const codes = reheatModesOf(r);
  if (codes.length === 0) return null;
  return [
    codes.map((c) => labelOf(modes, c)).join(" ou "),
    r?.temperature != null ? `${r.temperature} °C` : null,
    r?.minutes != null ? `${r.minutes} min` : null,
    r?.container ? `dans ${r.container}` : null,
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
    link: i.link?.trim() && linkValid(i.link) ? i.link.trim() : null,
    toVerify: i.toVerify ?? false,
    fixedQuantity: i.fixedQuantity ?? false,
    catalogIngredientId: i.catalogIngredientId ?? null,
  }));
}

export const MONTHS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

/** « Toute l'année », « juin à sept. », ou les mois un à un. */
export function seasonsLine(months: number[] | null | undefined): string | null {
  if (!months) return null;
  if (months.length === 0) return "Hors saison";
  if (months.length === 12) return "Toute l'année";
  const sorted = [...months].sort((a, b) => a - b);
  const suivis = sorted.every((m, i) => i === 0 || m === sorted[i - 1] + 1);
  return suivis && sorted.length > 2
    ? `${MONTHS[sorted[0] - 1]} à ${MONTHS[sorted[sorted.length - 1] - 1]}`
    : sorted.map((m) => MONTHS[m - 1]).join(", ");
}

/** Une adresse que l'API acceptera : `http` ou `https`, rien d'autre. */
export const linkValid = (link?: string | null) =>
  !link?.trim() || /^https?:\/\/\S+$/i.test(link.trim());

/** Le réchauffage s'enregistre dès qu'un mode est coché : le reste est facultatif. */
export function cleanReheating(r: {
  modes: string[];
  temperature: string;
  minutes: string;
  note: string;
  container: string;
}): Reheating | null {
  if (r.modes.length === 0) return null;
  return {
    modes: r.modes,
    minutes: r.minutes.trim() ? Number(r.minutes) : null,
    temperature: r.temperature.trim() ? Number(r.temperature) : null,
    note: r.note.trim() || null,
    container: r.container.trim() || null,
  };
}

/** Une étape en cours de saisie : la durée reste une chaîne. */
export interface StepRow {
  text: string;
  type: string;
  minutes: string;
}

/**
 * Les étapes telles que stockées : des `Step`, ou du texte seul pour une fiche
 * écrite avant les types. Ce qui n'est ni l'un ni l'autre est ignoré.
 */
export function readSteps(raw: unknown): Step[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((s): Step[] => {
    if (typeof s === "string") return s.trim() ? [{ text: s, type: null, durationMinutes: null }] : [];
    if (s && typeof s === "object" && typeof (s as Step).text === "string") {
      const step = s as Step;
      return [{ text: step.text, type: step.type ?? null, durationMinutes: step.durationMinutes ?? null }];
    }
    return [];
  });
}

export const toStepRow = (s: Step): StepRow => ({
  text: s.text,
  type: s.type ?? "",
  minutes: s.durationMinutes?.toString() ?? "",
});

/** Les étapes écrites, dans l'ordre : l'API les numérote. */
export const cleanSteps = (list: StepRow[]): Step[] =>
  list
    .filter((s) => s.text.trim())
    .map((s) => ({
      text: s.text.trim(),
      type: s.type || null,
      durationMinutes: s.minutes.trim() ? Number(s.minutes) : null,
    }));

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
