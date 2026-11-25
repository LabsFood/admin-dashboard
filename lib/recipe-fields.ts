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

/** Une unité de ligne (§4.12), telle que `GET /referentials/units` la sert. */
export interface UnitItem {
  code: string;
  label: string;
  plural: string;
}

const unit = (code: string, label: string, plural = label): UnitItem => ({
  code,
  label,
  plural,
});

/**
 * Les 14 unités d'une ligne. L'API refuse tout autre code. Même table que
 * `dishes/domain/units.rules.ts` et que l'espace des batch cookers.
 */
export const UNITS: UnitItem[] = [
  unit("g", "g"),
  unit("kg", "kg"),
  unit("ml", "ml"),
  unit("cl", "cl"),
  unit("l", "l"),
  unit("tsp", "c. à café"),
  unit("tbsp", "c. à soupe"),
  unit("piece", "pièce", "pièces"),
  unit("clove", "gousse", "gousses"),
  unit("bunch", "botte", "bottes"),
  unit("slice", "tranche", "tranches"),
  unit("leaf", "feuille", "feuilles"),
  unit("pinch", "pincée", "pincées"),
  unit("to_taste", "selon le goût"),
];

export const UNIT_CODES = UNITS.map((u) => u.code);
export const TO_TASTE = "to_taste";

/** Les unités qui se comptent entières : toujours l'unité au-dessus. */
const WHOLE = new Set(["piece", "clove", "bunch", "slice", "leaf", "pinch"]);

/** EPSILON pour que 1,005 donne 1,01 et non 1. */
const roundTo = (qty: number, step: number) =>
  Math.round((qty + Number.EPSILON) / step) * step;

const decimals = (qty: number, places: number) => {
  const factor = 10 ** places;
  return Math.round((qty + Number.EPSILON) * factor) / factor;
};

/**
 * L'arrondi d'affichage, seul endroit où l'on arrondit : la table de l'API
 * (`roundForDisplay`, dans `dishes/domain/units.rules.ts`), à l'identique.
 *
 * Les valeurs de son test, à garder vraies (la console n'a pas de lanceur de tests) :
 *   piece 2.1 -> 3        clove 0.4 -> 1
 *   g 7.46 -> 7.5         g 46.4 -> 46        g 132.4 -> 130      g 133 -> 135
 *   ml 99.5 -> 100        kg 1.255 -> 1.26
 *   tsp 0.2 -> 0.5        tsp 1.3 -> 1.5      tbsp 1.2 -> 1
 *   (1.5, 'kg') -> '1,5 kg'      (2, 'clove') -> '2 gousses'
 *   (1, 'clove') -> '1 gousse'   (null, 'to_taste') -> 'selon le goût'
 */
export function roundForDisplay(qty: number, unitCode: string): number {
  if (WHOLE.has(unitCode)) return Math.ceil(qty - 1e-9);
  switch (unitCode) {
    case "g":
    case "ml":
      if (qty < 10) return decimals(qty, 1);
      if (qty <= 100) return Math.round(qty);
      return roundTo(qty, 5);
    case "kg":
    case "l":
    case "cl":
      return decimals(qty, 2);
    case "tsp":
    case "tbsp":
      return Math.max(0.5, roundTo(qty, 0.5));
    case TO_TASTE:
      return 0;
    default:
      return decimals(qty, 2);
  }
}

/** « 1,5 kg », « 2 gousses », « selon le goût » : jamais de nombre pour ce dernier. */
export function displayQuantity(qty: number | null, unitCode: string | null): string {
  if (unitCode === TO_TASTE) return "selon le goût";
  const known = UNITS.find((u) => u.code === unitCode);
  if (qty == null) return known?.label ?? unitCode ?? "";
  const rounded = roundForDisplay(qty, unitCode ?? "");
  const number = String(rounded).replace(".", ",");
  const label = known ? (rounded >= 2 ? known.plural : known.label) : (unitCode ?? "");
  return label ? `${number} ${label}` : number;
}

