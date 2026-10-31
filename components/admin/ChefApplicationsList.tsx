"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Search,
  Users,
} from "lucide-react";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { cn, formatDate, initials } from "@/lib/utils";
import { useChefApplications } from "@/lib/api/admin";
import type { ChefApplicationRow, ChefApplicationStatus } from "@/lib/api/types";

/* ─────────────────────────────────────────────────────────────────────────────
   File d'attente des candidatures batch cooker — `GET /admin/chef-applications`.

   L'API trie la plus vieille d'abord et porte elle-même les filtres (statut,
   pièces en attente, recherche) et la pagination : on les lui laisse plutôt
   que de filtrer une page déjà découpée, ce qui mentirait sur les totaux. Le
   tri par colonne, lui, réordonne la page affichée.
   ───────────────────────────────────────────────────────────────────────────── */

const STATUS_LABEL: Record<ChefApplicationStatus, string> = {
  submitted: "À instruire",
  "changes-requested": "Compléments demandés",
  approved: "Approuvée",
  rejected: "Refusée",
};

const STATUS_TONE: Record<ChefApplicationStatus, BadgeTone> = {
  submitted: "info",
  "changes-requested": "warning",
  approved: "success",
  rejected: "danger",
};

const FILTERS: { id: "all" | ChefApplicationStatus; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "submitted", label: "À instruire" },
  { id: "changes-requested", label: "Compléments" },
  { id: "approved", label: "Approuvées" },
  { id: "rejected", label: "Refusées" },
];

/** « 36 h » devient « 1 j 12 h » : au-delà d'un jour, les heures ne parlent plus. */
function waitingLabel(hours: number): string {
  if (hours < 1) return "à l’instant";
  if (hours < 24) return `${Math.floor(hours)} h`;
  const days = Math.floor(hours / 24);
  const rest = Math.round(hours % 24);
  return rest > 0 ? `${days} j ${rest} h` : `${days} j`;
}

const column = createColumnHelper<ChefApplicationRow>();

const COLUMNS = [
  column.accessor("reference", {
    header: "Référence",
    // Une référence est un identifiant, pas une destination : l'ouverture se
    // fait par le nom ou par le bouton de fin de ligne.
    cell: (c) => (
      <span className="font-mono text-[12px] font-semibold text-navy">{c.getValue()}</span>
    ),
  }),
  column.accessor("name", {
    header: "Candidat",
    cell: (c) => (
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white"
        >
          {initials(c.getValue())}
        </span>
        <Link
          href={`/candidatures/${c.row.original.id}`}
          className="truncate font-semibold text-navy hover:text-terra"
        >
          {c.getValue()}
        </Link>
      </div>
    ),
  }),
  column.accessor("city", {
    header: "Ville",
    cell: (c) => <span className="text-ink-mid">{c.getValue() || "—"}</span>,
  }),
  column.accessor("status", {
    header: "Statut",
    cell: (c) => {
      const s = c.getValue();
      return (
        <div className="flex items-center gap-2">
          <Badge tone={STATUS_TONE[s]}>{STATUS_LABEL[s]}</Badge>
          {c.row.original.reactivatedPendingReview && (
            <span className="whitespace-nowrap text-[11px] text-terra">rouverte</span>
          )}
        </div>
      );
    },
  }),
  column.accessor("pendingDocuments", {
    header: "Pièces en attente",
    cell: (c) => {
      const n = c.getValue();
      return n > 0 ? (
        <span className="font-semibold text-terra">{n}</span>
      ) : (
        <span className="text-ink-soft">—</span>
      );
    },
  }),
  column.accessor("waitingSinceHours", {
    header: "En attente depuis",
    cell: (c) => (
      <span
        className={cn(
          c.getValue() >= 48 ? "font-semibold text-danger" : "text-ink-mid",
        )}
      >
        {waitingLabel(c.getValue())}
      </span>
    ),
  }),
  column.accessor("submittedAt", {
    header: "Déposée le",
    cell: (c) => (
      <span className="whitespace-nowrap text-ink-soft">
        {c.getValue() ? formatDate(c.getValue()) : "—"}
      </span>
    ),
  }),
  column.display({
    id: "open",
    header: "",
    cell: (c) => (
      <div className="flex justify-end">
        <Link
          href={`/candidatures/${c.row.original.id}`}
          className="btn btn-outline btn-sm whitespace-nowrap"
        >
          Voir le dossier
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    ),
    meta: { width: "1%" },
  }),
];

