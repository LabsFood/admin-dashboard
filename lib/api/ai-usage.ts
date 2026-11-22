"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiFetch } from "./client";

/* ─────────────────────────────────────────────────────────────────────────────
   Budget IA (DAT import de recettes, 6 bis).

   Tous les appels aux fournisseurs d'IA passent par `AiGateway` côté API, qui
   écrit une ligne par appel (poste, fonctionnalité, tags, fournisseur, modèle,
   cuisinier, coût). Ces hooks lisent les agrégats et règlent les plafonds.
   Montants en centimes d'euro.
   ───────────────────────────────────────────────────────────────────────────── */

export type Period =
  | "day"
  | "week"
  | "month"
  | "year"
  | "rolling24h"
  | "rolling7d"
  | "rolling30d"
  | "rolling365d";

export type Caps = Partial<Record<Period, number>>;

export interface AiUsageSummary {
  mode: "soft" | "strict";
  alertPercent: number;
  periods: {
    period: Period;
    label: string;
    spentCents: number;
    capCents: number | null;
    percent: number | null;
  }[];
  postes: {
    code: string;
    label: string;
    spentCents: Record<Period, number>;
    capsCents: Caps;
  }[];
}

export interface AiDaily {
  days: {
    date: string;
    totalCents: number;
    calls: number;
    postes: Record<string, number>;
  }[];
}

export type BreakdownBy =
  | "poste"
  | "feature"
  | "provider"
  | "model"
  | "chef"
  | "tag";

export interface AiBreakdown {
  by: BreakdownBy;
  days: number;
  rows: {
    key: string;
    label: string;
    costCents: number;
    calls: number;
    failures: number;
    avgCostCents: number;
    avgDurationMs: number | null;
  }[];
}

export interface AiBudgets {
  mode: "soft" | "strict";
  alertPercent: number;
  global: Caps;
  postes: Partial<Record<string, Caps>>;
  periods: { code: Period; label: string }[];
  postesList: {
    code: string;
    label: string;
    features: { code: string; label: string }[];
  }[];
}

export interface RecipeImportSetting {
  mode: "off" | "beta" | "all";
  betaChefProfileIds: string[];
  allowNonEuFallback: boolean;
}

const ROOT = ["admin", "ai"] as const;

export function useAiSummary() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: [...ROOT, "summary"],
    queryFn: () => apiFetch<AiUsageSummary>("/admin/ai-usage/summary"),
    refetchInterval: 60_000,
  });
}

export function useAiDaily(days = 90) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: [...ROOT, "daily", days],
    queryFn: () => apiFetch<AiDaily>(`/admin/ai-usage/daily?days=${days}`),
  });
}

export function useAiBreakdown(by: BreakdownBy, days: number, poste?: string) {
  const apiFetch = useApiFetch();
  const qs = new URLSearchParams({
    by,
    days: String(days),
    ...(poste ? { poste } : {}),
  });
  return useQuery({
    queryKey: [...ROOT, "breakdown", by, days, poste ?? ""],
    queryFn: () => apiFetch<AiBreakdown>(`/admin/ai-usage/breakdown?${qs}`),
  });
}

export function useAiBudgets() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: [...ROOT, "budgets"],
    queryFn: () => apiFetch<AiBudgets>("/admin/ai-budgets"),
  });
}

export function useSetAiBudgets() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      body: Pick<AiBudgets, "mode" | "alertPercent" | "global" | "postes">,
    ) => apiFetch<AiBudgets>("/admin/ai-budgets", { method: "PUT", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ROOT }),
  });
}

export function useRecipeImportSetting() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: [...ROOT, "recipe-import"],
    queryFn: () =>
      apiFetch<RecipeImportSetting>("/admin/ai-settings/recipe-import"),
  });
}

export function useSetRecipeImportSetting() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RecipeImportSetting) =>
      apiFetch<RecipeImportSetting>("/admin/ai-settings/recipe-import", {
        method: "PUT",
        body,
      }),
    onSuccess: (data) => qc.setQueryData([...ROOT, "recipe-import"], data),
  });
}

export function useUnlinkedNames(days = 30) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: [...ROOT, "unlinked", days],
    queryFn: () =>
      apiFetch<{ name: string; count: number; chefs: number }[]>(
        `/admin/recipe-imports/unlinked-names?days=${days}`,
      ),
  });
}

export const euros = (cents: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
