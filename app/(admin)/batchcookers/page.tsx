"use client";

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