/** Le libellé d'une unité, ou le code lui-même quand il est inconnu. */
export const unitLabel = (code?: string | null) =>
  code ? (UNITS.find((u) => u.code === code)?.label ?? code) : "";

/**
 * Une unité écrite avant les 14 codes (« pièce », « c. à soupe »…) lue comme
 * un code ; `null` quand elle n'en est aucun.
 */
export function unitFromText(text?: string | null): string | null {
  if (!text) return null;
  if (UNIT_CODES.includes(text)) return text;
  const fold = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
  const aliases: Record<string, string[]> = {
    g: ["gr", "gramme", "grammes"],
    kg: ["kilo", "kilos", "kilogramme", "kilogrammes"],
    ml: ["millilitre", "millilitres"],
    cl: ["centilitre", "centilitres"],
    l: ["litre", "litres"],
    tsp: ["cac", "c a c", "c a cafe", "cuillere a cafe", "cuilleres a cafe"],
    tbsp: ["cas", "c a s", "c a soupe", "cuillere a soupe", "cuilleres a soupe"],
    piece: ["", "piece", "pieces", "pc", "pcs", "u", "unite", "unites"],
    clove: ["gousse", "gousses"],
    bunch: ["botte", "bottes"],
    slice: ["tranche", "tranches"],
    leaf: ["feuille", "feuilles"],
    pinch: ["pincee", "pincees"],
    to_taste: ["selon le gout", "au gout", "a volonte"],
  };
  return Object.entries(aliases).find(([, list]) => list.includes(fold))?.[0] ?? null;
}

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
  boulangerie: "Boulangerie",
  boucherie: "Boucherie",
  poissonnerie: "Poissonnerie",
  cremerie: "Crèmerie",
  fromages: "Fromages",
  "epicerie-salee": "Épicerie salée",
  conserves: "Conserves",
  epices: "Épices",
  "epicerie-sucree": "Épicerie sucrée",
  boissons: "Boissons",
  "non-alimentaire": "Non alimentaire",
  surgeles: "Surgelés",
};

/**
 * Le libellé d'un rayon. La liste réglée dans Paramètres (`useAisles`) fait foi
 * quand on la passe ; sinon les 13 rayons par défaut ; sinon le code tel quel.
 */
export const aisleLabel = (
  code?: string | null,
  list?: { code: string; label: string }[],
) =>
  code ? (list?.find((a) => a.code === code)?.label ?? AISLE_LABEL[code] ?? code) : null;

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
    s.freezable === true
      ? s.freezerMonths != null
        ? `congelable ${s.freezerMonths} mois`
        : "congelable"
      : s.freezable === false
        ? "ne se congèle pas"
        : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/* ── Les gardes avant envoi ────────────────────────────────────────────────── */

/**
 * Une ligne en cours de saisie. Les champs sont tenus en chaînes pour qu'un
 * champ vidé reste vide au lieu de retomber sur 0 ; `cleanLines` les convertit
 * en vrais nombres et booléens, comme l'API les exige.
 */
export interface LineRow {
  name: string;
  qty: string;
  unit: string;
  /** Le rayon, seulement pour une ligne non reliée : sinon c'est celui de l'entrée. */
  aisle: string;
  link: string;
  toVerify: boolean;
  fixedQuantity: boolean;
  catalogIngredientId: string | null;
  optional: boolean;
  precision: string;
  preparation: string;
  group: string;
  /** `undefined` : l'API décide d'après l'entrée (ingrédient de base : masqué). */
  hiddenFromClient: boolean | undefined;
  rawText: string | null;
  /**
   * Ce que l'on sait des allergènes de l'entrée reliée : le cachet de l'API sur
   * la ligne enregistrée, ou la fiche de l'entrée choisie. Jamais renvoyé à l'API :
   * il ne sert qu'à l'aperçu du brouillon. `undefined` : inconnu.
   */
  entryAllergens?: string[];
  entryIncomplete?: boolean;
}

