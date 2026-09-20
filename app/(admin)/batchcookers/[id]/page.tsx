"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  Check,
  FileWarning,
  Globe2,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  CalendarDays,
  Clock,
  ShoppingBasket,
  UtensilsCrossed,
  X,
  ZoomIn,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import DocPreview from "@/components/admin/DocPreview";
import { cn, euros, initials } from "@/lib/utils";
import {
  BC_SHOWCASE,
  batchCookerById,
  completion,
  docFamilyLabel,
  docStatusLabel,
  docStatusTone,
  dossierStatusLabel,
  dossierStatusTone,
  availabilityOf,
  contentStatusLabel,
  contentStatusTone,
  financials,
  menusOf,
  paymentMethodLabel,
  sapPathLabel,
  legalFormLabel,
  workStatusLabel,
  sessionsOf,
  transactionsOf,
  txStatusLabel,
  txStatusTone,
  txTypeLabel,
  type BatchCooker,
  type BcDocument,
  type ContentStatus,
  type DocFamily,
  type DocStatus,
} from "@/lib/mock/batchcookers";

const FAMILY_ORDER: DocFamily[] = ["blocking", "conditional", "recommended"];
const TABS = ["candidature", "dossier", "profil", "menus", "agenda", "prestations", "finances"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL: Record<Tab, string> = {
  candidature: "Candidature",
  dossier: "Documents",
  profil: "Profil & vitrine",
  menus: "Menus & recettes",
  agenda: "Agenda",
  prestations: "Prestations",
  finances: "Finances",
};

/** SIRET par groupes, comme sur l'avis de situation. */
const formatSiret = (raw: string) => {
  const d = raw.replace(/\D/g, "");
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9), d.slice(9)].filter(Boolean).join(" ");
};

const daysUntil = (iso: string) =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

export default function BatchCookerDetailPage() {
  const params = useParams<{ id: string }>();
  const bc = batchCookerById(params.id);

  if (!bc) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="mb-3 text-5xl">👨‍🍳</p>
        <h2 className="font-display text-2xl font-bold text-navy">Batch cooker introuvable</h2>
        <Link href="/batchcookers" className="btn btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </Link>
      </div>
    );
  }

  return <Detail key={bc.id} initial={bc} />;
}

