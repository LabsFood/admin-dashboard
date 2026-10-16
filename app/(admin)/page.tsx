"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  ChefHat,
  Info,
  RotateCw,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth";
import { cn, euros, formatDate, formatDateLong } from "@/lib/utils";
import {
  BOOKING_ACTIVE,
  bookingStatusText,
  useAdminDashboard,
} from "@/lib/api/dashboard";
import { bookingPortions, useBookings } from "@/lib/api/bookings";
import { useFormules, formuleName } from "@/lib/api/formules";
import {
  needsChef,
  quoteStatusLabel,
  quoteStatusTone,
  useQuotes,
} from "@/lib/api/quotes";
import { useMeals } from "@/lib/api/catalog";
import { useChefApplications } from "@/lib/api/admin";
import { useReviewQueue } from "@/lib/api/moderation";
import { adminErrorMessage } from "@/lib/api/errors";

/* ─────────────────────────────────────────────────────────────────────────────
   La vue d'ensemble.

   Elle montrait un chiffre d'affaires du mois, une variation en pourcentage et
   une courbe sur sept mois. Rien de tout cela n'existe : `GET /admin/dashboard`
   ne prend aucune période et compte depuis le premier jour. Un cumul présenté
   comme un mois, c'est une décision prise sur un chiffre faux.

   L'écran dit donc ce que l'API sait dire — des totaux, une répartition par
   statut et par formule, les plats les plus commandés — et nomme en bas ce
   qu'elle ne sait pas encore dire, pour que personne ne le cherche.

   Ce qui mérite une décision aujourd'hui passe devant les totaux : un devis à
   chiffrer, une candidature qui attend, un plat à relire. Un tableau de bord
   qu'on regarde sans rien en faire n'a pas gagné sa place en haut du menu.
   ───────────────────────────────────────────────────────────────────────────── */

