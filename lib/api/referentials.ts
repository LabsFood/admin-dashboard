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
  { code: "starter", label: "Entrée" },
  { code: "main", label: "Plat" },
  { code: "side", label: "Accompagnement" },
  { code: "dessert", label: "Dessert" },
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
  });
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

/** Le libellé d'un code, ou le code lui-même quand il sort de la liste. */
export function refLabel(items: RefItem[], code: string): string {
  return items.find((i) => i.code === code)?.label ?? code;
}
