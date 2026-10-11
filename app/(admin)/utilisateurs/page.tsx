"use client";

import { useMemo, useState } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import Link from "next/link";
import {
  Info,
  LayoutGrid,
  Plus,
  RotateCw,
  Rows3,
  Search,
  Users,
  X,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { DataTable, TablePagination } from "@/components/ui/DataTable";
import Drawer from "@/components/ui/Drawer";
import EmptyState from "@/components/ui/EmptyState";
import UserForm from "@/components/admin/UserForm";
import RoleEditor from "@/components/admin/RoleEditor";
import WriteToUserButton from "@/components/admin/WriteToUserButton";
import { cn, initials, timeAgo } from "@/lib/utils";
import { roleLabel, roleTone } from "@/lib/status";
import { useClients } from "@/lib/api/admin";
import { toClientView } from "@/lib/api/adapt";
import { forgetUser, useRecentUsers } from "@/lib/recent-users";
import type { Role } from "@/lib/api/types";

/* ─────────────────────────────────────────────────────────────────────────────
   Utilisateurs.

   Une seule liste, deux sources : les profils clients renvoyés par l'API, et
   les comptes provisionnés depuis cette console (mémorisés localement, faute
   de `GET /admin/users`). Les empiler en deux sections obligeait à chercher la
   même personne à deux endroits ; la colonne « origine » dit d'où vient la
   ligne, ce qui suffit.
   ───────────────────────────────────────────────────────────────────────────── */

type Origin = "console" | "client";

interface UserRow {
  key: string;
  /** uuid `users.id` — la clé de `PATCH /admin/users/{id}/role`. */
  userId: string;
  name: string;
  email: string;
  role: Role;
  origin: Origin;
  /** Fiche client, quand elle existe. */
  href?: string;
  createdAt?: string;
  onForget?: () => void;
}

const column = createColumnHelper<UserRow>();

const COLUMNS = [
  column.accessor("name", {
    header: "Utilisateur",
    cell: (c) => {
      const r = c.row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar name={r.name} />
          <div className="min-w-0">
            {r.href ? (
              <Link
                href={r.href}
                className="block truncate font-semibold text-navy hover:text-terra"
              >
                {r.name}
              </Link>
            ) : (
              <span className="block truncate font-semibold text-navy">{r.name}</span>
            )}
            {r.createdAt && (
              <span className="text-[11px] text-ink-soft">Cr\u00e9\u00e9 {timeAgo(r.createdAt)}</span>
            )}
          </div>
        </div>
      );
    },
  }),
  column.accessor("email", {
    header: "Email",
    cell: (c) => (
      <span className="font-mono text-[12px] text-ink-mid">{c.getValue()}</span>
    ),
    meta: { cellClass: "max-w-[16rem] truncate" },
  }),
  column.accessor("role", {
    header: "R\u00f4le",
    cell: (c) => <Badge tone={roleTone[c.getValue()]}>{roleLabel[c.getValue()]}</Badge>,
    // Le filtre de r\u00f4le est une \u00e9galit\u00e9 stricte, pas une recherche de texte.
    filterFn: (row, id, value) => value === "all" || row.getValue(id) === value,
  }),
  column.accessor("origin", {
    header: "Origine",
    cell: (c) => <OriginTag row={c.row.original} />,
  }),
  column.display({
    id: "roleEditor",
    header: "R\u00f4le applicatif",
    cell: (c) => (
      <div className="flex items-center justify-end gap-4">
        {/* L'équipe n'a pas de fil support avec elle-même. */}
        {c.row.original.role !== "admin" && (
          <WriteToUserButton userId={c.row.original.userId} />
        )}
        <div className="w-fit">
          <RoleEditor
            userId={c.row.original.userId}
            role={c.row.original.role}
            hint={false}
          />
        </div>
      </div>
    ),
    meta: { width: "16rem" },
  }),
];

const ROLE_FILTERS: { id: "all" | Role; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "client", label: "Clients" },
  { id: "chef", label: "Batch cookers" },
  { id: "admin", label: "Admins" },
];

