"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  ChefHat,
  Info,
  RotateCw,
  Search,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import FilterTabs from "@/components/ui/FilterTabs";
import EmptyState from "@/components/ui/EmptyState";
import { euros, formatDate } from "@/lib/utils";
import {
  bookingMealNames,
  bookingPortions,
  bookingStatusLabel,
  bookingStatusText,
  isBookingOpen,
  useBookings,
  type Booking,
} from "@/lib/api/bookings";
import { adminErrorMessage } from "@/lib/api/errors";

/* ─────────────────────────────────────────────────────────────────────────────
   Les réservations — `GET /bookings`.

   L'écran tournait sur `lib/mock/reservations.ts` et montrait un statut de
   paiement, un créneau nommé, une formule et un chef par son nom. Une
   réservation porte une référence, deux bornes horaires, un statut, un prix
   TTC en centimes, ses plats et son client. C'est ce qui est affiché.

   La route rend toute la base d'un bloc : le filtre, la recherche et le tri
   sont faits ici. L'écran le dit, parce que c'est ce qui cassera le jour où il
   y aura mille réservations.
   ───────────────────────────────────────────────────────────────────────────── */

type Filter = "all" | "open" | "history" | string;

export default function ReservationsPage() {
  const query = useBookings();
  const [filter, setFilter] = useState<Filter>("all");
  const [recherche, setRecherche] = useState("");

  const toutes = query.data ?? [];

  const counts = toutes.reduce<Record<string, number>>((acc, b) => {
    if (b.status) acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});
  const statuts = Object.keys(counts).sort(
    (a, b) => (counts[b] ?? 0) - (counts[a] ?? 0),
  );

  const q = recherche.trim().toLowerCase();
  const liste = toutes
    .filter((b) =>
      filter === "all"
        ? true
        : filter === "open"
          ? isBookingOpen(b)
          : filter === "history"
            ? !isBookingOpen(b)
            : b.status === filter,
    )
    .filter(
      (b) =>
        !q ||
        (b.reference ?? "").toLowerCase().includes(q) ||
        (b.client?.fullName ?? "").toLowerCase().includes(q) ||
        (b.client?.email ?? "").toLowerCase().includes(q) ||
        bookingMealNames(b).some((n) => n.toLowerCase().includes(q)),
    )
    .sort((a, b) => (b.startsAt ?? "").localeCompare(a.startsAt ?? ""));

  const ouvertes = toutes.filter(isBookingOpen).length;
  const total = toutes.reduce((n, b) => n + (b.priceCents ?? 0), 0);

  if (query.isError) {
    return (
      <section className="card p-6">
        <p className="flex items-start gap-2 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {adminErrorMessage(query.error)}
        </p>
        <button onClick={() => query.refetch()} className="btn btn-outline btn-sm mt-4">
          <RotateCw className="h-3 w-3" aria-hidden /> Réessayer
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <MiniStat label="Réservations" value={query.isPending ? "…" : toutes.length} />
        <MiniStat label="En cours" value={query.isPending ? "…" : ouvertes} />
        <MiniStat
          label="Chiffre d'affaires"
          value={query.isPending ? "…" : euros(Math.round(total / 100))}
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "Toutes", count: toutes.length },
            { id: "open", label: "En cours", count: ouvertes },
            { id: "history", label: "Terminées", count: toutes.length - ouvertes },
            ...statuts.map((s) => ({
              id: s,
              label: bookingStatusLabel[s] ?? s,
              count: counts[s] ?? 0,
            })),
          ]}
        />
        <div className="relative lg:w-64">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
            aria-hidden
          />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Référence, client, plat…"
            aria-label="Rechercher une réservation"
            className="input-base pl-9"
          />
        </div>
      </div>

      {query.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card h-20 animate-pulse" />
          ))}
        </div>
      ) : toutes.length === 0 ? (
        <div className="card">
          <EmptyState
            Icon={CalendarRange}
            title="Aucune réservation"
            text="La réservation n'est pas encore ouverte côté API : POST /bookings répond 501. Rien ne peut arriver ici avant que le backend ne l'ouvre."
          />
        </div>
      ) : liste.length === 0 ? (
        <p className="card p-6 text-sm text-ink-soft">
          Aucune réservation ne correspond
          {q ? ` à « ${recherche} »` : " à ce filtre"}.
        </p>
      ) : (
        <ul className="space-y-3">
          {liste.map((b, i) => (
            <BookingRow key={b.id} booking={b} index={i} />
          ))}
        </ul>
      )}

      <section className="card p-5">
        <h3 className="flex items-center gap-2 font-display text-base font-bold text-navy">
          <Info className="h-4 w-4 text-ink-soft" aria-hidden />
          Ce que l&apos;API ne sait pas encore faire
        </h3>
        <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-mid">
          <li>
            <strong>Réserver</strong> — <code>POST /bookings</code> répond{" "}
            <code>501</code>. Le tunnel de réservation du site ne peut donc pas
            aboutir : c&apos;est le plus gros manque du produit aujourd&apos;hui.
          </li>
          <li>
            <strong>Filtrer et paginer</strong> — <code>GET /bookings</code> rend
            toute la base d&apos;un bloc. Ce qui est trié ici l&apos;est côté
            navigateur, et ne tiendra pas à l&apos;échelle.
          </li>
          <li>
            <strong>Le règlement</strong> — aucun statut de paiement sur une
            réservation, aucune route de paiement.
          </li>
          <li>
            <strong>Le nom du batch cooker</strong> — seul son{" "}
            <code>chefProfileId</code> est renvoyé.
          </li>
        </ul>
      </section>
    </div>
  );
}

