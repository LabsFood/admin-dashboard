"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, FileUp, Loader2, Sparkles, X } from "lucide-react";
import FilterTabs from "@/components/ui/FilterTabs";
import { adminErrorMessage } from "@/lib/api/errors";
import { useAllergens } from "@/lib/api/referentials";
import type { Meal } from "@/lib/api/catalog";
import { COUNTRIES } from "@/lib/countries";
import {
  checkImportFiles,
  IMPORT_MAX_FILES,
  IMPORT_MAX_MB,
  useAdminRecipeImport,
  useStartAdminImport,
  type ImportDraft,
  type ImportSourceType,
} from "@/lib/api/recipe-imports";

/* ─────────────────────────────────────────────────────────────────────────────
   Importer une recette avec l'IA, en tête du formulaire de création.

   L'admin donne un fichier (PDF ou photos), un texte, un lien ou un simple
   titre. L'API lit la recette et renvoie un brouillon par recette trouvée ; on
   en remplit le formulaire, que l'admin relit avant d'enregistrer. Rien n'est
   créé tant qu'il n'a pas cliqué « Créer ». Les allergènes se calculent des
   lignes reliées ; ceux que l'IA soupçonne sont signalés, jamais ajoutés.
   ───────────────────────────────────────────────────────────────────────────── */

const SOURCES: { id: ImportSourceType; label: string }[] = [
  { id: "file", label: "Fichier ou photos" },
  { id: "text", label: "Texte" },
  { id: "url", label: "Lien" },
  { id: "title", label: "Partir d'un titre" },
];

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

const FIELD_LABELS: Record<string, string> = {
  portions: "portions",
  prepMinutes: "temps de préparation",
  cookMinutes: "temps de cuisson",
  storageDays: "durée de conservation",
};

/** Ce que le formulaire reprend d'un brouillon. */
export function draftToMeal(draft: ImportDraft): Partial<Meal> {
  const d = draft.dish;
  return {
    name: d.name,
    description: d.description,
    country: d.country && COUNTRIES.some((c) => c.code === d.country) ? d.country : null,
    category: (d.category as Meal["category"]) ?? null,
    portions: d.portions,
    prepTime: d.prepMinutes,
    cookTime: d.cookMinutes,
    difficulty: d.difficulty,
    equipment: d.equipment,
    ingredients: d.recipe.ingredients,
    steps: d.recipe.steps,
    storage: d.recipe.storage ?? null,
    reheating: d.recipe.reheating ? { note: d.recipe.reheating.note } : null,
  };
}

