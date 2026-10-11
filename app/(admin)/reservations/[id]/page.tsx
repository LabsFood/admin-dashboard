"use client";

import { use, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarRange,
  ChefHat,
  Clock,
  Info,
  Loader2,
  Mail,
  RefreshCw,
  RotateCw,
  ShoppingBasket,
  UserRound,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toaster";
import { euros, formatDateLong } from "@/lib/utils";
import { aisleLabel } from "@/lib/recipe-fields";
import {
  bookingPortions,
  bookingStatusText,
  isBookingOpen,
  useBooking,
  useRegenerateShoppingList,
} from "@/lib/api/bookings";
import { adminErrorMessage } from "@/lib/api/errors";

/* ─────────────────────────────────────────────────────────────────────────────
   Une réservation — `GET /bookings/admin/bookings/{id}`.

   Elle arrive complète : le client, les plats avec leurs portions, et la liste
   de courses telle qu'elle a été calculée. Noter le chemin, dont le segment
   est doublé côté API.

   Une seule action : recalculer la liste de courses. Elle repart des versions
   de recettes que la prestation cuisine, **en gardant les corrections du batch
   cooker** — c'est ce qui la rend sans danger, et c'est ce que le dialogue dit
   avant de la lancer.

   Ce qui n'existe pas : l'adresse de la session, le règlement, la part du
   batch cooker, et son nom (seul `chefProfileId` est renvoyé).
   ───────────────────────────────────────────────────────────────────────────── */

export default function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const toast = useToast();
  const query = useBooking(id);
  const regenerate = useRegenerateShoppingList();
  const [aRecalculer, setARecalculer] = useState(false);

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
  const heures =
    b.startsAt && b.endsAt
      ? `${new Date(b.startsAt).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })} → ${new Date(b.endsAt).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : null;

  /** Les lignes de la liste, regroupées par rayon comme en magasin. */
  const rayons = new Map<string, { name: string; quantity: string | null }[]>();
  for (const it of b.shoppingList?.items ?? []) {
    const cle = it.aisle ?? "";
    const bucket = rayons.get(cle) ?? [];
    bucket.push({ name: it.name, quantity: it.quantity });
    rayons.set(cle, bucket);
  }

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
        transition={{ duration: 0.4 }}
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
              {heures && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-terra-soft" aria-hidden /> {heures}
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
          {b.priceCents != null && (
            <div className="flex flex-col items-start lg:items-end">
              <p className="font-display text-3xl font-bold text-terra-soft">
                {euros(Math.round(b.priceCents / 100))}
              </p>
              <p className="text-xs text-white/60">payés par le client</p>
            </div>
          )}
        </div>
      </motion.section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* ── Plats ───────────────────────────────────────────────────── */}
          <section className="card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-navy">
              <UtensilsCrossed className="h-4 w-4 text-terra" aria-hidden /> Plats
              commandés
            </h3>
            {(b.bookingMeals?.length ?? 0) === 0 ? (
              <p className="text-sm text-ink-soft">
                Aucun plat rattaché à cette réservation.
              </p>
            ) : (
              <ul className="divide-y divide-[rgba(0,35,75,0.06)]">
                {b.bookingMeals!.map((m) => (
                  <li
                    key={m.mealId}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-navy">
                        {m.meal?.name ?? "Plat retiré du catalogue"}
                      </span>
                      <span className="block font-mono text-[11px] text-ink-soft">
                        {m.mealId.slice(0, 8)}…
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

          {/* ── Liste de courses ───────────────────────────────────────── */}
          <section className="card p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-navy">
                  <ShoppingBasket className="h-4 w-4 text-terra" aria-hidden /> Liste de
                  courses
                </h3>
                {b.shoppingList?.generatedAt && (
                  <p className="mt-0.5 text-[12px] text-ink-soft">
                    Calculée le {formatDateLong(b.shoppingList.generatedAt)}
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

            {rayons.size === 0 ? (
              <p className="text-sm leading-relaxed text-ink-soft">
                Aucune liste pour cette réservation. Elle se calcule depuis les
                recettes de ses plats : si aucun n&apos;a de recette, il n&apos;y a
                rien à calculer.
              </p>
            ) : (
              <div className="space-y-4">
                {[...rayons.entries()].map(([rayon, lignes]) => (
                  <div key={rayon || "sans-rayon"}>
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
                      {aisleLabel(rayon) ?? "Sans rayon"}
                    </p>
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {lignes.map((l, i) => (
                        <li
                          key={`${l.name}-${i}`}
                          className="flex items-center justify-between gap-2 rounded-xl bg-cream-soft px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 text-navy">{l.name}</span>
                          <span className="shrink-0 text-xs text-ink-soft">
                            {l.quantity ?? ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Colonne de droite ─────────────────────────────────────────── */}
        <aside className="space-y-4">
          <section className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-navy">
              <UserRound className="h-4 w-4 text-terra" aria-hidden /> Le client
            </h3>
            {b.client ? (
              <dl className="space-y-2 text-sm">
                <Row label="Nom" value={b.client.fullName ?? "Non renseigné"} />
                <Row label="Email" value={b.client.email ?? "—"} mono />
                {b.client.role && <Row label="Rôle" value={b.client.role} />}
              </dl>
            ) : (
              <p className="text-sm text-ink-soft">
                Client non renvoyé par l&apos;API pour cette réservation.
              </p>
            )}
            {b.clientId && (
              <Link
                href={`/clients/${b.clientId}`}
                className="btn btn-outline btn-sm mt-3 w-full"
              >
                <Mail className="h-3 w-3" aria-hidden /> Sa fiche client
              </Link>
            )}
          </section>

          <section className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-navy">
              <ChefHat className="h-4 w-4 text-terra" aria-hidden /> Le batch cooker
            </h3>
            {b.chefProfileId ? (
              <>
                <p className="font-mono text-[11px] leading-relaxed text-ink-soft">
                  {b.chefProfileId}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-mid">
                  Son nom n&apos;est pas renvoyé sur une réservation — seul son
                  identifiant de profil l&apos;est.
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-soft">
                Aucun batch cooker assigné à cette réservation.
              </p>
            )}
          </section>

          <section className="card p-5">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-navy">
              <Info className="h-4 w-4 text-ink-soft" aria-hidden /> Pas disponible
            </h3>
            <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-mid">
              {[
                "L’adresse de la session",
                "Le règlement et son statut",
                "La part du batch cooker et la commission",
                "Annuler ou déplacer la réservation",
              ].map((x) => (
                <li key={x} className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-soft/50"
                  />
                  <span>
                    {x} — <strong className="font-semibold text-navy">N/A</strong>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {!isBookingOpen(b) && (
            <p className="flex items-start gap-2 px-1 text-[12px] leading-relaxed text-ink-soft">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
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
              setARecalculer(false);
              toast.success(
                "Liste de courses recalculée",
                "Les corrections du batch cooker ont été conservées.",
              );
            },
            onError: (e) =>
              toast.error("Le recalcul a échoué", adminErrorMessage(e)),
          })
        }
        pending={regenerate.isPending}
        title="Recalculer la liste de courses ?"
        lead="Elle repart des versions de recettes que cette prestation cuisine, mises à l'échelle des portions commandées."
        detail="Les corrections du batch cooker sont conservées : le geste est sans danger, et utile après un changement de plats ou de portions."
        confirmLabel="Recalculer"
      />
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={mono ? "font-mono text-[13px] text-navy" : "text-navy"}>{value}</dd>
    </div>
  );
}
