"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { BadgeTone } from "@/components/ui/Badge";
import { useApiFetch } from "./client";

/* ─────────────────────────────────────────────────────────────────────────────
   Les batch cookers.

   La liste de tous les comptes batch cooker de la plateforme, approuvés ou non,
   y compris ceux qui n'ont jamais déposé de candidature. Elle vient de
   `/admin/chefs`, plus des candidatures approuvées comme avant.

   L'identifiant est celui de la **page batch cooker** (`chefProfile.id`) : le
   même que prennent `/admin/chefs/{id}/dishes`, `/menus` et `/verification`.
   Ce n'est ni l'identifiant du compte (`userId`) ni celui de la candidature.

   Lecture seule. Mettre en ligne se fait par `useSetChefVerification`,
   approuver par la candidature.
   ───────────────────────────────────────────────────────────────────────────── */

/** Où en est un batch cooker. Chacun est dans un seul état, calculé par l'API. */
export type ChefState = "online" | "offline" | "suspended" | "pending";

/** `verified` : le réseau, soit les trois premiers états réunis. */
export type ChefStateFilter = ChefState | "verified";

export type ChefSort = "recent" | "name";

/**
 * Les quatre paliers (module Recettes, R34). Des codes neutres : leurs noms se
 * règlent dans Paramètres, sans déploiement. Aucune facturation n'en dépend.
 */
export const CHEF_TIERS = ["tier_1", "tier_2", "tier_3", "tier_4"] as const;
export type ChefTier = (typeof CHEF_TIERS)[number];

export interface AdminChef {
  /** Identifiant de la page batch cooker. */
  id: string;
  /** Identifiant du compte : pour lui écrire, ou l'affecter à une demande. */
  userId: string;
  displayName: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  city: string | null;
  state: ChefState;
  isVerified: boolean;
  isActive: boolean;
  autoSuspendedAt: string | null;
  /** En ligne sur la foi d'un document de remplacement que personne n'a relu. */
  reactivatedPendingReview: boolean;
  /** Absent d'une API antérieure aux paliers. */
  tier?: ChefTier;
  /** Le nom réglé dans Paramètres. */
  tierLabel?: string;
  regions: { code: string; label: string }[];
  /** `null` : compte sans candidature (antérieur au parcours, ou créé à la main). */
  application: { id: string; reference: string; status: string } | null;
  counts: {
    publishedDishes: number;
    publishedMenus: number;
    /** Réservations en attente ou confirmées. */
    upcomingBookings: number;
    completedBookings: number;
  };
  createdAt: string;
}

export interface AdminChefDetail extends AdminChef {
  bio: string | null;
  serviceRadiusKm: number;
  sapPath: string | null;
  sapDeclarationNumber: string | null;
  /** Rendus depuis le 24/10 : la fiche peut enfin relire ce qu'elle écrit. */
  crcesuAffiliationStatus?: "not_started" | "pending" | "active" | null;
  urssafTiersPrestationStatus?: "not_started" | "pending" | "active" | null;
  zones: {
    regionCode: string;
    regionLabel: string;
    scope: "region" | "cities";
    cities: string[];
  }[];
  payoutsConnected: boolean;
  calendarConnected: boolean;
  application:
    | (NonNullable<AdminChef["application"]> & {
        submittedAt: string;
        decidedAt: string | null;
      })
    | null;
}

export type ChefCounts = Record<ChefState | "all", number>;

interface ChefPage {
  data: AdminChef[];
  meta: {
    page: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export const CHEF_STATE_LABEL: Record<ChefState, string> = {
  online: "En ligne",
  offline: "Hors ligne",
  suspended: "Suspendu",
  pending: "En attente",
};

export const CHEF_STATE_TONE: Record<ChefState, BadgeTone> = {
  online: "success",
  offline: "neutral",
  suspended: "danger",
  pending: "warning",
};

/** Ce que l'état veut dire pour quelqu'un qui cherche à réserver. */
export const CHEF_STATE_HELP: Record<ChefState, string> = {
  online: "Vitrine en ligne : les clients peuvent le réserver.",
  offline:
    "Approuvé mais invisible : aucun client ne peut le réserver tant que sa vitrine n'est pas mise en ligne.",
  suspended:
    "Mis hors ligne automatiquement : un document obligatoire a expiré. Le dépôt d'une version à jour le remet en ligne.",
  pending: "Compte créé, candidature pas encore approuvée.",
};

const ROOT = ["admin", "chefs"] as const;

export interface ChefListParams {
  q?: string;
  state?: ChefStateFilter;
  region?: string;
  sort?: ChefSort;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

/** `GET /admin/chefs` — recherche, filtres et tri faits par l'API. */
export function useAdminChefs({
  q,
  state,
  region,
  sort,
  page,
  limit,
  enabled,
}: ChefListParams = {}) {
  const apiFetch = useApiFetch();
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (state) params.set("state", state);
  if (region) params.set("region", region);
  if (sort) params.set("sort", sort);
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();

  return useQuery({
    queryKey: [...ROOT, "list", qs],
    queryFn: () => apiFetch<ChefPage>(`/admin/chefs${qs ? `?${qs}` : ""}`),
    enabled: enabled ?? true,
    // Pendant qu'on tape ou qu'on change de page, la liste précédente reste
    // affichée au lieu de clignoter.
    placeholderData: keepPreviousData,
  });
}

/** `GET /admin/chefs/counts` — le nombre de batch cookers par état. */
export function useAdminChefCounts() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: [...ROOT, "counts"],
    queryFn: () => apiFetch<ChefCounts>("/admin/chefs/counts"),
  });
}

/** `GET /admin/chefs/{id}` — `id` est l'identifiant de la page batch cooker. */
export function useAdminChef(id: string | undefined) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: [...ROOT, "detail", id],
    queryFn: () => apiFetch<AdminChefDetail>(`/admin/chefs/${id}`),
    enabled: !!id,
  });
}

/** La clé à invalider quand l'état d'un batch cooker vient de changer. */
export const ADMIN_CHEFS_KEY = ROOT;
