"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Save, X } from "lucide-react";
import InfoPopover from "@/components/ui/InfoPopover";
import { cn } from "@/lib/utils";
import { adminErrorMessage, errorFor } from "@/lib/api/errors";
import { ApiError } from "@/lib/api/client";
import { useAisles, useAllergens, useComputedDiets } from "@/lib/api/referentials";
import { MONTHS } from "@/lib/recipe-fields";
import {
  alreadyListed,
  useCreateCatalogIngredient,
  useIngredientImpact,
  useUpdateCatalogIngredient,
  type CatalogIngredient,
  type CatalogIngredientInput,
  type IngredientImpact,
  type IngredientWrite,
} from "@/lib/api/catalog";

/* ─────────────────────────────────────────────────────────────────────────────
   Le formulaire d'un ingrédient de la liste commune (§4.10), partagé par la
   liste et par la file « À valider » (« Corriger puis valider »).

   Les contrôles du client servent à écrire un message clair ; l'API reste
   l'autorité, et ses refus 4xx s'affichent près du champ qu'ils visent.
   ───────────────────────────────────────────────────────────────────────────── */

const NAME_MAX = 120;
const ALIAS_MAX = 20;

type Field = "name" | "aliases" | "aisle" | "allergens" | "diets" | "seasonMonths" | "status";

/** Le champ qu'un refus de l'API vise (`null` : pas identifiable, message en bas). */
function fieldOfError(error: unknown): Field | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status === 400) {
    for (const f of ["name", "aliases", "aisle", "allergens", "diets", "seasonMonths", "status"] as const) {
      if (errorFor(error, f) || errorFor(error, `${f}.0`)) return f;
    }
    return null;
  }
  if (error.status === 409) return "name";
  if (error.status === 422) {
    const m = `${(error.body as { code?: string } | null)?.code ?? ""} ${error.message}`.toLowerCase();
    if (m.includes("status")) return "status";
    if (m.includes("aisle") || m.includes("rayon")) return "aisle";
    if (m.includes("allerg")) return "allergens";
  }
  return null;
}

const sameSet = <T extends string | number>(a: T[], b: T[]) =>
  a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

