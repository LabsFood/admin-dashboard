"use client";

import { useQuery } from "@tanstack/react-query";
import { useApiFetch } from "./client";

/* ─────────────────────────────────────────────────────────────────────────────
   Les listes de référence : régimes, allergènes, catégories.

   Elles sont publiques et stables. On les garde une heure en cache, et on
   retombe sur la copie locale si l'API ne répond pas : un référentiel
   injoignable ne doit jamais empêcher d'écrire un plat.
   ───────────────────────────────────────────────────────────────────────────── */

export interface RefItem {
  code: string;
  label: string;
}

/** Les 14 allergènes à déclaration obligatoire (règlement INCO 1169/2011). */
const ALLERGENS: RefItem[] = [
  { code: "gluten", label: "Céréales contenant du gluten" },
  { code: "crustaceans", label: "Crustacés" },
  { code: "eggs", label: "Œufs" },
  { code: "fish", label: "Poissons" },
  { code: "peanuts", label: "Arachides" },
  { code: "soy", label: "Soja" },
  { code: "milk", label: "Lait" },
  { code: "nuts", label: "Fruits à coque" },
  { code: "celery", label: "Céleri" },
  { code: "mustard", label: "Moutarde" },
  { code: "sesame", label: "Graines de sésame" },
  { code: "sulphites", label: "Anhydride sulfureux et sulfites" },
  { code: "lupin", label: "Lupin" },
  { code: "molluscs", label: "Mollusques" },
];

const DIETS: RefItem[] = [
  { code: "vegetarian", label: "Végétarien" },
  { code: "vegan", label: "Végan" },
  { code: "halal", label: "Halal" },
  { code: "gluten-free", label: "Sans gluten" },
  { code: "lactose-free", label: "Sans lactose" },
  { code: "nut-free", label: "Sans fruits à coque" },
];

const CATEGORIES: RefItem[] = [
  { code: "main", label: "Plat complet" },
  { code: "starter", label: "Entrée" },
  { code: "soup", label: "Soupe" },
  { code: "side", label: "Accompagnement" },
  { code: "dessert", label: "Dessert" },
  { code: "breakfast", label: "Petit-déjeuner ou goûter" },
  { code: "sauce", label: "Sauce ou base" },
];

function useReferential(path: string, key: string, fallback: RefItem[]) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: ["referentials", key],
    queryFn: async () => {
      try {
        const res = await apiFetch<Record<string, RefItem[]>>(path);
        const list = res?.[key];
        return Array.isArray(list) && list.length > 0 ? list : fallback;
      } catch {
        return fallback;
      }
    },
    staleTime: 3_600_000,
    initialData: fallback,
    // Sans cela, TanStack tient `initialData` pour déjà chargé et ne demande
    // jamais la liste réglée dans Paramètres pendant l'heure.
    initialDataUpdatedAt: 0,
  });
}

const REGIONS: RefItem[] = [
  { code: "11", label: "Île-de-France" },
  { code: "24", label: "Centre-Val de Loire" },
  { code: "27", label: "Bourgogne-Franche-Comté" },
  { code: "28", label: "Normandie" },
  { code: "32", label: "Hauts-de-France" },
  { code: "44", label: "Grand Est" },
  { code: "52", label: "Pays de la Loire" },
  { code: "53", label: "Bretagne" },
  { code: "75", label: "Nouvelle-Aquitaine" },
  { code: "76", label: "Occitanie" },
  { code: "84", label: "Auvergne-Rhône-Alpes" },
  { code: "93", label: "Provence-Alpes-Côte d'Azur" },
  { code: "94", label: "Corse" },
];

/** `GET /referentials/regions` — les régions qu'un batch cooker peut couvrir. */
export function useRegions() {
  return useReferential("/referentials/regions", "regions", REGIONS);
}

/** `GET /referentials/diets` */
export function useDiets() {
  return useReferential("/referentials/diets", "diets", DIETS);
}

/** `GET /referentials/allergens` */
export function useAllergens() {
  return useReferential("/referentials/allergens", "allergens", ALLERGENS);
}

