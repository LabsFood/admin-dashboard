"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiFetch } from "./client";

/* ─────────────────────────────────────────────────────────────────────────────
   Les réservations — `GET /bookings`.

   Trois choses à savoir avant de s'appuyer dessus :

   - la route rend **toute** la base, sans filtre ni pagination. Pas de filtre
     par batch cooker, par statut ni par date : tout tri se fait ici, après
     coup. Tenable tant que le volume est petit ; ça ne le restera pas ;
   - elle est annoncée « admin only » mais **tout compte connecté peut
     l'appeler** aujourd'hui. C'est un trou de sécurité, pas une facilité :
     signalé au backend, à ne pas exploiter ailleurs ;
   - `POST /bookings` répond `501`. Rien ne peut encore être réservé : ce que
     ces écrans montrent vient de données posées côté serveur.

   La forme d'une réservation n'a pas de schéma, mais les exemples des deux
   routes de détail la décrivent entièrement — c'est elle qui est typée ici.
   ───────────────────────────────────────────────────────────────────────────── */

export interface BookingMeal {
  bookingId?: string;
  mealId: string;
  /** Portions commandées pour ce plat. */
  portions: number;
  meal?: { id: string; name: string } | null;
}

export interface ShoppingItem {
  id?: string;
  shoppingListId?: string;
  /** Rayon, tel que l'API le stocke : un identifiant, pas un libellé. */
  aisle: string | null;
  name: string;
  /** Texte libre (« 8 pièces »), à la différence des listes de prestation. */
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
  clientId: string | null;
  chefProfileId: string | null;
  /** Début et fin de la session, ISO. */
  startsAt: string | null;
  endsAt: string | null;
  status: string | null;
  /** Centimes, TTC. */
  priceCents: number | null;
  currency: string | null;
  bookingMeals?: BookingMeal[] | null;
  shoppingList?: ShoppingList | null;
  client?: {
    id: string;
    email: string | null;
    fullName: string | null;
    role?: string;
  } | null;
}

const BOOKINGS = ["admin", "bookings"] as const;

function unwrap(res: unknown): Booking[] {
  if (Array.isArray(res)) return res as Booking[];
  if (res && typeof res === "object") {
    const o = res as Record<string, unknown>;
    for (const k of ["data", "items", "bookings"]) {
      if (Array.isArray(o[k])) return o[k] as Booking[];
    }
  }
  return [];
}

/**
 * Toutes les réservations. `enabled` laisse la requête en sommeil : un onglet
 * fermé n'a pas à tirer la base entière.
 */
export function useBookings({ enabled }: { enabled?: boolean } = {}) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: BOOKINGS,
    queryFn: async () => unwrap(await apiFetch<unknown>("/bookings")),
    enabled: enabled ?? true,
    staleTime: 60_000,
  });
}

/**
 * `GET /bookings/admin/bookings/{id}` — la réservation avec son client, ses
 * plats et sa liste de courses. Noter le chemin : le segment est bien doublé
 * côté API.
 */
export function useBooking(id: string | undefined) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: [...BOOKINGS, id],
    queryFn: () => apiFetch<Booking>(`/bookings/admin/bookings/${id}`),
    enabled: !!id,
    retry: false,
  });
}

/**
 * `POST /bookings/admin/bookings/{id}/shopping-list/regenerate`
 *
 * Recalcule la liste depuis les versions de recettes que la prestation
 * cuisine, mise à l'échelle des portions commandées. **Les corrections du
 * batch cooker sont conservées.** À utiliser après un changement de plats ou
 * de portions.
 */
export function useRegenerateShoppingList() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<ShoppingList>(
        `/bookings/admin/bookings/${id}/shopping-list/regenerate`,
        { method: "POST" },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: BOOKINGS }),
  });
}

/* ── Lecture ───────────────────────────────────────────────────────────────── */

/**
 * Les statuts observés dans la base. La liste n'est pas documentée : on nomme
 * ceux qu'on connaît et on laisse passer les autres tels quels, plutôt que de
 * cacher un état qu'on n'attendait pas.
 */
export const bookingStatusLabel: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  shopping: "Courses en cours",
  cooking: "En cuisine",
  completed: "Terminée",
  delivered: "Terminée",
  cancelled: "Annulée",
  refunded: "Remboursée",
};

export const bookingStatusText = (code?: string | null) =>
  code ? (bookingStatusLabel[code] ?? code) : "Statut inconnu";

/** Les statuts qui ne sont pas encore de l'historique. */
export const BOOKING_ACTIVE = ["pending", "confirmed", "shopping", "cooking"];

export const isBookingOpen = (b: Booking) =>
  !b.status || BOOKING_ACTIVE.includes(b.status);

/** Total des portions commandées, tous plats confondus. */
export const bookingPortions = (b: Booking) =>
  (b.bookingMeals ?? []).reduce((n, m) => n + (m.portions ?? 0), 0);

export const bookingMealNames = (b: Booking) =>
  (b.bookingMeals ?? [])
    .map((m) => m.meal?.name)
    .filter((n): n is string => Boolean(n));

/**
 * Les réservations d'un batch cooker, de la plus récente à la plus ancienne.
 *
 * `null` quand aucune ligne ne porte d'identifiant de chef : on ne peut alors
 * ni affirmer qu'il n'en a aucune, ni dire lesquelles sont les siennes.
 */
export function bookingsOfChef(
  all: Booking[],
  chefProfileId: string,
): Booking[] | null {
  if (!all.some((b) => b.chefProfileId)) return null;
  return all
    .filter((b) => b.chefProfileId === chefProfileId)
    .sort((a, b) => (b.startsAt ?? "").localeCompare(a.startsAt ?? ""));
}
