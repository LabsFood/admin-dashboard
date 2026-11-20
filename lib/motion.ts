/* ─────────────────────────────────────────────────────────────────────────────
   Jetons de mouvement de la console. Tout ce qui bouge passe par ici : une
   durée, une courbe, un ressort, jamais une valeur écrite à la main.

   Budget (docs/ui-ux-guidelines.md, § 1) : une console s'ouvre toute la
   journée, donc quasi aucun mouvement d'entrée. On anime les retours d'action
   et l'ouverture des tiroirs, rien d'autre.
   ───────────────────────────────────────────────────────────────────────────── */

/** Secondes, l'unité de Framer Motion. Plafond de la console : 200 ms. */
export const DURATION = {
  /** Retour d'appui, changement de couleur. */
  instant: 0.12,
  /** Changement de page, ouverture d'un menu. */
  fast: 0.16,
  /** Tiroir, dialogue. */
  base: 0.2,
} as const

/** slow-out : démarre vite, se pose doucement. Pour tout ce qui ENTRE. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const
/** slow-in : part doucement, finit vite. Pour tout ce qui SORT. */
export const EASE_IN = [0.7, 0, 0.84, 0] as const
/** slow-in + slow-out : un déplacement d'un point à un autre. */
export const EASE_MOVE = [0.65, 0, 0.35, 1] as const

/** Ressort pour un interrupteur : se pose sans rebondir deux fois. */
export const SPRING = { type: "spring", stiffness: 520, damping: 34, mass: 0.7 } as const

/** Fondu seul : la console n'annonce pas ses pages, elle les affiche. */
export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: DURATION.fast, ease: EASE_OUT },
} as const
