"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiFetch } from "./client";
import type { PageMeta } from "./types";

/* ─────────────────────────────────────────────────────────────────────────────
   Le catalogue Lab's Food, côté console.

   Deux patrimoines distincts, qu'il ne faut pas confondre :

   - **les plats Lab's Food** (`/admin/meals`) : écrits par la maison. Un plat
     `published` peut entrer dans une semaine de menu ou être proposé à un
     batch cooker. `chefProfileId` y vaut toujours `null`.
   - **le contenu des batch cookers** (`/admin/dishes`, `/admin/menus/{id}/…`) :
     écrit par eux, que la console ne crée pas et ne modifie pas — elle le
     relit, le suspend, ou lève la suspension. Voir `moderation.ts`.

   Les réponses de liste ne sont pas documentées dans le Swagger (`200` sans
   schéma) sauf pour `/admin/meals`. On accepte donc indifféremment un tableau
   nu ou l'enveloppe `{ data, meta }` : le jour où l'API tranche, rien ne casse.
   ───────────────────────────────────────────────────────────────────────────── */

export type MealStatus = "draft" | "published" | "archived";
export type Continent = "africa" | "americas" | "asia" | "europe" | "middle_east";
export type Difficulty = "easy" | "medium" | "hard";
export type DishCategory = "starter" | "main" | "side" | "dessert";
export type MenuPeriod = "week" | "month";

export interface Ingredient {
  name: string;
  qty?: number | string | null;
  unit?: string | null;
  aisle?: string | null;
  /** Où l'acheter, ou ce que c'est : une adresse `http(s)`. */
  link?: string | null;
  /** À vérifier (recette importée) : empêche « Prête ». */
  toVerify?: boolean;
  /** La même quantité quel que soit le nombre de portions (§4.12). */
  fixedQuantity?: boolean;
  /** L'entrée de la liste commune (§4.10) : régimes et saisons s'en calculent. */
  catalogIngredientId?: string | null;
}

