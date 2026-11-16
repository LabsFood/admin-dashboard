"use client";

import { useState } from "react";
import { Check, Copy, ShieldAlert } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { adminErrorMessage } from "@/lib/api/errors";
import { useUrssafDossier, type UrssafDossier } from "@/lib/api/money";

/* ─────────────────────────────────────────────────────────────────────────────
   Le dossier URSSAF d'un client, à recopier sur l'espace Unipros.

   C'est le seul écran de la console qui montre un IBAN en clair. L'API trace
   chaque ouverture (`urssaf.dossier_revealed`) ; la console ne le garde pas en
   cache après fermeture, et ne le recopie nulle part ailleurs.
   ───────────────────────────────────────────────────────────────────────────── */

const FRANCE = "99100";

export default function UrssafDossierDrawer({
  linkId,
  clientName,
  chefName,
  onClose,
}: {
  linkId: string | null;
  clientName?: string;
  chefName?: string;
  onClose: () => void;
}) {
  const dossier = useUrssafDossier(linkId);

  return (
    <Drawer
      open={linkId !== null}
      onClose={onClose}
      eyebrow="Dossier URSSAF"
      title={clientName ?? "Client"}
    >
      <div className="space-y-5 p-5">
        <p className="flex items-start gap-2 text-sm leading-relaxed text-ink-mid">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
          À recopier sur l&apos;espace Unipros pour rattacher ce client
          {chefName ? ` à ${chefName}` : ""}. Cette lecture est tracée.
        </p>

        {dossier.isPending && (
          <SkeletonGroup className="card space-y-3 p-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </SkeletonGroup>
        )}

        {dossier.isError && (
          <div className="card p-5 text-sm text-ink-mid">
            <p className="font-semibold text-navy">Dossier illisible</p>
            <p className="mt-1">{adminErrorMessage(dossier.error)}</p>
          </div>
        )}

        {dossier.data && (
          <Fiche d={dossier.data.dossier} nova={dossier.data.chefNovaCode} />
        )}
      </div>
    </Drawer>
  );
}

function Fiche({ d, nova }: { d: UrssafDossier; nova: string | null }) {
  const neEnFrance = d.birthCountryCode === FRANCE;
  return (
    <div className="space-y-5">
      <Bloc titre="Identité">
        <Ligne label="Civilité" valeur={d.civility === "F" ? "Madame" : "Monsieur"} />
        <Ligne label="Nom de naissance" valeur={d.birthName} />
        {d.usageName && <Ligne label="Nom d'usage" valeur={d.usageName} />}
        <Ligne label="Prénoms" valeur={d.firstNames} />
        <Ligne label="Date de naissance" valeur={d.birthDate.split("-").reverse().join("/")} />
        <Ligne label="Pays de naissance (INSEE)" valeur={d.birthCountryCode} mono />
        {neEnFrance && (
          <>
            <Ligne label="Département de naissance" valeur={d.birthDepartmentCode ?? ""} mono />
            <Ligne
              label="Commune de naissance"
              valeur={`${d.birthCommuneName ?? ""} (${d.birthCommuneCode ?? ""})`}
            />
          </>
        )}
      </Bloc>

      <Bloc titre="Contact">
        <Ligne label="Mobile" valeur={d.mobilePhone} mono />
        <Ligne label="Email" valeur={d.email} />
        <Ligne
          label="Adresse"
          valeur={[d.address.line1, d.address.line2].filter(Boolean).join(", ")}
        />
        <Ligne label="Code postal" valeur={d.address.postalCode} mono />
        <Ligne label="Commune" valeur={d.address.city} />
        <Ligne label="Pays (INSEE)" valeur={d.address.countryCode} mono />
      </Bloc>

      <Bloc titre="Compte prélevé par l'URSSAF">
        <Ligne label="IBAN" valeur={d.iban} mono />
        <Ligne label="BIC" valeur={d.bic} mono />
        <Ligne label="Titulaire" valeur={d.accountHolder} />
      </Bloc>

      <Bloc titre="Batch cooker">
        <Ligne label="Numéro SAP / NOVA" valeur={nova ?? "Non renseigné"} mono={!!nova} />
      </Bloc>
    </div>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {titre}
      </h3>
      <dl className="card divide-y divide-[rgba(0,35,75,0.06)]">{children}</dl>
    </section>
  );
}

function Ligne({ label, valeur, mono }: { label: string; valeur: string; mono?: boolean }) {
  const [copie, setCopie] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2">
      <div className="min-w-0">
        <dt className="text-xs text-ink-soft">{label}</dt>
        <dd className={mono ? "font-mono text-sm tabular-nums text-ink" : "text-sm text-ink"}>
          {valeur}
        </dd>
      </div>
      <button
        type="button"
        aria-label={`Copier ${label}`}
        onClick={() => {
          void navigator.clipboard.writeText(valeur).then(() => {
            setCopie(true);
            setTimeout(() => setCopie(false), 1500);
          });
        }}
        className="hit flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-ink-soft hover:bg-cream-deep hover:text-navy"
      >
        {copie ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
