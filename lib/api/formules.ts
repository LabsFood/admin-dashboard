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

/** Le nom d'une formule depuis son identifiant, ou l'identifiant. */
export const formuleName = (list: Formule[], id: string) =>
  list.find((f) => f.id === id)?.name ?? id;
