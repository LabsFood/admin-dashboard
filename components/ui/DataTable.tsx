"use client";

import {
  flexRender,
  type RowData,
  type Table as TanTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
}: {
  table: TanTable<T>;
  emptyLabel?: string;
}) {
  const rows = table.getRowModel().rows;

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
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={table.getAllLeafColumns().length}
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
      <p className="text-xs text-ink-soft">
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
        <span className="px-2 text-xs text-ink-mid">
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
        "flex h-7 w-7 items-center justify-center rounded-md border border-[rgba(0,35,75,0.18)] transition-colors",
        disabled
          ? "cursor-not-allowed text-ink-soft opacity-40"
          : "text-navy hover:bg-cream-soft",
      )}
    >
      {children}
    </button>
  );
}
