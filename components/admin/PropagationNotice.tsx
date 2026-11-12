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

const ZERO: Propagation = { dishes: 0, reverified: 0, chefs: 0, skipped: 0, failed: 0 };

/**
 * Rejoue le report d'un ou plusieurs ingrédients, un par un, et en additionne
 * les chiffres. `progress` compte les entrées déjà rejouées.
 */
export function useReplay() {
  const replay = usePropagateIngredient();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<Propagation | null>(null);
  const [error, setError] = useState<unknown>(null);

  async function run(ids: string[]) {
    setError(null);
    setProgress({ done: 0, total: ids.length });
    const sum = { ...ZERO };
    try {
      for (const [k, id] of ids.entries()) {
        const p = await replay.mutateAsync(id);
        sum.dishes += p.dishes;
        sum.reverified += p.reverified;
        sum.chefs += p.chefs;
        sum.skipped += p.skipped;
        sum.failed += p.failed;
        setProgress({ done: k + 1, total: ids.length });
      }
      setResult(sum);
      return sum;
    } catch (e) {
      setError(e);
      return null;
    } finally {
      setProgress(null);
    }
  }
  return { run, progress, result, error, pending: progress !== null };
}

/**
 * Le bilan d'un report. Quand des recettes ont échoué (`failed > 0`), propose de
 * rejouer le report : celui de `ingredientId`, ou celui de chaque entrée de
 * `replayIds` (un import en met beaucoup à jour). Les nouveaux chiffres
 * remplacent les anciens.
 */
export default function PropagationNotice({
  propagation,
  ingredientId,
  replayIds,
  label = "Report dans les recettes",
}: {
  propagation: Propagation | null;
  ingredientId?: string;
  replayIds?: string[];
  label?: string;
}) {
  const replay = useReplay();
  const ids = replayIds ?? (ingredientId ? [ingredientId] : []);
  const current = replay.result ?? propagation;
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
            {ids.length === 0 &&
              " Aucune entrée mise à jour n'est connue : ouvrez les ingrédients concernés dans la liste pour relancer leur report."}
          </p>
          {ids.length > 0 && (
            <button
              type="button"
              disabled={replay.pending}
              onClick={() => void replay.run(ids)}
              className="btn btn-sm btn-outline"
            >
              {replay.pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              )}
              {ids.length > 1
                ? `Relancer le report des ${ids.length} ingrédients mis à jour`
                : "Relancer le report"}
              {replay.progress && ids.length > 1 && ` (${replay.progress.done}/${replay.progress.total})`}
            </button>
          )}
        </div>
      )}
      {replay.error != null && (
        <p role="alert" className="text-[12px] text-danger">
          {adminErrorMessage(replay.error)}
        </p>
      )}
    </div>
  );
}
