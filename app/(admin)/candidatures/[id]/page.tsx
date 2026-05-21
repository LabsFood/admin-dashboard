"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Calendar,
  Car,
  Check,
  Download,
  FileText,
  Globe2,
  Image as ImageIcon,
  Mail,
  MapPin,
  Maximize2,
  Phone,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { formatDate, initials } from "@/lib/utils";
import { candidatureTone } from "@/lib/status";
import {
  candidatureById,
  CANDIDATURE_STATUS_LABEL,
  DOCUMENT_LABEL,
} from "@/lib/mock/candidatures";
import type {
  CandidatureStatus,
  CandidatureDocument,
} from "@/lib/mock/types";

const PIPELINE: CandidatureStatus[] = [
  "new",
  "reviewing",
  "interview",
  "accepted",
];

export default function CandidatureDetailPage() {
  const params = useParams<{ id: string }>();
  const candidate = candidatureById(params.id);

  const [status, setStatus] = useState<CandidatureStatus>(
    candidate?.status ?? "new",
  );
  const [notes, setNotes] = useState(candidate?.internalNotes ?? "");
  const [notesSaved, setNotesSaved] = useState(false);
  const [activeDocId, setActiveDocId] = useState(
    candidate?.documents[0]?.id ?? "",
  );
  const [zoom, setZoom] = useState(false);

  if (!candidate) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="mb-3 text-5xl">🧑‍🍳</p>
        <h2 className="font-display text-2xl font-bold text-navy">
          Candidature introuvable
        </h2>
        <Link href="/candidatures" className="btn btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" /> Retour aux candidatures
        </Link>
      </div>
    );
  }

  const activeDoc =
    candidate.documents.find((d) => d.id === activeDocId) ??
    candidate.documents[0];
  const stepIndex = PIPELINE.indexOf(status);
  const age = new Date().getFullYear() - candidate.birthYear;

  return (
    <div className="space-y-6">
      <Link
        href="/candidatures"
        className="inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Toutes les candidatures
      </Link>

      {/* En-tête */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white lg:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-terra/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-terra font-display text-xl font-bold text-white">
              {initials(candidate.name)}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-bold lg:text-3xl">
                  {candidate.name}
                </h2>
                {candidate.hasHaccp && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-success-soft">
                    <ShieldCheck className="h-3 w-3" /> HACCP
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-white/65">
                {candidate.currentRole} · {age} ans
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/55">
                <MapPin className="h-3.5 w-3.5 text-terra-soft" />
                {candidate.city} · candidature du{" "}
                {formatDate(candidate.createdAt)}
              </p>
            </div>
          </div>
          <Badge tone={candidatureTone[status]} dot>
            {CANDIDATURE_STATUS_LABEL[status]}
          </Badge>
        </div>
      </motion.div>

      {/* Pipeline de recrutement */}
      <section className="card p-6">
        <h3 className="mb-5 font-display text-lg font-bold text-navy">
          Processus de recrutement
        </h3>
        {status === "rejected" ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-danger-soft px-4 py-3">
            <p className="text-sm font-semibold text-danger">
              Candidature refusée.
            </p>
            <button
              onClick={() => setStatus("new")}
              className="text-xs font-semibold text-danger underline"
            >
              Rouvrir
            </button>
          </div>
        ) : (
          <>
            <div className="relative grid grid-cols-4 gap-2">
              <div className="absolute left-0 right-0 top-4 h-0.5 bg-cream-deep" />
              <div
                className="absolute left-0 top-4 h-0.5 bg-terra transition-all"
                style={{
                  width: `${(stepIndex / (PIPELINE.length - 1)) * 100}%`,
                }}
              />
              {PIPELINE.map((step, i) => {
                const reached = i <= stepIndex;
                return (
                  <div
                    key={step}
                    className="relative flex flex-col items-center text-center"
                  >
                    <span
                      className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                        reached
                          ? "bg-terra text-white"
                          : "bg-cream-deep text-ink-soft"
                      }`}
                    >
                      {reached ? (
                        <Check className="h-4 w-4" strokeWidth={3} />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-current" />
                      )}
                    </span>
                    <p
                      className={`mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                        reached ? "text-navy" : "text-ink-soft"
                      }`}
                    >
                      {CANDIDATURE_STATUS_LABEL[step]}
                    </p>
                  </div>
                );
              })}
            </div>

            {status === "interview" && (
              <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl bg-terra-pale/40 px-4 py-3">
                <Calendar className="h-4 w-4 text-terra-deep" />
                <span className="text-sm text-navy">
                  Entretien{" "}
                  {candidate.interviewDate
                    ? `prévu le ${formatDate(candidate.interviewDate)}`
                    : "à programmer"}
                </span>
                <input
                  type="date"
                  defaultValue={candidate.interviewDate ?? ""}
                  className="input-base ml-auto w-auto py-1.5 text-xs"
                />
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[rgba(0,35,75,0.06)] pt-4">
              <span className="mr-1 text-xs font-semibold text-ink-soft">
                Faire avancer :
              </span>
              {PIPELINE.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    s === status
                      ? "bg-navy text-white"
                      : "bg-cream-soft text-ink-mid hover:bg-cream-deep"
                  }`}
                >
                  {CANDIDATURE_STATUS_LABEL[s]}
                </button>
              ))}
              <button
                onClick={() => setStatus("rejected")}
                className="ml-auto rounded-full bg-danger-soft px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger hover:text-white"
              >
                Refuser
              </button>
            </div>
          </>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          {/* Profil */}
          <section className="card p-6">
            <h3 className="mb-4 font-display text-lg font-bold text-navy">
              Profil du candidat
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Fact Icon={Award} label="Expérience" value={`${candidate.experienceYears} ans`} />
              <Fact Icon={Wallet} label="Tarif souhaité" value={`${candidate.expectedRate} €/h`} />
              <Fact
                Icon={Car}
                label="Véhicule"
                value={candidate.hasVehicle ? "Oui" : "Non"}
              />
              <Fact Icon={Calendar} label="Disponibilité" value={candidate.availability} />
              <Fact
                Icon={ShieldCheck}
                label="HACCP"
                value={candidate.hasHaccp ? "Certifié" : "Non certifié"}
              />
              <Fact Icon={Globe2} label="Langues" value={candidate.languages.join(", ")} />
            </div>

            <div className="mt-4">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                Cuisines maîtrisées
              </p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.cuisines.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-teal-pale px-2.5 py-1 text-[11px] font-medium text-teal"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                Lettre de motivation
              </p>
              <p className="rounded-2xl bg-cream-soft p-4 text-sm leading-relaxed text-ink-mid">
                {candidate.motivation}
              </p>
            </div>
          </section>

          {/* Documents */}
          <section className="card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-navy">
              <FileText className="h-4 w-4 text-terra" /> Documents joints (
              {candidate.documents.length})
            </h3>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[230px_1fr]">
              {/* Liste des documents */}
              <ul className="space-y-2">
                {candidate.documents.map((doc) => (
                  <li key={doc.id}>
                    <button
                      onClick={() => setActiveDocId(doc.id)}
                      className={`flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${
                        doc.id === activeDoc?.id
                          ? "border-terra bg-terra-pale/30"
                          : "border-[rgba(0,35,75,0.08)] hover:border-terra/40"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          doc.format === "pdf"
                            ? "bg-danger-soft text-danger"
                            : "bg-info-soft text-info"
                        }`}
                      >
                        {doc.format === "pdf" ? (
                          <FileText className="h-4 w-4" />
                        ) : (
                          <ImageIcon className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-navy">
                          {DOCUMENT_LABEL[doc.type]}
                        </p>
                        <p className="truncate font-mono text-[10px] text-ink-soft">
                          {doc.format.toUpperCase()} ·{" "}
                          {(doc.sizeKb / 1024).toFixed(1)} Mo
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              {/* Visionneuse */}
              {activeDoc && (
                <div className="overflow-hidden rounded-2xl border border-[rgba(0,35,75,0.08)]">
                  <div className="flex items-center justify-between gap-2 border-b border-[rgba(0,35,75,0.08)] bg-cream-soft px-3 py-2">
                    <p className="truncate text-xs font-semibold text-navy">
                      {activeDoc.name}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setZoom(true)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-mid hover:bg-cream-deep"
                        title="Agrandir"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="flex h-7 items-center gap-1 rounded-lg bg-navy px-2 text-[11px] font-semibold text-white"
                        title="Télécharger"
                      >
                        <Download className="h-3 w-3" /> Télécharger
                      </button>
                    </div>
                  </div>
                  <div className="bg-cream-deep/40 p-4">
                    <DocPreview doc={activeDoc} candidateName={candidate.name} />
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Contact */}
          <section className="card p-5">
            <h4 className="mb-3 font-display text-base font-bold text-navy">
              Contact
            </h4>
            <div className="space-y-1.5 text-xs text-ink-mid">
              <p className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-ink-soft" />
                {candidate.email}
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-ink-soft" />
                {candidate.phone}
              </p>
            </div>
            <div className="mt-3 flex gap-2">
              <a
                href={`mailto:${candidate.email}`}
                className="btn btn-primary flex-1"
              >
                <Mail className="h-4 w-4" /> Écrire
              </a>
              <a href={`tel:${candidate.phone}`} className="btn btn-outline">
                <Phone className="h-4 w-4" />
              </a>
            </div>
          </section>

          {/* Notes internes */}
          <section className="card p-5">
            <h4 className="mb-2 flex items-center gap-2 font-display text-base font-bold text-navy">
              <Sparkles className="h-4 w-4 text-terra" /> Notes internes
            </h4>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesSaved(false);
              }}
              rows={5}
              placeholder="Impressions, points à vérifier, retour d'entretien…"
              className="input-base resize-none text-sm"
            />
            <button
              onClick={() => setNotesSaved(true)}
              className="btn btn-primary mt-2 w-full"
            >
              {notesSaved ? (
                <>
                  <Check className="h-4 w-4" /> Note enregistrée
                </>
              ) : (
                "Enregistrer la note"
              )}
            </button>
          </section>

          {/* Décision rapide */}
          <section className="card p-5">
            <h4 className="mb-3 font-display text-base font-bold text-navy">
              Décision
            </h4>
            <div className="space-y-2">
              <button
                onClick={() => setStatus("accepted")}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-success-soft py-2.5 text-sm font-semibold text-success transition-colors hover:bg-success hover:text-white"
              >
                <BadgeCheck className="h-4 w-4" /> Recruter
              </button>
              <button
                onClick={() => setStatus("rejected")}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-danger-soft py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger hover:text-white"
              >
                <X className="h-4 w-4" /> Refuser
              </button>
            </div>
          </section>
        </aside>
      </div>

      {/* Modale plein écran */}
      {zoom && activeDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 p-4 backdrop-blur-sm"
          onClick={() => setZoom(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-cream-deep/60 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">
                {activeDoc.name}
              </p>
              <button
                onClick={() => setZoom(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <DocPreview doc={activeDoc} candidateName={candidate.name} large />
          </div>
        </div>
      )}
    </div>
  );
}

function Fact({
  Icon,
  label,
  value,
}: {
  Icon: typeof Award;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-cream-soft p-3">
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-navy">{value}</p>
    </div>
  );
}

/* ── Visionneuse de document ──────────────────────────────────────────────── */
function DocPreview({
  doc,
  candidateName,
  large = false,
}: {
  doc: CandidatureDocument;
  candidateName: string;
  large?: boolean;
}) {
  if (doc.format === "image") {
    return (
      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={doc.previewUrl}
          alt={doc.name}
          className={`w-full object-cover ${large ? "max-h-[70vh]" : "max-h-80"}`}
        />
      </div>
    );
  }

  // Aperçu PDF simulé — feuille A4 avec contenu factice selon le type.
  const isCertificate = doc.type === "haccp" || doc.type === "diploma";
  return (
    <div
      className={`mx-auto rounded-lg bg-white p-6 shadow-sm ${
        large ? "max-w-md" : ""
      }`}
      style={{ aspectRatio: "1 / 1.414" }}
    >
      {isCertificate ? (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-terra-pale text-terra-deep">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <p className="mt-3 font-display text-base font-bold text-navy">
            {doc.type === "haccp"
              ? "Certificat HACCP"
              : "Diplôme de cuisine"}
          </p>
          <p className="mt-1 text-xs text-ink-soft">Délivré à</p>
          <p className="text-sm font-semibold text-navy">{candidateName}</p>
          <div className="mt-4 w-full space-y-1.5">
            {[80, 60, 70].map((w, i) => (
              <div
                key={i}
                className="mx-auto h-1.5 rounded-full bg-cream-deep"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
          <div className="mt-5 h-9 w-9 rounded-full border-2 border-dashed border-terra/50" />
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <p className="font-display text-sm font-bold text-navy">
            {candidateName}
          </p>
          <div className="mt-1 h-1 w-16 rounded-full bg-terra" />
          <div className="mt-3 space-y-1.5">
            {[95, 88].map((w, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full bg-cream-deep"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((block) => (
              <div key={block}>
                <div className="h-1.5 w-1/3 rounded-full bg-terra-pale" />
                <div className="mt-1.5 space-y-1">
                  {[100, 92, 78].map((w, i) => (
                    <div
                      key={i}
                      className="h-1 rounded-full bg-cream-deep"
                      style={{ width: `${w}%` }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-wider text-ink-soft">
        Page 1 / {doc.pages ?? 1} · aperçu
      </p>
    </div>
  );
}
