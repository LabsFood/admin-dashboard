"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Info,
  MapPin,
  RotateCw,
  Search,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import FilterTabs from "@/components/ui/FilterTabs";
import EmptyState from "@/components/ui/EmptyState";
import { euros, formatDate } from "@/lib/utils";
import {
  BOOKING_STATUSES,
  bookingMealNames,
  bookingPortions,
  bookingStatusLabel,
  bookingStatusText,
  isBookingOpen,
  useBookings,
  type Booking,
  type BookingStatus,
} from "@/lib/api/bookings";
import { adminErrorMessage } from "@/lib/api/errors";

/* ─────────────────────────────────────────────────────────────────────────────
   Les réservations — `GET /admin/bookings`.

   La route du 16/10 remplace `GET /bookings`, qui rendait toute la base d'un
   bloc **et était appelable par n'importe quel compte connecté**. Elle est
   paginée et filtrée côté serveur : le filtre par statut et la page partent
   dans l'URL, et ce qui est compté est exact.

   La recherche, elle, reste locale : l'API n'a pas de `?q=`. L'écran le dit —
   elle ne porte que sur la page affichée.
   ───────────────────────────────────────────────────────────────────────────── */

type Filter = "all" | BookingStatus;

const PAR_PAGE = 25;

export default function ReservationsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [recherche, setRecherche] = useState("");

  const query = useBookings({
    page,
    limit: PAR_PAGE,
    status: filter === "all" ? undefined : filter,
  });

  const lignes = query.data?.data ?? [];
  const meta = query.data?.meta;
  const total = meta?.total ?? lignes.length;

  const q = recherche.trim().toLowerCase();
  const visibles = lignes.filter(
    (b) =>
      !q ||
      (b.reference ?? "").toLowerCase().includes(q) ||
      (b.client?.name ?? "").toLowerCase().includes(q) ||
      (b.chef?.displayName ?? "").toLowerCase().includes(q) ||
      (b.city ?? "").toLowerCase().includes(q) ||
      bookingMealNames(b).some((n) => n.toLowerCase().includes(q)),
  );

  const ouvertes = lignes.filter(isBookingOpen).length;
  const sommePage = lignes.reduce((n, b) => n + (b.amountTtc ?? b.priceCents ?? 0), 0);

  function changerFiltre(f: Filter) {
    setFilter(f);
    setPage(1);
  }

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
        <MiniStat
          label={filter === "all" ? "Réservations" : bookingStatusLabel[filter]}
          value={query.isPending ? "…" : total}
        />
        <MiniStat
          label="En cours sur cette page"
          value={query.isPending ? "…" : ouvertes}
        />
        <MiniStat
          label="Montant de la page"
          value={query.isPending ? "…" : euros(Math.round(sommePage / 100))}
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<Filter>
          value={filter}
          onChange={changerFiltre}
          options={[
            { id: "all", label: "Toutes" },
            ...BOOKING_STATUSES.map((s) => ({ id: s, label: bookingStatusLabel[s] })),
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
            placeholder="Référence, client, ville…"
            aria-label="Rechercher dans cette page"
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
      ) : total === 0 ? (
        <div className="card">
          <EmptyState
            Icon={CalendarRange}
            title={filter === "all" ? "Aucune réservation" : "Aucune réservation dans cet état"}
            text={
              filter === "all"
                ? "Dès qu'un client réservera un batch cooker, sa prestation apparaîtra ici."
                : "Changez de filtre pour voir les autres."
            }
          />
        </div>
      ) : visibles.length === 0 ? (
        <p className="card p-6 text-sm text-ink-soft">
          Aucune réservation de cette page ne correspond à «&nbsp;{recherche}&nbsp;». La
          recherche ne porte que sur la page affichée : l&apos;API n&apos;en propose pas.
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {visibles.map((b, i) => (
              <BookingRow key={b.id} booking={b} index={i} />
            ))}
          </ul>

          {meta && (meta.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] text-ink-soft">
                Page {meta.page} sur {meta.totalPages} · {total} réservation
                {total > 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={meta.page <= 1}
                  className="btn btn-outline btn-sm disabled:opacity-40"
                >
                  <ChevronLeft className="h-3 w-3" aria-hidden /> Précédente
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!meta.hasNextPage && meta.page >= (meta.totalPages ?? 1)}
                  className="btn btn-outline btn-sm disabled:opacity-40"
                >
                  Suivante <ChevronRight className="h-3 w-3" aria-hidden />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <section className="card p-5">
        <h3 className="flex items-center gap-2 font-display text-base font-bold text-navy">
          <Info className="h-4 w-4 text-ink-soft" aria-hidden />
          Ce que l&apos;API ne fait pas encore
        </h3>
        <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-mid">
          <li>
            <strong>Chercher</strong> — aucun <code>?q=</code> : la recherche
            ci-dessus ne porte que sur la page affichée.
          </li>
          <li>
            <strong>Le règlement</strong> — <code>paidCents</code> dit combien a
            été encaissé, mais il n&apos;y a pas d&apos;écran de suivi des
            paiements côté console.
          </li>
        </ul>
      </section>
    </div>
  );
}

function BookingRow({ booking: b, index }: { booking: Booking; index: number }) {
  const plats = bookingMealNames(b);
  const portions = bookingPortions(b);
  const impaye = b.status === "pending";

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
              {b.client?.name ?? "Client non nommé"}
            </span>
            <Badge tone={impaye ? "warning" : isBookingOpen(b) ? "info" : "neutral"} dot>
              {bookingStatusText(b.status)}
            </Badge>
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-ink-soft">
            {[
              b.reference,
              b.startsAt ? formatDate(b.startsAt) : null,
              b.timeSlot,
              portions > 0 ? `${portions} portions` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
          {plats.length > 0 && (
            <p className="mt-1 truncate text-[12px] text-ink-mid">{plats.join(", ")}</p>
          )}
        </div>

        <div className="hidden min-w-0 flex-col items-start text-[11px] text-ink-soft sm:flex">
          {b.chef?.displayName && (
            <span className="inline-flex items-center gap-1.5">
              <ChefHat className="h-3.5 w-3.5" aria-hidden /> {b.chef.displayName}
            </span>
          )}
          {b.city && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden /> {b.city}
            </span>
          )}
        </div>

        {b.amountTtc != null && (
          <span className="font-display text-sm font-bold text-navy">
            {euros(Math.round(b.amountTtc / 100))}
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