/** `GET /referentials/dish-categories` */
export function useDishCategories() {
  return useReferential(
    "/referentials/dish-categories",
    "categories",
    CATEGORIES,
  );
}

import { REHEAT_MODES } from "@/lib/recipe-fields";

const STEP_TYPES: RefItem[] = [
  { code: "preparation", label: "Préparation" },
  { code: "cuisson", label: "Cuisson" },
  { code: "refroidissement", label: "Refroidissement" },
  { code: "mise_en_boite", label: "Mise en boîte" },
];

/** `GET /referentials/step-types` (§4.5). */
export function useStepTypes() {
  return useReferential("/referentials/step-types", "stepTypes", STEP_TYPES);
}

/** `GET /referentials/reheat-modes` (§4.6) : la liste réglée dans Paramètres. */
export function useReheatModes() {
  return useReferential("/referentials/reheat-modes", "modes", REHEAT_MODES);
}

const COMPUTED_DIETS: RefItem[] = [
  { code: "vegetarian", label: "Végétarien" },
  { code: "vegan", label: "Végétalien" },
  { code: "no-pork", label: "Sans porc" },
  { code: "pescetarian", label: "Pescétarien" },
  { code: "gluten-free", label: "Sans gluten" },
  { code: "lactose-free", label: "Sans lactose" },
];

/** `GET /referentials/computed-diets` (§4.8) : ce que porte la liste commune. */
export function useComputedDiets() {
  return useReferential("/referentials/computed-diets", "diets", COMPUTED_DIETS);
}

/** `GET /referentials/recipe-profiles` (§4.8) : la liste réglée dans Paramètres. */
export function useRecipeProfiles() {
  return useReferential("/referentials/recipe-profiles", "profiles", []);
}

/** Les régimes qu'on déclare : aucun ingrédient ne les prouve (§4.8). */
export const DECLARED_DIETS: RefItem[] = [
  { code: "halal", label: "Halal" },
  { code: "kosher", label: "Casher" },
];

/** Le libellé d'un code, ou le code lui-même quand il sort de la liste. */
export function refLabel(items: RefItem[], code: string): string {
  return items.find((i) => i.code === code)?.label ?? code;
}

/** Une commune d'une région, telle que `interventionZones[].cities` l'attend. */
export interface RegionCommune {
  name: string;
  insee: string;
  department: string;
}

/**
 * `GET /referentials/regions/{code}/communes` — toutes les communes d'une
 * région, par ordre alphabétique (arrivée le 10/11). Plusieurs milliers pour
 * les plus grandes : ne la demander qu'à l'ouverture d'une région.
 */
export function useRegionCommunes(regionCode: string, enabled = true) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: ["referentials", "communes", regionCode],
    queryFn: async () =>
      (
        await apiFetch<{ communes: RegionCommune[] }>(
          `/referentials/regions/${regionCode}/communes`,
        )
      ).communes ?? [],
    enabled,
    staleTime: Infinity,
    retry: 1,
  });
}

/** Les rayons par défaut, dans l'ordre du magasin (repli si l'API ne répond pas). */
const AISLES: RefItem[] = [
  ["fruits-legumes", "Fruits et légumes"],
  ["boulangerie", "Boulangerie"],
  ["boucherie", "Boucherie"],
  ["poissonnerie", "Poissonnerie"],
  ["cremerie", "Crèmerie"],
  ["fromages", "Fromages"],
  ["epicerie-salee", "Épicerie salée"],
  ["conserves", "Conserves"],
  ["epices", "Épices"],
  ["epicerie-sucree", "Épicerie sucrée"],
  ["boissons", "Boissons"],
  ["non-alimentaire", "Non alimentaire"],
  ["surgeles", "Surgelés"],
].map(([code, label]) => ({ code, label }));

/** `GET /referentials/aisles` (§5.4) : la liste réglée dans Paramètres, dans l'ordre du magasin. */
export function useAisles() {
  return useReferential("/referentials/aisles", "aisles", AISLES);
}
