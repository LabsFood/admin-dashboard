"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  MapPin,
  RotateCw,
  Search,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import FilterTabs from "@/components/ui/FilterTabs";
import { cn, formatDate, initials } from "@/lib/utils";
import {
  CHEF_STATE_HELP,
  CHEF_STATE_LABEL,
  CHEF_STATE_TONE,
  useAdminChefCounts,
  useAdminChefs,
  type AdminChef,
  type ChefSort,
  type ChefStateFilter,
} from "@/lib/api/chefs";
import { adminErrorMessage } from "@/lib/api/errors";
import { useRegions } from "@/lib/api/referentials";

/**
 * Tous les batch cookers de la plateforme.
 *
 * La liste vient de `/admin/chefs` : recherche, filtres, tri et pagination sont
 * faits par l'API, sur tous les comptes — y compris ceux qui n'ont jamais déposé
 * de candidature, que l'ancienne liste (les candidatures approuvées) ne voyait pas.
 *
 * On ouvre sur « Réseau » : les approuvés. Approuvé n'est pas en ligne — c'est la
 * première question qu'on se pose devant cette liste, d'où un onglet par état.
 */

type Tab = ChefStateFilter | "all";

const PAGE_SIZE = 24;

export default function ChefNetwork() {
  const [tab, setTab] = useState<Tab>("verified");
  const [typed, setTyped] = useState("");
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState<ChefSort>("recent");
  const [page, setPage] = useState(1);

  // La recherche part quand on cesse de taper, pas à chaque lettre.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(typed.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [typed]);

  const regions = useRegions();
  const counts = useAdminChefCounts();
  const liste = useAdminChefs({
    q: q || undefined,
    state: tab === "all" ? undefined : tab,
    region: region || undefined,
    sort,
    page,
    limit: PAGE_SIZE,
  });

  const lignes = liste.data?.data ?? [];
  const meta = liste.data?.meta;
  const filtre = Boolean(q || region);
  const c = counts.data;

  const changer = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  if (liste.isError) {
    return (
      <section className="card p-6">
        <p className="flex items-start gap-2 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {adminErrorMessage(liste.error)}
        </p>
        <button onClick={() => liste.refetch()} className="btn btn-outline btn-sm mt-4">
          <RotateCw className="h-3 w-3" aria-hidden /> Réessayer
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm text-ink-mid">
            {liste.isPending
              ? "Lecture du réseau…"
              : `${meta?.total ?? lignes.length} batch cooker${(meta?.total ?? 0) > 1 ? "s" : ""}${filtre ? " pour ces critères" : ""}`}
          </p>
          {c && (
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
              {c.online} vitrine{c.online > 1 ? "s" : ""} en ligne sur {c.all} compte
              {c.all > 1 ? "s" : ""} — seules celles-là sont réservables par un client.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-60">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
              aria-hidden
            />
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Nom, email, ville, référence…"
              aria-label="Rechercher un batch cooker"
              className="input-base pl-9"
            />
          </div>
          <select
            value={region}
            onChange={(e) => changer(setRegion)(e.target.value)}
            aria-label="Filtrer par région d'intervention"
            className="input-base sm:w-52"
          >
            <option value="">Toutes les régions</option>
            {regions.data.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => changer(setSort)(e.target.value as ChefSort)}
            aria-label="Trier la liste"
            className="input-base sm:w-44"
          >
            <option value="recent">Plus récents d&apos;abord</option>
            <option value="name">Par nom</option>
          </select>
        </div>
      </div>

      <FilterTabs<Tab>
        value={tab}
        onChange={changer(setTab)}
        options={[
          {
            id: "verified",
            label: "Réseau",
            count: c ? c.online + c.offline + c.suspended : undefined,
          },
          { id: "online", label: "En ligne", count: c?.online },
          { id: "offline", label: "Hors ligne", count: c?.offline },
          { id: "suspended", label: "Suspendus", count: c?.suspended },
          { id: "pending", label: "En attente", count: c?.pending },
          { id: "all", label: "Tous", count: c?.all },
        ]}
      />

      {liste.isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-44 animate-pulse" />
          ))}
        </div>
      ) : lignes.length === 0 ? (
        <div className="card">
          <EmptyState
            Icon={ChefHat}
            title={filtre ? "Aucun résultat" : "Personne dans cet état"}
            text={
              filtre
                ? "Aucun batch cooker ne correspond à ces critères."
                : tab === "verified"
                  ? "Les batch cookers approuvés apparaîtront ici. Commencez par instruire une candidature."
                  : "Aucun batch cooker n'est dans cet état pour le moment."
            }
          />
        </div>
      ) : (
        // Pendant le chargement de la page suivante, l'ancienne reste, estompée.
        <div
          className={cn(
            "grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3",
            liste.isPlaceholderData && "opacity-60",
          )}
        >
          {lignes.map((chef, i) => (
            <motion.div
              key={chef.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
            >
              <ChefCard chef={chef} />
            </motion.div>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <nav
          aria-label="Pages de la liste"
          className="flex items-center justify-center gap-3 text-sm text-ink-mid"
        >
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={!meta.hasPreviousPage}
            className="btn btn-outline btn-sm disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Précédent
          </button>
          <span>
            Page {meta.page} sur {meta.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!meta.hasNextPage}
            className="btn btn-outline btn-sm disabled:opacity-40"
          >
            Suivant <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </nav>
      )}
    </div>
  );
}

function ChefCard({ chef }: { chef: AdminChef }) {
  const { counts } = chef;
  return (
    <Link href={`/batchcookers/${chef.id}`} className="card card-hover flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy text-sm font-bold text-white">
          {initials(chef.displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold text-navy">
            {chef.displayName}
          </p>
          <p className="flex items-center gap-1 truncate text-xs text-ink-soft">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            {chef.city ?? "Ville non renseignée"}
          </p>
        </div>
        <Badge tone={CHEF_STATE_TONE[chef.state]} dot>
          {CHEF_STATE_LABEL[chef.state]}
        </Badge>
      </div>

      <p className="mt-3 truncate font-mono text-[11px] text-ink-soft">
        {chef.application?.reference ?? "Sans candidature"} · {chef.email}
      </p>

      {chef.regions.length > 0 && (
        <p className="mt-2 truncate text-[12px] text-ink-mid">
          {chef.regions.map((r) => r.label).join(" · ")}
        </p>
      )}

      {chef.state !== "online" && (
        <p
          className={cn(
            "mt-2 text-[12px] leading-relaxed",
            chef.state === "suspended" ? "text-danger" : "text-[#8A6212]",
          )}
        >
          {CHEF_STATE_HELP[chef.state]}
        </p>
      )}
      {chef.reactivatedPendingReview && (
        <p className="mt-2 text-[12px] leading-relaxed text-[#8A6212]">
          En ligne sur un document de remplacement pas encore relu.
        </p>
      )}

      <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
        <Stat label="Plats" value={counts.publishedDishes} />
        <Stat label="Menus" value={counts.publishedMenus} />
        <Stat label="À venir" value={counts.upcomingBookings} />
        <Stat label="Réalisées" value={counts.completedBookings} />
      </dl>

      <div className="hairline mt-auto flex items-center justify-between border-t pt-3">
        <span className="text-[11px] text-ink-soft">
          Inscrit le {formatDate(chef.createdAt)}
        </span>
        <ArrowRight className="h-4 w-4 text-terra" aria-hidden />
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-cream-soft px-1 py-1.5">
      <dd className="font-display text-base font-bold text-navy">{value}</dd>
      <dt className="text-[10px] text-ink-soft">{label}</dt>
    </div>
  );
}
