"use client";

import { use, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import posthog from "posthog-js";
import {
  ArrowLeft,
  CalendarClock,
  CalendarRange,
  ChefHat,
  Clock,
  Info,
  Loader2,
  MapPin,
  Receipt,
  RefreshCw,
  RotateCw,
  ShoppingBasket,
  Sparkles,
  UserRound,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toaster";
import { cn, euros, formatDateLong } from "@/lib/utils";
import { aisleLabel, displayQuantity } from "@/lib/recipe-fields";
import { useAisles, useAllergens } from "@/lib/api/referentials";
import {
  BOOKING_STATUSES,
  bookingPortions,
  bookingStatusLabel,
  bookingStatusText,
  shoppingListStatusLabel,
  isBookingOpen,
  money,
  useBooking,
  useBookingConservation,
  useBookingShoppingList,
  useRegenerateShoppingList,
  useUpdateBooking,
  type BookingStatus,
} from "@/lib/api/bookings";
import { adminErrorMessage } from "@/lib/api/errors";
import InfoPopover from "@/components/ui/InfoPopover";
import { ContractPanel, WithdrawalPanel } from "@/components/legal/ContractPanels";

/** « lun. 23 nov. », lu comme un jour de calendrier. */
const jour = (ymd: string) =>
  new Date(`${ymd}T12:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

/* ─────────────────────────────────────────────────────────────────────────────
   Une réservation — `GET /admin/bookings/{id}`.

   Elle arrive complète depuis le 16/10 : le client, le batch cooker **par son
   nom**, l'adresse de la session, les plats avec la version de recette
   épinglée, les photos, la part nette et la commission, et la demande de
   report en cours s'il y en a une.

   Deux actions, et elles ne se valent pas :

   - **recalculer la liste de courses** est sans danger — elle repart des
     recettes de la prestation et garde les corrections du batch cooker ;
   - **changer le statut** est l'outil du support. La console peut poser
     n'importe quel statut, y compris ouvrir un litige, sans les garde-fous
     des deux autres points de vue. Chaque écriture est auditée — c'est pour
     réparer, pas pour aller vite.
   ───────────────────────────────────────────────────────────────────────────── */

export default function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const toast = useToast();
  const query = useBooking(id);
  const courses = useBookingShoppingList(id);
  const conservation = useBookingConservation(id);
  const allergens = useAllergens();
  const aisles = useAisles();
  const regenerate = useRegenerateShoppingList();
  const update = useUpdateBooking();
  const [aRecalculer, setARecalculer] = useState(false);
  const [aPoser, setAPoser] = useState<BookingStatus | null>(null);

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <div className="h-36 animate-pulse rounded-3xl bg-paper" />
        <div className="h-64 animate-pulse rounded-lg bg-paper" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <section className="card mx-auto max-w-lg p-6 text-center">
        <h2 className="font-display text-lg font-bold text-navy">
          Réservation introuvable
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-mid">
          {adminErrorMessage(query.error)}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button onClick={() => query.refetch()} className="btn btn-outline btn-sm">
            <RotateCw className="h-3 w-3" aria-hidden /> Réessayer
          </button>
          <Link href="/reservations" className="btn btn-primary btn-sm">
            Toutes les réservations
          </Link>
        </div>
      </section>
    );
  }

  const b = query.data;
  const portions = bookingPortions(b);
  const groupes = courses.data?.groups ?? [];
  const net = money(b.netCents);
  /* Le frais de courses a sa ligne : il entre dans le crédit d'impôt et dans
     l'assiette de la commission, il ne doit pas disparaître dans le prix. */
  const courses_ = money(b.shoppingFeeCents);
  const commission = money(b.commissionCents);
  const paye = money(b.paidCents);

  return (
    <div className="space-y-6">
      <Link
        href="/reservations"
        className="inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Toutes les réservations
      </Link>

      {/* ── L'essentiel ──────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white lg:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-terra/25 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            {b.reference && (
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-terra-soft">
                {b.reference}
              </p>
            )}
            <h2 className="mt-2 font-display text-3xl font-bold capitalize leading-tight lg:text-4xl">
              {b.startsAt ? formatDateLong(b.startsAt) : "Date à confirmer"}
            </h2>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/65">
              {b.timeSlot && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-terra-soft" aria-hidden /> {b.timeSlot}
                </span>
              )}
              {portions > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-terra-soft" aria-hidden /> {portions}{" "}
                  portions
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <CalendarRange className="h-4 w-4 text-terra-soft" aria-hidden />
                {bookingStatusText(b.status)}
              </span>
            </p>
          </div>
          {b.amountTtc != null && (
            <div className="flex flex-col items-start lg:items-end">
              <p className="font-display text-3xl font-bold text-terra-soft">
                {euros(Math.round(b.amountTtc / 100))}
              </p>
              <p className="text-xs text-white/60">
                payés par le client
                {paye && b.paidCents !== b.amountTtc ? ` · ${paye} encaissés` : ""}
              </p>
            </div>
          )}
        </div>
      </motion.section>

      {/* ── Un report en cours ───────────────────────────────────────────── */}
      {b.reschedule?.status === "pending" && (
        <section className="card border-terra/30 bg-terra/8 p-5">
          <p className="flex items-start gap-2 text-[13px] font-semibold text-terra-deep">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Un report attend une réponse
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-mid">
            {b.reschedule.proposedBy === "chef" ? "Le batch cooker" : "Le client"} propose
            le {formatDateLong(b.reschedule.to)} au lieu du{" "}
            {formatDateLong(b.reschedule.from)}.
            {b.reschedule.expiresAt &&
              ` Sans réponse avant le ${formatDateLong(b.reschedule.expiresAt)}, la prestation garde son heure.`}
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
            La console ne répond pas à leur place : aucune route ne le permet, et
            ce serait décider pour eux.
          </p>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* ── Plats ───────────────────────────────────────────────────── */}
          <section className="card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-navy">
              <UtensilsCrossed className="h-4 w-4 text-terra" aria-hidden /> Plats
              commandés
              {b.menuFrozen && (
                <span className="ml-auto inline-flex items-center gap-1">
                  <Badge tone="navy" dot={false}>
                    Menu figé
                  </Badge>
                  <InfoPopover label="Que veut dire « menu figé » ?">
                    À 3 jours de la prestation, le client et le batch cooker ne changent
                    plus les plats, sauf un plat à remplacer pour une allergie. La console
                    le peut encore ; ce changement est tracé dans le journal d’audit.
                  </InfoPopover>
                </span>
              )}
            </h3>
            {(b.allergyConflicts?.length ?? 0) > 0 && (
              <p className="mb-3 flex flex-wrap items-center gap-1 rounded-xl bg-danger-soft px-3 py-2 text-[13px] text-danger">
                <span className="font-semibold">À remplacer :</span>
                {b.allergyConflicts!
                  .map((c) => b.meals?.find((m) => m.mealId === c.mealId)?.name ?? "un plat")
                  .join(", ")}
                <InfoPopover label="Pourquoi ce plat est-il à remplacer ?">
                  Le client a déclaré une allergie après la validation du menu, et ce plat
                  contient l’allergène. Le client ou le batch cooker le remplace depuis son
                  espace, même si le menu est figé. Tant que ce n’est pas fait, la
                  réservation reste signalée.
                </InfoPopover>
              </p>
            )}
            {(b.meals?.length ?? 0) === 0 ? (
              <p className="text-sm text-ink-soft">
                Aucun plat rattaché à cette réservation.
              </p>
            ) : (
              <ul className="divide-y divide-[rgba(0,35,75,0.06)]">
                {b.meals!.map((m) => (
                  <li
                    key={m.mealId}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-navy">
                        {m.name ?? "Plat retiré du catalogue"}
                      </span>
                      <span className="block font-mono text-[11px] text-ink-soft">
                        {m.recipeVersion != null
                          ? `recette v${m.recipeVersion} · ${m.mealId.slice(0, 8)}…`
                          : `${m.mealId.slice(0, 8)}…`}
                      </span>
                      {/* Recettes lot 3 : les allergènes enregistrés quand le menu a été écrit. */}
                      <span className="block text-[12px] text-ink-mid">
                        {m.allergensSnapshot == null
                          ? "Allergènes pas encore figés"
                          : m.allergensSnapshot.length === 0
                            ? "Allergènes figés : aucun"
                            : `Allergènes figés : ${m.allergensSnapshot
                                .map((c) => allergens.data.find((a) => a.code === c)?.label ?? c)
                                .join(", ")}`}
                      </span>
                    </span>
                    <Badge tone="navy" dot={false}>
                      {m.portions} portion{m.portions > 1 ? "s" : ""}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Dates « à manger avant » (Recettes lot 3) ──────────────── */}
          {(b.meals?.length ?? 0) > 0 && (
            <section className="card p-6">
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-navy">
                Dates « à manger avant »
                <InfoPopover label="D’où viennent ces dates ?">
                  La plateforme propose le jour de la prestation plus la durée au frais de
                  la recette figée. Le batch cooker peut la changer jusqu’à 24 h après la
                  fin ; chaque changement est gardé ci-dessous : qui, quand, et la nouvelle
                  valeur.
                </InfoPopover>
              </h3>
              {conservation.isPending ? (
                <div className="h-16 animate-pulse rounded-xl bg-cream-soft" />
              ) : conservation.isError || !conservation.data ? (
                <p className="text-sm text-ink-soft">Les dates n’ont pas pu être lues.</p>
              ) : (
                <>
                  <ul className="divide-y divide-[rgba(0,35,75,0.06)]">
                    {conservation.data.dishes.map((d) => (
                      <li key={d.mealId} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <span className="text-sm font-semibold text-navy">{d.name}</span>
                        <span className="flex flex-wrap items-center gap-2 text-[13px] text-ink-mid">
                          {d.eatBefore.date ? jour(d.eatBefore.date) : "Pas de date"}
                          {d.eatBefore.fridgeDays !== null && ` · ${d.eatBefore.fridgeDays} j au frais`}
                          <Badge tone={d.eatBefore.setByChef ? "navy" : "neutral"} dot={false}>
                            {d.eatBefore.setByChef ? "Date du batch cooker" : "Date proposée"}
                          </Badge>
                          {d.eatBefore.fridgeAlert && (
                            <Badge tone="warning" dot={false}>
                              Plus de {conservation.data.fridgeAlertDays} j
                            </Badge>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mb-1.5 mt-4 text-[12px] font-semibold uppercase tracking-wide text-ink-soft">
                    Historique
                  </p>
                  {(conservation.data.history?.length ?? 0) === 0 ? (
                    <p className="text-[13px] text-ink-soft">
                      Le batch cooker n’a modifié aucune date.
                    </p>
                  ) : (
                    <ul className="space-y-1 text-[13px] text-ink-mid">
                      {conservation.data.history!.map((h, i) => (
                        <li key={i}>
                          {formatDateLong(h.changedAt)} ·{" "}
                          <span className="font-semibold text-navy">
                            {h.changedBy.name ?? "Compte supprimé"}
                          </span>
                          {h.changedBy.role === "chef" && " (batch cooker)"}
                          {h.changedBy.role === "admin" && " (Lab’s Food)"} ·{" "}
                          {conservation.data.dishes.find((d) => d.mealId === h.mealId)?.name ?? "un plat"} :{" "}
                          {h.value ? jour(h.value) : "retour à la date proposée"}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </section>
          )}

          {/* ── Liste de courses ───────────────────────────────────────── */}
          <section className="card p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-navy">
                  <ShoppingBasket className="h-4 w-4 text-terra" aria-hidden /> Liste de
                  courses
                </h3>
                <p className="mt-0.5 text-[12px] text-ink-soft">
                  {courses.data?.generatedAt
                    ? `Calculée le ${formatDateLong(courses.data.generatedAt)}`
                    : "Calculée depuis les recettes de la prestation"}
                  {b.shoppingByClient
                    ? " · les courses sont à la charge du client"
                    : " · les courses sont à la charge du batch cooker"}
                </p>
                {!b.shoppingByClient && courses.data?.status && (
                  <p className="mt-1.5 flex flex-wrap items-center gap-1 text-[12px] text-ink-mid">
                    <span className="font-semibold text-navy">
                      {shoppingListStatusLabel[courses.data.status]}
                    </span>
                    {courses.data.sentAt &&
                      ` · envoyée ${quand(courses.data.sentAt)}` +
                        ((courses.data.version ?? 0) > 1 ? ` (envoi n° ${courses.data.version})` : "")}
                    {courses.data.finalReceivedAt &&
                      ` · réponse du client ${quand(courses.data.finalReceivedAt)}`}
                    {courses.data.deadline &&
                      ` · date limite ${quand(courses.data.deadline)}`}
                    <InfoPopover label="Comment marche l’échange de la liste ?">
                      Le batch cooker envoie la liste ; le client coche ce qu’il a déjà,
                      commente une ligne et la renvoie, autant de fois qu’il veut jusqu’à
                      midi la veille. Les réponses affichées ici sont celles qui comptent :
                      elles portent sur la dernière liste envoyée. Sans réponse, le batch
                      cooker achète toute la liste.
                    </InfoPopover>
                  </p>
                )}
                {/* Recettes lot 4 (LF-0296) : l'étape courses et les rappels partis. */}
                {!b.shoppingByClient && (
                  <p className="mt-1 flex flex-wrap items-center gap-1 text-[12px] text-ink-mid">
                    <span className="font-semibold text-navy">
                      {b.groceriesValidatedAt
                        ? `Courses validées ${quand(b.groceriesValidatedAt)}`
                        : "Courses pas encore validées"}
                    </span>
                    {b.groceriesAmountCents != null &&
                      ` · ticket de ${euros(b.groceriesAmountCents / 100)}`}
                    <InfoPopover label="Que veut dire « courses validées » ?">
                      Le batch cooker confirme que les courses sont faites, avec le total
                      du ticket s’il le souhaite. Ce montant est une information : aucun
                      paiement des courses ne passe par la plateforme pour l’instant.
                    </InfoPopover>
                  </p>
                )}
                {!b.shoppingByClient && b.shoppingReminders && (
                  <p className="mt-1 text-[12px] text-ink-soft">
                    Rappels envoyés :{" "}
                    {[
                      b.shoppingReminders.chefSendAt &&
                        `batch cooker, liste à envoyer (${quand(b.shoppingReminders.chefSendAt)})`,
                      b.shoppingReminders.clientAnswerAt &&
                        `client, liste à renvoyer (${quand(b.shoppingReminders.clientAnswerAt)})`,
                      b.shoppingReminders.clientFrozenAt &&
                        `client, liste figée (${quand(b.shoppingReminders.clientFrozenAt)})`,
                      b.shoppingReminders.chefGroceriesAt &&
                        `batch cooker, courses à faire (${quand(b.shoppingReminders.chefGroceriesAt)})`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "aucun pour l’instant"}
                  </p>
                )}
              </div>
              <button
                onClick={() => setARecalculer(true)}
                disabled={regenerate.isPending}
                className="btn btn-outline btn-sm shrink-0"
              >
                {regenerate.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="h-3 w-3" aria-hidden />
                )}
                Recalculer
              </button>
            </div>

            {courses.isPending ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-9 animate-pulse rounded-xl bg-cream-soft" />
                ))}
              </div>
            ) : groupes.length === 0 ? (
              <p className="text-sm leading-relaxed text-ink-soft">
                Aucune liste. Elle se calcule depuis les recettes des plats : si
                aucun n&apos;a de recette, il n&apos;y a rien à calculer.
              </p>
            ) : (
              <div className="space-y-4">
                {groupes.map((g) => (
                  <div key={g.aisle || "sans-rayon"}>
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
                      {aisleLabel(g.aisle, aisles.data) ?? "Sans rayon"}
                    </p>
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {g.lines.map((l, i) => (
                        <li
                          key={`${l.name}-${i}`}
                          className="flex items-center justify-between gap-2 rounded-xl bg-cream-soft px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 text-navy">
                            <span className={cn(l.alreadyHave && "text-ink-soft line-through")}>
                              {l.name}
                            </span>
                            {l.edited && (
                              <span className="ml-2 text-[10px] font-semibold uppercase text-terra-deep">
                                corrigée
                              </span>
                            )}
                            {l.alreadyHave && (
                              <span className="ml-2 text-[10px] font-semibold uppercase text-success">
                                déjà chez le client
                              </span>
                            )}
                            {l.comment && (
                              <span className="mt-0.5 block text-[12px] italic text-ink-mid">
                                « {l.comment} »
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-ink-soft">
                            {displayQuantity(l.qty, l.unit)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Consignes et photos ────────────────────────────────────── */}
          {b.notes && (
            <section className="card p-6">
              <h3 className="mb-2 flex items-center gap-2 font-display text-base font-bold text-navy">
                <Sparkles className="h-4 w-4 text-terra" aria-hidden /> Consignes du
                client
              </h3>
              <p className="rounded-xl bg-cream-soft px-4 py-3 text-sm leading-relaxed text-ink-mid">
                {b.notes}
              </p>
            </section>
          )}

          {(b.photos?.length ?? 0) > 0 && (
            <section className="card p-6">
              <h3 className="mb-3 font-display text-base font-bold text-navy">
                Photos de la session
              </h3>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {b.photos!.map((p) => (
                  <li key={p.id} className="overflow-hidden rounded-xl bg-cream-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt={p.caption ?? ""}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ── Colonne de droite ─────────────────────────────────────────── */}
        <aside className="space-y-4">
          <WithdrawalPanel withdrawal={b.withdrawal} />
          <ContractPanel contract={b.contract} />

          <section className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-navy">
              <UserRound className="h-4 w-4 text-terra" aria-hidden /> Le client
            </h3>
            {b.client ? (
              <>
                <p className="text-sm font-semibold text-navy">
                  {b.client.name ?? "Nom non renseigné"}
                </p>
                <Link
                  href={`/clients/${b.client.id}`}
                  className="btn btn-outline btn-sm mt-3 w-full"
                >
                  Sa fiche client
                </Link>
              </>
            ) : (
              <p className="text-sm text-ink-soft">
                Client non renvoyé pour cette réservation.
              </p>
            )}
          </section>

          <section className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-navy">
              <Receipt className="h-4 w-4 text-terra" aria-hidden /> Ce que paie le
              client
            </h3>
            <dl className="space-y-1.5 text-[13px]">
              <Row label="Prestation" value={money(b.priceCents) ?? "—"} />
              <Row
                label="Forfait courses"
                value={
                  b.shoppingByClient
                    ? "à la charge du client"
                    : (courses_ ?? "non facturées")
                }
              />
              <Row label="Total TTC" value={money(b.amountTtc) ?? "—"} />
              <Row
                label="Après crédit d'impôt"
                value={money(b.amountAfterTax) ?? "—"}
              />
              {b.paidCents != null && (
                <Row label="Déjà encaissé" value={money(b.paidCents) ?? "—"} />
              )}
            </dl>
          </section>

          <section className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-navy">
              <ChefHat className="h-4 w-4 text-terra" aria-hidden /> Le batch cooker
            </h3>
            {b.chef ? (
              <>
                <p className="text-sm font-semibold text-navy">
                  {b.chef.displayName ?? "Nom non renseigné"}
                </p>
                {b.serviceOffer?.name && (
                  <p className="mt-0.5 text-[12px] text-ink-soft">
                    Offre réservée : {b.serviceOffer.name}
                  </p>
                )}
                {net && (
                  <dl className="hairline mt-3 space-y-1.5 border-t pt-3 text-[13px]">
                    <Row
                      label={b.commissionEstimated ? "Net estimé" : "Net perçu"}
                      value={net}
                    />
                    {commission && <Row label="Commission" value={commission} />}
                  </dl>
                )}
                {b.commissionEstimated && (
                  <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                    Estimé : la commission se fixe au paiement.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-ink-soft">
                Aucun batch cooker assigné à cette réservation.
              </p>
            )}
          </section>

          {(b.addressLine || b.city) && (
            <section className="card p-5">
              <h3 className="mb-2 flex items-center gap-2 font-display text-base font-bold text-navy">
                <MapPin className="h-4 w-4 text-terra" aria-hidden /> Où
              </h3>
              <p className="text-[13px] leading-relaxed text-ink-mid">
                {b.addressLine}
                {b.addressLine && b.city ? ", " : ""}
                {b.city}
              </p>
              {b.arrivedAt && (
                <p className="mt-2 text-[12px] text-ink-soft">
                  Arrivée pointée le {formatDateLong(b.arrivedAt)}
                </p>
              )}
            </section>
          )}

          {/* ── L'outil du support ─────────────────────────────────────── */}
          <section className="card p-5">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-navy">
              <Wallet className="h-4 w-4 text-terra" aria-hidden /> Forcer un statut
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-mid">
              La console passe outre les règles du client et du batch cooker.
              Chaque changement est <strong className="font-semibold">audité</strong> :
              c&apos;est pour réparer une situation, pas pour aller plus vite.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {BOOKING_STATUSES.filter((s) => s !== b.status).map((s) => (
                <button
                  key={s}
                  onClick={() => setAPoser(s)}
                  disabled={update.isPending}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                    s === "disputed" || s === "cancelled"
                      ? "bg-danger-soft text-danger hover:bg-danger/15"
                      : "bg-cream-soft text-ink-mid hover:bg-cream-deep",
                  )}
                >
                  {bookingStatusLabel[s]}
                </button>
              ))}
            </div>
          </section>

          {!isBookingOpen(b) && (
            <p className="flex items-start gap-2 px-1 text-[12px] leading-relaxed text-ink-soft">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Cette réservation n&apos;est plus en cours : recalculer sa liste de
              courses n&apos;a plus d&apos;effet utile.
            </p>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={aRecalculer}
        onClose={() => setARecalculer(false)}
        onConfirm={() =>
          regenerate.mutate(b.id, {
            onSuccess: () => {
              posthog.capture("booking_shopping_list_regenerated", {
                meal_count: b.meals?.length ?? 0,
                portions,
              });
              setARecalculer(false);
              toast.success(
                "Liste de courses recalculée",
                "Les corrections du batch cooker ont été conservées.",
              );
            },
            onError: (e) => toast.error("Le recalcul a échoué", adminErrorMessage(e)),
          })
        }
        pending={regenerate.isPending}
        title="Recalculer la liste de courses ?"
        lead="Elle repart des versions de recettes que cette prestation cuisine, mises à l'échelle des portions commandées."
        detail="Les corrections du batch cooker sont conservées : le geste est sans danger, et utile après un changement de plats ou de portions."
        confirmLabel="Recalculer"
      />

      <ConfirmDialog
        open={aPoser !== null}
        onClose={() => setAPoser(null)}
        onConfirm={() =>
          aPoser &&
          update.mutate(
            { id: b.id, patch: { status: aPoser } },
            {
              onSuccess: () => {
                posthog.capture("booking_status_overridden", {
                  previous_status: b.status,
                  status: aPoser,
                });
                setAPoser(null);
                toast.success(
                  `Statut posé : ${bookingStatusLabel[aPoser].toLowerCase()}`,
                  "Le changement est inscrit au journal d'audit.",
                );
              },
              onError: (e) => toast.error("Le statut n'a pas changé", adminErrorMessage(e)),
            },
          )
        }
        pending={update.isPending}
        tone={aPoser === "disputed" || aPoser === "cancelled" ? "danger" : "primary"}
        title={
          aPoser
            ? `Passer cette réservation en « ${bookingStatusLabel[aPoser].toLowerCase()} » ?`
            : ""
        }
        lead={
          aPoser === "disputed"
            ? "Un litige est ouvert sur cette prestation. Le règlement et la rémunération en dépendent."
            : aPoser === "cancelled"
              ? "La prestation est annulée, quel que soit son état d'avancement, et le créneau est libéré."
              : "Le client et le batch cooker verront ce statut dans leur espace."
        }
        detail="Vous passez outre les règles habituelles, et le changement est inscrit au journal d'audit avec votre nom."
        confirmLabel="Poser ce statut"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-semibold text-navy tabular-nums">{value}</dd>
    </div>
  );
}

/** « 3 nov. à 12:00 » : un instant de l’échange autour de la liste. */
function quand(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