export default function ChefApplicationsList() {
  const [status, setStatus] = useState<"all" | ChefApplicationStatus>("all");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data, isPending, isError, error, refetch, isFetching } =
    useChefApplications({
      page,
      limit: 20,
      status: status === "all" ? undefined : status,
      hasPendingDocuments: pendingOnly || undefined,
      q: q || undefined,
    });

  const rows = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;

  const table = useReactTable({
    data: rows,
    columns: COLUMNS,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Filtres et pagination sont portés par l'API.
    manualPagination: true,
    manualFiltering: true,
  });

  /** Tout changement de critère ramène à la première page. */
  const change = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-2xl text-sm leading-relaxed text-ink-mid">
          Les dossiers arrivent la plus longue attente en tête. Un dossier
          n&apos;est approuvable qu&apos;une fois la pièce d&apos;identité et le
          justificatif d&apos;immatriculation validés.
        </p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn btn-outline btn-sm"
        >
          <RotateCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          Actualiser
        </button>
      </div>

      {/* ── Filtres ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[rgba(0,35,75,0.1)] pb-4">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={q}
            onChange={(e) => change(setQ)(e.target.value)}
            placeholder="Nom, email, ville, référence…"
            aria-label="Rechercher une candidature"
            className="input-base pl-9"
          />
        </div>

        <div role="radiogroup" aria-label="Filtrer par statut" className="flex items-center">
          {FILTERS.map((f) => {
            const on = status === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => change(setStatus)(f.id)}
                className={cn(
                  "border border-l-0 px-3 py-2 text-xs font-semibold transition-colors first:rounded-l-md first:border-l last:rounded-r-md",
                  on
                    ? "border-navy bg-navy text-white"
                    : "border-[rgba(0,35,75,0.18)] text-ink-mid hover:bg-cream-soft hover:text-navy",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => change(setPendingOnly)(!pendingOnly)}
          aria-pressed={pendingOnly}
          className={cn(
            "rounded-md border px-3 py-2 text-xs font-semibold transition-colors",
            pendingOnly
              ? "border-terra bg-terra text-white"
              : "border-[rgba(0,35,75,0.18)] text-ink-mid hover:bg-cream-soft hover:text-navy",
          )}
        >
          Pièces en attente
        </button>
      </div>

      {/* ── Liste ──────────────────────────────────────────────────────── */}
      <section>
        <p className="mb-3 text-xs text-ink-soft" aria-live="polite">
          {isPending
            ? "Chargement…"
            : meta
              ? `${meta.total} candidature${meta.total > 1 ? "s" : ""}`
              : ""}
        </p>

        {isPending ? (
          <div className="space-y-px">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse bg-cream-soft" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-lg bg-paper py-10">
            <EmptyState
              Icon={Users}
              title="Chargement impossible"
              text={
                error instanceof Error
                  ? error.message
                  : "Impossible de récupérer les candidatures depuis l'API."
              }
            />
            <div className="flex justify-center">
              <button onClick={() => refetch()} className="btn btn-navy">
                <RotateCw className="h-4 w-4" /> Réessayer
              </button>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg bg-paper px-6 py-12 text-center">
            <p className="text-sm text-ink-mid">
              {q || status !== "all" || pendingOnly
                ? "Aucune candidature ne correspond à ces critères."
                : "Aucune candidature pour l’instant."}
            </p>
            {(q || status !== "all" || pendingOnly) && (
              <button
                onClick={() => {
                  setQ("");
                  setStatus("all");
                  setPendingOnly(false);
                  setPage(1);
                }}
                className="btn btn-outline btn-sm mt-4"
              >
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <>
            <DataTable table={table} />
            {meta && meta.totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(0,35,75,0.1)] bg-paper px-4 py-3">
                <p className="text-xs text-ink-soft">
                  Page {meta.page} sur {meta.totalPages} · {meta.total} dossiers
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!meta.hasPreviousPage || isFetching}
                    aria-label="Page précédente"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-[rgba(0,35,75,0.18)] text-navy transition-colors hover:bg-cream-soft disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!meta.hasNextPage || isFetching}
                    aria-label="Page suivante"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-[rgba(0,35,75,0.18)] text-navy transition-colors hover:bg-cream-soft disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
