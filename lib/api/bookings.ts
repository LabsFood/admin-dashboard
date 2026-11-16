"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiFetch } from "./client";
import { euros } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   Les réservations — `GET /admin/bookings`.

   Le 16/10 l'API a remplacé `GET /bookings`, qui rendait toute la base d'un
   bloc, sans pagination ni filtre. La nouvelle route est paginée (100 lignes
   au plus) et filtrable par client, par batch cooker, par statut et par
   dates. L'ancienne a été **supprimée le 17/10** : elle répond 404.

   Rectification : nous avions écrit que `GET /bookings` était appelable par
   n'importe quel compte connecté (BLK-14). Le backend a vérifié — elle était
   réservée aux admins depuis le 23/09. Seul BLK-22 était fondé : ni filtre,
   ni pagination.

   Conséquence utile : l'onglet « Ses prestations » d'une fiche de batch cooker
   n'a plus à trier la base côté navigateur — `?chefId=` suffit.

   Le cycle de vie, commun aux trois points de vue :

     pending ──(paiement)──> confirmed ──> shopping ──> cooking ──> delivered
                                                                        │
                                                                   completed

   La console peut poser **n'importe quel** statut, y compris `disputed`, et
   chaque écriture est auditée : c'est l'outil du support, pas un raccourci.
   ───────────────────────────────────────────────────────────────────────────── */

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "shopping"
  | "cooking"
  | "delivered"
  | "completed"
  | "cancelled"
  | "disputed";

export interface BookingMeal {
  mealId: string;
  name?: string | null;
  portions: number;
  /** Recettes lot 3 : la version figée quand le menu a été écrit. */
  recipeVersion?: number | null;
  /** Lot 3 : les allergènes du plat à ce moment-là. `null` : pas encore figés. */
  allergensSnapshot?: string[] | null;
  pinnedAt?: string | null;
}

export interface ShoppingItem {
  id?: string;
  /** Rayon, tel que l'API le stocke : un identifiant, pas un libellé. */
  aisle: string | null;
  name: string;
  quantity: string | null;
}

export interface ShoppingList {
  id: string;
  bookingId?: string;
  generatedAt: string | null;
  items: ShoppingItem[];
}

