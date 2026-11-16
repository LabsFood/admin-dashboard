"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { motion } from "framer-motion";
import { AlertTriangle, BookOpen, Check, GitMerge, Loader2, Pencil, Search, Users, UserRound } from "lucide-react";
import IngredientEditor from "@/components/admin/IngredientEditor";
import IngredientTabs from "@/components/admin/IngredientTabs";
import PropagationNotice, { useReplay } from "@/components/admin/PropagationNotice";
import { adminErrorMessage } from "@/lib/api/errors";
import { refLabel, useAisles, useAllergens, useComputedDiets } from "@/lib/api/referentials";
import {
  alreadyListed,
  isIncomplete,
  isTimeout,
  TIMEOUT_HINT,
  useCatalogIngredients,
  useIngredientDishes,
  useMergeIngredient,
  useValidateIngredient,
  type CatalogIngredient,
  type IngredientFilters,
  type IngredientWrite,
} from "@/lib/api/catalog";

/* ─────────────────────────────────────────────────────────────────────────────
   La file « À valider » (Recettes §7.2) — `/admin/ingredients/a-valider`.

   Un batch cooker qui ne trouve pas un ingrédient dans la liste commune crée le
   sien, privé, en attente. La maison le valide (il rejoint la liste), le
   fusionne dans une entrée existante (ses recettes la relient alors), ou le
   corrige avant de le valider.
   ───────────────────────────────────────────────────────────────────────────── */

type MergeTarget = { id: string; name: string } & Partial<CatalogIngredient>;

/**
 * La confirmation d'une fusion : les recettes passent sur les allergènes, le
 * rayon et le statut de la cible. On nomme ce qu'elles y perdent.
 */
function mergeConfirmText(
  item: CatalogIngredient,
  target: MergeTarget,
  allergenList: { code: string; label: string }[],
  aisleList: { code: string; label: string }[],
): string {
  let text = `Fusionner « ${item.name} » avec « ${target.name} » ? Les recettes qui utilisent « ${item.name} » utiliseront « ${target.name} ».`;
  if (target.allergens === undefined && target.allergensNone === undefined) {
    text += " Les allergènes de la cible ne sont pas connus ici : vérifiez-les d'abord.";
  } else {
    const targetAllergens = target.allergens ?? [];
    const theirs = target.allergensNone ? "aucun allergène" : targetAllergens.length ? targetAllergens.map((a) => refLabel(allergenList, a)).join(", ") : "à compléter";
    text += ` Allergènes de la cible : ${theirs}.`;
    if (!target.allergensNone && targetAllergens.length === 0) {
      text += " Ses recettes perdront leur confirmation d'allergènes tant que la cible n'est pas complétée.";
    } else {
      const lost = (item.allergens ?? []).filter((a) => !targetAllergens.includes(a));
      if (lost.length > 0) text += ` Les recettes perdront : ${lost.map((a) => refLabel(allergenList, a)).join(", ")}.`;
    }
  }
  text += ` Rayon de la cible : ${target.aisle ? refLabel(aisleList, target.aisle) : "aucun"}${target.status && target.status !== "active" ? ` (statut : ${target.status})` : ""}.`;
  return `${text} Cette action est définitive.`;
}

/** Le terme de recherche d'un nom : 60 caractères au plus (limite de l'API), à une coupure de mot si possible. */
function searchTerm(name: string): string {
  const n = name.trim();
  if (n.length <= 60) return n;
  const cut = n.slice(0, 60);
  const space = cut.lastIndexOf(" ");
  return (space > 20 ? cut.slice(0, space) : cut).trim();
}

const PENDING: IngredientFilters = { search: "", status: "pending", aisle: "", incomplete: false, reviewed: "" };

/** Le résultat d'une action, gardé à l'écran : l'entrée a quitté la file. */
interface Outcome {
  key: number;
  text: string;
  write: IngredientWrite;
  /** L'id sur lequel rejouer un report : la cible d'une fusion, sinon l'entrée. */
  replayId: string;
}