/** Une entrée de la liste commune d'ingrédients (§4.10). */
export interface CatalogIngredient {
  id: string;
  name: string;
  /** Autres noms, en minuscules. */
  aliases: string[];
  /** Codes de `GET /referentials/computed-diets`. */
  diets: string[];
  /** Mois 1 à 12 ; vide : pas de saison. */
  seasonMonths: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CatalogIngredientInput {
  name?: string;
  aliases?: string[];
  diets?: string[];
  seasonMonths?: number[];
}

/** Une étape (§4.5) : sans type, la fiche n'est pas « Prête ». */
export interface Step {
  order?: number;
  text: string;
  type: string | null;
  durationMinutes: number | null;
}

/** §4.6 : les modes viennent de la liste réglée dans Paramètres. */
export interface Reheating {
  modes?: string[];
  /** Le premier des modes, pour les fiches écrites avant la liste. */
  mode?: string | null;
  temperature?: number | null;
  minutes?: number | null;
  note?: string | null;
  container?: string | null;
}

/** Un point qui manque, tel que l'API le nomme (`field` désigne le champ). */
export interface Problem {
  code: string;
  field: string;
  message: string;
}

/** Recettes §4.11, calculé par l'API. */
export interface Readiness {
  ready: boolean;
  problems: Problem[];
  toPublish: Problem[];
  warnings: Problem[];
}

export interface Storage {
  method?: string | null;
  days?: number | null;
  container?: string | null;
}

/** `MealResponseDto` — un plat de la maison. */
export interface Meal {
  id: string;
  /** `null` sur ces routes : un plat Lab's Food n'a pas de propriétaire chef. */
  chefProfileId: string | null;
  /** Attribution seule : n'ouvre aucun droit d'édition. */
  createdByUserId: string | null;
  /** Renseigné quand le plat est réservé à un batch cooker (`/offer`). */
  offeredToChefProfileId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  continent: Continent | null;
  /** ISO 3166-1 alpha-2 — colore la carte culinaire du client. */
  country: string | null;
  portions: number | null;
  /** Minutes. */
  prepTime: number;
  cookTime: number | null;
  dietaryTags: string[];
  allergens: string[];
  allergensNone: boolean;
  customDiets: string[];
  customAllergens: string[];
  category: DishCategory | null;
  reheating: Reheating | null;
  storage: Storage | null;
  publishedAt: string | null;
  calories: number | null;
  difficulty: Difficulty | null;
  /**
   * Documenté comme `object` : les plats écrits avant le changement de format
   * peuvent porter autre chose qu'une liste de `{ name, qty, unit }`. Passer
   * par `ingredientLines()` plutôt que d'itérer à l'aveugle.
   */
  ingredients: unknown;
  /** `Step[]` ; texte seul pour une fiche écrite avant les types (lire par `readSteps`). */
  steps: unknown;
  /** Texte libre, jamais contrôlé (§4.7). */
  equipment?: string[];
  /** Pour la maison, l'enregistrement vaut confirmation, si des allergènes sont déclarés. */
  allergensVerifiedAt?: string | null;
  recipeVersion?: number;
  readiness?: Readiness;
  /** §4.8 : halal, casher, déclarés. */
  declaredDiets?: string[];
  profiles?: string[];
  /** Mois choisis à la place du calcul ; vide : aucun. */
  seasonsOverride?: number[];
  /** Calculé d'après la liste commune ; null tant qu'une ligne n'y est pas reliée. */
  classification?: { diets: string[]; seasonMonths: number[] } | null;
  isFeatured: boolean;
  status: MealStatus;
  createdAt: string;
  updatedAt: string;
}

/** Corps de `POST /admin/meals` — seuls `name` et `prepTime` sont exigés. */
export interface MealInput {
  name: string;
  prepTime: number;
  description?: string | null;
  dietaryTags?: string[];
  customDiets?: string[];
  allergens?: string[];
  allergensNone?: boolean;
  customAllergens?: string[];
  ingredients?: Ingredient[];
  category?: DishCategory | null;
  cookTime?: number | null;
  reheating?: Reheating | null;
  storage?: Storage | null;
  imageUrl?: string | null;
  continent?: Continent | null;
  country?: string | null;
  portions?: number | null;
  calories?: number | null;
  difficulty?: Difficulty | null;
  steps?: Step[];
  equipment?: string[];
  declaredDiets?: string[];
  profiles?: string[];
  seasonsOverride?: number[];
  isFeatured?: boolean;
  status?: MealStatus;
}

/** Un menu Lab's Food : un assemblage ordonné de plats de la maison. */
export interface LabsFoodMenu {
  id: string;
  title: string;
  pitch: string | null;
  period: MenuPeriod | null;
  shoppingIncluded: boolean;
  status: MealStatus;
  /** Photo de couverture, depuis `POST /admin/menus/{id}/photo/*`. */
  imageUrl?: string | null;
  offeredToChefProfileId?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Soit les plats dépliés, soit rien — auquel cas `dishIds` fait foi. */
  dishes?: Array<Pick<Meal, "id" | "name" | "imageUrl" | "country" | "status">>;
  dishIds?: string[];
}

export interface LabsFoodMenuInput {
  title: string;
  pitch?: string | null;
  period?: MenuPeriod;
  shoppingIncluded?: boolean;
  /** Dans l'ordre d'affichage. Des ids de `GET /admin/meals`. */
  dishIds?: string[];
  status?: MealStatus;
}

/** Une semaine de menu : l'ardoise publique d'une semaine ISO. */
export interface MenuWeek {
  id: string;
  year: number;
  weekNumber: number;
  status?: MealStatus;
  startDate?: string | null;
  endDate?: string | null;
  mealIds?: string[];
  meals?: Array<Pick<Meal, "id" | "name" | "imageUrl" | "country">>;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuWeekInput {
  year: number;
  weekNumber: number;
  mealIds?: string[];
}

/* ── Lecture tolérante ─────────────────────────────────────────────────────── */

/**
 * Extrait la liste d'une réponse, qu'elle arrive nue ou enveloppée. Les clés
 * sont celles que l'API utilise déjà ailleurs (`data`, et le nom de la
 * ressource pour les référentiels).
 */
export function unwrapList<T>(res: unknown, ...keys: string[]): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === "object") {
    const o = res as Record<string, unknown>;
    for (const k of ["data", "items", ...keys]) {
      if (Array.isArray(o[k])) return o[k] as T[];
    }
  }
  return [];
}