export interface Booking {
  id: string;
  reference: string | null;
  status: BookingStatus;
  startsAt: string;
  endsAt: string;
  bookingDate?: string | null;
  /** « 09:00-12:00 », calculé par l'API dans le bon fuseau. */
  timeSlot?: string | null;
  persons?: number | null;
  addressLine?: string | null;
  city?: string | null;
  notes?: string | null;
  shoppingByClient?: boolean | null;
  /** Centimes — la prestation seule, sans les courses. */
  priceCents: number;
  /**
   * Le frais de courses, séparé depuis le 17/10.
   *
   * Il ne s'applique que si l'offre inclut les courses **et** que le client ne
   * les fait pas lui-même (`shoppingByClient: false`). Il ouvre droit au
   * crédit d'impôt et entre dans l'assiette de la commission : il se montre
   * donc sur sa propre ligne, jamais fondu dans le prix.
   */
  shoppingFeeCents?: number | null;
  /** Recettes lot 4 : « Courses faites », et le total du ticket si le batch cooker l'a saisi. */
  groceriesValidatedAt?: string | null;
  groceriesAmountCents?: number | null;
  /** Fiche seulement : quand chaque rappel de la liste est parti (dans l'application). */
  shoppingReminders?: {
    chefSendAt: string | null;
    clientAnswerAt: string | null;
    clientFrozenAt: string | null;
    chefGroceriesAt: string | null;
  };
  /** Ce que paie le client : prestation + courses. */
  amountTtc: number;
  amountAfterTax: number;
  currency: string;
  arrivedAt?: string | null;
  createdAt?: string;
  mealsCount?: number | null;
  client?: { id: string; name: string | null; avatarUrl?: string | null } | null;
  chef?: { id: string; displayName: string | null } | null;
  serviceOffer?: { id: string; name: string | null } | null;
  formule?: { id: string; name: string | null } | null;
  paymentMethods?: string[] | null;
  paidCents?: number | null;
  netCents?: number | null;
  commissionCents?: number | null;
  commissionEstimated?: boolean | null;
  meals?: BookingMeal[] | null;
  /** Recettes lot 1 : `verified` seulement quand plus rien n'est à vérifier à la main. */
  allergyCheck?: "verified" | "unverified";
  /** Les raisons, en codes : jamais l'allergie elle-même dans une liste. */
  allergyCheckReasons?: string[];
  /** Fiche seulement : les plats qui contiennent un allergène du client, à remplacer. */
  allergyConflicts?: { mealId: string; allergens: string[] }[];
  /** Lot 3 : à 72 h du début, les plats ne changent plus, sauf par la console (tracé). */
  menuFrozen?: boolean;
  frozenSince?: string;
  shoppingList?: ShoppingList | null;
  photos?: { id: string; url: string; caption?: string | null }[] | null;
  reschedule?: {
    id: string;
    proposedBy: "client" | "chef";
    from: string;
    to: string;
    status: string;
    expiresAt: string | null;
  } | null;
  /** CGV V1 : les cases cochées et la conclusion du contrat. */
  contract?: import("./contract").BookingContract;
  /** CGV V1 : la rétractation, quand le client l'a exercée ou peut encore le faire. */
  withdrawal?: import("./contract").BookingWithdrawal | null;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface BookingsQuery {
  page?: number;
  limit?: number;
  status?: BookingStatus;
  /** Sur le début de la prestation, ISO. */
  from?: string;
  to?: string;
  clientId?: string;
  /** L'id de **page** du batch cooker (`chefProfileId`). */
  chefId?: string;
  enabled?: boolean;
}

const BOOKINGS = ["admin", "bookings"] as const;

function unwrap(res: unknown): { data: Booking[]; meta: PageMeta | null } {
  if (Array.isArray(res)) return { data: res as Booking[], meta: null };
  if (res && typeof res === "object") {
    const o = res as Record<string, unknown>;
    for (const k of ["data", "items", "bookings"]) {
      if (Array.isArray(o[k])) {
        return {
          data: o[k] as Booking[],
          meta: o.meta && typeof o.meta === "object" ? (o.meta as PageMeta) : null,
        };
      }
    }
  }
  return { data: [], meta: null };
}

/**
 * `GET /admin/bookings` — toutes les réservations, filtrées côté serveur.
 *
 * `enabled: false` laisse la requête en sommeil sans changer sa clé : un
 * onglet fermé n'a pas à interroger l'API.
 */
export function useBookings({ enabled, ...q }: BookingsQuery = {}) {
  const apiFetch = useApiFetch();

  const p = new URLSearchParams();
  if (q.page != null) p.set("page", String(q.page));
  if (q.limit != null) p.set("limit", String(q.limit));
  if (q.status) p.set("status", q.status);
  if (q.from) p.set("from", q.from);
  if (q.to) p.set("to", q.to);
  if (q.clientId) p.set("clientId", q.clientId);
  if (q.chefId) p.set("chefId", q.chefId);
  const qs = p.toString();

  return useQuery({
    queryKey: [...BOOKINGS, q],
    queryFn: async () =>
      unwrap(await apiFetch<unknown>(`/admin/bookings${qs ? `?${qs}` : ""}`)),
    enabled: enabled ?? true,
    staleTime: 60_000,
  });
}

/** `GET /admin/bookings/{id}` — avec son client, ses plats et sa liste de courses. */
export function useBooking(id: string | undefined) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: [...BOOKINGS, "one", id],
    queryFn: () => apiFetch<Booking>(`/admin/bookings/${id}`),
    enabled: !!id,
    retry: false,
  });
}

export interface AdminBookingPatch {
  startsAt?: string;
  persons?: number;
  addressLine?: string;
  addressCity?: string;
  addressPostalCode?: string;
  notes?: string;
  shoppingByClient?: boolean;
  meals?: { mealId: string; portions?: number }[];
  /** N'importe quel statut, audité. `disputed` ouvre un litige. */
  status?: BookingStatus;
  priceCents?: number;
  amountTtc?: number;
  amountAfterTax?: number;
}

/**
 * `PATCH /admin/bookings/{id}` — l'outil du support.
 *
 * Il passe outre les règles des deux autres points de vue : n'importe quel
 * statut, les montants, l'horaire sans vérifier la disponibilité. Chaque
 * écriture est auditée — à n'utiliser que pour réparer, pas pour aller vite.
 */
export function useUpdateBooking() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: AdminBookingPatch }) =>
      apiFetch<Booking>(`/admin/bookings/${id}`, { method: "PATCH", body: patch }),
    onSuccess: (b) => {
      qc.setQueryData([...BOOKINGS, "one", b.id], b);
      qc.invalidateQueries({ queryKey: BOOKINGS });
    },
  });
}

/**
 * `POST /admin/bookings/{id}/shopping-list/regenerate`
 *
 * Recalcule la liste depuis les versions de recettes que la prestation
 * cuisine. **Les corrections du batch cooker sont conservées.** À utiliser
 * après un changement de plats ou de portions.
 */
