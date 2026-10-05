"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  Loader2,
  RotateCw,
  Users,
  X,
} from "lucide-react";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import SignedDocDialog, { type SignedDoc } from "@/components/admin/SignedDocDialog";
import ReasonDialog from "@/components/ui/ReasonDialog";
import { cn, formatDate, initials } from "@/lib/utils";
import {
  useSetChefVerification,
  verificationMessage,
  useApproveApplication,
  useChefApplication,
  useDecideDocument,
  useDocumentDownload,
  useRejectApplication,
  useRequestChanges,
} from "@/lib/api/admin";
import type {
  ChefApplicationDocument,
  ChefApplicationStatus,
  ChefDocumentFamily,
  ChefDocumentStatus,
} from "@/lib/api/types";

/* ─────────────────────────────────────────────────────────────────────────────
   Dossier d'une candidature — `GET /admin/chef-applications/{id}`.

   Le détail ne reprend pas les champs calculés de la liste : ni `name`, ni
   `city`. Le nom se recompose depuis `identity`, la ville depuis `address`.
   Les libellés des pièces viennent de l'API et font foi sur notre table.

   Les décisions (valider une pièce, demander des compléments, approuver,
   refuser) passent par le proxy same-origin `/lf-api/*` : aucun préflight,
   donc le `PATCH` d'une pièce fonctionne malgré le CORS de l'API qui
   n'annonce que `GET, HEAD, POST`.
   ───────────────────────────────────────────────────────────────────────────── */

const STATUS_LABEL: Record<ChefApplicationStatus, string> = {
  submitted: "À instruire",
  "changes-requested": "Compléments demandés",
  approved: "Approuvée",
  rejected: "Refusée",
};

const STATUS_TONE: Record<ChefApplicationStatus, BadgeTone> = {
  submitted: "info",
  "changes-requested": "warning",
  approved: "success",
  rejected: "danger",
};

/** Familles de pièces, dans l'ordre où on les instruit. */
const FAMILIES: { id: ChefDocumentFamily; label: string; hint: string }[] = [
  {
    id: "blocking",
    label: "Obligatoires",
    hint: "L’approbation est refusée tant qu’elles ne sont pas validées.",
  },
  {
    id: "conditional",
    label: "Selon la situation",
    hint: "Demandées d’après les réponses du candidat.",
  },
  {
    id: "recommended",
    label: "Facultatives",
    hint: "Elles renforcent le dossier sans le bloquer.",
  },
];

const DOC_TONE: Record<ChefDocumentStatus, BadgeTone> = {
  valid: "success",
  submitted: "info",
  rejected: "danger",
  expired: "warning",
  missing: "neutral",
};

const DOC_STATUS_LABEL: Record<ChefDocumentStatus, string> = {
  valid: "Validée",
  submitted: "À examiner",
  rejected: "Refusée",
  expired: "Expirée",
  missing: "Non déposée",
};

const WORK_STATUS_LABEL: Record<string, string> = {
  "eu-citizen": "Ressortissant français ou de l’UE",
  "residence-permit": "Titre de séjour autorisant à travailler",
  "renewal-pending": "Titre de séjour en cours de renouvellement",
  other: "Autre situation",
};

const LEGAL_FORM_LABEL: Record<string, string> = {
  micro: "Micro ou auto-entrepreneur",
  "other-company": "Autre forme d’entreprise",
  "not-registered": "Pas d’entreprise",
};

const DOSSIER_STATUS_LABEL: Record<string, string> = {
  draft: "Incomplet",
  complete: "Complet",
  reviewing: "En vérification",
  validated: "Validé",
};

/**
 * Clés que cette page sait rendre. Tout ce que l'API renvoie en plus est listé
 * en bas de l'écran : tant que le contrat n'est pas publié, c'est le dossier
 * lui-même qui nous apprend ce qu'il contient.
 */
const RENDERED_KEYS = new Set([
  "id",
  "reference",
  "status",
  "identity",
  "address",
  "interventionZones",
  "workAuthorization",
  "company",
  "consent",
  "submittedAt",
  "decidedAt",
  "chefProfileId",
  "dossierStatus",
  "canApprove",
  "documents",
  "refusal",
]);