/** La pagination, si la réponse en porte une. */
export function unwrapMeta(res: unknown): PageMeta | null {
  if (res && typeof res === "object") {
    const meta = (res as Record<string, unknown>).meta;
    if (meta && typeof meta === "object") return meta as PageMeta;
  }
  return null;
}

/**
 * Les ingrédients tels qu'ils sont lisibles, quel que soit le format stocké :
 * liste d'objets `{ name, qty, unit }`, liste de chaînes, ou dictionnaire des
 * tout premiers plats. Retourne une ligne par ingrédient.
 */
export function ingredientLines(raw: unknown): string[] {
  const asLine = (v: unknown): string | null => {
    if (typeof v === "string") return v.trim() || null;
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    if (!name) return null;
    const qty = o.qty == null || o.qty === "" ? "" : String(o.qty);
    const unit = typeof o.unit === "string" ? o.unit : "";
    const amount = [qty, unit].filter(Boolean).join(" ");
    return amount ? `${name} — ${amount}` : name;
  };

  if (Array.isArray(raw)) {
    return raw.map(asLine).filter((l): l is string => l !== null);
  }
  if (raw && typeof raw === "object") {
    const items = (raw as Record<string, unknown>).items;
    if (Array.isArray(items)) {
      return items.map(asLine).filter((l): l is string => l !== null);
    }
    return Object.entries(raw as Record<string, unknown>)
      .map(([k, v]) => (v == null || v === "" ? k : `${k} — ${String(v)}`))
      .filter(Boolean);
  }
  return [];
}

/* ── Clés de cache ─────────────────────────────────────────────────────────── */

const MEALS = ["admin", "meals"] as const;
const MENUS = ["admin", "labsfood-menus"] as const;
const WEEKS = ["admin", "menu-weeks"] as const;

/* ── Plats Lab's Food ──────────────────────────────────────────────────────── */

/**
 * `GET /admin/meals` — toute la bibliothèque, sans pagination côté API.
 *
 * `enabled: false` garde la requête en sommeil sans changer sa clé : la
 * palette de recherche s'en sert pour ne charger ses sources qu'à l'ouverture,
 * tout en partageant le cache des écrans.
 */
export function useMeals({ enabled }: { enabled?: boolean } = {}) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: MEALS,
    queryFn: async () => unwrapList<Meal>(await apiFetch<unknown>("/admin/meals"), "meals"),
    enabled: enabled ?? true,
  });
}

