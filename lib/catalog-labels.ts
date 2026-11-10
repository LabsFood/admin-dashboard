import type { BadgeTone } from "@/components/ui/Badge";
import type { Continent, Difficulty, MealStatus, MenuPeriod } from "@/lib/api/catalog";
import type { ModeratedStatus, ReasonCode } from "@/lib/api/moderation";

/* Ce que l'API nomme en anglais, et ce que la console affiche en français. */

export const continentLabel: Record<Continent, string> = {
  europe: "Europe",
  africa: "Afrique",
  asia: "Asie",
  americas: "Amériques",
  middle_east: "Moyen-Orient",
};

export const CONTINENTS = Object.keys(continentLabel) as Continent[];

export const difficultyLabel: Record<Difficulty, string> = {
  easy: "Facile",
  medium: "Moyen",
  hard: "Difficile",
};

export const difficultyTone: Record<Difficulty, BadgeTone> = {
  easy: "success",
  medium: "warning",
  hard: "danger",
};

export const periodLabel: Record<MenuPeriod, string> = {
  week: "Semaine",
  month: "Mois",
};

/* ── Statuts ───────────────────────────────────────────────────────────────── */

/**
 * Les plats de la maison connaissent trois états. Le contenu des batch cookers
 * en connaît un quatrième, `suspended` : retiré du public par la modération,
 * et lui seul peut être remis en ligne.
 */
export const moderatedLabel: Record<ModeratedStatus, string> = {
  published: "En ligne",
  draft: "Brouillon",
  suspended: "Suspendu",
  archived: "Archivé",
};

export const moderatedTone: Record<ModeratedStatus, BadgeTone> = {
  published: "success",
  draft: "warning",
  suspended: "danger",
  archived: "neutral",
};

/** Idem pour un plat Lab's Food, qui n'a pas d'état suspendu. */
export const catalogLabel: Record<MealStatus, string> = {
  published: "Publié",
  draft: "Brouillon",
  archived: "Archivé",
};

export const catalogTone: Record<MealStatus, BadgeTone> = {
  published: "success",
  draft: "warning",
  archived: "neutral",
};

/* ── Motifs de suspension ──────────────────────────────────────────────────── */

/** Les huit motifs que l'API accepte, dits comme un admin les penserait. */
export const reasonCodeLabel: Record<ReasonCode, string> = {
  "allergens-incomplete": "Allergènes incomplets",
  "inappropriate-content": "Contenu inapproprié",
  copyright: "Recette ou photo empruntée",
  "misleading-origin": "Origine trompeuse",
  "not-a-real-photo": "Photo générée, pas une vraie photo",
  duplicate: "Doublon",
  quality: "Qualité insuffisante",
  other: "Autre",
};

/** Ce que l'admin vérifie derrière chaque motif. */
export const reasonCodeHint: Record<ReasonCode, string> = {
  "allergens-incomplete":
    "La fiche ne déclare pas un allergène que la recette contient visiblement.",
  "inappropriate-content": "Texte ou photo qui n'a rien à faire sur la vitrine.",
  copyright: "Recette recopiée, ou photo qui n'appartient pas au batch cooker.",
  "misleading-origin": "Le pays annoncé ne correspond pas au plat.",
  "not-a-real-photo":
    "La photo principale est une image générée : le plat doit être montré tel qu'il est. La photo est retirée avec le plat.",
  duplicate: "Le même plat existe déjà sur cette vitrine.",
  quality: "Description trop pauvre ou photo inutilisable.",
  other: "Rien de ce qui précède — le motif écrit fait tout le travail.",
};