function Detail({ initial }: { initial: BatchCooker }) {
  const [documents, setDocuments] = useState<BcDocument[]>(initial.documents);
  const [tab, setTab] = useState<Tab>("dossier");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  // Statut de publication des menus, surchargé par les décisions admin.
  const [menuStatus, setMenuStatus] = useState<Record<string, ContentStatus>>({});

  const bc = { ...initial, ...(BC_SHOWCASE[initial.id] ?? {}), documents };
  const score = completion(bc);
  const fin = financials(bc.id);
  const pendingCount = documents.filter(
    (d) => d.status === "submitted" || d.status === "reviewing",
  ).length;
  // Pièces appelées par la situation déclarée à la candidature.
  const conditionalDocs = documents.filter((d) => d.family === "conditional");

  const setStatus = (id: string, status: DocStatus, rejectionReason?: string) =>
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status, rejectionReason } : d)),
    );

  const confirmReject = (id: string) => {
    if (!reason.trim()) return;
    setStatus(id, "rejected", reason.trim());
    setRejecting(null);
    setReason("");
  };

  return (
    <div className="space-y-6">
      <Link
        href="/batchcookers"
        className="inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Tous les batch cookers
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* ── Colonne identité ─────────────────────────────────────────── */}
        <aside className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-terra/25 blur-3xl" />
            <div className="relative flex flex-col items-center text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-terra font-display text-2xl font-bold text-white">
                {initials(bc.name)}
              </span>
              <p className="mt-3 font-display text-xl font-bold">{bc.name}</p>
              {bc.displayName && (
                <p className="text-xs text-white/55">« {bc.displayName} »</p>
              )}
              <Badge tone={dossierStatusTone[bc.dossier]} className="mt-2" dot>
                {dossierStatusLabel[bc.dossier]}
              </Badge>
              <div className="mt-4 w-full space-y-2 text-left text-xs text-white/70">
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-terra-soft" /> {bc.email}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-terra-soft" /> {bc.phone}
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-terra-soft" /> {bc.zone}
                </p>
              </div>
            </div>
          </motion.div>

          <section className="card p-5">
            <div className="mb-1 flex justify-between text-xs text-ink-mid">
              <span>Pièces obligatoires validées</span>
              <span className="font-semibold text-navy">{score} %</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-cream-deep">
              <div className="h-full rounded-full bg-terra" style={{ width: `${score}%` }} />
            </div>
            <div className="mt-4 space-y-2 text-xs">
              <Row label="Voie SAP" value={sapPathLabel[bc.sapPath]} />
              {bc.workStatus && <Row label="Situation" value={workStatusLabel[bc.workStatus]} />}
              {bc.legalForm && <Row label="Statut" value={legalFormLabel[bc.legalForm]} />}
              <Row label="CESU" value={bc.acceptsCesu ? "Accepté" : "Non"} />
              <Row label="Immatriculé" value={bc.registered ? "Oui" : "Pas encore"} />
              <Row label="Prestations" value={`${bc.missionsCount}`} />
              <Row label="Candidature" value={shortDate(bc.appliedAt)} />
            </div>
          </section>

          <section className="card p-5">
            <h4 className="mb-3 font-display text-base font-bold text-navy">Actions</h4>
            {bc.dossier === "suspended" ? (
              <button className="flex w-full items-center gap-2.5 rounded-xl border border-[rgba(0,35,75,0.1)] px-3.5 py-2.5 text-sm font-semibold text-success transition-colors hover:bg-success-soft/50">
                <RotateCcw className="h-4 w-4" /> Réactiver le compte
              </button>
            ) : (
              <button className="flex w-full items-center gap-2.5 rounded-xl border border-[rgba(0,35,75,0.1)] px-3.5 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft/50">
                <Ban className="h-4 w-4" /> Suspendre le compte
              </button>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
              Toute décision est horodatée et tracée dans le journal d&apos;audit.
            </p>
          </section>
        </aside>

        {/* ── Colonne onglets ──────────────────────────────────────────── */}
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  tab === t
                    ? "bg-navy text-white"
                    : "border border-[rgba(0,35,75,0.1)] bg-paper text-ink-mid hover:text-navy",
                )}
              >
                {TAB_LABEL[t]}
                {t === "dossier" && pendingCount > 0 && (
                  <span
                    className={cn(
                      "ml-2 rounded-full px-1.5 py-0.5 text-[10px]",
                      tab === t ? "bg-terra text-white" : "bg-warning-soft text-[#9A6E15]",
                    )}
                  >
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab === "candidature" && (
            <section className="card space-y-6 p-6">
              <div>
                <h3 className="font-display text-lg font-bold text-navy">Ce qui a été déclaré</h3>
                <p className="mt-1 text-xs text-ink-soft">
                  Réponses du formulaire « Nous rejoindre », envoyées le {shortDate(bc.appliedAt)}.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Block title="Identité">
                  <Row label="Nom" value={bc.name} />
                  <Row label="Email" value={bc.email} />
                  <Row label="Téléphone" value={bc.phone} />
                  <Row label="Adresse" value={bc.address ?? "—"} />
                </Block>

                <Block title="Activité">
                  <Row label="Statut" value={bc.legalForm ? legalFormLabel[bc.legalForm] : "—"} />
                  <Row label="SIRET" value={bc.siret ? formatSiret(bc.siret) : "Pas encore immatriculé"} />
                  <Row label="Voie SAP" value={sapPathLabel[bc.sapPath]} />
                  <Row label="N° de déclaration" value={bc.sapDeclarationNumber ?? "Portée par la coopérative"} />
                </Block>
              </div>

              {/* Situation déclarée : c'est elle qui commande la pièce attendue. */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-navy">Situation déclarée</h4>
                <p className="text-sm text-ink-mid">
                  {bc.workStatus ? workStatusLabel[bc.workStatus] : "Non renseignée"}
                </p>
                {bc.workStatusDetails && (
                  <p className="mt-2 rounded-xl bg-cream-soft px-4 py-3 text-[13px] leading-relaxed text-ink">
                    {bc.workStatusDetails}
                  </p>
                )}
                {conditionalDocs.length > 0 && (
                  <p className="mt-2 text-xs text-ink-soft">
                    Pièce attendue de ce fait :{" "}
                    <span className="font-semibold text-navy">
                      {conditionalDocs.map((d) => d.label).join(", ")}
                    </span>
                    . Elle est facultative à la candidature.
                  </p>
                )}
              </div>

              {/* Zones d'intervention */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-navy">Zones d&apos;intervention</h4>
                {(bc.zones ?? []).length === 0 ? (
                  <p className="text-sm text-ink-soft">{bc.zone}</p>
                ) : (
                  <ul className="space-y-2">
                    {(bc.zones ?? []).map((z) => (
                      <li
                        key={z.regionCode}
                        className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-[rgba(0,35,75,0.08)] px-3 py-2.5"
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-terra" />
                        <span className="text-sm font-semibold text-navy">{z.regionLabel}</span>
                        <span className="text-xs text-ink-soft">
                          {z.scope === "region" ? "toute la région" : z.cities.join(", ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          {tab === "dossier" &&
            FAMILY_ORDER.map((family) => {
              const items = documents.filter((d) => d.family === family);
              if (items.length === 0) return null;
              return (
                <section key={family} className="card p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <h3 className="font-display text-lg font-bold text-navy">
                      {family === "blocking"
                        ? "Pièces obligatoires"
                        : family === "conditional"
                          ? "Selon la situation déclarée"
                          : "Pièces facultatives"}
                    </h3>
                    <Badge
                      tone={family === "blocking" ? "danger" : family === "conditional" ? "warning" : "neutral"}
                    >
                      {docFamilyLabel[family]}
                    </Badge>
                  </div>

                  <ul className="space-y-3">
                    {items.map((d) => {
                      const expiry = d.expiresAt ? daysUntil(d.expiresAt) : null;
                      const actionable = d.status === "submitted" || d.status === "reviewing";
                      const hasFile = d.status !== "missing";
                      return (
                        <li key={d.id} className="rounded-2xl border border-[rgba(0,35,75,0.08)] p-4">
                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[150px_1fr]">
                            {/* Aperçu */}
                            {hasFile ? (
                              <div className="group relative">
                                <DocPreview doc={d} chefName={bc.name} />
                                <span className="pointer-events-none absolute inset-0 hidden items-center justify-center rounded-lg bg-navy/40 text-white group-hover:flex">
                                  <ZoomIn className="h-5 w-5" />
                                </span>
                              </div>
                            ) : (
                              <div
                                className="flex items-center justify-center rounded-lg border-2 border-dashed border-[rgba(0,35,75,0.12)] text-[11px] text-ink-soft"
                                style={{ aspectRatio: "1 / 1.414" }}
                              >
                                Non fourni
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-navy">{d.label}</p>
                                <Badge tone={docStatusTone[d.status]}>
                                  {docStatusLabel[d.status]}
                                </Badge>
                              </div>

                              {d.submittedAt && (
                                <p className="mt-1 text-[11px] text-ink-soft">
                                  Déposé le {shortDate(d.submittedAt)}
                                  {d.sizeKb ? ` · ${d.sizeKb} Ko` : ""}
                                </p>
                              )}

                              {expiry !== null && d.status !== "missing" && (
                                <p
                                  className={cn(
                                    "mt-1 inline-flex items-center gap-1.5 text-[11px]",
                                    expiry <= 7
                                      ? "text-danger"
                                      : expiry <= 60
                                        ? "text-[#9A6E15]"
                                        : "text-ink-soft",
                                  )}
                                >
                                  <CalendarClock className="h-3.5 w-3.5" />
                                  {expiry > 0
                                    ? `Expire dans ${expiry} jour${expiry > 1 ? "s" : ""}`
                                    : `Expirée depuis ${Math.abs(expiry)} jour${Math.abs(expiry) > 1 ? "s" : ""}`}
                                </p>
                              )}

                              {d.status === "rejected" && d.rejectionReason && (
                                <div className="mt-2 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2">
                                  <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
                                  <p className="text-xs leading-relaxed text-danger">
                                    <span className="font-semibold">Motif : </span>
                                    {d.rejectionReason}
                                  </p>
                                </div>
                              )}

                              {actionable && rejecting !== d.id && (
                                <div className="mt-3 flex gap-2">
                                  <button
                                    onClick={() => setStatus(d.id, "valid")}
                                    className="btn btn-primary px-3 py-2 text-xs"
                                  >
                                    <Check className="h-3.5 w-3.5" /> Valider
                                  </button>
                                  <button
                                    onClick={() => setRejecting(d.id)}
                                    className="btn btn-outline px-3 py-2 text-xs"
                                  >
                                    <X className="h-3.5 w-3.5" /> Refuser
                                  </button>
                                </div>
                              )}

                              {rejecting === d.id && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  className="mt-3"
                                >
                                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                                    Motif du refus (obligatoire)
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Ce texte est affiché au batch cooker."
                                    className="input-base resize-none"
                                  />
                                  <div className="mt-2 flex gap-2">
                                    <button
                                      onClick={() => confirmReject(d.id)}
                                      disabled={!reason.trim()}
                                      className="btn btn-primary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      Confirmer le refus
                                    </button>
                                    <button
                                      onClick={() => {
                                        setRejecting(null);
                                        setReason("");
                                      }}
                                      className="btn btn-ghost px-3 py-2 text-xs"
                                    >
                                      Annuler
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}

          {tab === "profil" && (
            <section className="card p-6 space-y-5">
              <div>
                <p className="eyebrow mb-2">Statut de la vitrine</p>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={bc.isVerified ? "success" : "warning"}>
                    {bc.isVerified ? "Vérifié" : "En attente de vérification"}
                  </Badge>
                  <Badge tone={bc.isActive ? "success" : "neutral"}>
                    {bc.isActive ? "Réservable" : "Non réservable"}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-ink-soft">
                  Modifiable via <code className="font-mono">PATCH /admin/chefs/:id/verification</code>.
                </p>
              </div>

              {bc.bio && (
                <div>
                  <p className="eyebrow mb-2">Présentation</p>
                  <p className="text-sm leading-relaxed text-ink-mid">{bc.bio}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="eyebrow mb-2">Langues</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(bc.languages ?? []).map((l) => (
                      <span
                        key={l}
                        className="inline-flex items-center gap-1 rounded-full bg-cream-soft px-2.5 py-1 text-[11px] text-navy"
                      >
                        <Globe2 className="h-3 w-3" /> {l}
                      </span>
                    ))}
                    {(bc.languages ?? []).length === 0 && (
                      <span className="text-xs text-ink-soft">Non renseigné</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="eyebrow mb-2">Spécialités</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(bc.specialties ?? []).map((s) => (
                      <span key={s} className="rounded-full bg-teal-pale px-2.5 py-1 text-[11px] text-teal">
                        {s}
                      </span>
                    ))}
                    {(bc.specialties ?? []).length === 0 && (
                      <span className="text-xs text-ink-soft">Non renseigné</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className="eyebrow mb-2">Moyens de paiement acceptés</p>
                <div className="flex flex-wrap gap-1.5">
                  {(bc.acceptedPayments ?? []).map((p) => (
                    <Badge key={p} tone="neutral">
                      {paymentMethodLabel[p]}
                    </Badge>
                  ))}
                  {bc.shoppingIncluded && (
                    <Badge tone="info">
                      <ShoppingBasket className="h-3 w-3" /> Courses incluses
                    </Badge>
                  )}
                </div>
              </div>

              <p className="rounded-xl bg-cream-soft px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-mid">
                Langues, spécialités, moyens de paiement et option courses ne sont pas
                encore portés par l&apos;API — affichés ici en données simulées.
              </p>
            </section>
          )}

          {tab === "menus" && (
            <section className="card p-6">
              <h3 className="mb-4 font-display text-lg font-bold text-navy">
                Menus & recettes ({menusOf(bc.id).length})
              </h3>
              {menusOf(bc.id).length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-soft">
                  Aucune recette publiée.
                </p>
              ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {menusOf(bc.id).map((m) => (
                    <li key={m.id} className="rounded-2xl border border-[rgba(0,35,75,0.08)] p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display text-base font-bold text-navy">{m.name}</p>
                        <div className="flex shrink-0 gap-1.5">
                          {m.origin === "ai" && <Badge tone="info">IA</Badge>}
                          <Badge tone={contentStatusTone[menuStatus[m.id] ?? m.status]}>
                            {contentStatusLabel[menuStatus[m.id] ?? m.status]}
                          </Badge>
                        </div>
                      </div>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-ink-soft">
                        <UtensilsCrossed className="h-3 w-3" /> {m.country} · {m.category} ·{" "}
                        {m.portions} portions
                      </p>
                      {m.allergens.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {m.allergens.map((a) => (
                            <span
                              key={a}
                              className="rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-medium text-danger"
                            >
                              ⚠ {a}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Moderation : l admin fixe le statut de publication. */}
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[rgba(0,35,75,0.06)] pt-3">
                        {(["published", "pending", "rejected"] as ContentStatus[])
                          .filter((st) => st !== (menuStatus[m.id] ?? m.status))
                          .map((st) => (
                            <button
                              key={st}
                              onClick={() =>
                                setMenuStatus((prev) => ({ ...prev, [m.id]: st }))
                              }
                              className="btn btn-outline px-2.5 py-1.5 text-[11px]"
                            >
                              {st === "published"
                                ? "Publier"
                                : st === "pending"
                                  ? "Remettre en validation"
                                  : "Refuser"}
                            </button>
                          ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "agenda" && (
            <>
              <section className="card p-6">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-white">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <h3 className="font-display text-lg font-bold text-navy">
                    Disponibilites hebdomadaires
                  </h3>
                </div>

                {availabilityOf(bc.id) ? (
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {availabilityOf(bc.id)!.slots.map((slot) => {
                      const open = slot.ranges.length > 0;
                      return (
                        <li
                          key={slot.day}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3",
                            open
                              ? "border-[rgba(0,35,75,0.08)]"
                              : "border-[rgba(0,35,75,0.05)] bg-cream-soft/60",
                          )}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-navy">{slot.day}</p>
                            <p className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
                              <Clock className="h-3 w-3" />
                              {open ? slot.ranges.join(" · ") : "Indisponible"}
                            </p>
                          </div>
                          <Badge tone={open ? "success" : "neutral"}>
                            {open ? "Ouvert" : "Ferme"}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="py-8 text-center text-sm text-ink-soft">
                    Aucune disponibilite renseignee par ce batch cooker.
                  </p>
                )}

                <div className="mt-4 rounded-xl bg-cream-soft px-4 py-3">
                  <p className="text-xs text-ink-mid">
                    <span className="font-semibold text-navy">Zone d&apos;intervention : </span>
                    {availabilityOf(bc.id)?.zone ?? bc.zone}
                  </p>
                </div>
              </section>

              <section className="card p-6">
                <h3 className="mb-4 font-display text-lg font-bold text-navy">
                  Sessions planifiees
                </h3>
                {sessionsOf(bc.id).filter((x) => x.status === "upcoming").length === 0 ? (
                  <p className="py-6 text-center text-sm text-ink-soft">
                    Aucune session a venir.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {sessionsOf(bc.id)
                      .filter((x) => x.status === "upcoming")
                      .map((x) => (
                        <li
                          key={x.id}
                          className="flex items-center gap-4 rounded-2xl bg-cream-soft px-4 py-3"
                        >
                          <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-paper">
                            <span className="font-display text-sm font-bold text-navy">
                              {new Date(x.date).getDate()}
                            </span>
                            <span className="font-mono text-[8px] uppercase text-ink-soft">
                              {new Date(x.date).toLocaleDateString("fr-FR", { month: "short" })}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-navy">{x.client}</p>
                            <p className="font-mono text-[11px] text-ink-soft">{x.reference}</p>
                          </div>
                          <Badge tone="info">A venir</Badge>
                        </li>
                      ))}
                  </ul>
                )}
              </section>
            </>
          )}

          {tab === "prestations" && (
            <section className="card p-6">
              <h3 className="mb-4 font-display text-lg font-bold text-navy">
                Prestations ({sessionsOf(bc.id).length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(0,35,75,0.08)] text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                      <th className="pb-2 font-normal">Référence</th>
                      <th className="pb-2 font-normal">Client</th>
                      <th className="pb-2 font-normal">Date</th>
                      <th className="pb-2 font-normal text-right">Montant</th>
                      <th className="pb-2 font-normal text-right">Net chef</th>
                      <th className="pb-2 font-normal">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(0,35,75,0.06)]">
                    {sessionsOf(bc.id).map((s) => (
                      <tr key={s.id}>
                        <td className="py-3 font-mono text-[11px] text-ink-soft">{s.reference}</td>
                        <td className="py-3 font-semibold text-navy">{s.client}</td>
                        <td className="py-3 text-xs text-ink-mid">{shortDate(s.date)}</td>
                        <td className="py-3 text-right text-ink-mid">{euros(s.amountTTC)}</td>
                        <td className="py-3 text-right font-display font-bold text-navy">
                          {euros(s.net)}
                        </td>
                        <td className="py-3">
                          <Badge
                            tone={
                              s.status === "done"
                                ? "success"
                                : s.status === "disputed"
                                  ? "danger"
                                  : s.status === "cancelled"
                                    ? "neutral"
                                    : "info"
                            }
                          >
                            {s.status === "done"
                              ? "Réalisée"
                              : s.status === "disputed"
                                ? "Litige"
                                : s.status === "cancelled"
                                  ? "Annulée"
                                  : "À venir"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === "finances" && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="CA généré" value={euros(fin.grossRevenue)} />
                <Stat label="Commissions" value={euros(fin.commission)} accent />
                <Stat label="Net chef" value={euros(fin.net)} />
                <Stat label="En attente" value={`${fin.pending}`} />
              </div>

              <section className="card p-6">
                <h3 className="mb-4 font-display text-lg font-bold text-navy">
                  Transactions ({transactionsOf(bc.id).length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead>
                      <tr className="border-b border-[rgba(0,35,75,0.08)] text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                        <th className="pb-2 font-normal">Date</th>
                        <th className="pb-2 font-normal">Référence</th>
                        <th className="pb-2 font-normal">Type</th>
                        <th className="pb-2 font-normal">Moyen</th>
                        <th className="pb-2 font-normal text-right">Montant</th>
                        <th className="pb-2 font-normal text-right">Commission</th>
                        <th className="pb-2 font-normal">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(0,35,75,0.06)]">
                      {transactionsOf(bc.id).map((t) => (
                        <tr key={t.id}>
                          <td className="py-3 text-xs text-ink-mid">{shortDate(t.date)}</td>
                          <td className="py-3 font-mono text-[11px] text-ink-soft">{t.reference}</td>
                          <td className="py-3">
                            <Badge tone={t.type === "commission" ? "terra" : "neutral"}>
                              {txTypeLabel[t.type]}
                            </Badge>
                          </td>
                          <td className="py-3 text-xs text-ink-mid">
                            {t.paymentMethod ? paymentMethodLabel[t.paymentMethod] : "—"}
                          </td>
                          <td
                            className={cn(
                              "py-3 text-right font-semibold",
                              t.amount < 0 ? "text-danger" : "text-navy",
                            )}
                          >
                            {euros(t.amount)}
                          </td>
                          <td className="py-3 text-right text-ink-soft">
                            {t.commission ? euros(t.commission) : "—"}
                          </td>
                          <td className="py-3">
                            <Badge tone={txStatusTone[t.status]}>{txStatusLabel[t.status]}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-navy">{title}</h4>
      <div className="space-y-2 text-xs">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-soft">{label}</span>
      <span className="text-right font-semibold text-navy">{value}</span>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className={cn("font-display text-xl font-bold", accent ? "text-terra" : "text-navy")}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
        {label}
      </p>
    </div>
  );
}