export default function UtilisateursPage() {
  const recent = useRecentUsers();
  const { data, isPending, isError, error, refetch } = useClients();

  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | Role>("all");
  const [view, setView] = useState<"table" | "cards">("table");
  const [creating, setCreating] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);

  const rows = useMemo<UserRow[]>(() => {
    const fromApi: UserRow[] = (data?.data ?? []).map(toClientView).map((c) => ({
      key: `api-${c.id}`,
      userId: c.userId,
      name: c.name,
      email: c.email,
      role: c.role,
      origin: "client",
      href: `/clients/${c.id}`,
    }));

    // Un compte créé ici qui s'est déjà connecté remonte aussi de l'API :
    // on garde la ligne de l'API, qui porte la fiche client.
    const known = new Set(fromApi.map((r) => r.userId));
    const fromConsole: UserRow[] = recent
      .filter((u) => !known.has(u.id))
      .map((u) => ({
        key: `local-${u.id}`,
        userId: u.id,
        name: u.fullName?.trim() || u.email,
        email: u.email,
        role: u.role,
        origin: "console",
        createdAt: u.createdAt,
        onForget: () => forgetUser(u.id),
      }));

    return [...fromConsole, ...fromApi];
  }, [data, recent]);

  const columnFilters: ColumnFiltersState = useMemo(
    () => (role === "all" ? [] : [{ id: "role", value: role }]),
    [role],
  );

  const table = useReactTable({
    data: rows,
    columns: COLUMNS,
    state: { sorting, globalFilter: query, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setQuery,
    getRowId: (r) => r.key,
    // La recherche porte sur le nom et l'email, pas sur les colonnes rendues.
    globalFilterFn: (row, _id, value) => {
      const q = String(value).trim().toLowerCase();
      if (!q) return true;
      const r = row.original;
      return (
        r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 12 } },
  });

  // La vue en cartes lit les lignes du tableau : m\u00eame tri, m\u00eame filtre,
  // m\u00eame page. Changer de vue ne change que la mise en forme.
  const visible = table.getRowModel().rows.map((r) => r.original);
  const matching = table.getFilteredRowModel().rows.length;
  const total = rows.length;

  return (
    <div className="space-y-6">
      {/* ── Titre et action principale ─────────────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy lg:text-3xl">
            Utilisateurs
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-mid">
            Le rôle est la source de vérité des droits : seuls les comptes{" "}
            <strong className="font-semibold text-navy">admin</strong> accèdent à
            cette console. Créer un compte le provisionne dans Clerk et en base.
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="btn btn-primary">
          <Plus className="h-4 w-4" />
          Nouvel utilisateur
        </button>
      </header>

      {/* ── Filtres et vue ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[rgba(0,35,75,0.1)] pb-4">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom ou email…"
            aria-label="Rechercher un utilisateur"
            className="input-base pl-9"
          />
        </div>

        <div role="radiogroup" aria-label="Filtrer par rôle" className="flex items-center">
          {ROLE_FILTERS.map((f) => {
            const on = role === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setRole(f.id)}
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

        <div className="ml-auto flex items-center" role="group" aria-label="Affichage">
          <ViewButton
            active={view === "table"}
            onClick={() => setView("table")}
            Icon={Rows3}
            label="Tableau"
          />
          <ViewButton
            active={view === "cards"}
            onClick={() => setView("cards")}
            Icon={LayoutGrid}
            label="Cartes"
          />
        </div>
      </div>

      {/* ── Liste ──────────────────────────────────────────────────────── */}
      <section>
        <p className="mb-3 text-xs text-ink-soft" aria-live="polite">
          {isPending
            ? "Chargement…"
            : `${matching} utilisateur${matching > 1 ? "s" : ""}${
                matching !== total ? ` sur ${total}` : ""
              }`}
        </p>

        {isPending ? (
          <div className="space-y-px">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse bg-cream-soft" />
            ))}
          </div>
        ) : isError ? (
          <div className="bg-paper py-10">
            <EmptyState
              Icon={Users}
              title="Chargement impossible"
              text={
                error instanceof Error
                  ? error.message
                  : "Impossible de récupérer les comptes depuis l'API."
              }
            />
            <div className="flex justify-center">
              <button onClick={() => refetch()} className="btn btn-navy">
                <RotateCw className="h-4 w-4" /> Réessayer
              </button>
            </div>
          </div>
        ) : matching === 0 ? (
          <div className="bg-paper px-6 py-12 text-center">
            <p className="text-sm text-ink-mid">
              {query || role !== "all"
                ? "Aucun compte ne correspond à ces critères."
                : "Aucun compte pour l'instant."}
            </p>
            {(query || role !== "all") && (
              <button
                onClick={() => {
                  setQuery("");
                  setRole("all");
                }}
                className="btn btn-outline btn-sm mt-4"
              >
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <>
            {view === "table" ? (
              <DataTable table={table} />
            ) : (
              <div className="grid grid-cols-1 gap-px bg-[rgba(0,35,75,0.08)] sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((r) => (
                  <UserCard key={r.key} row={r} />
                ))}
              </div>
            )}
            <TablePagination table={table} />
          </>
        )}
      </section>

      {/* ── Limite backend connue ──────────────────────────────────────── */}
      <p className="flex items-start gap-2.5 bg-cream-soft px-4 py-3 text-xs leading-relaxed text-ink-mid">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />
        <span>
          <span className="font-semibold text-navy">
            Nom, prénom et téléphone ne sont pas modifiables ici :
          </span>{" "}
          l&apos;API expose la création du compte et le changement de rôle, mais
          aucun endpoint de mise à jour des informations personnelles d&apos;un
          autre utilisateur. Les comptes marqués{" "}
          <span className="font-semibold text-navy">Créé ici</span> ne sont
          mémorisés que dans ce navigateur, faute de{" "}
          <code className="font-mono">GET /admin/users</code>.
        </span>
      </p>

      {/* ── Création ───────────────────────────────────────────────────── */}
      <Drawer
        open={creating}
        onClose={() => setCreating(false)}
        eyebrow="Comptes & accès"
        title="Nouvel utilisateur"
      >
        <p className="mb-5 text-xs leading-relaxed text-ink-mid">
          Seul l&apos;email est obligatoire. Sans mot de passe, Clerk crée un
          compte « passwordless » et envoie un lien de connexion.
        </p>
        <UserForm onCancel={() => setCreating(false)} />
      </Drawer>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  Icon: typeof Rows3;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={`Vue ${label.toLowerCase()}`}
      className={cn(
        "flex items-center gap-1.5 border border-l-0 px-3 py-2 text-xs font-semibold transition-colors first:rounded-l-md first:border-l last:rounded-r-md",
        active
          ? "border-navy bg-navy text-white"
          : "border-[rgba(0,35,75,0.18)] text-ink-mid hover:bg-cream-soft hover:text-navy",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function UserCard({ row }: { row: UserRow }) {
  return (
    <article className="bg-paper p-5">
      <div className="flex items-start gap-3">
        <Avatar name={row.name} size="lg" />
        <div className="min-w-0 flex-1">
          {row.href ? (
            <Link
              href={row.href}
              className="block truncate font-semibold text-navy hover:text-terra"
            >
              {row.name}
            </Link>
          ) : (
            <p className="truncate font-semibold text-navy">{row.name}</p>
          )}
          <p className="truncate font-mono text-[11px] text-ink-soft">{row.email}</p>
        </div>
        <Badge tone={roleTone[row.role]}>{roleLabel[row.role]}</Badge>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-ink-soft">
        <OriginTag row={row} />
        {row.createdAt && <span>Créé {timeAgo(row.createdAt)}</span>}
        {row.role !== "admin" && (
          <WriteToUserButton userId={row.userId} className="ml-auto" />
        )}
      </div>

      <div className="mt-4 border-t border-[rgba(0,35,75,0.08)] pt-3">
        <p className="field-label">Rôle applicatif</p>
        <RoleEditor userId={row.userId} role={row.role} hint={false} />
      </div>
    </article>
  );
}

function OriginTag({ row }: { row: UserRow }) {
  if (row.origin === "client") {
    return <span className="text-[11px] text-ink-soft">Fichier clients</span>;
  }
  return (
    <span className="inline-flex items-center gap-2 text-[11px] text-ink-soft">
      Créé ici
      {row.onForget && (
        <button
          type="button"
          onClick={row.onForget}
          title="Retirer de cette liste (ne supprime pas le compte)"
          className="inline-flex items-center gap-0.5 text-ink-soft hover:text-danger"
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Retirer {row.name} de la liste</span>
        </button>
      )}
    </span>
  );
}

function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center bg-navy font-bold text-white",
        size === "lg" ? "h-11 w-11 text-sm" : "h-9 w-9 text-[11px]",
      )}
    >
      {initials(name)}
    </span>
  );
}
