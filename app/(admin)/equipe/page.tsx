"use client";

import { motion } from "framer-motion";
import {
  Award,
  ChefHat,
  Mail,
  MapPin,
  Phone,
  Plus,
  Star,
  UtensilsCrossed,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { formatDate, initials } from "@/lib/utils";
import { TEAM, SERVICE_ZONES } from "@/lib/mock/team";
import type { TeamRole } from "@/lib/mock/types";

const ROLE_LABEL: Record<TeamRole, string> = {
  founder: "Fondatrice",
  chef: "Chef·fe",
  staff: "Staff",
};
const ROLE_TONE: Record<TeamRole, "terra" | "navy" | "teal"> = {
  founder: "terra",
  chef: "navy",
  staff: "teal",
};

export default function EquipePage() {
  return (
    <div className="space-y-8">
      {/* Équipe */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="eyebrow">Ressources</p>
            <h2 className="mt-1 font-display text-lg font-bold text-navy">
              Chefs & staff ({TEAM.length})
            </h2>
          </div>
          <button className="btn btn-primary">
            <Plus className="h-4 w-4" /> Ajouter un membre
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {TEAM.map((m, i) => (
            <motion.article
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: i * 0.06 }}
              className="card flex flex-col p-5"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-navy text-base font-bold text-white">
                  {m.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.avatar}
                      alt={m.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials(m.name)
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-bold text-navy">
                    {m.name}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-ink-soft">
                    <MapPin className="h-3 w-3" />
                    {m.city}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Badge tone={ROLE_TONE[m.role]}>{ROLE_LABEL[m.role]}</Badge>
                    <Badge tone={m.status === "active" ? "success" : "neutral"}>
                      {m.status === "active" ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-ink-mid">
                {m.specialty}
              </p>

              {m.role !== "staff" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-cream-soft p-2.5 text-center">
                    <p className="inline-flex items-center gap-1 font-display text-base font-bold text-navy">
                      <Star className="h-3.5 w-3.5 fill-terra text-terra" />
                      {m.rating || "—"}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-ink-soft">
                      {m.reviewCount} avis
                    </p>
                  </div>
                  <div className="rounded-xl bg-cream-soft p-2.5 text-center">
                    <p className="inline-flex items-center gap-1 font-display text-base font-bold text-navy">
                      <UtensilsCrossed className="h-3.5 w-3.5 text-teal" />
                      {m.sessionsDone}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-ink-soft">
                      sessions
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {m.badges.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1 rounded-full bg-terra/10 px-2 py-0.5 text-[10px] font-medium text-terra-deep"
                  >
                    <Award className="h-2.5 w-2.5" />
                    {b}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-[rgba(0,35,75,0.06)] pt-3 text-[11px] text-ink-soft">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {m.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {m.phone}
                </span>
                <span>Depuis le {formatDate(m.joinedAt)}</span>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Zones de service */}
      <section>
        <div className="mb-4">
          <p className="eyebrow">Couverture</p>
          <h2 className="mt-1 font-display text-lg font-bold text-navy">
            Zones de service
          </h2>
        </div>
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[1.4fr_1fr_1.6fr_0.7fr_0.7fr] gap-4 border-b border-[rgba(0,35,75,0.07)] bg-cream-soft px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft lg:grid">
            <span>Zone</span>
            <span>Département</span>
            <span>Codes postaux</span>
            <span>Chefs</span>
            <span>Statut</span>
          </div>
          <ul className="divide-y divide-[rgba(0,35,75,0.06)]">
            {SERVICE_ZONES.map((z) => (
              <li
                key={z.id}
                className="grid grid-cols-1 gap-2 px-5 py-3.5 lg:grid-cols-[1.4fr_1fr_1.6fr_0.7fr_0.7fr] lg:items-center lg:gap-4"
              >
                <p className="flex items-center gap-1.5 text-sm font-semibold text-navy">
                  <MapPin className="h-3.5 w-3.5 text-terra" />
                  {z.name}
                </p>
                <p className="text-xs text-ink-mid">{z.region}</p>
                <div className="flex flex-wrap gap-1">
                  {z.postalCodes.map((pc) => (
                    <span
                      key={pc}
                      className="rounded bg-cream-deep px-1.5 py-0.5 font-mono text-[10px] text-ink-mid"
                    >
                      {pc}
                    </span>
                  ))}
                </div>
                <p className="flex items-center gap-1 text-xs text-ink-mid">
                  <ChefHat className="h-3.5 w-3.5 text-ink-soft" />
                  {z.chefsCount} · {z.clientsCount} clients
                </p>
                <Badge tone={z.active ? "success" : "neutral"}>
                  {z.active ? "Active" : "Bientôt"}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
