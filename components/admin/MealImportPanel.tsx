"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, FileUp, Sparkles, X } from "lucide-react";
import ActivityTrail, { type ActivityStep } from "@/components/ui/ActivityTrail";
import FilterTabs from "@/components/ui/FilterTabs";
import { adminErrorMessage } from "@/lib/api/errors";
import { useAllergens } from "@/lib/api/referentials";
import type { Meal } from "@/lib/api/catalog";
import { COUNTRIES, regionOf } from "@/lib/countries";
import {
  checkImportFiles,
  IMPORT_MAX_FILES,
  IMPORT_MAX_MB,
  useAdminRecipeImport,
  useStartAdminImport,
  type AdminRecipeImport,
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
  stepTypes: "types d'étape",
};

/** Ce que le formulaire reprend d'un brouillon. */
export function draftToMeal(draft: ImportDraft): Partial<Meal> {
  const d = draft.dish;
  return {
    name: d.name,
    description: d.description,
    country: d.country && COUNTRIES.some((c) => c.code === d.country) ? d.country : null,
    continent: regionOf(d.country),
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

type Origin = { source: string; startedAt: string };
type Phase = "source" | "trail";

/** L'avancement côté navigateur (envoi), avant que l'API ne prenne le relais. */
interface ClientProgress {
  files: { total: number; done: number; current: string | null };
  created: boolean;
}

const NO_PROGRESS: ClientProgress = {
  files: { total: 0, done: 0, current: null },
  created: false,
};

const seconds = (from?: string | null, to?: string | null) =>
  from && to ? Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 1000)) : null;

/**
 * L'encart en tête du formulaire de création : une ligne, le bouton à droite.
 * Le bouton ouvre la fenêtre d'import ; l'import en cours y reste visible si on
 * la ferme puis la rouvre.
 */
export default function MealImportPanel({
  onDraft,
}: {
  onDraft: (draft: ImportDraft, warnings: string[], origin: Origin) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="card flex flex-wrap items-center gap-3 p-4" aria-label="Importer avec l'IA">
      <Sparkles className="h-4 w-4 shrink-0 text-teal" aria-hidden />
      <p className="min-w-0 flex-1 text-sm">
        <span className="block font-semibold text-navy">Partir d&apos;une recette existante</span>
        <span className="block text-xs text-ink-soft">
          PDF, photos, texte, lien ou simple titre : l&apos;IA remplit le formulaire, vous
          relisez avant de créer.
        </span>
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-primary btn-sm"
        aria-haspopup="dialog"
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden /> Importer avec l&apos;IA
      </button>
      <ImportDialog
        open={open}
        onClose={() => setOpen(false)}
        onDraft={(d, w, o) => {
          onDraft(d, w, o);
          setOpen(false);
        }}
      />
    </section>
  );
}