export function useRegenerateShoppingList() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<ShoppingList>(`/admin/bookings/${id}/shopping-list/regenerate`, {
        method: "POST",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: BOOKINGS }),
  });
}

/* ── La liste de courses d'une prestation ──────────────────────────────────── */

export interface MissionLine {
  name: string;
  qty: number;
  unit: string;
  /** `true` quand le batch cooker a corrigé ou ajouté la ligne. */
  edited?: boolean;
  /** Réponse du client : il l'a déjà. Rendue seulement si elle porte sur la dernière liste envoyée. */
  alreadyHave?: boolean;
  comment?: string | null;
  /** Facultative dans toutes les recettes qui la demandent (décision du 16/11). */
  optional?: true;
}

/** L'échange autour de la liste (Recettes §10.7), calculé par l'API. */
export type ShoppingListStatus =
  | "preparing"
  | "sent"
  | "update_sent"
  | "final_received"
  | "frozen";

export const shoppingListStatusLabel: Record<ShoppingListStatus, string> = {
  preparing: "Pas encore envoyée au client",
  sent: "Envoyée, sans réponse du client",
  update_sent: "Mise à jour envoyée, sans nouvelle réponse du client",
  final_received: "Liste finale reçue du client",
  frozen: "Figée",
};

export interface MissionShoppingList {
  missionId: string;
  persons: number | null;
  generatedAt: string | null;
  groups: { aisle: string; lines: MissionLine[] }[];
  shoppingByClient?: boolean;
  /** Midi, heure de Paris, la veille de la prestation. */
  deadline?: string;
  status?: ShoppingListStatus;
  /** Nombre d'envois par le batch cooker. */
  version?: number;
  sentAt?: string | null;
  finalReceivedAt?: string | null;
}

/**
 * `GET /chef-missions/{id}/shopping-list` — lisible par le batch cooker, les
 * admins **et** le client.
 *
 * `GET /admin/bookings/{id}` ne rend pas la liste : c'est ici qu'elle vit,
 * groupée par rayon et mise à l'échelle des portions commandées. Les lignes
 * marquées `edited` sont les corrections du batch cooker.
 */
export function useBookingShoppingList(bookingId: string | undefined) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: [...BOOKINGS, bookingId, "shopping-list"],
    queryFn: () =>
      apiFetch<MissionShoppingList>(`/chef-missions/${bookingId}/shopping-list`),
    enabled: !!bookingId,
    retry: false,
  });
}

/* ── Lecture ───────────────────────────────────────────────────────────────── */

export const bookingStatusLabel: Record<BookingStatus, string> = {
  pending: "À régler",
  confirmed: "Confirmée",
  shopping: "Courses en cours",
  cooking: "En cuisine",
  delivered: "Livrée",
  completed: "Terminée",
  cancelled: "Annulée",
  disputed: "En litige",
};

export const BOOKING_STATUSES = Object.keys(bookingStatusLabel) as BookingStatus[];

export const bookingStatusText = (code?: string | null) =>
  code ? (bookingStatusLabel[code as BookingStatus] ?? code) : "Statut inconnu";

/** Ce qui n'est pas encore de l'historique. */
export const BOOKING_ACTIVE: BookingStatus[] = [
  "pending",
  "confirmed",
  "shopping",
  "cooking",
  "delivered",
];

export const isBookingOpen = (b: Booking) => BOOKING_ACTIVE.includes(b.status);

/**
 * Des centimes en euros lisibles, ou `null`.
 *
 * `euros()` de `lib/utils` attend des euros et un nombre : tous les montants
 * de l'API sont en centimes et parfois absents. Le passage se fait ici, une
 * fois, plutôt que dans chaque écran.
 */
export const money = (cents?: number | null) =>
  cents == null || !Number.isFinite(cents) ? null : euros(Math.round(cents / 100));

export const bookingPortions = (b: Booking) =>
  (b.meals ?? []).reduce((n, m) => n + (m.portions ?? 0), 0);

export const bookingMealNames = (b: Booking) =>
  (b.meals ?? []).map((m) => m.name).filter((n): n is string => Boolean(n));

/* ── Les suppléments d'une réservation ─────────────────────────────────────── */

/**
 * `GET` / `PUT /admin/settings/booking-supplements` — arrivé le 18/10.
 *
 * Une formule comprend un nombre de personnes ; au-delà, chaque convive se
 * facture, et chaque plat ajouté aussi. Ces trois nombres valent pour **tout
 * le réseau** : ils ne se règlent pas batch cooker par batch cooker, et c'est
 * `GET /service-offers/{id}/price` qui les applique au moment où un client
 * compose sa réservation.
 *
 * Ils ne touchent pas aux réservations déjà créées : celles-ci portent leurs
 * montants.
 */