const formatSiret = (s: string) =>
  s.replace(/\D/g, "").replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, "$1 $2 $3 $4");

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} Ko`
    : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;

export default function CandidatureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isPending, isError, error, refetch } = useChefApplication(id);
  const [rawOpen, setRawOpen] = useState(false);

  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-lg bg-cream-soft" />
        <div className="h-64 animate-pulse rounded-lg bg-cream-soft" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg bg-paper py-12">
        <EmptyState
          Icon={Users}
          title="Dossier introuvable"
          text={
            error instanceof Error
              ? error.message
              : "Cette candidature n'existe pas, ou l'API n'a pas répondu."
          }
        />
        <div className="flex justify-center gap-2">
          <button onClick={() => refetch()} className="btn btn-navy">
            <RotateCw className="h-4 w-4" /> Réessayer
          </button>
          <Link href="/batchcookers?vue=candidatures" className="btn btn-outline">
            Toutes les candidatures
          </Link>
        </div>
      </div>
    );
  }

  const { identity, address, company, workAuthorization, interventionZones } = data;
  const fullName = `${identity.firstName} ${identity.lastName}`.trim();
  const documents = data.documents ?? [];
  const blockingLeft = documents.filter(
    (d) => d.family === "blocking" && d.status !== "valid",
  );

  // Champs présents dans la réponse mais pas encore à l'écran. Une valeur nulle
  // ou vide ne compte pas : elle n'apprend rien.
  const unrendered = Object.entries(data as unknown as Record<string, unknown>)
    .filter(([k, v]) => {
      if (RENDERED_KEYS.has(k)) return false;
      if (v == null) return false;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === "object") return Object.keys(v as object).length > 0;
      return v !== "";
    })
    .map(([k, v]) => ({
      key: k,
      preview:
        typeof v === "object" ? (Array.isArray(v) ? "tableau" : "objet") : String(v),
    }));

  return (
    <div className="space-y-6">
      <Link
        href="/batchcookers?vue=candidatures"
        className="inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Toutes les candidatures
      </Link>

      {/* ── En-tête ────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(0,35,75,0.1)] pb-5">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white"
          >
            {initials(fullName)}
          </span>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
              {data.reference}
            </p>
            <h1 className="mt-0.5 font-display text-2xl font-bold text-navy">{fullName}</h1>
            <p className="mt-1 text-sm text-ink-mid">
              {[address.city, identity.email, identity.phone].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone={STATUS_TONE[data.status]}>{STATUS_LABEL[data.status]}</Badge>
          <p className="text-xs text-ink-soft">Déposée le {formatDate(data.submittedAt)}</p>
          {data.decidedAt && (
            <p className="text-xs text-ink-soft">Décidée le {formatDate(data.decidedAt)}</p>
          )}
          <Link
            href={`/batchcookers/${data.chefProfileId}`}
            className="text-xs font-semibold text-terra underline-offset-4 hover:underline"
          >
            Voir le profil batch cooker
          </Link>
        </div>
      </header>

      {/* ── Ce qui empêche d'approuver ─────────────────────────────────── */}
      <section
        className={cn(
          "rounded-lg px-5 py-4",
          data.canApprove ? "bg-success-soft" : "bg-warning-soft",
        )}
      >
        <p className="text-sm font-semibold text-navy">
          {data.canApprove
            ? "Ce dossier peut être approuvé."
            : blockingLeft.length > 0
              ? `Approbation impossible : ${blockingLeft.length} pièce${blockingLeft.length > 1 ? "s" : ""} obligatoire${blockingLeft.length > 1 ? "s" : ""} non validée${blockingLeft.length > 1 ? "s" : ""}.`
              : "Approbation impossible en l’état."}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink-mid">
          Dossier{" "}
          <span className="font-semibold text-navy">
            {DOSSIER_STATUS_LABEL[data.dossierStatus] ?? data.dossierStatus}
          </span>
          {blockingLeft.length > 0 && <> — {blockingLeft.map((d) => d.label).join(", ")}.</>}{" "}
          C’est l’API qui tranche : elle refuse l’approbation tant que la pièce
          d’identité et le justificatif d’immatriculation ne sont pas validés.
        </p>
      </section>

      {data.refusal?.reason && (
        <section className="rounded-lg bg-danger-soft px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-danger">
            Motif du refus, lu par le candidat
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink">{data.refusal.reason}</p>
          {data.refusal.allowReapplyAfter && (
            <p className="mt-2 text-xs text-ink-mid">
              Peut recandidater à partir du {formatDate(data.refusal.allowReapplyAfter)}
            </p>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_20rem]">
        {/* ── Ce qui a été déclaré ─────────────────────────────────────── */}
        <section className="space-y-6 rounded-lg bg-paper p-5 lg:p-6">
          <Block title="Identité et adresse">
            <Row label="Nom" value={fullName} />
            <Row label="Email" value={identity.email} mono />
            <Row label="Téléphone" value={identity.phone} mono />
            <Row
              label="Adresse"
              value={[
                address.street,
                address.line2,
                [address.postcode, address.city].filter(Boolean).join(" "),
              ]
                .filter(Boolean)
                .join(", ")}
            />
          </Block>

          <Block title="Autorisation de travail">
            <Row
              label="Situation"
              value={WORK_STATUS_LABEL[workAuthorization.status] ?? workAuthorization.status}
            />
            <Row label="Précision" value={workAuthorization.details || undefined} />
          </Block>

          <Block title="Activité">
            <Row
              label="Statut"
              value={LEGAL_FORM_LABEL[company.legalForm] ?? company.legalForm}
            />
            <Row
              label="SIRET"
              value={company.siret ? formatSiret(company.siret) : undefined}
              mono
            />
            <Row
              label="Services à la personne"
              value={
                company.sap?.path === "type-a"
                  ? `Déclaration propre${company.sap.declarationNumber ? ` · ${company.sap.declarationNumber}` : ""}`
                  : company.sap?.path === "type-b"
                    ? "Portés par la coopérative"
                    : undefined
              }
            />
          </Block>

          {interventionZones.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-base font-bold text-navy">
                Zones d’intervention
              </h2>
              <ul className="space-y-2 border-t border-[rgba(0,35,75,0.08)] pt-3">
                {interventionZones.map((z, i) => (
                  <li key={z.regionCode ?? i} className="text-sm">
                    <span className="font-semibold text-navy">
                      {z.regionLabel ?? z.regionCode}
                    </span>
                    <span className="block text-xs text-ink-mid">
                      {z.scope === "cities" && z.cities.length > 0
                        ? z.cities.map((c) => c.name).join(", ")
                        : "Toute la région"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Block title="Consentement">
            <Row
              label="Politique de confidentialité"
              value={data.consent.privacyPolicy ? "Acceptée" : "Refusée"}
            />
            <Row label="Conditions" value={data.consent.terms ? "Acceptées" : "Refusées"} />
            <Row label="Horodatage" value={formatDate(data.consent.acceptedAt)} />
          </Block>
        </section>

        {/* ── Pièces ───────────────────────────────────────────────────── */}
        <aside className="space-y-5 rounded-lg bg-paper p-5 lg:sticky lg:top-6 lg:self-start">
          <div>
            <h2 className="font-display text-lg font-bold text-navy">Pièces du dossier</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-mid">
              {documents.filter((d) => d.status === "valid").length} validée
              {documents.filter((d) => d.status === "valid").length > 1 ? "s" : ""} sur{" "}
              {documents.length}
            </p>
          </div>

          {FAMILIES.map(({ id: family, label, hint }) => {
            const docs = documents.filter((d) => d.family === family);
            if (docs.length === 0) return null;
            return (
              <div key={family}>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-navy">
                  {label}
                </h3>
                <p className="mb-2 mt-0.5 text-[11px] leading-snug text-ink-soft">{hint}</p>
                <ul className="divide-y divide-[rgba(0,35,75,0.08)] border-y border-[rgba(0,35,75,0.08)]">
                  {docs.map((doc) => (
                    <DocumentRow key={doc.type} doc={doc} appId={data.id} />
                  ))}
                </ul>
              </div>
            );
          })}

          {documents.length === 0 && (
            <p className="rounded-lg bg-cream-soft px-4 py-6 text-center text-sm text-ink-soft">
              Aucune pièce dans la réponse de l&apos;API pour ce dossier.
            </p>
          )}


          <DecisionBar
            appId={data.id}
            canApprove={data.canApprove}
            decided={data.status === "approved" || data.status === "rejected"}
            documents={documents}
            chefProfileId={data.chefProfileId}
            approuve={data.status === "approved"}
          />
        </aside>


      </div>

      {/* ── Ce que l'API renvoie et qu'on n'affiche pas encore ─────────── */}
      {unrendered.length > 0 && (
        <section className="rounded-lg bg-warning-soft px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#9A6E15]">
            {unrendered.length} champ{unrendered.length > 1 ? "s" : ""} non affiché
            {unrendered.length > 1 ? "s" : ""}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-mid">
            L&apos;API renvoie ces champs, l&apos;écran ne les rend pas encore.
          </p>
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {unrendered.map(({ key, preview }) => (
              <li
                key={key}
                className="rounded-full bg-paper px-2.5 py-1 font-mono text-[11px] text-navy"
              >
                {key}
                <span className="ml-1.5 text-ink-soft">{preview}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Réponse brute ──────────────────────────────────────────────── */}
      <section>
        <button
          type="button"
          onClick={() => setRawOpen((v) => !v)}
          aria-expanded={rawOpen}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-mid hover:text-navy"
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", rawOpen && "rotate-180")}
          />
          Réponse brute de l’API
        </button>
        {rawOpen && (
          <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-navy p-4 font-mono text-[11px] leading-relaxed text-white/80">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </section>
    </div>
  );
}

function DocumentRow({
  doc,
  appId,
}: {
  doc: ChefApplicationDocument;
  appId: string;
}) {
  const meta = [
    doc.fileName,
    doc.sizeBytes ? formatSize(doc.sizeBytes) : null,
    doc.submittedAt ? `déposée le ${formatDate(doc.submittedAt)}` : null,
    doc.expiresOn ? `expire le ${formatDate(doc.expiresOn)}` : null,
    doc.version > 1 ? `version ${doc.version}` : null,
  ].filter(Boolean);

  const decide = useDecideDocument(appId);
  const download = useDocumentDownload(appId);
  const [refusing, setRefusing] = useState(false);
  const [preview, setPreview] = useState<SignedDoc | null>(null);

  // On ne décide que d'une pièce déposée : rien à juger sur un dossier vide.
  const deposited = doc.version > 0;
  const busy = decide.isPending;

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug text-navy">{doc.label}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-ink-soft">
            {meta.length > 0 ? meta.join(" · ") : "Aucun dépôt"}
          </p>
          {doc.reason && (
            <p className="mt-1 text-[11px] leading-snug text-danger">{doc.reason}</p>
          )}
        </div>
        <Badge className="shrink-0" tone={DOC_TONE[doc.status] ?? "neutral"}>
          {DOC_STATUS_LABEL[doc.status] ?? doc.status}
        </Badge>
      </div>

      {deposited && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={download.isPending}
            onClick={() => {
              // L'URL vit cinq minutes et chaque consultation est journalisée :
              // on la demande au clic, jamais en avance.
              setPreview({ label: doc.label, fileName: doc.fileName });
              download.mutate(doc.type, {
                onSuccess: (r) =>
                  setPreview({ label: doc.label, url: r.url, fileName: doc.fileName }),
              });
            }}
            className="btn btn-outline btn-sm"
          >
            {download.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
            Consulter
          </button>

          {doc.status !== "valid" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => decide.mutate({ type: doc.type, decision: "valid" })}
              className="btn btn-sm border border-success/40 text-success hover:bg-success-soft"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Valider
            </button>
          )}

          {doc.status !== "rejected" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setRefusing(true)}
              className="btn btn-sm border border-danger/40 text-danger hover:bg-danger-soft"
            >
              <X className="h-3 w-3" /> Refuser
            </button>
          )}
        </div>
      )}

      <SignedDocDialog
        doc={preview}
        loading={download.isPending}
        error={download.isError}
        onClose={() => setPreview(null)}
      />

      <ReasonDialog
        open={refusing}
        onClose={() => setRefusing(false)}
        title={`Refuser «\u00a0${doc.label}\u00a0»`}
        lead="Le candidat lit ce motif mot pour mot et dépose une nouvelle version. Dites ce qui ne va pas et ce qu'il faut envoyer."
        placeholder="L'extrait date de plus de 3 mois. Merci d'envoyer un avis de situation récent."
        confirmLabel="Refuser la pièce"
        pending={decide.isPending}
        error={decide.isError ? "Le refus n'a pas été enregistré." : null}
        onConfirm={(reason) =>
          decide.mutate(
            { type: doc.type, decision: "rejected", reason },
            { onSuccess: () => setRefusing(false) },
          )
        }
      />
    </li>
  );
}

/**
 * Ce que l'admin peut décider sur l'ensemble du dossier. `canApprove` vient de
 * l'API : c'est elle qui sait si les pièces bloquantes sont validées, et elle
 * refusera l'approbation sinon.
 */
function DecisionBar({
  appId,
  canApprove,
  decided,
  documents,
  chefProfileId,
  approuve,
}: {
  appId: string;
  canApprove: boolean;
  decided: boolean;
  documents: ChefApplicationDocument[];
  chefProfileId: string;
  approuve: boolean;
}) {
  const approve = useApproveApplication(appId);
  const reject = useRejectApplication(appId);
  const changes = useRequestChanges(appId);

  const [rejecting, setRejecting] = useState(false);
  const [asking, setAsking] = useState(false);
  const [wanted, setWanted] = useState<string[]>([]);
  const [publishNow, setPublishNow] = useState(false);

  if (decided) {
    return <MiseEnLigne chefProfileId={chefProfileId} approuve={approuve} />;
  }

  const toggle = (t: string) =>
    setWanted((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <div className="space-y-3 border-t border-[rgba(0,35,75,0.1)] pt-4">
      {/*
       * L'approbation vérifie le batch cooker mais le laisse hors ligne, sauf
       * si on le dit ici. C'est une vraie décision, pas une option : elle
       * s'affiche comme telle, et dit ce qui se passe dans les deux cas.
       */}
      <fieldset>
        <legend className="field-label">Après approbation</legend>
        <div className="grid gap-2">
          {(
            [
              {
                v: false,
                t: "Vérifié, hors ligne",
                d: "Vous relisez sa vitrine, puis vous la mettez en ligne d'ici.",
              },
              {
                v: true,
                t: "Vérifié et en ligne",
                d: "Il devient réservable tout de suite par les clients.",
              },
            ] as const
          ).map(({ v, t, d }) => (
            <label
              key={String(v)}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 transition-colors",
                publishNow === v
                  ? "border-navy bg-cream-soft"
                  : "border-[rgba(0,35,75,0.12)] hover:border-navy/40",
              )}
            >
              <input
                type="radio"
                name="publish-now"
                checked={publishNow === v}
                onChange={() => setPublishNow(v)}
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-navy">{t}</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-soft">
                  {d}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        disabled={!canApprove || approve.isPending}
        title={canApprove ? undefined : "Les pièces obligatoires ne sont pas toutes validées."}
        onClick={() => approve.mutate({ isActive: publishNow })}
        className="btn btn-primary w-full justify-center"
      >
        {approve.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Approbation…
          </>
        ) : (
          <>
            <Check className="h-4 w-4" /> Approuver la candidature
          </>
        )}
      </button>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="btn btn-outline btn-sm flex-1 justify-center"
        >
          Demander des compléments
        </button>
        <button
          type="button"
          onClick={() => setRejecting(true)}
          className="btn btn-sm flex-1 justify-center border border-danger/40 text-danger hover:bg-danger-soft"
        >
          Refuser
        </button>
      </div>

      {approve.isError && (
        <p role="alert" className="text-[12px] leading-relaxed text-danger">
          L&apos;approbation a été refusée. L&apos;API vérifie elle-même que les
          pièces bloquantes sont validées.
        </p>
      )}

      <ReasonDialog
        open={asking}
        onClose={() => setAsking(false)}
        title="Demander des compléments"
        lead="Le candidat reçoit ce message par email, mot pour mot, avec un lien vers son dossier."
        placeholder="Votre attestation RC Pro s'arrête au 31/12/2026. Pouvez-vous envoyer celle de l'année en cours ?"
        confirmLabel="Envoyer la demande"
        maxLength={1000}
        pending={changes.isPending}
        error={
          changes.isError
            ? "La demande n'est pas partie."
            : wanted.length === 0
              ? "Choisissez au moins une pièce à redemander."
              : null
        }
        onConfirm={(message) => {
          if (wanted.length === 0) return;
          changes.mutate(
            { message, documentTypes: wanted },
            {
              onSuccess: () => {
                setAsking(false);
                setWanted([]);
              },
            },
          );
        }}
      >
        <div className="mt-4">
          <p className="field-label">Pièces à redemander</p>
          <ul className="flex flex-wrap gap-1.5">
            {documents.map((d) => {
              const on = wanted.includes(d.type);
              return (
                <li key={d.type}>
                  <button
                    type="button"
                    onClick={() => toggle(d.type)}
                    aria-pressed={on}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                      on
                        ? "border-navy bg-navy text-white"
                        : "border-[rgba(0,35,75,0.18)] text-ink-mid hover:bg-cream-soft",
                    )}
                  >
                    {d.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </ReasonDialog>

      <ReasonDialog
        open={rejecting}
        onClose={() => setRejecting(false)}
        title="Refuser la candidature"
        lead="Le candidat lit ce motif tel quel. Son compte reste ouvert, en lecture seule, et il pourra recandidater."
        placeholder="Votre zone d'intervention n'est pas encore couverte par Lab's Food."
        confirmLabel="Refuser la candidature"
        pending={reject.isPending}
        error={reject.isError ? "Le refus n'a pas été enregistré." : null}
        onConfirm={(reason) =>
          reject.mutate({ reason }, { onSuccess: () => setRejecting(false) })
        }
      />
    </div>
  );
}

/**
 * Le second geste.
 *
 * Approuver vérifie le batch cooker ; ça ne le rend pas réservable. L'API
 * sépare les deux exprès — on relit la vitrine, puis on l'expose. Sans ce
 * bouton, un dossier approuvé sans cocher « en ligne » restait invisible et
 * personne ne pouvait plus rien y faire.
 */
function MiseEnLigne({
  chefProfileId,
  approuve,
}: {
  chefProfileId: string;
  approuve: boolean;
}) {
  const verif = useSetChefVerification(chefProfileId);
  const [dernier, setDernier] = useState<"online" | "offline" | null>(null);

  if (!approuve) {
    return (
      <div className="rounded-lg bg-cream-soft px-4 py-3 text-xs leading-relaxed text-ink-mid">
        Cette candidature a été refusée. Pour revenir en arrière, le candidat
        doit candidater à nouveau.
      </div>
    );
  }

  const agir = (isActive: boolean) =>
    verif.mutate(
      { isActive },
      { onSuccess: () => setDernier(isActive ? "online" : "offline") },
    );

  return (
    <div className="space-y-3 border-t border-[rgba(0,35,75,0.1)] pt-4">
      <div>
        <p className="text-[13px] font-semibold text-navy">Vitrine publique</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-soft">
          Approuver vérifie le batch cooker. Tant que sa vitrine n&apos;est pas
          mise en ligne, aucun client ne le voit ni ne peut le réserver.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => agir(true)}
          disabled={verif.isPending}
          className="btn btn-primary btn-sm flex-1 justify-center"
        >
          {verif.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          Mettre en ligne
        </button>
        <button
          type="button"
          onClick={() => agir(false)}
          disabled={verif.isPending}
          className="btn btn-outline btn-sm flex-1 justify-center"
        >
          Retirer
        </button>
      </div>

      {dernier && !verif.isPending && (
        <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-success">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {dernier === "online"
            ? "Vitrine en ligne : les clients peuvent le réserver."
            : "Vitrine retirée : il n'apparaît plus aux clients."}
        </p>
      )}

      {verif.isError && (
        <p role="alert" className="flex items-start gap-1.5 text-[12px] leading-relaxed text-danger">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {verificationMessage(verif.error)}
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-ink-soft">
        L&apos;état actuel n&apos;est pas lisible ici : l&apos;API n&apos;expose
        pas la fiche d&apos;un batch cooker. Ces deux boutons sont sans danger à
        répéter.
      </p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-base font-bold text-navy">{title}</h2>
      <dl className="space-y-2.5 border-t border-[rgba(0,35,75,0.08)] pt-3">{children}</dl>
    </section>
  );
}

function Row({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="shrink-0 text-xs text-ink-soft">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-right leading-snug text-navy",
          mono && "font-mono text-[12px]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
