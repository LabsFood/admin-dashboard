"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  Calculator,
  CalendarDays,
  Check,
  ChefHat,
  Info,
  Loader2,
  MapPin,
  Percent,
  RotateCw,
  Send,
  Sparkles,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import QuoteChefAssignment from "@/components/admin/QuoteChefAssignment";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FilterTabs from "@/components/ui/FilterTabs";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toaster";
import { formatDate } from "@/lib/utils";
import { ApiError } from "@/lib/api/client";
import {
  MAX_COMMISSION_BPS,
  QUOTE_STATUSES,
  centsToEuros,
  dayLabel,
  needsChef,
  offerStatusLabel,
  previewOffer,
  quoteStatusHint,
  quoteStatusLabel,
  quoteStatusTone,
  slotLabel,
  useCommission,
  useCreateQuoteOffer,
  useQuotes,
  useSetCommission,
  useUpdateQuote,
  type Quote,
  type QuoteStatus,
} from "@/lib/api/quotes";
import { adminErrorMessage } from "@/lib/api/errors";

/* ─────────────────────────────────────────────────────────────────────────────
   Les demandes sur-mesure — `GET /admin/quotes`.

   Le client décrit son événement, un batch cooker lui propose son prix, le
   client accepte et la prestation est créée. La console intervient à deux
   endroits : confier la demande à un batch cooker quand elle n'en a pas (le
   client n'en a pas choisi, ou le sien a décliné), et chiffrer au nom du
   batch cooker affecté.

   Chiffrer, c'est envoyer une offre au client : un geste vers l'extérieur, qui
   passe par une confirmation montrant ce qu'il va lire. On saisit le **net**
   du batch cooker ; le prix client vient du taux de commission, réglé ici.
   ───────────────────────────────────────────────────────────────────────────── */

type Filter = "all" | "needs_chef" | QuoteStatus;

/** Les refus de l'API propres aux demandes, dits pour l'admin. */
const MESSAGES: Record<string, string> = {
  QUOTE_CLOSED: "Cette demande est close : elle ne peut plus être modifiée.",
  OFFER_PENDING: "Une offre attend la réponse du client : le statut suivra sa réponse.",
  OFFER_ALREADY_ACTIVE: "Une offre attend déjà la réponse du client.",
  QUOTE_HAS_NO_CHEF: "Affectez d'abord un batch cooker : l'offre part en son nom.",
  CHEF_NOT_ASSIGNABLE: "Ce compte n'est pas un batch cooker vérifié.",
};

const quoteError = (error: unknown) =>
  (error instanceof ApiError &&
    MESSAGES[(error.body as { code?: string } | null)?.code ?? ""]) ||
  adminErrorMessage(error);

export default function DemandesPage() {
  // `useSearchParams` impose une frontière Suspense au rendu statique.
  return (
    <Suspense fallback={null}>
      <Demandes />
    </Suspense>
  );
}