export interface BookingSupplements {
  /** Personnes comprises dans le prix d'une formule. */
  includedPersons: number;
  /** Centimes, par personne au-delà. */
  extraPersonCents: number;
  /** Centimes, par plat ajouté. */
  extraMealCents: number;
  updatedAt?: string | null;
}

const SUPPLEMENTS = ["admin", "settings", "booking-supplements"] as const;

export function useBookingSupplements() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: SUPPLEMENTS,
    queryFn: () => apiFetch<BookingSupplements>("/admin/settings/booking-supplements"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSetBookingSupplements() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<BookingSupplements, "updatedAt">) =>
      apiFetch<BookingSupplements>("/admin/settings/booking-supplements", {
        method: "PUT",
        body,
      }),
    onSuccess: (s) => {
      qc.setQueryData(SUPPLEMENTS, s);
      qc.invalidateQueries({ queryKey: BOOKINGS });
    },
  });
}

/* ── Conservation (Recettes lot 3) ──────────────────────────────────────────── */

export interface EatBefore {
  /** `YYYY-MM-DD` : celle du batch cooker si posée, sinon celle proposée. */
  date: string | null;
  proposed: string | null;
  setByChef: boolean;
  setAt: string | null;
  fridgeDays: number | null;
  fridgeAlert: boolean;
}

export interface ConservationSheet {
  bookingId: string;
  startsAt: string;
  status: BookingStatus;
  fridgeAlertDays: number;
  dishes: { mealId: string; name: string; eatBefore: EatBefore }[];
  /** Chaque date posée : qui (nom et rôle, pour la console), quand, quelle valeur. */
  history?: {
    mealId: string;
    value: string | null;
    changedAt: string;
    changedBy: { id?: string | null; name?: string | null; role: "chef" | "admin" | null };
  }[];
}

/** `GET /chef-missions/{id}/conservation` — la console la lit à tout moment, avec l'historique. */
export function useBookingConservation(bookingId: string | undefined) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: [...BOOKINGS, bookingId, "conservation"],
    queryFn: () => apiFetch<ConservationSheet>(`/chef-missions/${bookingId}/conservation`),
    enabled: !!bookingId,
    retry: false,
  });
}

export interface FridgeAlert {
  days: number;
  updatedAt: string | null;
}

const FRIDGE_ALERT = ["admin", "settings", "fridge-alert"] as const;

/** `GET /admin/settings/fridge-alert` — 4 jours par défaut (BLK-31 encore ouvert). */
export function useFridgeAlert() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: FRIDGE_ALERT,
    queryFn: () => apiFetch<FridgeAlert>("/admin/settings/fridge-alert"),
    staleTime: 5 * 60 * 1000,
  });
}

/** `PUT /admin/settings/fridge-alert` — de 1 à 14 jours, tracé. */
export function useSetFridgeAlert() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (days: number) =>
      apiFetch<FridgeAlert>("/admin/settings/fridge-alert", { method: "PUT", body: { days } }),
    onSuccess: (s) => {
      qc.setQueryData(FRIDGE_ALERT, s);
      qc.invalidateQueries({ queryKey: BOOKINGS });
    },
  });
}

/* ── Courses (Recettes lot 6, préparation) ──────────────────────────────────── */

export interface GroceriesSetting {
  /** Le plus qu'un client peut fixer comme Budget Courses, en centimes. */
  budgetMaxCents: number;
  /** Le forfait courses conseillé aux batch cookers, en centimes : un conseil, jamais un refus. */
  recommendedShoppingFeeMinCents: number;
  updatedAt: string | null;
}

const GROCERIES = ["admin", "settings", "groceries"] as const;

/** `GET /admin/settings/groceries` — 100 € et 15 € par défaut. */
export function useGroceriesSetting() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: GROCERIES,
    queryFn: () => apiFetch<GroceriesSetting>("/admin/settings/groceries"),
    staleTime: 5 * 60 * 1000,
  });
}

/** `PUT /admin/settings/groceries` — les deux valeurs à chaque fois, tracé. */
export function useSetGroceriesSetting() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<GroceriesSetting, "updatedAt">) =>
      apiFetch<GroceriesSetting>("/admin/settings/groceries", { method: "PUT", body }),
    onSuccess: (s) => qc.setQueryData(GROCERIES, s),
  });
}
