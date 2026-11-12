"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Loader2, UserPlus } from "lucide-react";
import Hint from "@/components/ui/Hint";
import { cn } from "@/lib/utils";
import { useRegions } from "@/lib/api/referentials";
import { adminErrorMessage } from "@/lib/api/errors";
import {
  useOpenChefApplication,
  type OpenApplicationInput,
  type OpenedApplication,
} from "@/lib/api/admin";

/* ─────────────────────────────────────────────────────────────────────────────
   Ouvrir la candidature d'un batch cooker (`POST /admin/chef-applications`).

   La même fiche que le site public, saisie par l'admin. Le compte est créé
   non vérifié et inactif, et la personne reçoit son lien de connexion par
   email : les pièces, la revue et l'approbation suivent le parcours habituel,
   donc aucun batch cooker n'est vérifié sans pièces validées.

   ponytail: zones = régions entières. Un découpage ville par ville se règle
   ensuite (`ZonesEditor`, après approbation) ou par le candidat lui-même.
   ───────────────────────────────────────────────────────────────────────────── */

type WorkStatus = OpenApplicationInput["workAuthorization"]["status"];
type LegalForm = OpenApplicationInput["company"]["legalForm"];
type SapPath = OpenApplicationInput["company"]["sap"]["path"];

const WORK_STATUS: { id: WorkStatus; label: string }[] = [
  { id: "eu-citizen", label: "Citoyen de l'Union européenne" },
  { id: "residence-permit", label: "Titre de séjour" },
  { id: "renewal-pending", label: "Renouvellement en cours" },
  { id: "other", label: "Autre situation" },
];

const LEGAL_FORMS: { id: LegalForm; label: string }[] = [
  { id: "micro", label: "Micro-entreprise" },
  { id: "other-company", label: "Autre société" },
  { id: "not-registered", label: "Pas encore immatriculé" },
];

