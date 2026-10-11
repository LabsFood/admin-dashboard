"use client";

import { useQuery } from "@tanstack/react-query";
import { useApiFetch } from "./client";

/* ─────────────────────────────────────────────────────────────────────────────
   Les prestations — `GET /bookings`.

   Trois choses à savoir avant de s'appuyer dessus :

   - la route rend **toute** la base, sans filtre ni pagination. Un filtre par
     batch cooker n'existe pas : on le fait ici, après coup. Tant que le volume
     est petit c'est tenable ; ça ne le restera pas ;
   - aucune réponse 2xx n'a de schéma dans le Swagger. On lit donc chaque champ
     sous plusieurs noms plausibles plutôt que de parier sur un seul ;
   - elle est annoncée « admin only » mais **tout compte connecté peut
     l'appeler** aujourd'hui. C'est un trou de sécurité, pas une facilité :
     signalé au backend, à ne pas exploiter ailleurs.
   ───────────────────────────────────────────────────────────────────────────── */

export interface Booking {
  id: string;
  reference: string | null;
  /** Date de la prestation, ISO, quand l'API la nomme d'une façon connue. */
  date: string | null;
  status: string | null;
  chefProfileId: string | null;
  chefName: string | null;
  clientName: string | null;
  city: string | null;
  guests: number | null;
  /** En centimes. */
  amountCents: number | null;
  /** La ligne telle qu'elle est arrivée : pour inspecter ce qu'on n'a pas lu. */
  raw: Record<string, unknown>;
}

const str = (o: Record<string, unknown>, ...keys: string[]): string | null => {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
};

const num = (o: Record<string, unknown>, ...keys: string[]): number | null => {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
};

/** Un objet imbriqué (`chef`, `client`), s'il y en a un. */
const obj = (o: Record<string, unknown>, key: string): Record<string, unknown> =>
  o[key] && typeof o[key] === "object" ? (o[key] as Record<string, unknown>) : {};

function normalize(raw: unknown): Booking | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = str(o, "id", "bookingId", "uuid");
  if (!id) return null;

  const chef = obj(o, "chef");
  const client = obj(o, "client");
  const nom = (x: Record<string, unknown>) => {
    const direct = str(x, "displayName", "name", "fullName");
    if (direct) return direct;
    const compose = [str(x, "firstName"), str(x, "lastName")]
      .filter(Boolean)
      .join(" ")
      .trim();
    return compose || null;
  };

  return {
    id,
    reference: str(o, "reference", "ref", "code"),
    date: str(o, "date", "scheduledAt", "startsAt", "serviceDate", "sessionDate"),
    status: str(o, "status", "state"),
    chefProfileId:
      str(o, "chefProfileId", "chefId") ?? str(chef, "id", "chefProfileId"),
    chefName: str(o, "chefName") ?? nom(chef),
    clientName: str(o, "clientName") ?? nom(client),
    city: str(o, "city") ?? str(obj(o, "address"), "city"),
    guests: num(o, "guests", "people", "portions"),
    amountCents: num(o, "amountCents", "totalCents", "priceCents", "amountTtcCents"),
    raw: o,
  };
}

function unwrap(res: unknown): Booking[] {
  let brut: unknown[] = [];
  if (Array.isArray(res)) {
    brut = res;
  } else if (res && typeof res === "object") {
    const o = res as Record<string, unknown>;
    for (const k of ["data", "items", "bookings"]) {
      if (Array.isArray(o[k])) {
        brut = o[k] as unknown[];
        break;
      }
    }
  }
  return brut.map(normalize).filter((b): b is Booking => b !== null);
}

/**
 * Toutes les prestations. `enabled` laisse la requête en sommeil : un onglet
 * fermé n'a pas à tirer la base entière.
 */
export function useBookings({ enabled }: { enabled?: boolean } = {}) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: async () => unwrap(await apiFetch<unknown>("/bookings")),
    enabled: enabled ?? true,
    staleTime: 60_000,
  });
}

/**
 * Les prestations d'un batch cooker, triées de la plus récente à la plus
 * ancienne. `null` quand aucune ligne ne porte d'identifiant de chef : on ne
 * peut alors ni affirmer qu'il n'en a aucune, ni lesquelles sont les siennes.
 */
export function bookingsOfChef(
  all: Booking[],
  chefProfileId: string,
): Booking[] | null {
  if (!all.some((b) => b.chefProfileId)) return null;
  return all
    .filter((b) => b.chefProfileId === chefProfileId)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}
