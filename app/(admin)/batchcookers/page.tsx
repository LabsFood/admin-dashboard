"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  ChefHat,
  MapPin,
  RotateCw,
  Search,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import FilterTabs from "@/components/ui/FilterTabs";
import ChefApplicationsList from "@/components/admin/ChefApplicationsList";
import { cn, formatDate, initials } from "@/lib/utils";
import { useChefApplications } from "@/lib/api/admin";
import { adminErrorMessage } from "@/lib/api/errors";

/**
 * Deux stades d'une meme vie : on candidate, puis on cuisine. Les separer en
 * deux entrees de menu obligeait a chercher la meme personne a deux endroits
 * selon l'avancement de son dossier.
 */
type Stage = "candidatures" | "reseau";

export default function BatchCookersPage() {
  return (
    <Suspense fallback={null}>
      <BatchCookers />
    </Suspense>
  );
}

function BatchCookers() {
  // `?vue=candidatures` : l'ancienne route /candidatures redirige ici.
  const initialStage: Stage =
    useSearchParams().get("vue") === "candidatures" ? "candidatures" : "reseau";
  const [stage, setStage] = useState<Stage>(initialStage);
  const [query, setQuery] = useState("");

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Stade" className="flex items-center">
        <StageTab
          active={stage === "candidatures"}
          onClick={() => setStage("candidatures")}
        >
          Candidatures
        </StageTab>
        <StageTab active={stage === "reseau"} onClick={() => setStage("reseau")}>
          Réseau en activité
        </StageTab>
      </div>

      {stage === "candidatures" ? (
        <ChefApplicationsList />
      ) : (
        <ReseauView query={query} setQuery={setQuery} />
      )}
    </div>
  );
}

function StageTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
        active
          ? "border-terra text-navy"
          : "border-transparent text-ink-soft hover:text-navy",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Approuvé n'est pas en ligne. L'API crée le profil chef dès la soumission et
 * laisse la vitrine éteinte : on peut très bien avoir dix candidatures
 * approuvées et aucun batch cooker réservable. C'est la première question
 * qu'on se pose devant cette liste, donc le premier filtre.
 */
type Presence = "tous" | "en-ligne" | "hors-ligne";

function ReseauView({ query, setQuery }: { query: string; setQuery: (q: string) => void }) {
  const liste = useChefApplications({ status: "approved", limit: 100 });
  const [presence, setPresence] = useState<Presence>("tous");
  const lignes = liste.data?.data ?? [];

  // `isActive` arrive dans la réponse réelle sans figurer au Swagger. Quand il
  // manque, on ne filtre pas sur une devinette : la carte reste muette.
  const etatConnu = lignes.some((b) => typeof b.isActive === "boolean");
  const enLigne = lignes.filter((b) => b.isActive === true).length;

  const q = query.trim().toLowerCase();
  const filtrees = lignes
    .filter((b) =>
      !etatConnu || presence === "tous"
        ? true
        : presence === "en-ligne"
          ? b.isActive === true
          : b.isActive !== true,
    )
    .filter(
      (b) =>
        !q ||
        b.name.toLowerCase().includes(q) ||
        (b.city ?? "").toLowerCase().includes(q) ||
        b.reference.toLowerCase().includes(q),
    );

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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-ink-mid">
            {liste.isPending
              ? "Lecture du réseau…"
              : `${liste.data?.meta?.total ?? lignes.length} batch cooker${
                  lignes.length > 1 ? "s" : ""
                } approuvé${lignes.length > 1 ? "s" : ""}`}
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
            {etatConnu
              ? `${enLigne} vitrine${enLigne > 1 ? "s" : ""} en ligne — seules celles-là sont réservables par un client.`
              : "Établi depuis les candidatures approuvées : l'API n'expose pas encore la liste des batch cookers."}
          </p>
        </div>
        <div className="relative lg:w-64">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, ville, référence…"
            aria-label="Rechercher un batch cooker"
            className="input-base pl-9"
          />
        </div>
      </div>

      {etatConnu && (
        <FilterTabs<Presence>
          value={presence}
          onChange={setPresence}
          options={[
            { id: "tous", label: "Tous", count: lignes.length },
            { id: "en-ligne", label: "En ligne", count: enLigne },
            { id: "hors-ligne", label: "Hors ligne", count: lignes.length - enLigne },
          ]}
        />
      )}

      {liste.isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-40 animate-pulse" />
          ))}
        </div>
      ) : filtrees.length === 0 ? (
        <div className="card">
          <EmptyState
            Icon={ChefHat}
            title={q ? "Aucun résultat" : "Aucun batch cooker approuvé"}
            text={
              q
                ? "Aucun profil ne correspond à cette recherche."
                : "Les candidatures approuvées apparaîtront ici. Commencez par en instruire une."
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrees.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
            >
              <Link
                href={`/batchcookers/${b.id}`}
                className="card card-hover flex h-full flex-col p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy text-sm font-bold text-white">
                    {initials(b.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-bold text-navy">
                      {b.name}
                    </p>
                    {b.city && (
                      <p className="flex items-center gap-1 truncate text-xs text-ink-soft">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden /> {b.city}
                      </p>
                    )}
                  </div>
                  {typeof b.isActive === "boolean" ? (
                    <Badge tone={b.isActive ? "success" : "neutral"} dot>
                      {b.isActive ? "En ligne" : "Hors ligne"}
                    </Badge>
                  ) : (
                    <Badge tone="success" dot>
                      Approuvé
                    </Badge>
                  )}
                </div>

                <p className="mt-3 font-mono text-[11px] text-ink-soft">{b.reference}</p>

                {b.isActive === false && (
                  <p className="mt-2 text-[12px] leading-relaxed text-[#8A6212]">
                    Approuvé mais invisible : aucun client ne peut le réserver
                    tant que sa vitrine n&apos;est pas mise en ligne.
                  </p>
                )}

                <div className="hairline mt-auto flex items-center justify-between border-t pt-3">
                  <span className="text-[11px] text-ink-soft">
                    {b.isVerified === false
                      ? "Vérification non faite"
                      : `Candidature du ${formatDate(b.submittedAt)}`}
                  </span>
                  <ArrowRight className="h-4 w-4 text-terra" aria-hidden />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