function ImportDialog({
  open,
  onClose,
  onDraft,
}: {
  open: boolean;
  onClose: () => void;
  onDraft: (draft: ImportDraft, warnings: string[], origin: Origin) => void;
}) {
  const [phase, setPhase] = useState<Phase>("source");
  const [source, setSource] = useState<ImportSourceType>("file");
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ClientProgress>(NO_PROGRESS);
  const [trailOpen, setTrailOpen] = useState(true);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const start = useStartAdminImport((e) =>
    setProgress((p) =>
      e.kind === "created"
        ? { ...p, created: true }
        : e.kind === "upload"
          ? { ...p, files: { total: e.total, done: e.index, current: e.name } }
          : { ...p, files: { total: e.total, done: e.index + 1, current: null } },
    ),
  );
  const current = useAdminRecipeImport(importId);
  const data = current.data;
  const uploading = start.isPending;
  const reading = data?.status === "pending" || data?.status === "processing";
  const busy = uploading || reading;

  // Un chronomètre pendant la lecture : la seule chose qui bouge, une fois par seconde.
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [busy]);

  // Échap ferme (l'import continue : on le retrouve en rouvrant), focus dans la
  // fenêtre, défilement de la page bloqué — comme `ConfirmDialog`.
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !uploading) onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, uploading, onClose]);

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
    setProgress(NO_PROGRESS);
    setTrailOpen(true);
    const t0 = Date.now();
    setStartedAt(t0);
    setNow(t0);
    setPhase("trail");
    start.mutate(input, { onSuccess: (res) => setImportId(res.id) });
  }

  function restart() {
    start.reset();
    setImportId(null);
    setProgress(NO_PROGRESS);
    setPhase("source");
  }

  const origin: Origin | null = data
    ? { source: data.sourceType, startedAt: data.createdAt }
    : null;
  const failed =
    (start.error ? adminErrorMessage(start.error) : null) ??
    (data?.status === "failed" ? (data.error?.message ?? "L'import a échoué.") : null) ??
    (current.error ? adminErrorMessage(current.error) : null);
  const done = data?.status === "done";
  const steps = buildSteps({ source, files, text, url, title, progress, data, failed, uploading });
  const elapsed = startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : 0;
  const summary = failed
    ? "L'import s'est arrêté : voir l'étape en échec."
    : done
      ? `Terminé : ${data.drafts.length} recette${data.drafts.length > 1 ? "s" : ""} lue${data.drafts.length > 1 ? "s" : ""}${
          seconds(data.createdAt, data.finishedAt) !== null
            ? ` en ${seconds(data.createdAt, data.finishedAt)} s`
            : ""
        }.`
      : `En cours depuis ${elapsed} s…`;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/50 p-4 animate-fade-in motion-reduce:animate-none"
      onClick={() => !uploading && onClose()}
    >
      {/* slow-out : la fenêtre se pose en 160 ms (fondu seul). */}
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-paper p-6 shadow-[0_18px_48px_-18px_rgba(0,35,75,0.35)] focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="import-dialog-title" className="font-display text-lg font-bold text-navy">
            Importer une recette avec l&apos;IA
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            aria-label="Fermer"
            className="hit -m-2 rounded-full p-2 text-ink-soft hover:text-navy disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {phase === "source" ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-ink-mid">
              Choisissez la source. Rien n&apos;est enregistré : le formulaire se remplit et vous
              relisez avant de créer.
            </p>
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
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="input-base"
                placeholder="Ex. Poulet yassa"
                aria-label="Nom du plat"
              />
            )}
            {localError && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-md bg-danger-soft p-3 text-[13px] text-danger"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {localError}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={submit} className="btn btn-primary">
                <Sparkles className="h-4 w-4" aria-hidden /> Lancer la lecture
              </button>
              <button type="button" onClick={onClose} className="btn btn-ghost">
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <ActivityTrail
              title="Comment l'IA a lu la recette"
              summary={summary}
              steps={steps}
              open={trailOpen}
              onToggle={() => setTrailOpen((v) => !v)}
            />

            {failed && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-md bg-danger-soft p-3 text-[13px] text-danger"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {failed}
              </p>
            )}

            {done && data.drafts.length > 1 && origin && (
              <div>
                <p className="text-sm font-semibold text-navy">
                  {data.drafts.length} recettes trouvées : laquelle reprendre ?
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {data.drafts.map((d, i) => (
                    <li key={`${d.dish.name}-${i}`}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => onDraft(d, data.warnings, origin)}
                      >
                        {d.dish.name} · {d.dish.recipe.ingredients.length} ingrédients
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {done && data.drafts.length === 1 && origin && (
                <button
                  type="button"
                  autoFocus
                  onClick={() => onDraft(data.drafts[0], data.warnings, origin)}
                  className="btn btn-primary"
                >
                  Remplir le formulaire
                </button>
              )}
              {(failed || done) && (
                <button type="button" onClick={restart} className="btn btn-outline">
                  {failed ? "Réessayer" : "Importer une autre source"}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                className="btn btn-ghost"
              >
                {busy ? "Continuer en arrière-plan" : "Fermer"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Les étapes du fil, déduites uniquement de ce qui s'est passé : l'envoi vu
 * par le navigateur, puis l'état et la trace rendus par l'API.
 */
function buildSteps({
  source,
  files,
  text,
  url,
  title,
  progress,
  data,
  failed,
  uploading,
}: {
  source: ImportSourceType;
  files: File[];
  text: string;
  url: string;
  title: string;
  progress: ClientProgress;
  data: AdminRecipeImport | undefined;
  failed: string | null;
  uploading: boolean;
}): ActivityStep[] {
  const steps: ActivityStep[] = [];
  const created = progress.created || Boolean(data);

  // 1. La source part vers l'API.
  if (source === "file") {
    const { total, done, current } = progress.files;
    steps.push({
      id: "send",
      label:
        created || done === files.length
          ? `${files.length} fichier${files.length > 1 ? "s" : ""} envoyé${files.length > 1 ? "s" : ""} au stockage privé`
          : current
            ? `Envoi de « ${current} » (${done + 1} sur ${total || files.length})`
            : "Envoi des fichiers au stockage privé",
      status: created ? "done" : failed && !created ? "error" : "active",
      detail: (
        <ul className="list-disc pl-4">
          {files.map((f, i) => (
            <li key={i}>
              {f.name} · {(f.size / 1024 / 1024).toFixed(1)} Mo
            </li>
          ))}
        </ul>
      ),
    });
  } else {
    let host = url;
    try {
      host = new URL(url).hostname;
    } catch {
      /* lien déjà vérifié avant l'envoi */
    }
    steps.push({
      id: "send",
      label:
        source === "text"
          ? `Texte envoyé (${text.trim().length} caractères)`
          : source === "url"
            ? `Lien envoyé : ${host}`
            : `Titre envoyé : « ${title.trim()} »`,
      status: created ? "done" : failed ? "error" : "active",
      meta:
        source === "title"
          ? "Pas de source : l'IA propose une recette classique, entièrement à relire."
          : source === "url"
            ? "La page est lue par l'API, comme une source publiée : les étapes seront reformulées."
            : undefined,
    });
  }

  // 2. L'import est enregistré, l'API le prend en charge.
  steps.push({
    id: "queued",
    label: "Import enregistré",
    status: created ? "done" : failed && !uploading ? "pending" : "pending",
  });

  // 3. Lecture par le modèle.
  const reading = data?.status === "pending" || data?.status === "processing";
  const readFailed = data?.status === "failed";
  const trace = data?.trace;
  const readSeconds = seconds(trace?.startedAt ?? data?.createdAt, data?.finishedAt);
  steps.push({
    id: "read",
    label: readFailed
      ? "Lecture interrompue"
      : data?.status === "done"
        ? `Recette lue${trace?.model ? ` par ${trace.model}` : ""}`
        : data?.status === "processing"
          ? "Lecture par l'IA"
          : "En attente de lecture",
    status: !data
      ? "pending"
      : readFailed
        ? "error"
        : reading
          ? "active"
          : trace?.belowThreshold
            ? "warning"
            : "done",
    meta:
      data?.status === "done"
        ? [
            trace?.provider ? `Fournisseur : ${trace.provider}` : null,
            readSeconds !== null ? `${readSeconds} s` : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : readFailed
          ? (data?.error?.message ?? undefined)
          : undefined,
    detail: trace?.belowThreshold ? (
      <p>
        Moins de 70 % des ingrédients ont été reliés avec certitude, même après le modèle de
        renfort quand il est activé : relisez la liste de près.
      </p>
    ) : undefined,
  });

  // 4. Liaison au référentiel commun, recette par recette.
  if (data?.status === "done") {
    const linked = data.drafts.reduce((n, d) => n + d.linked, 0);
    const toVerify = data.drafts.reduce((n, d) => n + d.toVerify, 0);
    const unlinked = trace?.unlinkedNames ?? [];
    steps.push({
      id: "link",
      label: `${linked} ingrédient${linked > 1 ? "s" : ""} relié${linked > 1 ? "s" : ""} à la liste commune`,
      status: toVerify > 0 ? "warning" : "done",
      meta: toVerify > 0 ? `${toVerify} à vérifier` : undefined,
      detail:
        unlinked.length > 0 ? (
          <p>
            Inconnus de la liste commune : {unlinked.join(", ")}. Ils remontent aussi dans
            « Lus dans les imports ».
          </p>
        ) : undefined,
    });

    // 5. Ce qui a été estimé ou soupçonné : à relire.
    const estimated = [
      ...new Set(data.drafts.flatMap((d) => d.estimatedFields).map((f) => FIELD_LABELS[f]).filter(Boolean)),
    ];
    const allergens = [...new Set(data.drafts.flatMap((d) => d.suspectedAllergens))];
    const notes = [...data.warnings, ...data.drafts.flatMap((d) => d.warnings)];
    steps.push({
      id: "review",
      label:
        estimated.length + allergens.length + notes.length > 0
          ? "Points à relire relevés"
          : "Rien de particulier à relire",
      status: estimated.length + notes.length > 0 ? "warning" : "done",
      meta: [
        estimated.length ? `Estimé : ${estimated.join(", ")}` : null,
        allergens.length ? `${allergens.length} allergène${allergens.length > 1 ? "s" : ""} soupçonné${allergens.length > 1 ? "s" : ""}` : null,
      ]
        .filter(Boolean)
        .join(" · ") || undefined,
      detail:
        notes.length > 0 ? (
          <ul className="list-disc pl-4">
            {notes.slice(0, 8).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        ) : undefined,
    });

    steps.push({
      id: "ready",
      label:
        data.drafts.length > 1
          ? `${data.drafts.length} brouillons prêts : choisissez lequel reprendre`
          : "Brouillon prêt",
      status: "done",
    });
  } else {
    steps.push({ id: "link", label: "Liaison à la liste commune", status: "pending" });
    steps.push({ id: "ready", label: "Brouillon prêt", status: "pending" });
  }
  return steps;
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