export const LINE_LIMITS = { name: 120, precision: 60, preparation: 120, group: 60 } as const;
export const MAX_LINES = 60;

export const emptyLine = (): LineRow => ({
  name: "",
  qty: "",
  unit: "g",
  aisle: "",
  link: "",
  toVerify: false,
  fixedQuantity: false,
  catalogIngredientId: null,
  optional: false,
  precision: "",
  preparation: "",
  group: "",
  hiddenFromClient: undefined,
  rawText: null,
});

/** Une ligne telle que l'API l'a stockée (ou un reste d'avant le format), prête à éditer. */
export function toLineRow(raw: unknown): LineRow | null {
  if (typeof raw === "string") return raw.trim() ? { ...emptyLine(), name: raw.trim(), unit: "" } : null;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name : "";
  if (!name.trim()) return null;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const code = typeof o.unit === "string" ? unitFromText(o.unit) : null;
  return {
    name,
    qty: typeof o.qty === "number" || typeof o.qty === "string" ? String(o.qty) : "",
    unit: code ?? "",
    aisle: str(o.aisle),
    link: str(o.link),
    toVerify: o.toVerify === true,
    fixedQuantity: o.fixedQuantity === true,
    catalogIngredientId: typeof o.catalogIngredientId === "string" ? o.catalogIngredientId : null,
    optional: o.optional === true,
    precision: str(o.precision),
    preparation: str(o.preparation),
    group: str(o.group),
    hiddenFromClient: typeof o.hiddenFromClient === "boolean" ? o.hiddenFromClient : undefined,
    rawText: typeof o.rawText === "string" ? o.rawText : null,
    entryAllergens: Array.isArray(o.allergens)
      ? o.allergens.filter((a): a is string => typeof a === "string")
      : undefined,
    entryIncomplete: typeof o.incomplete === "boolean" ? o.incomplete : undefined,
  };
}

/** L'aperçu des allergènes d'un brouillon (R31) : ce que l'enregistrement va juger. */
export interface DraftAllergens {
  /** Apportés par une ligne obligatoire, ou ajoutés à la main. */
  firm: string[];
  /** Apportés seulement par des lignes facultatives. */
  conditional: string[];
  /** Lignes non reliées à la liste commune. */
  unlinked: number;
  /** Lignes reliées dont la fiche est à compléter, ou dont les allergènes ne sont pas connus. */
  incompleteEntries: number;
  /** Vrai si l'enregistrement ne vaudra pas vérification. */
  incomplete: boolean;
}

/**
 * Même union que le calcul de l'API (lignes reliées + `addedAllergens`),
 * refaite côté client pour le brouillon. L'API reste l'autorité : elle
 * recalcule à l'enregistrement.
 */
export function draftAllergens(lines: LineRow[], added: string[]): DraftAllergens {
  const firm = new Set(added);
  const optionalOnly = new Set<string>();
  let unlinked = 0;
  let incompleteEntries = 0;
  for (const l of lines) {
    if (lineBlank(l)) continue;
    if (!l.catalogIngredientId) {
      unlinked += 1;
      continue;
    }
    if (l.entryIncomplete === true || l.entryAllergens === undefined) incompleteEntries += 1;
    for (const a of l.entryAllergens ?? []) {
      if (l.optional) optionalOnly.add(a);
      else firm.add(a);
    }
  }
  const conditional = [...optionalOnly].filter((a) => !firm.has(a));
  return {
    firm: [...firm],
    conditional,
    unlinked,
    incompleteEntries,
    incomplete: unlinked > 0 || incompleteEntries > 0,
  };
}

/** Les plats écrits avant le format peuvent porter autre chose qu'une liste de lignes. */
export function readLineRows(raw: unknown): LineRow[] {
  if (Array.isArray(raw)) return raw.map(toLineRow).filter((l): l is LineRow => l !== null);
  if (raw && typeof raw === "object") {
    const items = (raw as Record<string, unknown>).items;
    if (Array.isArray(items)) return readLineRows(items);
  }
  return [];
}