export default function MealImportPanel({
  onDraft,
}: {
  onDraft: (draft: ImportDraft, warnings: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<ImportSourceType>("file");
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const start = useStartAdminImport();
  const current = useAdminRecipeImport(importId);
  const data = current.data;
  const applied = useRef<string | null>(null);

  // Une seule recette lue : elle part directement dans le formulaire.
  useEffect(() => {
    if (data?.status === "done" && data.drafts.length === 1 && applied.current !== data.id) {
      applied.current = data.id;
      onDraft(data.drafts[0], data.warnings);
      setOpen(false);
    }
  }, [data, onDraft]);

  function submit() {
    setLocalError(null);
    if (source === "file") {
      const problem = checkImportFiles(files);
      if (problem) return setLocalError(problem);
    }
    if (source === "text" && text.trim().length < 20) {
      return setLocalError("Collez le texte de la recette (20 caractères au moins).");
    }
    if (source === "url" && !/^https:\/\//i.test(url.trim())) {
      return setLocalError("Collez un lien qui commence par https://");
    }
    if (source === "title" && title.trim().length < 3) {
      return setLocalError("Donnez le nom du plat.");
    }
    const input =
      source === "file"
        ? { sourceType: "file" as const, files }
        : source === "text"
          ? { sourceType: "text" as const, text }
          : source === "url"
            ? { sourceType: "url" as const, url: url.trim() }
            : { sourceType: "title" as const, title: title.trim() };
    setImportId(null);
    start.mutate(input, { onSuccess: (res) => setImportId(res.id) });
  }

  const waiting =
    start.isPending || data?.status === "pending" || data?.status === "processing";
  const error =
    localError ??
    (start.error ? adminErrorMessage(start.error) : null) ??
    (data?.status === "failed" ? (data.error?.message ?? "L'import a échoué.") : null) ??
    (current.error ? adminErrorMessage(current.error) : null);
  const several = data?.status === "done" && data.drafts.length > 1 ? data.drafts : null;

  return (
    <section className="card p-5" aria-label="Importer avec l'IA">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-teal" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-navy">Importer avec l&apos;IA</span>
          <span className="block text-xs text-ink-soft">
            PDF, photos, texte, lien ou simple titre : le formulaire se remplit, à relire
            avant de créer.
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-soft ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <FilterTabs options={SOURCES} value={source} onChange={setSource} />

          {source === "file" && (
            <div>
              <label className="btn btn-outline btn-sm cursor-pointer">
                <FileUp className="h-3.5 w-3.5" aria-hidden /> Choisir des fichiers
                <input
                  type="file"
                  accept={ACCEPT}
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    const next = [...files, ...Array.from(e.target.files ?? [])];
                    setFiles(next);
                    setLocalError(checkImportFiles(next));
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="mt-1.5 text-xs text-ink-soft">
                Un PDF, ou jusqu&apos;à {IMPORT_MAX_FILES} photos d&apos;une même recette,{" "}
                {IMPORT_MAX_MB} Mo au plus chacun.
              </p>
              {files.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {files.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-2.5 py-1 text-xs text-ink"
                    >
                      {f.name}
                      <button
                        type="button"
                        aria-label={`Retirer ${f.name}`}
                        className="text-ink-soft hover:text-danger"
                        onClick={() => {
                          const next = files.filter((_, j) => j !== i);
                          setFiles(next);
                          setLocalError(next.length ? checkImportFiles(next) : null);
                        }}
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {source === "text" && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="input-base"
              placeholder="Collez la recette : ingrédients et étapes."
              aria-label="Texte de la recette"
            />
          )}
          {source === "url" && (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input-base"
              placeholder="https://"
              aria-label="Lien de la recette"
            />
          )}
          {source === "title" && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-base"
              placeholder="Ex. Poulet yassa"
              aria-label="Nom du plat"
            />
          )}

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          {several && (
            <div>
              <p className="text-sm font-semibold text-navy">
                {several.length} recettes trouvées : laquelle reprendre ?
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {several.map((d, i) => (
                  <li key={`${d.dish.name}-${i}`}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        onDraft(d, data?.warnings ?? []);
                        setOpen(false);
                      }}
                    >
                      {d.dish.name} · {d.dish.recipe.ingredients.length} ingrédients
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={waiting}
              className="btn btn-primary btn-sm disabled:opacity-55"
            >
              {waiting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
              )}
              Lire la recette
            </button>
            {waiting && (
              <span className="text-xs text-ink-soft" aria-live="polite">
                {start.isPending ? "Envoi…" : "Lecture en cours, quelques secondes…"}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/** Ce qu'il faut relire après un import, au-dessus du formulaire rempli. */
export function ImportReviewNote({
  draft,
  warnings,
  onDismiss,
}: {
  draft: ImportDraft;
  warnings: string[];
  onDismiss: () => void;
}) {
  const allergens = useAllergens();
  const label = (code: string) =>
    allergens.data.find((a) => a.code === code)?.label ?? code;
  const estimated = draft.estimatedFields
    .map((f) => FIELD_LABELS[f])
    .filter((f): f is string => Boolean(f));
  const notes = [...warnings, ...draft.warnings];
  return (
    <section
      className="card flex items-start gap-3 border border-teal/30 p-4 text-sm"
      aria-label="À relire après l'import"
    >
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1 text-ink">
        <p className="font-semibold text-navy">Rempli par l&apos;IA : relisez avant de créer.</p>
        <p className="text-ink-mid">
          {draft.linked} ingrédient{draft.linked > 1 ? "s" : ""} relié
          {draft.linked > 1 ? "s" : ""} à la liste commune
          {draft.toVerify > 0 && <>, {draft.toVerify} à vérifier</>}.
          {estimated.length > 0 && <> Estimé : {estimated.join(", ")}.</>}
        </p>
        {draft.suspectedAllergens.length > 0 && (
          <p className="text-ink-mid">
            Allergènes que l&apos;IA soupçonne :{" "}
            {draft.suspectedAllergens.map(label).join(", ")}. Ils ne sont pas ajoutés :
            vérifiez qu&apos;ils viennent bien des lignes reliées.
          </p>
        )}
        {notes.length > 0 && (
          <ul className="list-disc pl-5 text-ink-mid">
            {notes.slice(0, 6).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Masquer"
        className="text-ink-soft hover:text-navy"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </section>
  );
}
