"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, FileUp, Loader2, Play, Upload } from "lucide-react";
import IngredientTabs from "@/components/admin/IngredientTabs";
import PropagationNotice from "@/components/admin/PropagationNotice";
import { adminErrorMessage } from "@/lib/api/errors";
import { useImportIngredients, type ImportReport } from "@/lib/api/catalog";

/* ─────────────────────────────────────────────────────────────────────────────
   L'import CSV de la liste commune (Recettes §7.4) — `/admin/ingredients/import`.

   On simule d'abord (rien n'est écrit), on lit le bilan et les erreurs ligne par
   ligne, puis on confirme : le même fichier est renvoyé avec `confirm: true`.
   ───────────────────────────────────────────────────────────────────────────── */

const MAX_BYTES = 2_000_000;
const HEADER = "nom;autres_noms;rayon;allergenes;aucun_allergene;regimes;mois;base;doute";

export default function ImportPage() {
  const importer = useImportIngredients();
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  /** Le bilan et le texte qu'il a simulé : un texte modifié depuis le rend caduc. */
  const [simulated, setSimulated] = useState<{ csv: string; report: ImportReport } | null>(null);
  const [final, setFinal] = useState<ImportReport | null>(null);

  const tooBig = csv.length > MAX_BYTES;
  const canSimulate = csv.trim().length > 0 && !tooBig && !importer.isPending;
  const current = simulated && simulated.csv === csv ? simulated.report : null;
  const canConfirm = !!current && current.errors.length === 0 && !final && !importer.isPending;

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProblem(null);
    if (file.size > MAX_BYTES) {
      setProblem(`Ce fichier fait plus de 2 Mo (${(file.size / 1_000_000).toFixed(1)} Mo).`);
      return;
    }
    try {
      // Lu comme du texte UTF-8, tel quel : l'API contrôle le contenu.
      const text = await file.text();
      if (text.length > MAX_BYTES) {
        setProblem("Ce fichier dépasse 2 000 000 de caractères.");
        return;
      }
      setCsv(text);
      setFileName(file.name);
      setSimulated(null);
      setFinal(null);
      importer.reset();
    } catch {
      setProblem("Ce fichier n'a pas pu être lu.");
    }
  }

  function simulate() {
    setFinal(null);
    importer.mutate({ csv }, { onSuccess: (report) => setSimulated({ csv, report }) });
  }

  function confirm() {
    importer.mutate({ csv, confirm: true }, { onSuccess: (report) => setFinal(report) });
  }

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card flex items-center gap-4 p-6"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/12 text-teal">
          <Upload className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-xl font-bold text-navy">Importer la liste commune</h2>
          <p className="text-sm text-ink-soft">
            Collez un CSV ou choisissez un fichier, vérifiez la simulation, puis confirmez.
          </p>
        </div>
      </motion.section>

      <IngredientTabs current="/ingredients/import" />

      <section className="card space-y-4 p-6">
        <p className="text-[13px] text-ink-mid">
          Séparateur <code>;</code>, listes séparées par <code>|</code>, booléens <code>oui</code> /{" "}
          <code>non</code>, 2 Mo et 2 000 lignes au plus. La première ligne est l&apos;en-tête :
        </p>
        <pre className="overflow-x-auto rounded-xl bg-cream-soft p-3 text-[12px] text-navy">{HEADER}</pre>

        <label className="btn btn-outline cursor-pointer">
          <FileUp className="h-4 w-4" aria-hidden /> Choisir un fichier CSV
          <input type="file" accept=".csv,text/csv,text/plain" onChange={pickFile} className="sr-only" />
        </label>
        {fileName && <span className="ml-2 text-[13px] text-ink-mid">{fileName}</span>}
        {problem && (
          <p role="alert" className="text-[12px] text-danger">
            {problem}
          </p>
        )}

        <label className="block">
          <span className="field-label">Contenu du CSV</span>
          <textarea
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value);
              setFileName(null);
              setFinal(null);
            }}
            rows={10}
            spellCheck={false}
            placeholder={`${HEADER}\\nTomate;pomme d'amour;fruits-legumes;;oui;vegan|vegetarian;6|7|8|9;non;non`}
            className="input-base font-mono text-[12px]"
            aria-invalid={tooBig}
          />
          {tooBig && (
            <span role="alert" className="mt-1 block text-[12px] text-danger">
              Le CSV dépasse 2 000 000 de caractères.
            </span>
          )}
        </label>

        <button type="button" onClick={simulate} disabled={!canSimulate} className="btn btn-primary">
          {importer.isPending && !final ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Play className="h-4 w-4" aria-hidden />
          )}
          Simuler l&apos;import
        </button>

        {importer.isError && (
          <p role="alert" className="flex items-start gap-1.5 text-[13px] text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {adminErrorMessage(importer.error)}
          </p>
        )}
      </section>

      {current && !final && (
        <section className="card space-y-4 p-6">
          <h3 className="font-display text-base font-bold text-navy">Simulation</h3>
          <Counts report={current} />
          {current.errors.length > 0 ? (
            <>
              <p className="text-[13px] text-danger">
                {current.errors.length} erreur{current.errors.length > 1 ? "s" : ""} : rien ne sera écrit tant que le
                fichier n&apos;est pas corrigé (la ligne 1 est l&apos;en-tête).
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="text-ink-soft">
                      <th className="w-20 py-1 pr-3 font-semibold">Ligne</th>
                      <th className="py-1 font-semibold">Erreur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(31,42,55,0.06)]">
                    {current.errors.map((er, k) => (
                      <tr key={`${er.line}-${k}`}>
                        <td className="py-1.5 pr-3 font-mono">{er.line === 0 ? "—" : er.line}</td>
                        <td className="py-1.5 text-navy">{er.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-ink-mid">Aucune erreur : le fichier peut être importé.</p>
          )}
          <button type="button" onClick={confirm} disabled={!canConfirm} className="btn btn-primary">
            {importer.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Upload className="h-4 w-4" aria-hidden />
            )}
            Confirmer l&apos;import
          </button>
        </section>
      )}

      {final && (
        <section className="card space-y-4 p-6">
          <h3 className="font-display text-base font-bold text-navy">Import terminé</h3>
          <Counts report={final} />
          {final.errors.length > 0 && (
            <ul className="space-y-1 text-[13px] text-danger" role="alert">
              {final.errors.map((er, k) => (
                <li key={k}>
                  {er.line > 0 ? `Ligne ${er.line} : ` : ""}
                  {er.message}
                </li>
              ))}
            </ul>
          )}
          <PropagationNotice propagation={final.propagation} />
        </section>
      )}
    </div>
  );
}

function Counts({ report }: { report: ImportReport }) {
  const items = [
    ["À créer", report.created],
    ["À mettre à jour", report.updated],
    ["Inchangés", report.unchanged],
  ] as const;
  return (
    <dl className="grid grid-cols-3 gap-3">
      {items.map(([label, n]) => (
        <div key={label} className="rounded-xl bg-cream-soft p-3 text-center">
          <dd className="font-display text-2xl font-bold text-navy">{n}</dd>
          <dt className="text-[12px] text-ink-soft">{label}</dt>
        </div>
      ))}
    </dl>
  );
}
