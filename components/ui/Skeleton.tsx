import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   Le chargement d'un écran de la console.

   Un squelette reprend la forme du contenu qu'il remplace : même hauteur de
   ligne, même nombre de colonnes. Sinon la page saute quand les données
   arrivent, et le squelette n'a servi à rien.

   Fond : `cream-deep` se voit sur le blanc des cartes et des tableaux. Le
   `cream-soft` d'avant sur du blanc ne se voyait pas.
   Mouvement : un fondu lent, coupé en `prefers-reduced-motion`.
   ───────────────────────────────────────────────────────────────────────────── */

/** Un bloc plein. Taille et forme viennent de l'appelant (`h-4 w-32`, `h-14`). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-cream-deep motion-reduce:animate-none", className)}
    />
  );
}

/**
 * Entoure un ensemble de blocs : un lecteur d'écran entend « Chargement » une
 * seule fois, au lieu de rien (les blocs sont `aria-hidden`).
 */
export function SkeletonGroup({
  children,
  label = "Chargement",
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Des lignes de liste de hauteur fixe (`h-14` par défaut, comme les tableaux). */
export function SkeletonRows({
  count = 4,
  rowClassName = "h-14",
  className,
}: {
  count?: number;
  rowClassName?: string;
  className?: string;
}) {
  return (
    <SkeletonGroup className={cn("space-y-px", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn("rounded-none", rowClassName)} />
      ))}
    </SkeletonGroup>
  );
}