export default function ToValidatePage() {
  const [page, setPage] = useState(1);
  const liste = useCatalogIngredients(PENDING, page);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const meta = liste.data?.meta;
  // La dernière carte d'une page est partie : on revient à la dernière page qui existe.
  if (meta && page > 1 && page > meta.totalPages) setPage(Math.max(1, meta.totalPages));

  function done(text: string, write: IngredientWrite, replayId: string) {
    setOutcomes((o) => [{ key: Date.now() + o.length, text, write, replayId }, ...o]);
  }

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card p-6"
      >
        <h2 className="font-display text-xl font-bold text-navy">
          {meta ? `${meta.total} ingrédient${meta.total > 1 ? "s" : ""} à valider` : "Ingrédients à valider"}
        </h2>
        <p className="text-sm text-ink-soft">
          Les ingrédients créés par des batch cookers. Validez-les, fusionnez-les dans une entrée existante, ou
          corrigez-les d&apos;abord.
        </p>
      </motion.section>

      <IngredientTabs current="/ingredients/a-valider" />

      {outcomes.map((o) => (
        <section key={o.key} className="card space-y-2 p-5">
          <p className="font-semibold text-navy">{o.text}</p>
          <PropagationNotice propagation={o.write.propagation} ingredientId={o.replayId} />
        </section>
      ))}

      {liste.isPending ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : liste.isError ? (
        <p role="alert" className="flex items-start gap-1.5 text-[13px] text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {adminErrorMessage(liste.error)}
        </p>
      ) : liste.data.data.length === 0 ? (
        <p className="card p-6 text-[13px] text-ink-soft">Rien à valider pour le moment.</p>
      ) : (
        <div className="space-y-4">
          {liste.data.data.map((i) => (
            <PendingCard key={i.id} item={i} onDone={done} />
          ))}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between text-[13px] text-ink-mid">
              <button
                type="button"
                onClick={() => setPage((p) => p - 1)}
                disabled={!meta.hasPreviousPage}
                className="btn btn-sm btn-outline"
              >
                Précédents
              </button>
              Page {meta.page} sur {meta.totalPages}
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!meta.hasNextPage}
                className="btn btn-sm btn-outline"
              >
                Suivants
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PendingCard({
  item,
  onDone,
}: {
  item: CatalogIngredient;
  onDone: (text: string, write: IngredientWrite, replayId: string) => void;
}) {
  const aisles = useAisles();
  const allergens = useAllergens();
  const diets = useComputedDiets();
  const validate = useValidateIngredient();
  const merge = useMergeIngredient();
  const [merging, setMerging] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [term, setTerm] = useState(searchTerm(item.name));
  const [showNear, setShowNear] = useState(false);
  const [showDishes, setShowDishes] = useState(false);
  /** La cible de la dernière fusion tentée : c'est sur elle que se rejoue le report. */
  const [lastTarget, setLastTarget] = useState<string | null>(null);
  const replay = useReplay();

  const conflict = alreadyListed(validate.error);
  const busy = validate.isPending || merge.isPending;
  const actionError = validate.error && !conflict ? validate.error : merge.error;

  function doValidate() {
    merge.reset();
    validate.mutate(item.id, {
      onSuccess: (write) => onDone(`« ${item.name} » rejoint la liste commune.`, write, item.id),
    });
  }

  function doMerge(target: MergeTarget) {
    if (!window.confirm(mergeConfirmText(item, target, allergens.data, aisles.data))) return;
    validate.reset();
    setLastTarget(target.id);
    merge.mutate(
      { id: item.id, intoId: target.id },
      {
        onSuccess: (write) =>
          onDone(`« ${item.name} » est fusionné avec « ${target.name} ».`, write, target.id),
      },
    );
  }

  if (correcting) {
    return (
      <IngredientEditor
        initial={item}
        disabled={validate.isPending}
        title={`Corriger « ${item.name} » puis valider`}
        submitLabel="Corriger puis valider"
        onDone={() => setCorrecting(false)}
        onSaved={(patched) => {
          validate.reset();
          validate.mutate(item.id, {
            onSuccess: (write) =>
              onDone(
                `« ${patched.ingredient.name} » corrigé et ajouté à la liste commune.`,
                { ingredient: write.ingredient, propagation: patched.propagation },
                item.id,
              ),
            // Le nom corrigé existe déjà : la carte propose alors la fusion.
            onSettled: () => setCorrecting(false),
          });
        }}
      />
    );
  }

  return (
    <article className="card space-y-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-navy">{item.name}</h3>
          {item.aliases.length > 0 && <p className="text-[12px] text-ink-soft">{item.aliases.join(", ")}</p>}
          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-mid">
            <UserRound className="h-3.5 w-3.5" aria-hidden />
            Créé par{" "}
            <strong className="text-navy">{item.chef?.displayName ?? "un batch cooker inconnu"}</strong>
            {item.createdAt && <>, le {new Date(item.createdAt).toLocaleDateString("fr-FR")}</>}
          </p>
          <p className="mt-2 flex flex-wrap gap-1.5">
            <span className="chip-muted">{item.aisle ? refLabel(aisles.data, item.aisle) : "Sans rayon"}</span>
            {item.allergensNone ? (
              <span className="chip-muted">Aucun allergène</span>
            ) : (
              (item.allergens ?? []).map((a) => (
                <span key={a} className="chip-danger">
                  {refLabel(allergens.data, a)}
                </span>
              ))
            )}
            {item.diets.map((d) => (
              <span key={d} className="chip-teal">
                {refLabel(diets.data, d)}
              </span>
            ))}
            {isIncomplete(item) && <span className="chip-danger">À compléter</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={doValidate} className="btn btn-sm btn-primary">
            {validate.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden />
            )}
            Valider
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setMerging((m) => !m);
              setShowNear(true);
            }}
            aria-expanded={merging}
            className="btn btn-sm btn-outline"
          >
            <GitMerge className="h-3.5 w-3.5" aria-hidden /> Fusionner avec…
          </button>
          <button type="button" disabled={busy} onClick={() => setCorrecting(true)} className="btn btn-sm btn-outline">
            <Pencil className="h-3.5 w-3.5" aria-hidden /> Corriger puis valider
          </button>
        </div>
      </div>

      {conflict && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-warning bg-cream-soft p-3 text-sm">
          <p className="flex-1 text-navy">
            Une entrée commune porte déjà ce nom : « {conflict.name} ». Fusionnez plutôt que de valider.
          </p>
          <button type="button" disabled={busy} onClick={() => doMerge(conflict)} className="btn btn-sm btn-primary">
            <GitMerge className="h-3.5 w-3.5" aria-hidden /> Fusionner avec « {conflict.name} »
          </button>
        </div>
      )}
      {actionError != null && (
        <div role="alert" className="space-y-2 text-[12px] text-danger">
          <p>
            {adminErrorMessage(actionError)}
            {isTimeout(actionError) && ` ${TIMEOUT_HINT}`}
          </p>
          {isTimeout(actionError) && (
            <button
              type="button"
              disabled={replay.pending}
              onClick={() => void replay.run([actionError === merge.error && lastTarget ? lastTarget : item.id])}
              className="btn btn-sm btn-outline"
            >
              {replay.pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              Relancer le report
            </button>
          )}
          {replay.result && !replay.error && <p className="text-ink-mid">Report relancé.</p>}
          {replay.error != null && <p>{adminErrorMessage(replay.error)}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowNear((v) => !v)}
          aria-expanded={showNear || merging}
          className="btn btn-sm btn-ghost"
        >
          <Users className="h-3.5 w-3.5" aria-hidden /> Noms proches
        </button>
        <button
          type="button"
          onClick={() => setShowDishes((v) => !v)}
          aria-expanded={showDishes}
          className="btn btn-sm btn-ghost"
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden /> Ses recettes
        </button>
      </div>

      {(showNear || merging) && (
        <NearEntries item={item} term={term} setTerm={setTerm} merging={merging} busy={busy} onMerge={doMerge} merge={merge} />
      )}
      {showDishes && <Dishes id={item.id} />}
    </article>
  );
}

/** Les entrées communes aux noms proches : chargées à l'ouverture, jamais au montage de la carte. */
function NearEntries({
  item,
  term,
  setTerm,
  merging,
  busy,
  onMerge,
  merge,
}: {
  item: CatalogIngredient;
  term: string;
  setTerm: (t: string) => void;
  merging: boolean;
  busy: boolean;
  onMerge: (target: MergeTarget) => void;
  merge: ReturnType<typeof useMergeIngredient>;
}) {
  const aisles = useAisles();
  const allergenRef = useAllergens();
  // Un terme vide listerait les 50 premières entrées, chacune avec « Fusionner ».
  const searchable = term.trim().length >= 2;
  const near = useCatalogIngredients(
    { search: term, status: "active", aisle: "", incomplete: false, reviewed: "" },
    1,
    searchable,
  );
  // Seules les entrées communes comptent : la recherche rend aussi des privées.
  const commons = (near.data?.data ?? []).filter((c) => c.chefProfileId == null && c.id !== item.id);
  return (
    <div className="rounded-xl bg-cream-soft p-3">
      <p className="mb-2 text-[12px] font-semibold text-ink-mid">
        {merging ? "Choisissez l'entrée commune qui le remplace" : "Entrées communes aux noms proches"}
      </p>
      <label className="relative mb-2 block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
          aria-hidden
        />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          maxLength={60}
          aria-label="Chercher dans la liste commune"
          placeholder="Chercher dans la liste commune"
          className="input-base pl-9"
        />
      </label>
      {!searchable ? (
        <p className="text-[12px] text-ink-soft">Écrivez au moins deux lettres pour chercher.</p>
      ) : near.isPending ? (
        <Skeleton className="h-8 rounded bg-white/60" />
      ) : near.isError ? (
        <p role="alert" className="text-[12px] text-danger">
          {adminErrorMessage(near.error)}
        </p>
      ) : commons.length === 0 ? (
        <p className="text-[12px] text-ink-soft">Aucune entrée commune ne ressemble à « {term} ».</p>
      ) : (
        <ul className="divide-y divide-[rgba(31,42,55,0.06)]">
          {commons.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-sm">
              <span className="min-w-0 text-navy">
                {c.name}
                {c.aliases.length > 0 && <span className="text-[12px] text-ink-soft"> — {c.aliases.join(", ")}</span>}
                <span className="mt-1 flex flex-wrap gap-1.5">
                  <span className="chip-muted">{c.aisle ? refLabel(aisles.data, c.aisle) : "Sans rayon"}</span>
                  {c.allergensNone ? (
                    <span className="chip-muted">Aucun allergène</span>
                  ) : (c.allergens ?? []).length > 0 ? (
                    (c.allergens ?? []).map((a) => (
                      <span key={a} className="chip-danger">
                        {refLabel(allergenRef.data, a)}
                      </span>
                    ))
                  ) : (
                    <span className="chip-danger">Allergènes à compléter</span>
                  )}
                  {c.status && c.status !== "active" && <span className="chip-muted">{c.status}</span>}
                </span>
              </span>
              {merging && (
                <button type="button" disabled={busy} onClick={() => onMerge(c)} className="btn btn-sm btn-outline">
                  {merge.isPending && merge.variables?.intoId === c.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  ) : (
                    <GitMerge className="h-3 w-3" aria-hidden />
                  )}
                  Fusionner
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Les recettes qui relient l'ingrédient (`GET …/dishes`), chargées à l'ouverture. */
function Dishes({ id }: { id: string }) {
  const dishes = useIngredientDishes(id, true);
  return (
    <div className="rounded-xl bg-cream-soft p-3">
      <p className="mb-2 text-[12px] font-semibold text-ink-mid">
        Recettes qui l&apos;utilisent{dishes.data ? ` (${dishes.data.total})` : ""}
      </p>
      {dishes.isPending ? (
        <Skeleton className="h-8 rounded bg-white/60" />
      ) : dishes.isError ? (
        <p role="alert" className="text-[12px] text-danger">
          {adminErrorMessage(dishes.error)}
        </p>
      ) : dishes.data.data.length === 0 ? (
        <p className="text-[12px] text-ink-soft">Aucune recette ne l&apos;utilise.</p>
      ) : (
        <>
          <ul className="divide-y divide-[rgba(31,42,55,0.06)]">
            {dishes.data.data.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-sm">
                <span className="text-navy">
                  {d.name}
                  <span className="text-[12px] text-ink-soft"> — {d.chef?.displayName ?? "Lab's Food"}</span>
                </span>
                <span className={d.allergensVerifiedAt ? "chip-teal" : "chip-muted"}>
                  {d.allergensVerifiedAt ? "Allergènes confirmés" : "Non confirmée"}
                </span>
              </li>
            ))}
          </ul>
          {dishes.data.total > dishes.data.data.length && (
            <p className="mt-2 text-[12px] text-ink-soft">
              {dishes.data.data.length} premières sur {dishes.data.total}.
            </p>
          )}
        </>
      )}
    </div>
  );
}
