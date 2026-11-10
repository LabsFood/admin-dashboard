"use client";

import { Check } from "lucide-react";
import Badge from "@/components/ui/Badge";
import InfoPopover from "@/components/ui/InfoPopover";
import type { ChefTierRule } from "@/lib/api/admin";

const pourcent = (bps: number) =>
  `${(bps / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;

/**
 * Ce qu'un palier permet et la commission qu'il paie (BLK-26), tel que l'API le
 * dit : `GET /admin/settings/chef-tiers` → `rules`. Rien n'est calculé ici.
 */
export default function TierRules({ rule }: { rule: ChefTierRule }) {
  return (
    <div className="space-y-2">
      <p className="flex flex-wrap items-center gap-2 text-[12px] text-ink-mid">
        {rule.decided ? (
          <Badge tone="success">Décidé</Badge>
        ) : (
          <span className="flex items-center gap-1">
            <Badge tone="warning">Provisoire</Badge>
            <InfoPopover label="Pourquoi provisoire ?">
              Les règles de ce palier ne sont pas encore décidées. En attendant, il
              ne restreint rien : il permet tout ce que permet le palier 1, au même
              taux de commission.
            </InfoPopover>
          </span>
        )}
        <span>
          Commission <strong className="text-navy">{pourcent(rule.commissionBps)}</strong>
        </span>
        <InfoPopover label="D'où vient ce taux ?">
          C&apos;est la commission de la plateforme, réglée plus haut. Un taux par
          palier viendra quand la grille sera décidée.
        </InfoPopover>
      </p>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {rule.capabilities.map((c) => (
          <li key={c.code} className="flex items-start gap-1.5 text-[12px] text-ink-mid">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
