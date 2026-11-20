"use client";

import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  LayoutGrid,
  MapPin,
  Plus,
  RotateCw,
  Rows3,
  Search,
  Users,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import FilterTabs from "@/components/ui/FilterTabs";
import EmptyState from "@/components/ui/EmptyState";
import Drawer from "@/components/ui/Drawer";
import UserForm from "@/components/admin/UserForm";
import DeleteAccountButton from "@/components/admin/DeleteAccountButton";
import { cn, euros, formatDate, initials } from "@/lib/utils";
import { clientTone, clientLabel } from "@/lib/status";
import { useClients } from "@/lib/api/admin";
import { rowToClientView, type ClientView } from "@/lib/api/adapt";
import type { ClientStatus } from "@/lib/mock/types";

type Filter = "all" | ClientStatus;
type View = "card" | "table";

/** Placeholder pour un champ non encore fourni par l'API. */
const DASH = "—";

export default function ClientsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("card");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isPending, isError, error, refetch } = useClients();

  const clients = useMemo<ClientView[]>(
    () => (data?.data ?? []).map(rowToClientView),
    [data],
  );

  // `meta.total` = nombre réel de clients côté API ; `clients` ne contient que
  // la page courante.
  const total = data?.meta.total ?? clients.length;

  const counts = useMemo(
    () =>
      clients.reduce<Record<string, number>>((acc, c) => {
        acc[c.status] = (acc[c.status] ?? 0) + 1;
        return acc;
      }, {}),
    [clients],
  );

  const filtered = useMemo(
    () =>
      clients.filter((c) => {
        const matchStatus = filter === "all" || c.status === filter;
        const q = query.toLowerCase();
        const matchQuery =
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q);
        return matchStatus && matchQuery;
      }),
    [clients, filter, query],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <MiniStat label="Clients" value={isPending ? DASH : total} />
        <MiniStat label="VIP" value={isPending ? DASH : counts.vip ?? 0} />
        <MiniStat label="Actifs" value={isPending ? DASH : counts.active ?? 0} />
        <MiniStat
          label="Prospects"
          value={isPending ? DASH : counts.prospect ?? 0}
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "Tous", count: clients.length },
            { id: "vip", label: "VIP", count: counts.vip ?? 0 },
            { id: "active", label: "Actifs", count: counts.active ?? 0 },
            { id: "prospect", label: "Prospects", count: counts.prospect ?? 0 },
            { id: "inactive", label: "Inactifs", count: counts.inactive ?? 0 },
          ]}
        />
        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:w-60">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, email…"
              className="input-base pl-9"
            />
          </div>
          <ViewToggle view={view} onChange={setView} />
          <button
            onClick={() => setCreateOpen(true)}
            className="btn btn-primary shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Client</span>
          </button>
        </div>
      </div>

      {isPending ? (
        <SkeletonGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-44 p-4">
              <Skeleton className="h-full rounded-[10px]" />
            </div>
          ))}
        </SkeletonGroup>
      ) : isError ? (
        <div className="card">
          <EmptyState
            Icon={Users}
            title="Chargement impossible"
            text={
              error instanceof Error
                ? error.message
                : "Impossible de récupérer les clients depuis l'API."
            }
          />
          <div className="flex justify-center pb-5">
            <button onClick={() => refetch()} className="btn btn-navy">
              <RotateCw className="h-4 w-4" /> Réessayer
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            Icon={Users}
            title="Aucun client"
            text="Aucun client ne correspond à cette recherche."
          />
        </div>
      ) : view === "card" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <div
              key={c.userId}
            >
              {c.id === null ? (
                <AccountOnly card c={c} className="card h-full p-5" />
              ) : (
              <Link
                href={`/clients/${c.id}`}
                className="card card-hover flex h-full flex-col p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy text-sm font-bold text-white">
                    {initials(c.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-bold text-navy">
                      {c.name}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-ink-soft">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {c.city ?? c.email}
                    </p>
                  </div>
                  <Badge tone={clientTone[c.status]}>
                    {clientLabel[c.status]}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-cream-soft p-3 text-center">
                  <Cell label="Sessions" value={c.ordersCount ?? DASH} />
                  <Cell
                    label="Dépensé"
                    value={c.totalSpent != null ? euros(c.totalSpent) : DASH}
                  />
                  <Cell
                    label="Foyer"
                    value={c.householdSize != null ? `${c.householdSize}` : DASH}
                  />
                </div>

                {c.dietaryPreferences.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.dietaryPreferences.map((d) => (
                      <span
                        key={d}
                        className="rounded-full bg-teal-pale px-2 py-0.5 text-xs font-medium text-teal"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-[rgba(0,35,75,0.06)] pt-3">
                  <span className="text-xs text-ink-soft">
                    {c.lastOrderAt
                      ? `Dernière session ${formatDate(c.lastOrderAt)}`
                      : c.createdAt
                        ? `Client depuis ${formatDate(c.createdAt)}`
                        : "Profil client"}
                  </span>
                  <ArrowRight className="h-4 w-4 text-terra" />
                </div>
              </Link>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[1.6fr_0.8fr_0.7fr_0.9fr_0.8fr_auto] gap-4 border-b border-[rgba(0,35,75,0.07)] bg-cream-soft px-5 py-3 text-xs uppercase tracking-[0.14em] text-ink-soft lg:grid">
            <span>Client</span>
            <span>Ville</span>
            <span>Sessions</span>
            <span>Dépensé</span>
            <span>Statut</span>
            <span />
          </div>
          <ul className="divide-y divide-[rgba(0,35,75,0.06)]">
            {filtered.map((c) => (
              <li key={c.userId}>
                {c.id === null ? (
                  <AccountOnly c={c} className="px-5 py-3.5" />
                ) : (
                <Link
                  href={`/clients/${c.id}`}
                  className="grid grid-cols-1 items-center gap-2 px-5 py-3.5 transition-colors hover:bg-cream-soft lg:grid-cols-[1.6fr_0.8fr_0.7fr_0.9fr_0.8fr_auto] lg:gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-xs font-bold text-white">
                      {initials(c.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-navy">
                        {c.name}
                      </p>
                      <p className="truncate text-xs text-ink-soft">
                        {c.email}
                      </p>
                    </div>
                  </div>
                  <p className="flex items-center gap-1 text-xs text-ink-mid">
                    <MapPin className="h-3 w-3 text-ink-soft" />
                    {c.city ?? DASH}
                  </p>
                  <p className="text-sm font-semibold text-navy tabular-nums">
                    {c.ordersCount ?? DASH}
                    <span className="ml-1 text-xs font-normal text-ink-soft lg:hidden">
                      sessions
                    </span>
                  </p>
                  <p className="text-sm font-semibold text-navy tabular-nums">
                    {c.totalSpent != null ? euros(c.totalSpent) : DASH}
                  </p>
                  <Badge tone={clientTone[c.status]}>
                    {clientLabel[c.status]}
                  </Badge>
                  <ArrowRight className="hidden h-4 w-4 text-terra lg:block" />
                </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Drawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        eyebrow="Comptes & accès"
        title="Nouveau compte"
      >
        <p className="mb-5 text-xs leading-relaxed text-ink-mid">
          Le compte est créé dans Clerk et en base. Il rejoindra ce fichier
          clients après sa première connexion à l&apos;espace client.
        </p>
        <UserForm onCancel={() => setCreateOpen(false)} />
      </Drawer>
    </div>
  );
}

/**
 * Un compte sans profil client (il n'a pas encore enregistré ses goûts) : la
 * fiche `/clients/{id}` se charge par id de **profil**, il n'y en a donc pas à
 * ouvrir. La ligne reste visible, et le compte peut être supprimé d'ici.
 */
function AccountOnly({
  c,
  className,
  card = false,
}: {
  c: ClientView;
  className: string;
  /** Vue cartes : même squelette qu'une fiche client, sans lien. */
  card?: boolean;
}) {
  if (card) {
    return (
      <div className={cn("flex flex-col", className)}>
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy text-sm font-bold text-white">
            {initials(c.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-bold text-navy">
              {c.name}
            </p>
            <p className="flex items-center gap-1 truncate text-xs text-ink-soft">
              <MapPin className="h-3 w-3 shrink-0" />
              {c.city ?? c.email}
            </p>
          </div>
          <Badge tone={clientTone[c.status]}>{clientLabel[c.status]}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-cream-soft p-3 text-center">
          <Cell label="Sessions" value={DASH} />
          <Cell label="Dépensé" value={DASH} />
          <Cell label="Foyer" value={DASH} />
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(0,35,75,0.06)] pt-3">
          <span className="text-xs text-ink-soft">Profil non renseigné</span>
          <DeleteAccountButton
            userId={c.userId}
            nom={c.name || c.email}
            role="client"
            retourVers="/clients"
          />
        </div>
      </div>
    );
  }
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-xs font-bold text-white">
        {initials(c.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-navy">{c.name}</p>
        <p className="truncate text-xs text-ink-soft">{c.email}</p>
        <p className="text-xs text-ink-soft">
          Profil non renseigné : pas de fiche à ouvrir.
        </p>
      </div>
      <Badge tone={clientTone[c.status]}>{clientLabel[c.status]}</Badge>
      <DeleteAccountButton
        userId={c.userId}
        nom={c.name || c.email}
        role="client"
        retourVers="/clients"
      />
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <div className="flex shrink-0 items-center rounded-full border border-[rgba(0,35,75,0.13)] bg-paper p-0.5">
      {(
        [
          { id: "card", Icon: LayoutGrid, label: "Cartes" },
          { id: "table", Icon: Rows3, label: "Tableau" },
        ] as const
      ).map(({ id, Icon, label }) => (
        <button
          key={id}
          type="button"
          aria-label={label}
          title={label}
          onClick={() => onChange(id)}
          className={cn(
            "hit flex h-8 w-8 items-center justify-center rounded-full transition-colors",
            view === id
              ? "bg-navy text-white"
              : "text-ink-soft hover:text-navy",
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-display text-sm font-bold text-navy">{value}</p>
      <p className="text-xs uppercase tracking-wide text-ink-soft">
        {label}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="font-display text-2xl font-bold text-navy">{value}</p>
      <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
        {label}
      </p>
    </div>
  );
}
