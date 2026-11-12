"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { adminErrorMessage } from "@/lib/api/errors";
import { usePropagateIngredient, type Propagation } from "@/lib/api/catalog";

/** Les chiffres d'un report (§7.3) en une phrase. */
export function propagationLine(p: Propagation): string {
  if (p.dishes === 0 && p.failed === 0 && p.skipped === 0) return "Aucune recette n'avait à changer.";
  const parts = [
    `${p.dishes} recette${p.dishes > 1 ? "s" : ""} mise${p.dishes > 1 ? "s" : ""} à jour`,
    `${p.reverified} confirmation${p.reverified > 1 ? "s" : ""} d'allergènes à refaire`,
    `${p.chefs} chef${p.chefs > 1 ? "s" : ""} prévenu${p.chefs > 1 ? "s" : ""}`,
  ];
  if (p.skipped > 0) parts.push(`${p.skipped} déjà à jour`);
  return `${parts.join(", ")}.`;
}

/**
 * Le bilan d'un report. Quand des recettes ont échoué (`failed > 0`), propose de
 * rejouer le report de l'ingrédient (`ingredientId`), et montre les nouveaux chiffres.
 * Sans `ingredientId` (un import touche beaucoup d'entrées), renvoie à la liste.
 */
export default function PropagationNotice({
  propagation,
  ingredientId,
  label = "Report dans les recettes",
}: {
  propagation: Propagation | null;
  ingredientId?: string;
  label?: string;
}) {
  const replay = usePropagateIngredient();
  const [replayed, setReplayed] = useState<Propagation | null>(null);
  const current = replayed ?? propagation;
  if (!current) return null;

  return (
    <div role="status" className="space-y-2 text-sm">
      <p className="flex items-start gap-1.5 text-ink-mid">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden />
        <span>
          <strong className="text-navy">{label} :</strong> {propagationLine(current)}
        </span>
      </p>
      {current.failed > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning bg-cream-soft p-3">
          <p className="flex flex-1 items-start gap-1.5 text-navy">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
            {current.failed} recette{current.failed > 1 ? "s n'ont" : " n'a"} pas pu être mise
            {current.failed > 1 ? "s" : ""} à jour.
            {!ingredientId && " Rouvrez les ingrédients modifiés dans la liste pour relancer leur report."}
          </p>
          {ingredientId && (
            <button
              type="button"
              disabled={replay.isPending}
              onClick={() => replay.mutate(ingredientId, { onSuccess: setReplayed })}
              className="btn btn-sm btn-outline"
            >
              {replay.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              )}
              Relancer le report
            </button>
          )}
        </div>
      )}
      {replay.isError && (
        <p role="alert" className="text-[12px] text-danger">
          {adminErrorMessage(replay.error)}
        </p>
      )}
    </div>
  );
}
