"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarRange,
  Check,
  ChefHat,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  Receipt,
  ShoppingBasket,
  Sparkles,
  Users,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { euros, formatDateLong } from "@/lib/utils";
import { reservationTone, paymentTone, paymentLabel } from "@/lib/status";
import {
  reservationById,
  RESERVATION_STATUS_LABEL,
  RESERVATION_STATUS_FLOW,
} from "@/lib/mock/reservations";
import { clientById } from "@/lib/mock/clients";
import type { ReservationStatus } from "@/lib/mock/types";

export default function ReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const reservation = reservationById(params.id);
  const [status, setStatus] = useState<ReservationStatus>(
    reservation?.status ?? "pending",
  );

  if (!reservation) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="mb-3 text-5xl">🍳</p>
        <h2 className="font-display text-2xl font-bold text-navy">
          Réservation introuvable
        </h2>
        <p className="mt-1 text-sm text-ink-mid">
          Cette session n&apos;existe pas ou a été supprimée.
        </p>
        <Link href="/reservations" className="btn btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" /> Retour aux réservations
        </Link>
      </div>
    );
  }

  const client = clientById(reservation.clientId);
  const stepIndex = RESERVATION_STATUS_FLOW.indexOf(status);
  const credit = reservation.amountTTC - reservation.amountAfterTax;

  return (
    <div className="space-y-6">
      <Link
        href="/reservations"
        className="inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Toutes les réservations
      </Link>

      {/* En-tête */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white lg:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-terra/25 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-terra-soft">
                {reservation.reference}
              </p>
              <Badge tone={reservationTone[status]} dot>
                {RESERVATION_STATUS_LABEL[status]}
              </Badge>
            </div>
            <h2 className="mt-2 font-display text-3xl font-bold lg:text-4xl">
              Formule {reservation.formula}
            </h2>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/65">
              <span className="inline-flex items-center gap-1.5">
                <CalendarRange className="h-4 w-4 text-terra-soft" />
                {formatDateLong(reservation.date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-terra-soft" />
                {reservation.timeSlot}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ChefHat className="h-4 w-4 text-terra-soft" />
                {reservation.chefName}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-terra-soft" />
                {reservation.persons} pers.
              </span>
            </p>
          </div>
          <div className="lg:text-right">
            <p className="font-display text-3xl font-bold text-terra-soft">
              {euros(reservation.amountTTC)}
            </p>
            <p className="text-xs text-white/55">
              soit {euros(reservation.amountAfterTax)} après crédit d&apos;impôt
            </p>
          </div>
        </div>
      </motion.div>

      {/* Suivi + changement de statut */}
      <section className="card p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-navy">
            Suivi de la session
          </h3>
        </div>
        {status === "cancelled" ? (
          <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            Cette réservation a été annulée.
          </p>
        ) : (
          <>
            <div className="relative grid grid-cols-5 gap-2">
              <div className="absolute left-0 right-0 top-4 h-0.5 bg-cream-deep" />
              <div
                className="absolute left-0 top-4 h-0.5 bg-terra transition-all"
                style={{
                  width: `${(stepIndex / (RESERVATION_STATUS_FLOW.length - 1)) * 100}%`,
                }}
              />
              {RESERVATION_STATUS_FLOW.map((step, i) => {
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
                      {RESERVATION_STATUS_LABEL[step]}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[rgba(0,35,75,0.06)] pt-4">
              <span className="mr-1 text-xs font-semibold text-ink-soft">
                Mettre à jour :
              </span>
              {RESERVATION_STATUS_FLOW.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    s === status
                      ? "bg-navy text-white"
                      : "bg-cream-soft text-ink-mid hover:bg-cream-deep"
                  }`}
                >
                  {RESERVATION_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          {/* Plats */}
          <section className="card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-navy">
              <ChefHat className="h-4 w-4 text-terra" /> Plats prévus (
              {reservation.meals.length})
            </h3>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {reservation.meals.map((m) => (
                <li
                  key={m.name}
                  className="flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-terra/12 text-xs font-bold text-terra-deep">
                    {m.portions}
                  </span>
                  <p className="text-sm font-medium text-navy">{m.name}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Liste de courses */}
          <section className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold text-navy">
                <ShoppingBasket className="h-4 w-4 text-terra" /> Liste de
                courses
              </h3>
              <Badge tone={reservation.shoppingByClient ? "info" : "teal"}>
                {reservation.shoppingByClient
                  ? "Courses : client"
                  : "Courses : Lab's Food"}
              </Badge>
            </div>
            {reservation.shoppingList ? (
              <div className="space-y-4">
                {reservation.shoppingList.map((aisle) => (
                  <div key={aisle.aisle}>
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                      {aisle.aisle}
                    </p>
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {aisle.items.map((it) => (
                        <li
                          key={it.name}
                          className="flex items-center justify-between rounded-xl bg-cream-soft px-3 py-2 text-sm"
                        >
                          <span className="text-navy">{it.name}</span>
                          <span className="text-xs text-ink-soft">
                            {it.qty}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-soft">
                Aucune liste détaillée — la liste sera générée à la
                confirmation.
              </p>
            )}
          </section>

          {/* Notes */}
          {reservation.notes && (
            <section className="rounded-3xl border border-terra/30 bg-terra-pale/30 p-5">
              <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-terra-deep">
                <Sparkles className="h-3.5 w-3.5" /> Consignes du client
              </p>
              <p className="text-sm text-navy">{reservation.notes}</p>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Client */}
          <section className="card p-5">
            <h4 className="mb-3 font-display text-base font-bold text-navy">
              Client
            </h4>
            <p className="text-sm font-semibold text-navy">
              {reservation.clientName}
            </p>
            {client && (
              <div className="mt-2 space-y-1.5 text-xs text-ink-mid">
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-ink-soft" />
                  {client.phone}
                </p>
                <p className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-soft" />
                  {reservation.address}
                </p>
              </div>
            )}
            {client && (
              <Link
                href={`/clients/${client.id}`}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-terra hover:underline"
              >
                Voir la fiche client
              </Link>
            )}
          </section>

          {/* Récap paiement */}
          <section className="card p-5">
            <h4 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-navy">
              <Receipt className="h-4 w-4 text-terra" /> Facturation
            </h4>
            <ul className="space-y-2 text-sm">
              <Row label="Forfait TTC" value={euros(reservation.amountTTC)} />
              <Row label="Crédit d'impôt SAP" value={`- ${euros(credit)}`} />
              <Row
                label="Reste à charge"
                value={euros(reservation.amountAfterTax)}
                bold
              />
            </ul>
            <div className="mt-3 border-t border-[rgba(0,35,75,0.06)] pt-3">
              <Badge tone={paymentTone[reservation.paymentStatus]} dot>
                {paymentLabel[reservation.paymentStatus]}
              </Badge>
            </div>
          </section>

          {/* Actions */}
          <Link
            href="/messagerie"
            className="flex items-center gap-3 rounded-3xl bg-teal p-4 text-white transition-transform hover:-translate-y-0.5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <MessageCircle className="h-4 w-4" />
            </span>
            <div className="text-sm">
              <p className="font-semibold">Contacter le client</p>
              <p className="text-xs text-white/60">Ouvrir la messagerie</p>
            </div>
          </Link>

          <button
            onClick={() => setStatus("cancelled")}
            className="w-full text-center text-xs text-ink-soft transition-colors hover:text-danger"
          >
            Annuler cette réservation
          </button>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-xs uppercase tracking-[0.06em] text-ink-soft">
        {label}
      </span>
      <span
        className={
          bold
            ? "font-display text-lg font-bold text-navy"
            : "font-medium text-navy"
        }
      >
        {value}
      </span>
    </li>
  );
}