function BookingRow({ booking: b, index }: { booking: Booking; index: number }) {
  const plats = bookingMealNames(b);
  const portions = bookingPortions(b);

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
    >
      <Link
        href={`/reservations/${b.id}`}
        className="card card-hover flex flex-wrap items-center gap-x-5 gap-y-3 p-4"
      >
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-cream-deep">
          {b.startsAt ? (
            <>
              <span className="font-display text-sm font-bold text-navy">
                {new Date(b.startsAt).getDate()}
              </span>
              <span className="font-mono text-[8px] uppercase text-ink-soft">
                {new Date(b.startsAt).toLocaleDateString("fr-FR", { month: "short" })}
              </span>
            </>
          ) : (
            <CalendarRange className="h-4 w-4 text-ink-soft" aria-hidden />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-sm font-semibold text-navy">
              {b.client?.fullName ?? b.client?.email ?? "Client non nommé"}
            </span>
            <Badge tone={isBookingOpen(b) ? "info" : "neutral"} dot>
              {bookingStatusText(b.status)}
            </Badge>
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-ink-soft">
            {[
              b.reference,
              b.startsAt ? formatDate(b.startsAt) : null,
              portions > 0 ? `${portions} portions` : null,
              plats.length > 0 ? `${plats.length} plat${plats.length > 1 ? "s" : ""}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
          {plats.length > 0 && (
            <p className="mt-1 truncate text-[12px] text-ink-mid">{plats.join(", ")}</p>
          )}
        </div>

        {b.chefProfileId && (
          <span className="hidden items-center gap-1.5 text-[11px] text-ink-soft sm:inline-flex">
            <ChefHat className="h-3.5 w-3.5" aria-hidden /> Batch cooker assigné
          </span>
        )}

        {b.priceCents != null && (
          <span className="font-display text-sm font-bold text-navy">
            {euros(Math.round(b.priceCents / 100))}
          </span>
        )}

        <ArrowRight className="h-4 w-4 shrink-0 text-terra" aria-hidden />
      </Link>
    </motion.li>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="font-display text-2xl font-bold text-navy">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
        {label}
      </p>
    </div>
  );
}