export default function OverviewPage() {
  const { user } = useAuth();

  const figures = useAdminDashboard();
  const bookings = useBookings();
  const quotes = useQuotes();
  const formules = useFormules();
  const meals = useMeals();
  const candidatures = useChefApplications({ status: "submitted", limit: 1 });
  const relecture = useReviewQueue({ review: "pending", limit: 1 });

  const f = figures.data;

  // Les prestations à venir : `GET /bookings` rend tout, sans tri utile.
  const aVenir = (bookings.data ?? [])
    .filter((b) => !b.status || BOOKING_ACTIVE.includes(b.status))
    .sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
  const prochaine = aVenir.find((b) => b.startsAt);

  // Ce que l'équipe doit faire : confier la demande à un batch cooker.
  const aAttribuer = (quotes.data ?? []).filter(needsChef);
  const recentes = (quotes.data ?? []).slice(0, 3);
  const enAttente = candidatures.data?.meta?.total ?? 0;
  // La file est paginée : son total vient de `meta`, pas de la page lue.
  const aRelire = relecture.data?.meta?.total ?? relecture.data?.items.length ?? 0;

  /** Ce qui attend une décision. L'ordre est celui de l'urgence réelle. */
  const decisions = [
    aAttribuer.length > 0 && {
      href: "/demandes",
      Icon: Sparkles,
      label: `${aAttribuer.length} demande${aAttribuer.length > 1 ? "s" : ""} sans batch cooker`,
      hint: "Un client attend un prix.",
    },
    enAttente > 0 && {
      href: "/batchcookers?vue=candidatures",
      Icon: ChefHat,
      label: `${enAttente} candidature${enAttente > 1 ? "s" : ""} à instruire`,
      hint: "La promesse est de 48 h ouvrées.",
    },
    aRelire > 0 && {
      href: "/moderation",
      Icon: ShieldCheck,
      label: `${aRelire} publication${aRelire > 1 ? "s" : ""} à relire`,
      hint: "En ligne sans avoir été vérifiée.",
    },
  ].filter(Boolean) as { href: string; Icon: typeof Sparkles; label: string; hint: string }[];

  return (
    <div className="space-y-6">
      {/* ── Ce qui attend une décision ──────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white lg:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-terra/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-teal-soft/25 blur-3xl"
        />

        <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <div>
            <h2 className="font-display text-3xl font-bold leading-tight lg:text-4xl">
              Bonjour {user?.name?.split(" ")[0] ?? "vous"}
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/65">
              {decisions.length === 0
                ? "Rien n'attend de décision ce matin. Les chiffres plus bas sont des cumuls depuis l'ouverture."
                : "Ce qui attend une décision, avant les chiffres."}
            </p>

            {decisions.length > 0 && (
              <ul className="mt-5 space-y-2">
                {decisions.map(({ href, Icon, label, hint }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 transition-colors hover:border-terra/50 hover:bg-white/10"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-terra/20 text-terra-soft">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{label}</span>
                        <span className="block text-xs text-white/55">{hint}</span>
                      </span>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:text-terra-soft"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-white/50">
              Prochaine prestation
            </p>
            {bookings.isPending ? (
              <div className="mt-3 h-10 animate-pulse rounded-lg bg-white/10" />
            ) : prochaine ? (
              <>
                <p className="mt-2 font-display text-lg font-bold leading-snug">
                  {formatDateLong(prochaine.startsAt!)}
                </p>
                <p className="mt-1 text-xs text-white/60">
                  {[
                    prochaine.client?.fullName,
                    bookingPortions(prochaine) > 0
                      ? `${bookingPortions(prochaine)} portions`
                      : null,
                    prochaine.status ? bookingStatusText(prochaine.status) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || prochaine.reference || "Détails non renvoyés"}
                </p>
                <Link
                  href="/reservations"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-terra px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-terra-deep"
                >
                  Les réservations <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                {aVenir.length > 0
                  ? "Des prestations sont en cours, mais aucune ne porte de date dans la réponse de l'API."
                  : "Aucune prestation à venir dans la base."}
              </p>
            )}
          </div>
        </div>
      </motion.section>

      {/* ── Les totaux ──────────────────────────────────────────────────── */}
      {figures.isError ? (
        <section className="card p-6">
          <p className="flex items-start gap-2 text-sm text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {adminErrorMessage(figures.error)}
          </p>
          <button
            onClick={() => figures.refetch()}
            className="btn btn-outline btn-sm mt-4"
          >
            <RotateCw className="h-3 w-3" aria-hidden /> Réessayer
          </button>
        </section>
      ) : (
        <>
          <p className="text-[12px] leading-relaxed text-ink-soft">
            Cumuls depuis l&apos;ouverture, toutes réservations confondues :
            l&apos;API ne découpe pas par période.
          </p>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <StatCard
              Icon={Wallet}
              label="Chiffre d'affaires"
              value={
                figures.isPending
                  ? "…"
                  : f?.revenueTtcCents != null
                    ? euros(Math.round(f.revenueTtcCents / 100))
                    : "—"
              }
              sub={
                f?.revenueAfterTaxCents != null
                  ? `${euros(Math.round(f.revenueAfterTaxCents / 100))} après crédit d'impôt`
                  : undefined
              }
              tone="terra"
              delay={0}
            />
            <StatCard
              Icon={CalendarRange}
              label="Réservations"
              value={figures.isPending ? "…" : (f?.sessionsTotal ?? 0)}
              sub={`${aVenir.length} encore en cours`}
              tone="navy"
              delay={0.05}
            />
            <StatCard
              Icon={Sparkles}
              label="Demandes sur-mesure"
              value={quotes.isPending ? "…" : (quotes.data?.length ?? 0)}
              sub={`${aAttribuer.length} sans batch cooker`}
              tone="teal"
              delay={0.1}
            />
            <StatCard
              Icon={ChefHat}
              label="Candidatures en attente"
              value={candidatures.isPending ? "…" : enAttente}
              sub="réponse sous 48 h ouvrées"
              tone="success"
              delay={0.15}
            />
          </section>

          {/* ── Répartitions ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Repartition
              titre="Réservations par statut"
              note="Où en sont les sessions, de la commande à la cuisine."
              pending={figures.isPending}
              lignes={(f?.sessionsByStatus ?? []).map((s) => ({
                cle: s.key,
                nom: bookingStatusText(s.key),
                valeur: s.count,
              }))}
              vide="Aucune réservation dans la base."
              teinte="terra"
            />

            <Repartition
              titre="Réservations par formule"
              note="Ce que les clients choisissent le plus."
              pending={figures.isPending || formules.isPending}
              lignes={(f?.formuleSplit ?? []).map((s) => ({
                cle: s.key,
                nom: formuleName(formules.data ?? [], s.key),
                valeur: s.count,
              }))}
              vide="Aucune formule commandée pour l'instant."
              teinte="teal"
              lien={{ href: "/formules", label: "Les formules" }}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* ── Plats les plus commandés ───────────────────────────────── */}
            <section className="card p-6 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 font-display text-lg font-bold text-navy">
                    <UtensilsCrossed className="h-4 w-4 text-terra" aria-hidden />
                    Plats les plus commandés
                  </h3>
                  <p className="mt-0.5 text-[12px] text-ink-soft">
                    En portions réservées, les cinq premiers.
                  </p>
                </div>
                <Link
                  href="/menus"
                  className="shrink-0 text-xs font-semibold text-terra hover:underline"
                >
                  Le catalogue
                </Link>
              </div>

              {figures.isPending || meals.isPending ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-9 animate-pulse rounded-lg bg-cream-soft" />
                  ))}
                </div>
              ) : (f?.topMeals.length ?? 0) === 0 ? (
                <p className="text-sm text-ink-soft">
                  Aucun plat n&apos;a encore été commandé.
                </p>
              ) : (
                <ul className="space-y-3">
                  {f!.topMeals.map((m) => {
                    const plat = (meals.data ?? []).find((x) => x.id === m.key);
                    const max = f!.topMeals[0].count || 1;
                    return (
                      <li key={m.key} className="flex items-center gap-3">
                        {plat?.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={plat.imageUrl}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <span
                            aria-hidden
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream-deep text-ink-soft"
                          >
                            <UtensilsCrossed className="h-4 w-4" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="truncate text-sm font-semibold text-navy">
                              {plat?.name ?? "Plat retiré du catalogue"}
                            </span>
                            <span className="shrink-0 font-mono text-[11px] text-ink-soft">
                              {m.count} portions
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream-deep">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(m.count / max) * 100}%` }}
                              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                              className="h-full rounded-full bg-teal"
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* ── Demandes récentes ──────────────────────────────────────── */}
            <section className="card p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-navy">
                  Demandes récentes
                </h3>
                <Link
                  href="/demandes"
                  className="text-xs font-semibold text-terra hover:underline"
                >
                  Voir
                </Link>
              </div>

              {quotes.isPending ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-cream-soft" />
                  ))}
                </div>
              ) : recentes.length === 0 ? (
                <p className="text-sm text-ink-soft">
                  Aucune demande sur-mesure pour l&apos;instant.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {recentes.map((d) => (
                    <li key={d.id}>
                      <Link
                        href="/demandes"
                        className="block rounded-xl border border-[rgba(0,35,75,0.06)] p-3 transition-colors hover:border-terra/40"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-navy">{d.title}</p>
                          <Badge tone={quoteStatusTone[d.status]} dot>
                            {quoteStatusLabel[d.status]}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[11px] text-ink-soft">
                          {[
                            d.client?.name ?? d.client?.email,
                            `${d.persons} pers.`,
                            `${d.mealsCount} plats`,
                            d.createdAt ? formatDate(d.createdAt) : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      {/* ── Ce que l'API ne sait pas encore dire ────────────────────────── */}
      <section className="card p-5">
        <h3 className="flex items-center gap-2 font-display text-base font-bold text-navy">
          <Info className="h-4 w-4 text-ink-soft" aria-hidden />
          Ce qui manque sur cet écran
        </h3>
        <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-mid">
          <li>
            <strong>Le mois en cours et sa tendance</strong> —{" "}
            <code>GET /admin/dashboard</code> ne prend aucune période : tout ce
            qu&apos;il rend est cumulé depuis l&apos;ouverture. Un «&nbsp;+12 %
            ce mois&nbsp;» serait inventé.
          </li>
          <li>
            <strong>Les nouveaux clients du mois</strong> — la liste des clients
            se pagine mais ne se filtre pas par date d&apos;inscription.
          </li>
          <li>
            <strong>Kossam</strong> — aucun module, donc aucun chiffre.
          </li>
          <li>
            <strong>La liste des prestations</strong> —{" "}
            <code>GET /bookings</code> rend toute la base d&apos;un bloc, sans
            pagination ni filtre : ce qui est montré ici est trié côté console.
          </li>
        </ul>
      </section>
    </div>
  );
}

/* ── Une répartition ───────────────────────────────────────────────────────── */

function Repartition({
  titre,
  note,
  lignes,
  vide,
  pending,
  teinte,
  lien,
}: {
  titre: string;
  note: string;
  lignes: { cle: string; nom: string; valeur: number }[];
  vide: string;
  pending: boolean;
  teinte: "terra" | "teal";
  lien?: { href: string; label: string };
}) {
  const total = lignes.reduce((n, l) => n + l.valeur, 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card p-6"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-navy">{titre}</h3>
          <p className="mt-0.5 text-[12px] text-ink-soft">{note}</p>
        </div>
        {lien && (
          <Link
            href={lien.href}
            className="shrink-0 text-xs font-semibold text-terra hover:underline"
          >
            {lien.label}
          </Link>
        )}
      </div>

      {pending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-7 animate-pulse rounded-lg bg-cream-soft" />
          ))}
        </div>
      ) : lignes.length === 0 ? (
        <p className="text-sm text-ink-soft">{vide}</p>
      ) : (
        <ul className="space-y-3">
          {lignes.map((l) => {
            const pct = total > 0 ? Math.round((l.valeur / total) * 100) : 0;
            return (
              <li key={l.cle}>
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="font-semibold text-navy">{l.nom}</span>
                  <span className="font-mono text-ink-soft">
                    {l.valeur} · {pct} %
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-cream-deep">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className={cn(
                      "h-full rounded-full",
                      teinte === "terra" ? "bg-terra" : "bg-teal",
                    )}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </motion.section>
  );
}
