"use client";

import {
  flexRender,
  type RowData,
  type Table as TanTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

/* ─────────────────────────────────────────────────────────────────────────────
   Tableau de données de la console.

   L'instance est construite par la page (TanStack Table) et passée ici : la
   vue en cartes travaille alors sur les mêmes lignes triées et filtrées, sans
   recopier la logique. Changer de vue ne change que la mise en forme.
   ───────────────────────────────────────────────────────────────────────────── */

declare module "@tanstack/react-table" {
  /** Réglages de colonne propres à cette console. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Largeur fixe, quand une colonne ne doit pas respirer. */
    width?: string;
    /** Classes appliquées à la cellule. */
    cellClass?: string;
  }
}

export function DataTable<T>({
  table,
  emptyLabel = "Aucune ligne.",
  loading = false,
  rowCount = 6,
  error,
}: {
  table: TanTable<T>;
  emptyLabel?: string;
  /** Pendant la requête : des lignes grises à la largeur réelle des colonnes. */
  loading?: boolean;
  /** Nombre de lignes grises. Celui d'une page type, pour ne pas faire sauter la mise en page. */
  rowCount?: number;
  /** Requête en échec : le message et « Réessayer » prennent la place des lignes. */
  error?: { message: string; onRetry: () => void };
}) {
  const rows = table.getRowModel().rows;
  const columns = table.getAllLeafColumns();

  return (
    <div className="overflow-x-auto bg-paper">
      <table className="table">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => {
                const sortable = header.column.getCanSort();
                const dir = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    style={{ width: header.column.columnDef.meta?.width }}
                    aria-sort={
                      dir === "asc"
                        ? "ascending"
                        : dir === "desc"
                          ? "descending"
                          : sortable
                            ? "none"
                            : undefined
                    }
                  >
                    {header.isPlaceholder ? null : sortable ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1.5 uppercase tracking-[inherit] transition-colors hover:text-navy"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {dir === "asc" ? (
                          <ArrowUp className="h-3 w-3 text-navy" aria-hidden />
                        ) : dir === "desc" ? (
                          <ArrowDown className="h-3 w-3 text-navy" aria-hidden />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" aria-hidden />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody aria-busy={loading || undefined}>
          {loading ? (
            Array.from({ length: rowCount }).map((_, i) => (
              <tr key={i} aria-hidden>
                {columns.map((col) => (
                  <td key={col.id} className={col.columnDef.meta?.cellClass}>
                    <Skeleton className="h-4 w-full max-w-40" />
                  </td>
                ))}
              </tr>
            ))
          ) : error ? (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-sm text-ink-mid">
                <p>{error.message}</p>
                <button type="button" onClick={error.onRetry} className="btn btn-outline btn-sm mt-3">
                  Réessayer
                </button>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-10 text-center text-sm text-ink-mid"
              >
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={cell.column.columnDef.meta?.cellClass}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Pagination — masquée tant qu'il n'y a qu'une page : rien à piloter. */
export function TablePagination<T>({ table }: { table: TanTable<T> }) {
  const pageCount = table.getPageCount();
  if (pageCount <= 1) return null;

  const { pageIndex } = table.getState().pagination;
  const rows = table.getFilteredRowModel().rows.length;
  const size = table.getState().pagination.pageSize;
  const from = pageIndex * size + 1;
  const to = Math.min(rows, (pageIndex + 1) * size);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(0,35,75,0.1)] bg-paper px-4 py-3">
      <p className="text-xs tabular-nums text-ink-soft">
        {from}–{to} sur {rows}
      </p>
      <div className="flex items-center gap-1">
        <PageButton
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          label="Page précédente"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </PageButton>
        <span className="px-2 text-xs tabular-nums text-ink-mid">
          {pageIndex + 1} / {pageCount}
        </span>
        <PageButton
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          label="Page suivante"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "hit flex h-7 w-7 items-center justify-center rounded-md border border-[rgba(0,35,75,0.18)] transition-colors",
        disabled
          ? "cursor-not-allowed text-ink-soft opacity-40"
          : "text-navy hover:bg-cream-soft",
      )}
    >
      {children}
    </button>
  );
}