/** Une ligne dont aucun champ n'a été touché : elle ne compte pas. */
export const lineBlank = (l: LineRow) =>
  !l.name.trim() &&
  !l.qty.trim() &&
  !l.precision.trim() &&
  !l.preparation.trim() &&
  !l.group.trim() &&
  !l.link.trim();

/**
 * Pourquoi l'API refuserait cette ligne, en français ; `null` si elle passe.
 * Mêmes règles que `lineInputProblems` : unité obligatoire, quantité au-dessus
 * de zéro (trois décimales) sauf « selon le goût », sans nombre.
 */
export function lineProblem(l: LineRow): string | null {
  if (lineBlank(l)) return null;
  if (!l.name.trim()) return "Donnez un nom à l'ingrédient.";
  if (l.name.trim().length > LINE_LIMITS.name) return "Le nom est limité à 120 caractères.";
  if (!l.unit) return l.toVerify ? null : "Choisissez une unité.";
  if (!UNIT_CODES.includes(l.unit)) return "Unité inconnue.";
  if (l.unit !== TO_TASTE) {
    if (!l.qty.trim()) return l.toVerify ? null : "Indiquez une quantité.";
    const n = Number(l.qty);
    if (!Number.isFinite(n) || n <= 0) return "La quantité doit être supérieure à 0.";
    if (n > 100000) return "La quantité est limitée à 100 000.";
    if (Math.round(n * 1000) / 1000 !== n) return "Trois décimales au plus.";
  }
  if (l.precision.trim().length > LINE_LIMITS.precision) return "La précision est limitée à 60 caractères.";
  if (l.preparation.trim().length > LINE_LIMITS.preparation)
    return "La préparation est limitée à 120 caractères.";
  if (l.group.trim().length > LINE_LIMITS.group) return "Le groupe est limité à 60 caractères.";
  if (!linkValid(l.link)) return "Un lien commence par http:// ou https://.";
  return null;
}