export default function IngredientEditor({
  initial,
  onDone,
  onSaved,
  submitLabel = "Enregistrer",
  title,
}: {
  initial: CatalogIngredient | null;
  onDone: () => void;
  /** Appelé après l'enregistrement. Sans lui, le formulaire se ferme. */
  onSaved?: (result: IngredientWrite) => void;
  submitLabel?: string;
  title?: string;
}) {
  const create = useCreateCatalogIngredient();
  const update = useUpdateCatalogIngredient();
  const impactCall = useIngredientImpact();
  const aisles = useAisles();
  const allergenList = useAllergens();
  const diets = useComputedDiets();

  const [name, setName] = useState(initial?.name ?? "");
  const [aliases, setAliases] = useState(initial?.aliases.join(", ") ?? "");
  const [aisle, setAisle] = useState(initial?.aisle ?? "");
  const [allergens, setAllergens] = useState<string[]>(initial?.allergens ?? []);
  const [none, setNone] = useState(initial?.allergensNone ?? false);
  const [isBasic, setIsBasic] = useState(initial?.isBasic ?? false);
  const [chosen, setChosen] = useState<string[]>(initial?.diets ?? []);
  const [months, setMonths] = useState<number[]>(initial?.seasonMonths ?? []);
  const [status, setStatus] = useState<"active" | "inactive">(
    initial?.status === "inactive" ? "inactive" : "active",
  );
  const [local, setLocal] = useState<Partial<Record<Field, string>>>({});
  /** L'impact lu, pour la valeur des champs à risque qu'il concernait. */
  const [impact, setImpact] = useState<{ sig: string; data: IngredientImpact } | null>(null);

  const saving = create.isPending || update.isPending;
  const apiError = create.error ?? update.error ?? impactCall.error;
  const apiField = apiError ? fieldOfError(apiError) : null;
  const listed = alreadyListed(apiError);

  /** La gestion du statut ne vaut que pour une entrée commune active ou inactive. */
  const statusEditable =
    !!initial && initial.chefProfileId == null && (initial.status === "active" || initial.status === "inactive");

  const risky = {
    allergens: initial ? !sameSet(allergens, initial.allergens ?? []) : false,
    none: initial ? none !== (initial.allergensNone ?? false) : false,
    diets: initial ? !sameSet(chosen, initial.diets) : false,
    months: initial ? !sameSet(months, initial.seasonMonths) : false,
  };
  const needsImpact = risky.allergens || risky.none || risky.diets || risky.months;
  const allergenChange = risky.allergens || risky.none;
  const sig = JSON.stringify([[...allergens].sort(), none, [...chosen].sort(), [...months].sort()]);

  function check(): Partial<Record<Field, string>> {
    const errs: Partial<Record<Field, string>> = {};
    const n = name.trim();
    if (n.length < 1) errs.name = "Le nom est obligatoire.";
    else if (n.length > NAME_MAX) errs.name = `Le nom ne dépasse pas ${NAME_MAX} caractères.`;
    const list = aliasList();
    if (list.length > ALIAS_MAX) errs.aliases = `Au plus ${ALIAS_MAX} autres noms (${list.length} saisis).`;
    else if (list.some((a) => a.length > NAME_MAX))
      errs.aliases = `Chaque autre nom ne dépasse pas ${NAME_MAX} caractères.`;
    if (aisle && !aisles.data.some((a) => a.code === aisle) && aisle !== initial?.aisle)
      errs.aisle = "Ce rayon n'est pas dans la liste en vigueur.";
    if (none && allergens.length > 0)
      errs.allergens = "Des allergènes et « aucun allergène » ne vont pas ensemble.";
    return errs;
  }

  function aliasList() {
    return aliases
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
  }

  function body(): CatalogIngredientInput {
    const out: CatalogIngredientInput = {
      name: name.trim(),
      aliases: aliasList(),
      diets: chosen,
      seasonMonths: months,
      allergens: none ? [] : allergens,
      allergensNone: none,
      isBasic,
    };
    if (aisle) out.aisle = aisle;
    if (statusEditable && status !== initial?.status) out.status = status;
    return out;
  }

  function save() {
    const payload = body();
    const done = (result: IngredientWrite) => {
      if (onSaved) onSaved(result);
      else onDone();
    };
    if (initial) {
      update.mutate({ id: initial.id, patch: payload }, { onSuccess: done });
    } else {
      create.mutate(payload, { onSuccess: (row) => done({ ingredient: row, propagation: null }) });
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = check();
    setLocal(errs);
    if (Object.keys(errs).length > 0) return;
    create.reset();
    update.reset();
    impactCall.reset();
    if (initial && needsImpact && impact?.sig !== sig) {
      impactCall.mutate(initial.id, { onSuccess: (data) => setImpact({ sig, data }) });
      return;
    }
    save();
  }

  const shownImpact = impact?.sig === sig && needsImpact ? impact.data : null;

  const err = (f: Field) => local[f] ?? (apiField === f && apiError ? adminErrorMessage(apiError) : null);
  const errBox = (f: Field) =>
    err(f) && (
      <p role="alert" className="mt-1 text-[12px] text-danger">
        {err(f)}
      </p>
    );

  const chip = (on: boolean) => cn(on ? "chip-teal" : "chip-muted", "cursor-pointer");

  return (
    <form onSubmit={submit} className="card space-y-4 p-6" noValidate>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-navy">
          {title ?? (initial ? `Modifier « ${initial.name} »` : "Nouvel ingrédient")}
        </h3>
        <button type="button" onClick={onDone} aria-label="Fermer" className="text-ink-soft">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Nom</span>
          <input
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tomate"
            className="input-base"
            aria-invalid={!!err("name")}
          />
          {errBox("name")}
          {listed && (
            <p className="mt-1 text-[12px] text-ink-mid">
              « {listed.name} » est déjà dans la liste commune.
            </p>
          )}
        </label>
        <label className="block">
          <span className="field-label">Autres noms (séparés par des virgules, {ALIAS_MAX} au plus)</span>
          <input
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            placeholder="pomme d'amour"
            className="input-base"
            aria-invalid={!!err("aliases")}
          />
          {errBox("aliases")}
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Rayon</span>
          <select
            value={aisle}
            onChange={(e) => setAisle(e.target.value)}
            className="input-base"
            aria-invalid={!!err("aisle")}
          >
            <option value="">À compléter</option>
            {initial?.aisle && !aisles.data.some((a) => a.code === initial.aisle) && (
              <option value={initial.aisle}>{initial.aisle} (hors liste)</option>
            )}
            {aisles.data.map((a) => (
              <option key={a.code} value={a.code}>
                {a.label}
              </option>
            ))}
          </select>
          {errBox("aisle")}
        </label>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-sm text-ink-mid">
            <input type="checkbox" checked={isBasic} onChange={(e) => setIsBasic(e.target.checked)} />
            Ingrédient de base (sel, huile… : hors liste de courses)
          </label>
          {statusEditable && (
            <label className="flex items-center gap-2 text-sm text-ink-mid">
              <input
                type="checkbox"
                checked={status === "active"}
                onChange={(e) => setStatus(e.target.checked ? "active" : "inactive")}
              />
              Actif (décoché : les batch cookers ne le trouvent plus)
            </label>
          )}
          {errBox("status")}
        </div>
      </div>

      <div>
        <p className="field-label flex items-center gap-1">
          Allergènes
          <InfoPopover label="Allergènes ou « aucun » ?">
            Cochez les allergènes que l&apos;ingrédient contient, ou « Aucun allergène » s&apos;il n&apos;en
            contient aucun des 14. Sans l&apos;un ni l&apos;autre, l&apos;entrée reste « à compléter ».
          </InfoPopover>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {allergenList.data.map((a) => {
            const on = allergens.includes(a.code);
            return (
              <button
                key={a.code}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setAllergens(on ? allergens.filter((x) => x !== a.code) : [...allergens, a.code]);
                  if (!on) setNone(false);
                }}
                className={chip(on)}
              >
                {a.label}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={none}
            onClick={() => {
              setNone(!none);
              if (!none) setAllergens([]);
            }}
            className={chip(none)}
          >
            Aucun allergène
          </button>
        </div>
        {errBox("allergens")}
      </div>

      <div>
        <p className="field-label flex items-center gap-1">
          Régimes compatibles
          <InfoPopover label="Que cocher ?">
            Les régimes que cet ingrédient permet. Une recette n&apos;affiche un régime que si tous ses
            ingrédients le permettent.
          </InfoPopover>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {diets.data.map((d) => {
            const on = chosen.includes(d.code);
            return (
              <button
                key={d.code}
                type="button"
                aria-pressed={on}
                onClick={() => setChosen(on ? chosen.filter((x) => x !== d.code) : [...chosen, d.code])}
                className={chip(on)}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        {errBox("diets")}
      </div>

      <div>
        <p className="field-label">Mois de saison (aucun : pas de saison)</p>
        <div className="flex flex-wrap gap-1.5">
          {MONTHS.map((m, i) => {
            const on = months.includes(i + 1);
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setMonths(on ? months.filter((x) => x !== i + 1) : [...months, i + 1].sort((a, b) => a - b))
                }
                className={chip(on)}
              >
                {m}
              </button>
            );
          })}
        </div>
        {errBox("seasonMonths")}
      </div>

      {apiError != null && apiField === null && (
        <p role="alert" className="text-[12px] text-danger">
          {adminErrorMessage(apiError)}
        </p>
      )}

      {shownImpact && (
        <div role="status" className="rounded-xl border border-warning bg-cream-soft p-4 text-sm text-ink-mid">
          <p className="flex items-start gap-2 font-semibold text-navy">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
            {impactLine(shownImpact, allergenChange)}
          </p>
          <p className="mt-1">Enregistrez pour reporter la modification dans ces recettes, ou revenez en arrière.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!name.trim() || saving || impactCall.isPending}
          className="btn btn-primary"
        >
          {saving || impactCall.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          {shownImpact ? "Confirmer et enregistrer" : needsImpact ? "Voir l'impact" : submitLabel}
        </button>
        {shownImpact && (
          <button type="button" onClick={() => setImpact(null)} className="btn btn-outline">
            Revenir au formulaire
          </button>
        )}
      </div>
    </form>
  );
}

/** « Cette modification touche N recettes de M chefs ; K perdront… » */
export function impactLine(i: IngredientImpact, allergenChange: boolean): string {
  if (i.dishes === 0) return "Aucune recette n'utilise cet ingrédient : la modification ne touche rien.";
  const s = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
  let line = `Cette modification touche ${s(i.dishes, "recette", "recettes")} de ${s(i.chefs, "chef", "chefs")}`;
  if (allergenChange && i.verifiedDishes > 0) {
    line += ` ; ${i.verifiedDishes} ${
      i.verifiedDishes > 1 ? "perdront" : "perdra"
    } leur confirmation d'allergènes et ne ${i.verifiedDishes > 1 ? "seront" : "sera"} plus réservable${
      i.verifiedDishes > 1 ? "s" : ""
    } jusqu'à reconfirmation`;
  }
  return `${line}.`;
}
