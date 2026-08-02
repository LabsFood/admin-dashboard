"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Ban,
  CheckCircle2,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Star,
  UtensilsCrossed,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { cn, euros, formatDate, initials } from "@/lib/utils";
import { reservationTone } from "@/lib/status";
import { teamMemberById } from "@/lib/mock/team";
import { RESERVATIONS, RESERVATION_STATUS_LABEL } from "@/lib/mock/reservations";
import type { TeamRole, TeamStatus } from "@/lib/mock/types";

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

export default function TeamMemberDetailPage() {
  const params = useParams<{ id: string }>();
  const member = teamMemberById(params.id);
  const [status, setStatus] = useState<TeamStatus>(member?.status ?? "active");

  if (!member) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="mb-3 text-5xl">👨‍🍳</p>
        <h2 className="font-display text-2xl font-bold text-navy">
          Membre introuvable
        </h2>
        <Link href="/equipe" className="btn btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" /> Retour à l&apos;équipe
        </Link>
      </div>
    );
  }

  const sessions = RESERVATIONS.filter((r) => r.chefId === member.id).sort(
    (a, b) => b.date.localeCompare(a.date),
  );

  return (
    <div className="space-y-6">
      <Link
        href="/equipe"
        className="inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Toute l&apos;équipe
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Identité */}
        <aside className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-terra/25 blur-3xl" />
            <div className="relative flex flex-col items-center text-center">
              <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-terra font-display text-2xl font-bold text-white">
                {member.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials(member.name)
                )}
              </span>
              <p className="mt-3 font-display text-xl font-bold">
                {member.name}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <Badge tone={ROLE_TONE[member.role]}>
                  {ROLE_LABEL[member.role]}
                </Badge>
                <Badge tone={status === "active" ? "success" : "neutral"}>
                  {status === "active" ? "Actif" : "Inactif"}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-white/70">{member.specialty}</p>
              <div className="mt-4 w-full space-y-2 text-left text-xs text-white/70">
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-terra-soft" />
                  {member.email}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-terra-soft" />
                  {member.phone}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-terra-soft" />
                  {member.city}
                </p>
              </div>
            </div>
          </motion.div>

          {member.role !== "staff" && (
            <div className="grid grid-cols-3 gap-3">
              <KpiBox
                Icon={Star}
                label="Note"
                value={member.rating || "—"}
              />
              <KpiBox
                Icon={Award}
                label="Avis"
                value={member.reviewCount}
              />
              <KpiBox
                Icon={UtensilsCrossed}
                label="Sessions"
                value={member.sessionsDone}
              />
            </div>
          )}

          {member.badges.length > 0 && (
            <section className="card p-5">
              <h4 className="mb-3 font-display text-base font-bold text-navy">
                Badges & certifications
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {member.badges.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1 rounded-full bg-terra/10 px-2.5 py-1 text-[11px] font-medium text-terra-deep"
                  >
                    <Award className="h-3 w-3" />
                    {b}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Actions */}
          <section className="card p-5">
            <h4 className="mb-3 font-display text-base font-bold text-navy">
              Actions
            </h4>
            <div className="space-y-2">
              {status === "active" ? (
                <ActionButton
                  Icon={Ban}
                  label="Suspendre le membre"
                  tone="danger"
                  onClick={() => setStatus("inactive")}
                />
              ) : (
                <ActionButton
                  Icon={CheckCircle2}
                  label="Réactiver le membre"
                  tone="success"
                  onClick={() => setStatus("active")}
                />
              )}
              <ActionButton
                Icon={Pencil}
                label="Modifier la fiche"
                tone="neutral"
                onClick={() => {}}
              />
            </div>
          </section>

          <Link
            href="/messagerie"
            className="flex items-center gap-3 rounded-3xl bg-teal p-4 text-white transition-transform hover:-translate-y-0.5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <MessageCircle className="h-4 w-4" />
            </span>
            <div className="text-sm">
              <p className="font-semibold">Contacter</p>
              <p className="text-xs text-white/60">Ouvrir la messagerie</p>
            </div>
          </Link>
        </aside>

        {/* Activité */}
        <div className="space-y-6">
          {/* Bio */}
          <section className="rounded-3xl border border-terra/30 bg-terra-pale/30 p-5">
            <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-terra-deep">
              <Star className="h-3.5 w-3.5" /> Biographie
            </p>
            <p className="text-sm text-navy">{member.bio}</p>
            <p className="mt-3 text-xs text-ink-soft">
              Dans l&apos;équipe depuis le {formatDate(member.joinedAt)}
            </p>
          </section>

          {/* Sessions assurées */}
          <section className="card p-6">
            <h3 className="mb-4 font-display text-lg font-bold text-navy">
              Sessions assurées ({sessions.length})
            </h3>
            {sessions.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-soft">
                Aucune session assurée par ce membre pour le moment.
              </p>
            ) : (
              <ul className="divide-y divide-[rgba(0,35,75,0.06)]">
                {sessions.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/reservations/${o.id}`}
                      className="flex items-center gap-4 py-3 transition-colors hover:bg-cream-soft"
                    >
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-cream-deep">
                        <span className="font-display text-sm font-bold text-navy">
                          {new Date(o.date).getDate()}
                        </span>
                        <span className="font-mono text-[8px] uppercase text-ink-soft">
                          {new Date(o.date).toLocaleDateString("fr-FR", {
                            month: "short",
                          })}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-navy">
                          Formule {o.formula} · {o.meals.length} plats
                        </p>
                        <p className="font-mono text-[11px] text-ink-soft">
                          {o.reference} · {o.clientName}
                        </p>
                      </div>
                      <Badge tone={reservationTone[o.status]} dot>
                        {RESERVATION_STATUS_LABEL[o.status]}
                      </Badge>
                      <span className="hidden font-display text-sm font-bold text-navy sm:block">
                        {euros(o.amountTTC)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-ink-soft" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function KpiBox({
  Icon,
  label,
  value,
}: {
  Icon: typeof Star;
  label: string;
  value: string | number;
}) {
  return (
    <div className="card p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-terra" />
      <p className="mt-1.5 font-display text-base font-bold text-navy">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-ink-soft">
        {label}
      </p>
    </div>
  );
}

function ActionButton({
  Icon,
  label,
  tone,
  onClick,
}: {
  Icon: typeof Star;
  label: string;
  tone: "success" | "danger" | "neutral";
  onClick: () => void;
}) {
  const tones: Record<typeof tone, string> = {
    success: "text-success hover:border-success/40 hover:bg-success-soft/50",
    danger: "text-danger hover:border-danger/40 hover:bg-danger-soft/50",
    neutral: "text-ink-mid hover:border-navy/30 hover:bg-cream-soft",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl border border-[rgba(0,35,75,0.1)] px-3.5 py-2.5 text-sm font-semibold transition-colors",
        tones[tone],
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