/** Les lignes envoyables : vrais nombres, vrais booléens, `qty: null` pour « selon le goût ». */
export function cleanLines(list: LineRow[]): Ingredient[] {
  return list
    .filter((l) => !lineBlank(l))
    .map((l) => {
      const toTaste = l.unit === TO_TASTE;
      const linked = Boolean(l.catalogIngredientId);
      const line: Ingredient = {
        name: l.name.trim(),
        qty: toTaste || !l.qty.trim() ? null : Number(l.qty),
        unit: l.unit || null,
        link: l.link.trim() && linkValid(l.link) ? l.link.trim() : null,
        toVerify: l.toVerify,
        fixedQuantity: l.fixedQuantity,
        catalogIngredientId: l.catalogIngredientId,
        optional: l.optional,
        precision: l.precision.trim() || null,
        preparation: l.preparation.trim() || null,
        group: l.group.trim() || null,
      };
      // Le rayon d'une ligne reliée est celui de son entrée : on ne l'envoie pas.
      if (!linked && l.aisle.trim()) line.aisle = l.aisle.trim();
      if (l.hiddenFromClient !== undefined) line.hiddenFromClient = l.hiddenFromClient;
      if (l.rawText) line.rawText = l.rawText;
      return line;
    });
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
  const note = r.note.trim();
  return {
    modes: r.modes,
    minutes: r.minutes.trim() ? Number(r.minutes) : null,
    temperature: r.temperature.trim() ? Number(r.temperature) : null,
    // `note` est une chaîne côté API : absente plutôt que `null`.
    ...(note ? { note } : {}),
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

/** « Congelable » : `""` tant que la question n'a pas de réponse. */
export type Freezable = "" | "yes" | "no";

/** Mois au congélateur proposés dès que « se congèle : oui » est choisi (comme l'import). */
export const DEFAULT_FREEZER_MONTHS = 3;

export const freezableOf = (s?: Storage | null): Freezable =>
  s?.freezable === true ? "yes" : s?.freezable === false ? "no" : "";

export interface StorageForm {
  method: string;
  days: string;
  container: string;
  freezable: Freezable;
  freezerMonths: string;
  thawing: string;
}

export function cleanStorage(s: StorageForm): Storage | null {
  if (!s.method || !s.days.trim()) return null;
  const base: Storage = {
    method: s.method,
    days: Number(s.days),
    container: s.container.trim() || null,
  };
  // Une question sans réponse reste sans réponse : on n'envoie pas `freezable`.
  if (s.freezable === "yes") {
    return {
      ...base,
      freezable: true,
      freezerMonths: s.freezerMonths.trim() ? Number(s.freezerMonths) : null,
      thawing: s.thawing.trim() || null,
    };
  }
  if (s.freezable === "no") {
    return { ...base, freezable: false, freezerMonths: null, thawing: null };
  }
  return base;
}

/* ── Valeurs par défaut ──────────────────────────────────────────────────────
   Un champ prérempli se corrige ; un champ vide dont l'exemple grisé ressemble
   à une valeur passe pour rempli. On remplit donc, au moment où la question se
   pose, ce qu'un cuisinier répondrait le plus souvent. Toujours modifiable. */

/** Jours de conservation proposés pour chaque lieu. */
export const STORAGE_DEFAULT_DAYS: Record<string, string> = {
  fridge: "3",
  freezer: "90",
  ambient: "1",
};

/** Une nouvelle fiche de batch cooking : au réfrigérateur, trois jours. */
export const NEW_STORAGE: StorageForm = {
  method: "fridge",
  days: STORAGE_DEFAULT_DAYS.fridge,
  container: "Boîte hermétique",
  freezable: "",
  freezerMonths: "",
  thawing: "",
};

/** « Congelable : oui » : ce qu'on propose pour les deux questions qui suivent. */
export const FREEZER_DEFAULTS = {
  freezerMonths: String(DEFAULT_FREEZER_MONTHS),
  thawing: "Une nuit au réfrigérateur.",
};

/** Température et durée proposées quand on coche un mode de réchauffage. */
export const REHEAT_DEFAULTS: Record<string, { temperature?: string; minutes?: string }> = {
  oven: { temperature: "160", minutes: "15" },
  microwave: { minutes: "3" },
  pan: { minutes: "5" },
  saucepan: { minutes: "10" },
  steam: { minutes: "10" },
  "bain-marie": { minutes: "15" },
};

/**
 * Cocher ou décocher un mode. Cocher remplit les champs encore vides avec les
 * valeurs du mode ; décocher retire celles qu'il avait mises et qu'on n'a pas
 * changées, pour qu'un clic annulé ne laisse pas un réchauffage sans mode.
 */
export function toggleReheatMode<
  R extends { modes: string[]; temperature: string; minutes: string },
>(r: R, code: string): R {
  const d = REHEAT_DEFAULTS[code] ?? {};
  if (r.modes.includes(code)) {
    const modes = r.modes.filter((x) => x !== code);
    // Une valeur changée à la main reste ; une valeur proposée par ce mode passe
    // à celle d'un mode encore coché, ou se vide.
    const kept = (field: "temperature" | "minutes") => {
      if (d[field] === undefined || r[field] !== d[field]) return r[field];
      const next = modes.map((m) => REHEAT_DEFAULTS[m]?.[field]).find((v) => v !== undefined);
      return next ?? "";
    };
    return { ...r, modes, temperature: kept("temperature"), minutes: kept("minutes") };
  }
  return {
    ...r,
    modes: [...r.modes, code],
    temperature: r.temperature.trim() || (d.temperature ?? ""),
    minutes: r.minutes.trim() || (d.minutes ?? ""),
  };
}

/**
 * Changer de lieu : les jours vides, ou encore ceux proposés pour l'ancien lieu,
 * prennent ceux du nouveau. « Non précisé » retire les jours proposés.
 */
export function changeStorageMethod(s: StorageForm, method: string): StorageForm {
  const proposed = !s.days.trim() || s.days === STORAGE_DEFAULT_DAYS[s.method];
  if (!proposed) return { ...s, method };
  return { ...s, method, days: STORAGE_DEFAULT_DAYS[method] ?? "" };
}

/** Répondre « congelable » : « oui » propose les mois et la décongélation. */
export function setFreezable(s: StorageForm, freezable: Freezable): StorageForm {
  if (freezable !== "yes") return { ...s, freezable };
  return {
    ...s,
    freezable,
    freezerMonths: s.freezerMonths.trim() || FREEZER_DEFAULTS.freezerMonths,
    thawing: s.thawing.trim() || FREEZER_DEFAULTS.thawing,
  };
}

/** Une réponse de la partie conservation, quelle qu'elle soit. */
export const storageTouched = (s: StorageForm) =>
  Boolean(s.method || s.days.trim() || s.container.trim() || s.freezable);

/** Un entier de `min` à `max`, ou rien. */
export const optionalIntIn = (v: string, min: number, max: number) => {
  const t = v.trim();
  if (!t) return true;
  const n = Number(t);
  return Number.isInteger(n) && n >= min && n <= max;
};

/**
 * Exagération (guidelines § 2) : chaque champ invalide vibre une fois, en
 * 200 ms, puis le premier prend le focus. Rien ne bouge en mouvement réduit.
 */
export function shakeInvalid(
  root: HTMLElement | null,
  /** Ouvre la carte repliée qui contient le champ (accordéon), avant de le montrer. */
  reveal?: (el: HTMLElement) => void,
) {
  const els = Array.from(
    root?.querySelectorAll<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]') ?? [],
  );
  if (els.length === 0) return;
  // Un champ d'une carte repliée est caché (`hidden`) : ni visible, ni focalisable.
  if (reveal) els.forEach(reveal);
  const first = els[0];
  first.scrollIntoView({ block: "center", behavior: "auto" });
  const focusable = first.matches("input, select, textarea, button")
    ? first
    : first.querySelector<HTMLElement>("input, select, textarea, button");
  focusable?.focus({ preventScroll: true });
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (const el of els) {
    // slow-in + slow-out (EASE_MOVE) : un aller-retour amorti, 200 ms.
    el.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-5px)" },
        { transform: "translateX(5px)" },
        { transform: "translateX(-3px)" },
        { transform: "translateX(3px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 200, easing: "cubic-bezier(0.65, 0, 0.35, 1)" },
    );
  }
}

