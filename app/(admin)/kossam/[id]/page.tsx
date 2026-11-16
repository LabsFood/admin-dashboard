"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  CreditCard,
  Mail,
  MapPin,
  Milk,
  Phone,
  Printer,
  Receipt,
  StickyNote,
  Truck,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { euros, formatDateLong } from "@/lib/utils";
import { kossamTone, paymentTone, paymentLabel } from "@/lib/status";
import {
  kossamById,
  KOSSAM_STATUS_LABEL,
  KOSSAM_STATUS_FLOW,
} from "@/lib/mock/kossam";
import type { KossamStatus, PaymentStatus } from "@/lib/mock/types";

/** @deprecated Retired from the console on 2026-11-01: linked from nowhere, kept for a possible return. */
export default function KossamDetailPage() {
  const params = useParams<{ id: string }>();
  const order = kossamById(params.id);
  const [status, setStatus] = useState<KossamStatus>(order?.status ?? "new");
  const [payment, setPayment] = useState<PaymentStatus>(
    order?.paymentStatus ?? "pending",
  );

  if (!order) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="mb-3 text-5xl">🥛</p>
        <h2 className="font-display text-2xl font-bold text-navy">
          Commande introuvable
        </h2>
        <Link href="/kossam" className="btn btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" /> Retour aux commandes
        </Link>
      </div>
    );
  }

  const bottles = order.items.reduce((n, it) => n + it.qty, 0);
  const subtotal = order.items.reduce(
    (n, it) => n + it.qty * it.unitPrice,
    0,
  );
  const stepIndex = KOSSAM_STATUS_FLOW.indexOf(status);

  return (
    <div className="space-y-6">
      <Link
        href="/kossam"
        className="inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Toutes les commandes Kossam
      </Link>

      {/* En-tête */}
      <div
        className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white lg:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-teal-soft/35 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.16em] text-terra-soft">
                <Milk className="h-3 w-3" /> {order.reference}
              </span>
              <Badge tone={kossamTone[status]} dot>
                {KOSSAM_STATUS_LABEL[status]}
              </Badge>
            </div>
            <h2 className="mt-2 font-display text-3xl font-bold lg:text-4xl">
              {order.customerName}
            </h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/65">
              <span className="inline-flex items-center gap-1.5">
                <Milk className="h-4 w-4 text-terra-soft" />
                {bottles} bouteille{bottles > 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-terra-soft" />
                Livraison {formatDateLong(order.deliveryDate)}
              </span>
            </p>
          </div>
          <div className="lg:text-right">
            <p className="font-display text-3xl font-bold text-terra-soft tabular-nums">
              {euros(order.total)}
            </p>
            <Badge tone={paymentTone[payment]} className="mt-1">
              {paymentLabel[payment]}
            </Badge>
          </div>
        </div>
      </div>

      {/* Suivi */}
      <section className="card p-6">
        <h3 className="mb-5 font-display text-lg font-bold text-navy">
          Suivi de la commande
        </h3>
        {status === "cancelled" ? (
          <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            Cette commande a été annulée.
          </p>
        ) : (
          <>
            <div className="relative grid grid-cols-4 gap-2">
              <div className="absolute left-0 right-0 top-4 h-0.5 bg-cream-deep" />
              <div
                className="absolute left-0 top-4 h-0.5 bg-terra transition-[width] duration-200"
                style={{
                  width: `${(stepIndex / (KOSSAM_STATUS_FLOW.length - 1)) * 100}%`,
                }}
              />
              {KOSSAM_STATUS_FLOW.map((step, i) => {
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
                      className={`mt-2 text-xs font-semibold uppercase tracking-[0.08em] ${
                        reached ? "text-navy" : "text-ink-soft"
                      }`}
                    >
                      {KOSSAM_STATUS_LABEL[step]}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[rgba(0,35,75,0.06)] pt-4">
              <span className="mr-1 text-xs font-semibold text-ink-soft">
                Faire avancer :
              </span>
              {KOSSAM_STATUS_FLOW.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    s === status
                      ? "bg-navy text-white"
                      : "bg-cream-soft text-ink-mid hover:bg-cream-deep"
                  }`}
                >
                  {KOSSAM_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          {/* Articles */}
          <section className="card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-navy">
              <Milk className="h-4 w-4 text-terra" /> Articles commandés
            </h3>
            <ul className="divide-y divide-[rgba(0,35,75,0.06)]">
              {order.items.map((it) => (
                <li
                  key={it.format}
                  className="flex items-center gap-4 py-3"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-pale text-teal">
                    <Milk className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-navy">
                      Kossam {it.format}
                    </p>
                    <p className="text-xs text-ink-soft tabular-nums">
                      {euros(it.unitPrice)} l&apos;unité
                    </p>
                  </div>
                  <span className="tabular-nums text-sm text-ink-mid">
                    × {it.qty}
                  </span>
                  <span className="font-display text-sm font-bold text-navy tabular-nums">
                    {euros(it.qty * it.unitPrice)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Livraison */}
          <section className="card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-navy">
              <Truck className="h-4 w-4 text-terra" /> Livraison
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoLine Icon={MapPin} label="Adresse" value={order.deliveryAddress} />
              <InfoLine Icon={MapPin} label="Zone" value={order.deliveryZone} />
              <InfoLine
                Icon={Calendar}
                label="Date"
                value={formatDateLong(order.deliveryDate)}
              />
              <InfoLine Icon={Clock} label="Créneau" value={order.deliverySlot} />
            </div>
          </section>

          {/* Notes */}
          {order.notes && (
            <section className="rounded-3xl border border-terra/30 bg-terra-pale/30 p-5">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-terra-deep">
                <StickyNote className="h-3.5 w-3.5" /> Note de commande
              </p>
              <p className="text-sm text-navy">{order.notes}</p>
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
              {order.customerName}
            </p>
            <div className="mt-2 space-y-1.5 text-xs text-ink-mid">
              <p className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-ink-soft" />
                {order.email}
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-ink-soft" />
                {order.phone}
              </p>
            </div>
          </section>

          {/* Facturation */}
          <section className="card p-5">
            <h4 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-navy">
              <Receipt className="h-4 w-4 text-terra" /> Paiement
            </h4>
            <ul className="space-y-2 text-sm">
              <Row label="Sous-total" value={euros(subtotal)} />
              <Row
                label="Livraison"
                value={order.deliveryFee ? euros(order.deliveryFee) : "Offerte"}
              />
              <Row label="Total" value={euros(order.total)} bold />
            </ul>
            <div className="mt-3 flex items-center gap-2 border-t border-[rgba(0,35,75,0.06)] pt-3 text-xs text-ink-mid">
              <CreditCard className="h-3.5 w-3.5 text-ink-soft" />
              {order.paymentMethod}
            </div>
            {payment !== "paid" && payment !== "refunded" && (
              <button
                onClick={() => setPayment("paid")}
                className="btn btn-primary mt-3 w-full"
              >
                <Check className="h-4 w-4" /> Marquer comme payée
              </button>
            )}
          </section>

          {/* Actions */}
          <button className="btn btn-outline w-full">
            <Printer className="h-4 w-4" /> Imprimer le bon de livraison
          </button>
          {status !== "cancelled" && status !== "delivered" && (
            <button
              onClick={() => setStatus("cancelled")}
              className="w-full text-center text-xs text-ink-soft transition-colors hover:text-danger"
            >
              Annuler cette commande
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}

function InfoLine({
  Icon,
  label,
  value,
}: {
  Icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-cream-soft p-3">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-ink-soft">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="mt-1 text-sm font-medium text-navy">{value}</p>
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