export default function ChefApplicationForm({
  onCancel,
}: {
  onCancel?: () => void;
}) {
  const open = useOpenChefApplication();
  const regions = useRegions().data ?? [];

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [postcode, setPostcode] = useState("");
  const [city, setCity] = useState("");
  const [zones, setZones] = useState<string[]>([]);
  const [workStatus, setWorkStatus] = useState<WorkStatus>("eu-citizen");
  const [workDetails, setWorkDetails] = useState("");
  const [legalForm, setLegalForm] = useState<LegalForm>("micro");
  const [siret, setSiret] = useState("");
  const [sapPath, setSapPath] = useState<SapPath>("type-b");
  const [sapNumber, setSapNumber] = useState("");
  const [done, setDone] = useState<OpenedApplication | null>(null);

  const registered = legalForm !== "not-registered";
  const phoneOk = /^\+[1-9]\d{7,14}$/.test(phone.trim());
  const canSubmit =
    !!firstName.trim() &&
    !!lastName.trim() &&
    !!email.trim() &&
    phoneOk &&
    !!street.trim() &&
    postcode.trim().length === 5 &&
    !!city.trim() &&
    zones.length > 0 &&
    (workStatus !== "other" || workDetails.trim().length >= 10) &&
    (!registered || siret.trim().length === 14) &&
    (sapPath !== "type-a" || !!sapNumber.trim());

  const toggleZone = (code: string) =>
    setZones((z) => (z.includes(code) ? z.filter((c) => c !== code) : [...z, code]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    open.mutate(
      {
        identity: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
        },
        address: { street: street.trim(), postcode: postcode.trim(), city: city.trim() },
        interventionZones: zones.map((code) => ({
          regionCode: code,
          regionLabel: regions.find((r) => r.code === code)?.label ?? code,
          scope: "region" as const,
          cities: [] as [],
        })),
        workAuthorization: {
          status: workStatus,
          ...(workStatus === "other" ? { details: workDetails.trim() } : {}),
        },
        company: {
          legalForm,
          ...(registered ? { siret: siret.trim() } : {}),
          sap: {
            path: sapPath,
            ...(sapPath === "type-a" ? { declarationNumber: sapNumber.trim() } : {}),
          },
        },
      },
      { onSuccess: setDone },
    );
  };

  if (done) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-2xl border border-success/30 bg-success-soft/60 px-4 py-3">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <div className="min-w-0 text-xs leading-relaxed text-ink-mid">
            <p className="font-semibold text-navy">
              Candidature {done.reference} ouverte pour {email.trim()}
            </p>
            <p className="mt-0.5">
              {done.invitation.delivered
                ? "Son lien de connexion lui a été envoyé par email (valable 7 jours)."
                : "L'email n'est pas parti : renvoie le lien depuis la fiche de la candidature."}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/candidatures/${done.id}`} className="btn btn-primary flex-1">
            Ouvrir le dossier
          </Link>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn btn-ghost">
              Fermer
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Hint id="ouverture-candidature-admin">
        Le compte est créé non vérifié et inactif. La personne reçoit un lien de
        connexion par email et accepte les CGU à sa première connexion : rien n&apos;est
        accepté à sa place. Ses pièces suivent ensuite la revue habituelle.
      </Hint>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Prénom" required>
          <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input-base" />
        </Field>
        <Field label="Nom" required>
          <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className="input-base" />
        </Field>
      </div>
      <Field label="Adresse email" required>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" className="input-base" />
      </Field>
      <Field label="Téléphone" required hint="Format international, sans espace : +33612345678">
        <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33612345678" className="input-base" />
      </Field>

      <Field label="Adresse" required>
        <input required value={street} onChange={(e) => setStreet(e.target.value)} placeholder="12 rue des Lilas" className="input-base" />
      </Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Code postal" required>
          <input required inputMode="numeric" maxLength={5} value={postcode} onChange={(e) => setPostcode(e.target.value)} className="input-base" />
        </Field>
        <div className="col-span-2">
          <Field label="Ville" required hint="Vérifiée avec le code postal.">
            <input required value={city} onChange={(e) => setCity(e.target.value)} className="input-base" />
          </Field>
        </div>
      </div>

      <Field label="Régions couvertes" required>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {regions.map((r) => {
            const on = zones.includes(r.code);
            return (
              <label
                key={r.code}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                  on
                    ? "border-navy bg-navy/5 text-navy"
                    : "border-[rgba(0,35,75,0.15)] text-ink-mid hover:bg-cream-soft",
                )}
              >
                <input type="checkbox" checked={on} onChange={() => toggleZone(r.code)} />
                {r.label}
              </label>
            );
          })}
        </div>
      </Field>

      <Field label="Droit de travailler en France" required>
        <select value={workStatus} onChange={(e) => setWorkStatus(e.target.value as WorkStatus)} className="input-base">
          {WORK_STATUS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </Field>
      {workStatus === "other" && (
        <Field label="Précisions" required hint="10 caractères minimum.">
          <textarea value={workDetails} onChange={(e) => setWorkDetails(e.target.value)} rows={2} className="input-base" />
        </Field>
      )}

      <Field label="Statut de l'entreprise" required>
        <select value={legalForm} onChange={(e) => setLegalForm(e.target.value as LegalForm)} className="input-base">
          {LEGAL_FORMS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </Field>
      {registered && (
        <Field label="SIRET" required hint="14 chiffres, clé de contrôle vérifiée par l'API.">
          <input inputMode="numeric" maxLength={14} value={siret} onChange={(e) => setSiret(e.target.value)} className="input-base" />
        </Field>
      )}

      <Field label="Voie de déclaration SAP" required>
        <select value={sapPath} onChange={(e) => setSapPath(e.target.value as SapPath)} className="input-base">
          <option value="type-b">Type B : coopérative</option>
          <option value="type-a">Type A : déclaration NOVA</option>
        </select>
      </Field>
      {sapPath === "type-a" && (
        <Field label="Numéro de déclaration SAP" required hint="SAP suivi de 9 chiffres.">
          <input value={sapNumber} onChange={(e) => setSapNumber(e.target.value)} placeholder="SAP443061841" className="input-base" />
        </Field>
      )}

      {open.isError && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-xs leading-relaxed text-danger">
            {adminErrorMessage(open.error)}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={open.isPending || !canSubmit} className="btn btn-primary flex-1 disabled:opacity-60">
          {open.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Création…
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" /> Ouvrir la candidature
            </>
          )}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {label}
        {required && <span className="text-terra"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-soft">{hint}</span>}
    </label>
  );
}
