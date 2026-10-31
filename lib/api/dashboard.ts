"use client";

import { useQuery } from "@tanstack/react-query";
import { useApiFetch } from "./client";

/* ─────────────────────────────────────────────────────────────────────────────
   Les chiffres de la console — `GET /admin/dashboard`.

   Deux choses à savoir avant de dessiner quoi que ce soit avec :

   1. **Il n'y a pas de période.** La route ne prend aucun paramètre et compte
      « across all bookings » : c'est un cumul depuis le premier jour. Pas de
      mois en cours, pas de mois précédent, donc pas de tendance. L'écran
      affichait « CA du mois +12 % » et une courbe sur sept mois : deux choses
      que l'API ne sait pas dire.

   2. **La réponse est une sortie brute de la base.** `_count._all`,
      `_sum.portions`, et des identifiants sans libellé : `topMeals` ne donne
      que `mealId`, `formuleSplit` que `formuleId`. Les noms se retrouvent en
      croisant avec `GET /admin/meals` et `GET /admin/formules`. On normalise
      ici, une fois, pour que l'écran parle de plats et de formules et pas de
      `_sum`.
   ───────────────────────────────────────────────────────────────────────────── */

/** La réponse telle qu'elle arrive. */
interface RawDashboard {
  revenue?: {
    /** Centimes, avant crédit d'impôt. */
    amountTtc?: number | null;
    /** Centimes, ce que le client paie réellement. */
    amountAfterTax?: number | null;
    priceCents?: number | null;
  } | null;
  sessionsByStatus?: { status?: string | null; _count?: { _all?: number } }[] | null;
  formuleSplit?: { formuleId?: string | null; _count?: { _all?: number } }[] | null;
  topMeals?: { mealId?: string | null; _sum?: { portions?: number | null } }[] | null;
}

export interface Tally {
  /** L'identifiant brut : c'est lui qui sert à retrouver un nom. */
  key: string;
  count: number;
}

export interface AdminFigures {
  /** En centimes, cumulés sur toutes les réservations. */
  revenueTtcCents: number | null;
  revenueAfterTaxCents: number | null;
  /** Réservations par statut, de la plus nombreuse à la moins. */
  sessionsByStatus: Tally[];
  /** Réservations par formule. */
  formuleSplit: Tally[];
  /** Les cinq plats les plus commandés, en portions. */
  topMeals: Tally[];
  /** Total des réservations, toutes périodes : la somme des statuts. */
  sessionsTotal: number;
}

const nombre = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

function tallies(
  list: { _count?: { _all?: number }; _sum?: { portions?: number | null } }[] | null | undefined,
  cle: (x: Record<string, unknown>) => string | null | undefined,
): Tally[] {
  return (list ?? [])
    .map((x) => ({
      key: cle(x as Record<string, unknown>) ?? "",
      count: nombre(x._count?._all) || nombre(x._sum?.portions),
    }))
    .filter((t) => t.key !== "")
    .sort((a, b) => b.count - a.count);
}

function normalize(raw: RawDashboard | null | undefined): AdminFigures {
  const sessions = tallies(raw?.sessionsByStatus, (x) => x.status as string);
  return {
    revenueTtcCents:
      raw?.revenue?.amountTtc ?? raw?.revenue?.priceCents ?? null,
    revenueAfterTaxCents: raw?.revenue?.amountAfterTax ?? null,
    sessionsByStatus: sessions,
    formuleSplit: tallies(raw?.formuleSplit, (x) => x.formuleId as string),
    topMeals: tallies(raw?.topMeals, (x) => x.mealId as string),
    sessionsTotal: sessions.reduce((n, s) => n + s.count, 0),
  };
}

export function useAdminDashboard({ enabled }: { enabled?: boolean } = {}) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => normalize(await apiFetch<RawDashboard>("/admin/dashboard")),
    enabled: enabled ?? true,
    staleTime: 60_000,
  });
}

/* ── Les statuts de réservation, dits en français ──────────────────────────── */

/**
 * Les statuts que la base utilise. La liste n'est pas documentée : on nomme
 * ceux qu'on a vus et on laisse passer les autres tels quels, plutôt que de
 * les cacher ou de les traduire au hasard.
 */
export const bookingStatusLabel: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  shopping: "Courses en cours",
  cooking: "En cuisine",
  completed: "Terminée",
  cancelled: "Annulée",
  refunded: "Remboursée",
};

export const bookingStatusText = (code: string) =>
  bookingStatusLabel[code] ?? code;

/** Les statuts qu'on considère encore en cours. */
export const BOOKING_ACTIVE = ["pending", "confirmed", "shopping", "cooking"];