/** Pourquoi la conservation serait refusée, ou `null`. */
export function storageProblem(s: StorageForm): string | null {
  if (!storageTouched(s)) return null;
  // Dire quel champ manque : un champ vide dont l'exemple grisé ressemble à une
  // valeur (« 3 ») passe pour rempli, et l'enregistrement semble refuser sans raison.
  if (s.method && !s.days.trim())
    return "Jours de conservation : le champ est vide. Indiquez combien de jours le plat se garde, ou repassez « Conserver au » sur « Non précisé ».";
  if (!s.method && s.days.trim())
    return "Conserver au : choisissez un lieu pour les jours de conservation indiqués.";
  if (!s.method || !s.days.trim())
    return "La conservation demande un lieu (« Conserver au ») et un nombre de jours, ou aucune des réponses de cette partie.";
  const days = Number(s.days);
  if (!Number.isInteger(days) || days < 0 || days > 365)
    return "Les jours de conservation : un nombre entier de 0 à 365.";
  if (s.freezable === "yes" && s.freezerMonths.trim()) {
    const m = Number(s.freezerMonths);
    if (!Number.isInteger(m) || m < 1 || m > 24)
      return "Les mois de congélation : un nombre entier de 1 à 24.";
  }
  if (s.thawing.trim().length > 300) return "La décongélation est limitée à 300 caractères.";
  return null;
}