function useCatalogMutation<TInput, TOut>(
  run: (apiFetch: ReturnType<typeof useApiFetch>, input: TInput) => Promise<TOut>,
  keys: readonly (readonly string[])[],
) {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => run(apiFetch, input),
    onSuccess: () => {
      for (const key of keys) qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** `POST /admin/meals` */
export function useCreateMeal() {
  return useCatalogMutation<MealInput, Meal>(
    (apiFetch, body) => apiFetch<Meal>("/admin/meals", { method: "POST", body }),
    [MEALS, MENUS, WEEKS],
  );
}

/**
 * `PATCH /admin/meals/{id}`
 *
 * `409 OFFER_PENDING` : le plat est réservé à un batch cooker. Retirer l'offre
 * avant de le modifier — sinon on changerait sous ses yeux ce qu'il a accepté.
 */
export function useUpdateMeal() {
  return useCatalogMutation<{ id: string; patch: Partial<MealInput> }, Meal>(
    (apiFetch, { id, patch }) =>
      apiFetch<Meal>(`/admin/meals/${id}`, { method: "PATCH", body: patch }),
    [MEALS, MENUS, WEEKS],
  );
}

/**
 * `DELETE /admin/meals/{id}`
 *
 * `409` si le plat a déjà été commandé : l'API refuse d'effacer une trace
 * comptable. Il faut l'archiver (`status: "archived"`) à la place.
 */
export function useDeleteMeal() {
  return useCatalogMutation<string, void>(
    (apiFetch, id) => apiFetch<void>(`/admin/meals/${id}`, { method: "DELETE" }),
    [MEALS, MENUS, WEEKS],
  );
}

/**
 * `POST /admin/meals/{id}/offer` — réserve le plat à un batch cooker.
 * `409 MEAL_IN_MENU` : le plat appartient à un menu Lab's Food ; c'est le menu
 * entier qui se propose, pas une de ses pièces.
 */
export function useOfferMeal() {
  return useCatalogMutation<{ id: string; chefProfileId: string }, unknown>(
    (apiFetch, { id, chefProfileId }) =>
      apiFetch<unknown>(`/admin/meals/${id}/offer`, {
        method: "POST",
        body: { chefProfileId },
      }),
    [MEALS],
  );
}

/** `DELETE /admin/meals/{id}/offer` */
export function useWithdrawMealOffer() {
  return useCatalogMutation<string, void>(
    (apiFetch, id) =>
      apiFetch<void>(`/admin/meals/${id}/offer`, { method: "DELETE" }),
    [MEALS],
  );
}

/* ── Menus Lab's Food ──────────────────────────────────────────────────────── */

/** `GET /admin/menus` */
export function useLabsFoodMenus({ enabled }: { enabled?: boolean } = {}) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: MENUS,
    queryFn: async () =>
      unwrapList<LabsFoodMenu>(await apiFetch<unknown>("/admin/menus"), "menus"),
    enabled: enabled ?? true,
  });
}

/** `POST /admin/menus` — `404` si un `dishIds` n'est pas un plat disponible. */
export function useCreateLabsFoodMenu() {
  return useCatalogMutation<LabsFoodMenuInput, LabsFoodMenu>(
    (apiFetch, body) =>
      apiFetch<LabsFoodMenu>("/admin/menus", { method: "POST", body }),
    [MENUS, MEALS],
  );
}

/** `PATCH /admin/menus/{id}` — `409 OFFER_PENDING` comme pour un plat. */
export function useUpdateLabsFoodMenu() {
  return useCatalogMutation<
    { id: string; patch: Partial<LabsFoodMenuInput> },
    LabsFoodMenu
  >(
    (apiFetch, { id, patch }) =>
      apiFetch<LabsFoodMenu>(`/admin/menus/${id}`, { method: "PATCH", body: patch }),
    [MENUS, MEALS],
  );
}

/** `DELETE /admin/menus/{id}` */
export function useDeleteLabsFoodMenu() {
  return useCatalogMutation<string, void>(
    (apiFetch, id) => apiFetch<void>(`/admin/menus/${id}`, { method: "DELETE" }),
    [MENUS, MEALS],
  );
}

/** `POST /admin/menus/{id}/offer` */
export function useOfferLabsFoodMenu() {
  return useCatalogMutation<{ id: string; chefProfileId: string }, unknown>(
    (apiFetch, { id, chefProfileId }) =>
      apiFetch<unknown>(`/admin/menus/${id}/offer`, {
        method: "POST",
        body: { chefProfileId },
      }),
    [MENUS],
  );
}

/** `DELETE /admin/menus/{id}/offer` */
export function useWithdrawLabsFoodMenuOffer() {
  return useCatalogMutation<string, void>(
    (apiFetch, id) =>
      apiFetch<void>(`/admin/menus/${id}/offer`, { method: "DELETE" }),
    [MENUS],
  );
}

/* ── Semaines de menu ──────────────────────────────────────────────────────── */

/** `GET /admin/menu-weeks` */
export function useMenuWeeks() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: WEEKS,
    queryFn: async () =>
      unwrapList<MenuWeek>(await apiFetch<unknown>("/admin/menu-weeks"), "weeks", "menuWeeks"),
  });
}

/** `POST /admin/menu-weeks` — `404` si un `mealIds` n'est pas un plat. */
export function useCreateMenuWeek() {
  return useCatalogMutation<MenuWeekInput, MenuWeek>(
    (apiFetch, body) =>
      apiFetch<MenuWeek>("/admin/menu-weeks", { method: "POST", body }),
    [WEEKS],
  );
}

