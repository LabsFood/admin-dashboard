"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiFetch } from "./client";

/* ─────────────────────────────────────────────────────────────────────────────
   Les formules — `GET /admin/formules`, `PATCH /admin/formules/{id}`.

   Ce que le client choisit en réservant. Deux prix en centimes : `priceTtc`
   avant le crédit d'impôt, `priceAfterTax` ce qu'il paie réellement. L'API ne
   déduit pas le second du premier : les deux sont stockés tels quels, donc
   c'est la console qui doit éviter qu'ils se contredisent.

   `active: false` cesse de la proposer aux nouveaux clients, sans toucher aux
   réservations déjà prises. Et il n'y a ni création ni suppression : les
   quatre formules sont posées en base.
   ───────────────────────────────────────────────────────────────────────────── */

export interface Formule {
  id: string;
  name: string;
  /** Centimes, avant crédit d'impôt. */
  priceTtc: number;
  /** Centimes, après crédit d'impôt. */
  priceAfterTax: number;
  duration: string | null;
  mealsCount: number | null;
  persons: string | null;
  features: string[];
  popular?: boolean;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FormulePatch {
  name?: string;
  priceTtc?: number;
  priceAfterTax?: number;
  features?: string[];
  active?: boolean;
}

const FORMULES = ["admin", "formules"] as const;

function unwrap(res: unknown): Formule[] {
  if (Array.isArray(res)) return res as Formule[];
  if (res && typeof res === "object") {
    const o = res as Record<string, unknown>;
    for (const k of ["data", "items", "formules"]) {
      if (Array.isArray(o[k])) return o[k] as Formule[];
    }
  }
  return [];
}

export function useFormules({ enabled }: { enabled?: boolean } = {}) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: FORMULES,
    queryFn: async () => unwrap(await apiFetch<unknown>("/admin/formules")),
    enabled: enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateFormule() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: FormulePatch }) =>
      apiFetch<Formule>(`/admin/formules/${id}`, { method: "PATCH", body: patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: FORMULES }),
  });
}

/* ── Les formules des batch cookers ─────────────────────────────────────────
   `GET /admin/service-offers`. Chaque batch cooker vend ses propres formules
   (une durée, un prix) : ce ne sont pas les formules de la plateforme
   ci-dessus. La console les lit ; c'est le batch cooker qui les modifie.
   ──────────────────────────────────────────────────────────────────────────── */

export interface ChefFormule {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  /** Centimes, TTC. */
  priceCents: number;
  currency: string;
  shoppingIncluded: boolean;
  shoppingFeeCents: number;
  active: boolean;
  chef: { id: string; displayName: string };
  bookingsCount: number;
}

export function useChefFormules() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: ["admin", "service-offers"],
    queryFn: () => apiFetch<ChefFormule[]>("/admin/service-offers"),
    staleTime: 60 * 1000,
  });
}

/** Le nom d'une formule depuis son identifiant, ou l'identifiant. */
export const formuleName = (list: Formule[], id: string) =>
  list.find((f) => f.id === id)?.name ?? id;