function Demandes() {
  const quotes = useQuotes();
  /** `?d=<id>` : la demande que l'email « un batch cooker est à attribuer » désigne. */
  const pointee = useSearchParams().get("d");
  const [filter, setFilter] = useState<Filter>("all");

  const toutes = quotes.data ?? [];
  const counts = toutes.reduce<Record<string, number>>((acc, q) => {
    acc[q.status] = (acc[q.status] ?? 0) + 1;
    return acc;
  }, {});
  const sansChef = toutes.filter(needsChef);

  const filtrees = toutes
    .filter((q) =>
      filter === "all" ? true : filter === "needs_chef" ? needsChef(q) : q.status === filter,
    )
    .sort((a, b) => {
      // La demande pointée d'abord, puis du plus récent au plus ancien.
      if (a.id === pointee) return -1;
      if (b.id === pointee) return 1;
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });

  if (quotes.isError) {
    return (
      <section className="card p-6">
        <p className="flex items-start gap-2 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {adminErrorMessage(quotes.error)}
        </p>
        <button onClick={() => quotes.refetch()} className="btn btn-outline btn-sm mt-4">
          <RotateCw className="h-3 w-3" aria-hidden /> Réessayer
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <MiniStat label="Demandes" value={quotes.isPending ? "…" : toutes.length} />
        <MiniStat
          label="Sans batch cooker"
          value={quotes.isPending ? "…" : sansChef.length}
          alert={sansChef.length > 0}
        />
        <MiniStat
          label="Offres acceptées"
          value={quotes.isPending ? "…" : (counts.accepted ?? 0)}
        />
      </div>

      <CommissionCard />

      <FilterTabs<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { id: "all", label: "Toutes", count: toutes.length },
          { id: "needs_chef", label: "Sans batch cooker", count: sansChef.length },
          ...QUOTE_STATUSES.map((s) => ({
            id: s,
            label: quoteStatusLabel[s],
            count: counts[s] ?? 0,
          })),
        ]}
      />

      {quotes.isPending ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-48 animate-pulse" />
          ))}
        </div>
      ) : filtrees.length === 0 ? (
        <div className="card">
          <EmptyState
            Icon={Sparkles}
            title={filter === "all" ? "Aucune demande" : "Aucune demande dans cet état"}
            text={
              filter === "all"
                ? "Les demandes sur-mesure envoyées depuis le site apparaîtront ici."
                : "Changez de filtre pour voir les autres."
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {filtrees.map((q, i) => (
            <QuoteCard key={q.id} quote={q} index={i} pointee={q.id === pointee} />
          ))}
        </div>
      )}

      <section className="card p-5">
        <h3 className="flex items-center gap-2 font-display text-base font-bold text-navy">
          <Info className="h-4 w-4 text-ink-soft" aria-hidden />
          Ce que la console ne fait pas
        </h3>
        <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-mid">
          <li>
            <strong>Clore une demande à la place du client</strong> — seul le
            client retire sa demande, et seule son acceptation crée la
            prestation.
          </li>
          <li>
            <strong>Encaisser</strong> — le règlement vient après la prestation ;
            l&apos;acceptation ne prélève rien.
          </li>
        </ul>
      </section>
    </div>
  );
}

/* ── La commission ─────────────────────────────────────────────────────────── */

function CommissionCard() {
  const toast = useToast();
  const commission = useCommission();
  const save = useSetCommission();
  const [editing, setEditing] = useState(false);
  const [percent, setPercent] = useState("");

  const bps = Math.round(Number(percent.replace(",", ".")) * 100);
  const valide =
    percent.trim() !== "" && Number.isFinite(bps) && bps >= 0 && bps <= MAX_COMMISSION_BPS;
  const actuel = commission.data
    ? `${(commission.data.commissionBps / 100).toLocaleString("fr-FR")} %`
    : "…";

  return (
    <section className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-terra/10 text-terra-deep">
          <Percent className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-navy">
            Commission Lab&apos;s Food : {commission.isError ? "indisponible" : actuel}
          </p>
          <p className="text-[12px] leading-relaxed text-ink-soft">
            Prise sur le prix client. Vaut pour les prochaines offres : celles
            déjà envoyées gardent leur taux.
          </p>
        </div>
      </div>

      {editing ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valide) return;
            save.mutate(bps, {
              onSuccess: () => {
                setEditing(false);
                toast.success("Commission mise à jour", "Elle s'applique aux prochaines offres.");
              },
              onError: (error) => toast.error("Commission inchangée", adminErrorMessage(error)),
            });
          }}
        >
          <input
            type="number"
            min={0}
            max={MAX_COMMISSION_BPS / 100}
            step="0.5"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            aria-label="Taux de commission en pourcentage"
            aria-invalid={(percent.trim() !== "" && !valide) || undefined}
            className="input-base w-24"
            autoFocus
          />
          <span className="text-sm text-ink-mid">%</span>
          <button type="submit" disabled={!valide || save.isPending} className="btn btn-primary btn-sm">
            {save.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <Check className="h-3 w-3" aria-hidden />
            )}
            Enregistrer
          </button>
          <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost btn-sm">
            <X className="h-3 w-3" aria-hidden />
            <span className="sr-only">Annuler</span>
          </button>
        </form>
      ) : (
        <button
          onClick={() => {
            setPercent(commission.data ? String(commission.data.commissionBps / 100) : "");
            setEditing(true);
          }}
          disabled={!commission.data}
          className="btn btn-outline btn-sm"
        >
          Modifier le taux
        </button>
      )}
    </section>
  );
}

/* ── Une demande ───────────────────────────────────────────────────────────── */