/**
 * `PATCH /admin/menu-weeks/{id}` — arrivé le 16/10.
 *
 * Une semaine se corrigeait en la recomposant : l'API ne savait que créer.
 * Trois choses à savoir maintenant qu'elle sait modifier :
 *
 * - `mealIds` **remplace** la liste, il n'y ajoute pas. `{ mealIds: [] }` vide
 *   l'ardoise ;
 * - changer `year` ou `weekNumber` déplace la semaine, et `409 MENU_WEEK_EXISTS`
 *   si l'autre semaine a déjà son menu ;
 * - seuls des plats Lab's Food peuvent y figurer (`403 CONTENT_NOT_OWNED`).
 */
export function useUpdateMenuWeek() {
  return useCatalogMutation<
    { id: string; patch: Partial<MenuWeekInput> },
    MenuWeek
  >(
    (apiFetch, { id, patch }) =>
      apiFetch<MenuWeek>(`/admin/menu-weeks/${id}`, { method: "PATCH", body: patch }),
    [WEEKS, MEALS],
  );
}

/**
 * `DELETE /admin/menu-weeks/{id}` — définitif.
 *
 * Les plats restent au catalogue : seule leur place sur cette ardoise
 * disparaît.
 */
export function useDeleteMenuWeek() {
  return useCatalogMutation<string, void>(
    (apiFetch, id) =>
      apiFetch<void>(`/admin/menu-weeks/${id}`, { method: "DELETE" }),
    [WEEKS],
  );
}

/* ── Dates ISO d'une semaine ───────────────────────────────────────────────── */

/**
 * Le lundi et le dimanche d'une semaine ISO. L'API ne renvoie que l'année et
 * le numéro ; la console affiche des dates, elle les calcule donc elle-même.
 */
export function isoWeekRange(year: number, week: number): { start: Date; end: Date } {
  // Le 4 janvier appartient toujours à la semaine 1 (ISO 8601).
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7; // dimanche = 7
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);

  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start, end };
}

/** La semaine ISO d'aujourd'hui — sert à repérer la semaine en cours. */
export function currentIsoWeek(): { year: number; week: number } {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayOfWeek = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek); // le jeudi de la semaine
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/* ── La liste commune d'ingrédients (module Recettes §4.10) ────────────────── */

const INGREDIENTS = ["admin", "ingredients"] as const;

/** `GET /admin/ingredients` — par nom, cinquante par page. */
export function useCatalogIngredients(search: string, page: number) {
  const apiFetch = useApiFetch();
  const q = search.trim();
  return useQuery({
    queryKey: [...INGREDIENTS, q, page],
    queryFn: () =>
      apiFetch<{ data: CatalogIngredient[]; meta: PageMeta }>(
        `/admin/ingredients?limit=50&page=${page}${q ? `&search=${encodeURIComponent(q)}` : ""}`,
      ),
  });
}

/** `GET /ingredients?search=` — les suggestions d'un formulaire, dès deux lettres. */
export function useIngredientSearch(term: string) {
  const apiFetch = useApiFetch();
  const q = term.trim();
  return useQuery({
    queryKey: ["ingredients", q.toLowerCase()],
    queryFn: () =>
      apiFetch<CatalogIngredient[]>(`/ingredients?search=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}

/** `POST /admin/ingredients` — 409 si le nom existe déjà, quelle que soit la casse. */
export function useCreateCatalogIngredient() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CatalogIngredientInput) =>
      apiFetch<CatalogIngredient>("/admin/ingredients", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: INGREDIENTS }),
  });
}

/**
 * `PATCH /admin/ingredients/{id}` — les plats qui relient l'ingrédient sont
 * reclassés par l'API.
 */
export function useUpdateCatalogIngredient() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CatalogIngredientInput }) =>
      apiFetch<CatalogIngredient>(`/admin/ingredients/${id}`, { method: "PATCH", body: patch }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INGREDIENTS });
      qc.invalidateQueries({ queryKey: ["ingredients"] });
    },
  });
}
