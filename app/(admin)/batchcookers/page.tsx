"use client";

import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import ChefApplicationsList from "@/components/admin/ChefApplicationsList";
import ChefNetwork from "@/components/admin/ChefNetwork";
import { cn } from "@/lib/utils";

/**
 * Deux stades d'une meme vie : on candidate, puis on cuisine. Les separer en
 * deux entrees de menu obligeait a chercher la meme personne a deux endroits
 * selon l'avancement de son dossier.
 */
type Stage = "candidatures" | "reseau";

/* Les onglets (44 px) puis la grille de cartes du réseau, comme `ChefNetwork` en chargement. */
function BatchCookersSkeleton() {
  return (
    <SkeletonGroup className="space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-11 w-28" />
        <Skeleton className="h-11 w-28" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-44 p-4">
            <Skeleton className="h-full rounded-[10px]" />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}

export default function BatchCookersPage() {
  return (
    <Suspense fallback={<BatchCookersSkeleton />}>
      <BatchCookers />
    </Suspense>
  );
}

function BatchCookers() {
  // `?vue=candidatures` : l'ancienne route /candidatures redirige ici.
  const initialStage: Stage =
    useSearchParams().get("vue") === "candidatures" ? "candidatures" : "reseau";
  const [stage, setStage] = useState<Stage>(initialStage);

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
          Batch cookers
        </StageTab>
      </div>

      {stage === "candidatures" ? <ChefApplicationsList /> : <ChefNetwork />}
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