function QuoteCard({
  quote: q,
  index,
  pointee,
}: {
  quote: Quote;
  index: number;
  pointee: boolean;
}) {
  const toast = useToast();
  const update = useUpdateQuote();
  const createOffer = useCreateQuoteOffer();
  const commission = useCommission();

  const [editing, setEditing] = useState(false);
  /** Saisi en euros, envoyé en centimes. */
  const [net, setNet] = useState("");
  const [conditions, setConditions] = useState("");
  const [aConfirmer, setAConfirmer] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const client = q.client?.name || q.client?.email || "Client inconnu";
  const chef = q.assignedChef ?? null;
  const ouverte = q.status !== "accepted" && q.status !== "cancelled";
  const offre = q.activeOffer;
  const acceptee = q.offers.find((o) => o.status === "accepted") ?? null;
  const passees = q.offers.filter((o) => o.id !== offre?.id && o.id !== acceptee?.id);

  const netCents = Math.round(Number(net.replace(",", ".")) * 100);
  // Les bornes de l'API (10 € à 20 000 €), répétées pour le message : elle revérifie.
  const netValide =
    net.trim() !== "" &&
    Number.isFinite(netCents) &&
    netCents >= 1000 &&
    netCents <= 2_000_000;
  const apercu =
    netValide && commission.data ? previewOffer(netCents, commission.data.commissionBps) : null;

  function ouvrir() {
    setErreur(null);
    setNet("");
    setConditions("");
    setEditing(true);
  }

  function envoyer() {
    setErreur(null);
    createOffer.mutate(
      {
        id: q.id,
        offer: {
          netCents,
          ...(conditions.trim() ? { conditions: conditions.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          setAConfirmer(false);
          setEditing(false);
          toast.success(
            `Offre envoyée à ${client}`,
            `Au nom de ${chef?.displayName ?? "son batch cooker"}. Il la voit dans son espace.`,
          );
        },
        onError: (e) => setErreur(quoteError(e)),
      },
    );
  }

  function prendreEnCharge() {
    update.mutate(
      { id: q.id, patch: { status: "in_review" } },
      {
        onSuccess: () => toast.success("Demande prise en charge"),
        onError: (e) => toast.error("Le statut n'a pas changé", quoteError(e)),
      },
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
      className={`card p-5 lg:p-6 ${pointee ? "ring-2 ring-terra/50" : ""}`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[11px] text-ink-soft">{q.reference}</p>
            <Badge tone={quoteStatusTone[q.status]} dot>
              {quoteStatusLabel[q.status]}
            </Badge>
            {needsChef(q) && q.status !== "chef_declined" && (
              <Badge tone="danger">Sans batch cooker</Badge>
            )}
            {q.createdAt && (
              <span className="text-[11px] text-ink-soft">{formatDate(q.createdAt)}</span>
            )}
          </div>

          <h3 className="mt-1.5 font-display text-lg font-bold leading-snug text-navy">
            {q.title}
          </h3>
          <p className="text-xs text-ink-soft">
            Demandé par <span className="font-semibold">{client}</span>
            {q.client?.email && q.client?.name && (
              <span className="ml-1.5 font-mono">{q.client.email}</span>
            )}
            {q.client?.phone && <span className="ml-1.5 font-mono">{q.client.phone}</span>}
          </p>

          {q.brief && (
            <p className="mt-2.5 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-ink-mid">
              {q.brief}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Meta Icon={Users} label={`${q.persons} pers.`} />
            <Meta Icon={UtensilsCrossed} label={`${q.mealsCount} plats`} />
            {q.cuisine && <Meta Icon={ChefHat} label={q.cuisine} />}
            {q.desiredDate && (
              <Meta
                Icon={CalendarDays}
                label={`${dayLabel(q.desiredDate)}${q.timeSlot ? `, ${slotLabel[q.timeSlot]}` : ""}`}
              />
            )}
            {(q.address?.line || q.address?.city) && (
              <Meta
                Icon={MapPin}
                label={[q.address.line, q.address.postalCode, q.address.city]
                  .filter(Boolean)
                  .join(", ")}
              />
            )}
            {q.budgetCents != null && (
              <Meta Icon={Sparkles} label={`Budget ${centsToEuros(q.budgetCents)}`} />
            )}
            {(q.diet ?? []).map((d) => (
              <span
                key={d}
                className="rounded-full bg-terra/10 px-2.5 py-1 text-[11px] font-medium text-terra-deep"
              >
                {d}
              </span>
            ))}
            {(q.allergies ?? []).map((a) => (
              <span
                key={a}
                className="rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-medium text-danger"
              >
                ⚠ {a}
              </span>
            ))}
          </div>

          <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">
            {quoteStatusHint[q.status]}
          </p>

          {q.status === "chef_declined" && (
            <p className="mt-2 rounded-xl bg-danger/8 px-3 py-2 text-[12px] leading-relaxed text-ink-mid">
              <strong className="text-danger">À réattribuer.</strong>{" "}
              {q.chefDeclineReason
                ? `Le batch cooker a écrit : « ${q.chefDeclineReason} »`
                : "Le batch cooker n'a pas donné de raison."}
            </p>
          )}

          {ouverte ? (
            <QuoteChefAssignment quote={q} />
          ) : (
            chef && (
              <Link
                href={`/batchcookers/${chef.chefProfileId}`}
                className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-terra hover:underline"
              >
                <ChefHat className="h-3.5 w-3.5" aria-hidden /> {chef.displayName}
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              </Link>
            )
          )}
        </div>

        {/* ── L'offre ───────────────────────────────────────────────────── */}
        <div className="w-full shrink-0 lg:w-80">
          {editing ? (
            <div className="rounded-2xl border border-[rgba(0,35,75,0.1)] bg-cream-soft p-4">
              <p className="mb-3 text-[13px] font-semibold text-navy">
                Chiffrer au nom de {chef?.displayName}
              </p>

              <label className="block">
                <span className="field-label">Net du batch cooker (€)</span>
                <input
                  type="number"
                  min={10}
                  max={20000}
                  step="0.01"
                  value={net}
                  onChange={(e) => setNet(e.target.value)}
                  placeholder="170"
                  className="input-base"
                />
                <span className="mt-1 block text-[11px] leading-relaxed text-ink-soft">
                  Ce qu&apos;il touche. Le prix client est calculé avec la
                  commission.
                </span>
              </label>

              {apercu && (
                <dl className="mt-3 space-y-1 rounded-xl bg-paper px-3 py-2.5 text-[12px] text-ink-mid">
                  <Ligne label="Commission" value={centsToEuros(apercu.commissionCents)} />
                  <Ligne label="Prix client" value={centsToEuros(apercu.clientPriceCents)} fort />
                  <Ligne
                    label="Après crédit d'impôt"
                    value={centsToEuros(apercu.afterTaxCreditCents)}
                  />
                </dl>
              )}

              <label className="mt-3 block">
                <span className="field-label">Conditions, pour le client</span>
                <textarea
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="Courses et rangement compris."
                  className="input-base resize-y"
                />
              </label>

              {net.trim() !== "" && !netValide && (
                <p className="mt-2 text-[12px] leading-relaxed text-danger">
                  Le net est compris entre 10 € et 20 000 €.
                </p>
              )}
              {erreur && !aConfirmer && (
                <p role="alert" className="mt-2 text-[12px] leading-relaxed text-danger">
                  {erreur}
                </p>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setAConfirmer(true)}
                  disabled={!apercu || createOffer.isPending}
                  className="btn btn-primary flex-1"
                >
                  <Send className="h-4 w-4" aria-hidden /> Envoyer au client
                </button>
                <button onClick={() => setEditing(false)} className="btn btn-ghost">
                  <X className="h-4 w-4" aria-hidden />
                  <span className="sr-only">Annuler</span>
                </button>
              </div>
            </div>
          ) : offre || acceptee ? (
            <div className="rounded-2xl border border-terra/25 bg-terra/8 p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-terra-deep">
                {acceptee ? "Offre acceptée" : `Offre · ${offerStatusLabel[offre!.status]}`}
              </p>
              <OfferAmounts offer={(acceptee ?? offre)!} />
              {!acceptee && offre && (
                <p className="mt-1.5 text-[11px] text-ink-soft">
                  Valable jusqu&apos;au {dayLabel(offre.validUntil)}
                </p>
              )}
              {acceptee && q.booking && (
                <p className="mt-2 text-[12px] font-semibold text-navy">
                  Prestation {q.booking.reference ?? ""} ·{" "}
                  {new Date(q.booking.startsAt).toLocaleString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Europe/Paris",
                  })}
                </p>
              )}
            </div>
          ) : ouverte ? (
            <div className="space-y-2">
              <button
                onClick={ouvrir}
                disabled={!chef}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-terra/40 bg-terra/5 px-4 py-6 text-sm font-semibold text-terra-deep transition-colors hover:bg-terra/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Calculator className="h-4 w-4" aria-hidden />
                Chiffrer à la place du batch cooker
              </button>
              {!chef && (
                <p className="text-center text-[11px] text-ink-soft">
                  Affectez d&apos;abord un batch cooker : l&apos;offre part en son nom.
                </p>
              )}
              {q.status === "submitted" && (
                <button
                  onClick={prendreEnCharge}
                  disabled={update.isPending}
                  className="btn btn-outline btn-sm w-full"
                >
                  {update.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  ) : (
                    <Check className="h-3 w-3" aria-hidden />
                  )}
                  Je m&apos;en occupe
                </button>
              )}
            </div>
          ) : null}

          {passees.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {passees.map((o) => (
                <li
                  key={o.id}
                  className="rounded-xl bg-cream-soft px-3 py-2 text-[11px] leading-relaxed text-ink-mid"
                >
                  <span className="font-semibold text-navy">
                    {centsToEuros(o.clientPriceCents)}
                  </span>{" "}
                  · {offerStatusLabel[o.status]} · {formatDate(o.createdAt)}
                  {o.declineReason && <span className="block italic">« {o.declineReason} »</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* L'offre part chez le client : on montre d'abord ce qu'il lira. */}
      <ConfirmDialog
        open={aConfirmer}
        onClose={() => setAConfirmer(false)}
        onConfirm={envoyer}
        pending={createOffer.isPending}
        error={erreur}
        title={`Envoyer cette offre à ${client} ?`}
        lead={
          apercu
            ? `Il verra ${centsToEuros(apercu.clientPriceCents)}, soit ${centsToEuros(
                apercu.afterTaxCreditCents,
              )} à sa charge après le crédit d'impôt, au nom de ${
                chef?.displayName ?? "son batch cooker"
              }. S'il accepte, la prestation est créée.`
            : ""
        }
        detail={
          conditions.trim()
            ? `Vos conditions partiront telles quelles : « ${conditions.trim()} »`
            : "Aucune condition : le client ne verra que les montants. Une phrase sur ce qui est compris évite un aller-retour."
        }
        confirmLabel="Envoyer l'offre"
      />
    </motion.article>
  );
}

function OfferAmounts({ offer }: { offer: Quote["offers"][number] }) {
  return (
    <>
      <p className="mt-1 font-display text-2xl font-bold text-navy">
        {centsToEuros(offer.clientPriceCents)}
      </p>
      <p className="text-[11px] text-ink-mid">
        soit {centsToEuros(offer.afterTaxCreditCents)} après crédit d&apos;impôt
      </p>
      <p className="mt-1 text-[11px] text-ink-mid">
        Net batch cooker {centsToEuros(offer.netCents)} · commission{" "}
        {(offer.commissionBps / 100).toLocaleString("fr-FR")} %
      </p>
      {offer.proposedDate && (
        <p className="mt-1 text-[11px] text-ink-mid">
          Date proposée : {dayLabel(offer.proposedDate)}
          {offer.proposedTimeSlot ? `, ${slotLabel[offer.proposedTimeSlot]}` : ""}
        </p>
      )}
      {offer.conditions && (
        <p className="mt-1.5 whitespace-pre-line text-[11px] italic leading-relaxed text-ink-mid">
          {offer.conditions}
        </p>
      )}
    </>
  );
}

function Ligne({ label, value, fort }: { label: string; value: string; fort?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt>{label}</dt>
      <dd className={fort ? "font-display text-base font-bold text-navy" : "font-semibold text-navy"}>
        {value}
      </dd>
    </div>
  );
}

function Meta({ Icon, label }: { Icon: typeof Users; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-2.5 py-1 text-[11px] font-medium text-ink-mid">
      <Icon className="h-3 w-3 text-ink-soft" aria-hidden />
      {label}
    </span>
  );
}

function MiniStat({
  label,
  value,
  alert,
}: {
  label: string;
  value: string | number;
  alert?: boolean;
}) {
  return (
    <div className="card p-4">
      <p className={`font-display text-2xl font-bold ${alert ? "text-danger" : "text-navy"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
        {label}
      </p>
    </div>
  );
}
