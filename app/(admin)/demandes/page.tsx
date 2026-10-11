"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Calculator,
  Check,
  ChefHat,
  Info,
  Loader2,
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
import { euros, formatDate } from "@/lib/utils";
import {
  QUOTE_STATUSES,
  afterTaxDefault,
  quoteStatusHint,
  quoteStatusLabel,
  quoteStatusTone,
  useQuotes,
  useUpdateQuote,
  type Quote,
  type QuoteStatus,
} from "@/lib/api/quotes";
import { adminErrorMessage } from "@/lib/api/errors";

/* ─────────────────────────────────────────────────────────────────────────────
   Les demandes sur-mesure — `GET /admin/quotes`.

   Un client décrit son événement, la console répond un prix. Le prix part chez
   lui : il le voit dans son espace et peut l'accepter. C'est donc un geste
   vers l'extérieur, et il passe par une confirmation qui montre exactement ce
   que le client va lire.

   Deux montants partent ensemble, en centimes : le TTC et ce qui reste à
   charge après le crédit d'impôt de 50 %. L'API ne calcule pas le second — la
   console le propose, et laisse le corriger.

   Ce qu'elle ne sait pas faire : affecter un batch cooker. Le champ existe en
   lecture, aucun champ du DTO ne l'écrit.
   ───────────────────────────────────────────────────────────────────────────── */

type Filter = "all" | QuoteStatus;

export default function DemandesPage() {
  const quotes = useQuotes();
  const [filter, setFilter] = useState<Filter>("all");

  const toutes = quotes.data ?? [];
  const counts = toutes.reduce<Record<string, number>>((acc, q) => {
    acc[q.status] = (acc[q.status] ?? 0) + 1;
    return acc;
  }, {});

  const filtrees = toutes
    .filter((q) => filter === "all" || q.status === filter)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

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

  const aChiffrer = (counts.submitted ?? 0) + (counts.in_review ?? 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <MiniStat label="Demandes" value={quotes.isPending ? "…" : toutes.length} />
        <MiniStat label="À traiter" value={quotes.isPending ? "…" : aChiffrer} />
        <MiniStat
          label="Devis acceptés"
          value={quotes.isPending ? "…" : (counts.accepted ?? 0)}
        />
      </div>

      <FilterTabs<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { id: "all", label: "Toutes", count: toutes.length },
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
            <QuoteCard key={q.id} quote={q} index={i} />
          ))}
        </div>
      )}

      <section className="card p-5">
        <h3 className="flex items-center gap-2 font-display text-base font-bold text-navy">
          <Info className="h-4 w-4 text-ink-soft" aria-hidden />
          Ce que l&apos;API ne permet pas encore
        </h3>
        <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-mid">
          <li>
            <strong>Classer une demande sans suite</strong> — le seul statut de
            fin est <code>declined</code>, qui veut dire «&nbsp;le client a
            refusé&nbsp;». L&apos;écrire à sa place serait un faux.
          </li>
        </ul>
      </section>
    </div>
  );
}

/* ── Une demande ───────────────────────────────────────────────────────────── */

function QuoteCard({ quote: q, index }: { quote: Quote; index: number }) {
  const toast = useToast();
  const update = useUpdateQuote();

  const [editing, setEditing] = useState(false);
  /** Saisis en euros, envoyés en centimes. */
  const [ttc, setTtc] = useState("");
  const [apres, setApres] = useState("");
  const [note, setNote] = useState("");
  const [aConfirmer, setAConfirmer] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const chiffre = q.quoteAmountTtc != null;
  const client = q.client?.fullName || q.client?.email || "Client inconnu";

  function ouvrir() {
    setErreur(null);
    setTtc(q.quoteAmountTtc != null ? String(Math.round(q.quoteAmountTtc / 100)) : "");
    setApres(
      q.quoteAmountAfterTax != null ? String(Math.round(q.quoteAmountAfterTax / 100)) : "",
    );
    setNote(q.quoteNote ?? "");
    setEditing(true);
  }

  /** Le TTC guide le reste à charge, tant qu'on ne l'a pas corrigé à la main. */
  function changerTtc(valeur: string) {
    setTtc(valeur);
    const n = Number(valeur);
    if (valeur.trim() && Number.isFinite(n)) {
      setApres(String(Math.round(afterTaxDefault(n * 100) / 100)));
    } else {
      setApres("");
    }
  }

  const ttcCents = Math.round(Number(ttc) * 100);
  const apresCents = Math.round(Number(apres) * 100);
  const montantsValides =
    ttc.trim() !== "" &&
    Number.isFinite(ttcCents) &&
    ttcCents > 0 &&
    apres.trim() !== "" &&
    Number.isFinite(apresCents) &&
    apresCents >= 0 &&
    apresCents <= ttcCents;

  function envoyer() {
    setErreur(null);
    update.mutate(
      {
        id: q.id,
        patch: {
          status: "quoted",
          quoteAmountTtc: ttcCents,
          quoteAmountAfterTax: apresCents,
          ...(note.trim() ? { quoteNote: note.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          setAConfirmer(false);
          setEditing(false);
          toast.success(
            `Devis envoyé à ${client}`,
            "Il le voit dans son espace et peut l'accepter.",
          );
        },
        onError: (e) => setErreur(adminErrorMessage(e)),
      },
    );
  }

  function prendreEnCharge() {
    update.mutate(
      { id: q.id, patch: { status: "in_review" } },
      {
        onSuccess: () =>
          toast.success(
            "Demande prise en charge",
            "Le client voit que quelqu'un s'en occupe.",
          ),
        onError: (e) => toast.error("Le statut n'a pas changé", adminErrorMessage(e)),
      },
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
      className="card p-5 lg:p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[11px] text-ink-soft">{q.reference}</p>
            <Badge tone={quoteStatusTone[q.status]} dot>
              {quoteStatusLabel[q.status]}
            </Badge>
            {q.createdAt && (
              <span className="text-[11px] text-ink-soft">{formatDate(q.createdAt)}</span>
            )}
          </div>

          <h3 className="mt-1.5 font-display text-lg font-bold leading-snug text-navy">
            {q.title}
          </h3>
          <p className="text-xs text-ink-soft">
            Demandé par <span className="font-semibold">{client}</span>
            {q.client?.email && q.client?.fullName && (
              <span className="ml-1.5 font-mono">{q.client.email}</span>
            )}
          </p>

          {q.brief && (
            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-ink-mid">
              {q.brief}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Meta Icon={Users} label={`${q.persons} pers.`} />
            <Meta Icon={UtensilsCrossed} label={`${q.mealsCount} plats`} />
            {q.cuisine && <Meta Icon={ChefHat} label={q.cuisine} />}
            {(q.diet ?? []).map((d) => (
              <span
                key={d}
                className="rounded-full bg-terra/10 px-2.5 py-1 text-[11px] font-medium text-terra-deep"
              >
                {d}
              </span>
            ))}
          </div>

          <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">
            {quoteStatusHint[q.status]}
          </p>

          <QuoteChefAssignment quote={q} />
        </div>

        {/* ── Le devis ──────────────────────────────────────────────────── */}
        <div className="w-full shrink-0 lg:w-80">
          {editing ? (
            <div className="rounded-2xl border border-[rgba(0,35,75,0.1)] bg-cream-soft p-4">
              <p className="mb-3 text-[13px] font-semibold text-navy">
                {chiffre ? "Corriger le devis" : "Établir un devis"}
              </p>

              <label className="block">
                <span className="field-label">Montant TTC (€)</span>
                <input
                  type="number"
                  min={1}
                  value={ttc}
                  onChange={(e) => changerTtc(e.target.value)}
                  placeholder="450"
                  className="input-base"
                />
              </label>

              <label className="mt-3 block">
                <span className="field-label">Reste à charge (€)</span>
                <input
                  type="number"
                  min={0}
                  value={apres}
                  onChange={(e) => setApres(e.target.value)}
                  placeholder="225"
                  aria-invalid={
                    (apres.trim() !== "" && apresCents > ttcCents) || undefined
                  }
                  className="input-base"
                />
                <span className="mt-1 block text-[11px] leading-relaxed text-ink-soft">
                  Proposé à la moitié du TTC — le crédit d&apos;impôt services à
                  la personne. L&apos;API ne le calcule pas : ce qui est écrit
                  ici est ce que le client verra.
                </span>
              </label>

              <label className="mt-3 block">
                <span className="field-label">Note pour le client</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Service et rangement compris."
                  className="input-base resize-y"
                />
              </label>

              {apres.trim() !== "" && apresCents > ttcCents && (
                <p className="mt-2 text-[12px] leading-relaxed text-danger">
                  Le reste à charge dépasse le montant TTC.
                </p>
              )}
              {erreur && (
                <p role="alert" className="mt-2 text-[12px] leading-relaxed text-danger">
                  {erreur}
                </p>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setAConfirmer(true)}
                  disabled={!montantsValides || update.isPending}
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
          ) : chiffre ? (
            <div className="rounded-2xl border border-terra/25 bg-terra/8 p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-terra-deep">
                {q.status === "accepted"
                  ? "Devis accepté"
                  : q.status === "declined"
                    ? "Devis refusé"
                    : "Devis envoyé"}
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-navy">
                {euros(Math.round(q.quoteAmountTtc! / 100))}
              </p>
              {q.quoteAmountAfterTax != null && (
                <p className="text-[11px] text-ink-mid">
                  soit {euros(Math.round(q.quoteAmountAfterTax / 100))} après
                  crédit d&apos;impôt
                </p>
              )}
              {q.quoteNote && (
                <p className="mt-1.5 text-[11px] leading-relaxed italic text-ink-mid">
                  {q.quoteNote}
                </p>
              )}
              {q.status !== "accepted" && (
                <button onClick={ouvrir} className="btn btn-sm btn-outline mt-3">
                  <Calculator className="h-3 w-3" aria-hidden /> Corriger le prix
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={ouvrir}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-terra/40 bg-terra/5 px-4 py-6 text-sm font-semibold text-terra-deep transition-colors hover:bg-terra/10"
              >
                <Calculator className="h-4 w-4" aria-hidden />
                Chiffrer cette demande
              </button>
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
          )}
        </div>
      </div>

      {/* Le prix part chez le client : on montre d'abord ce qu'il lira. */}
      <ConfirmDialog
        open={aConfirmer}
        onClose={() => setAConfirmer(false)}
        onConfirm={envoyer}
        pending={update.isPending}
        error={erreur}
        title={`Envoyer ce devis à ${client} ?`}
        lead={`Il verra ${euros(Math.round(ttcCents / 100))} TTC, soit ${euros(
          Math.round(apresCents / 100),
        )} à sa charge après le crédit d'impôt, et pourra l'accepter depuis son espace.`}
        detail={
          note.trim()
            ? `Votre note partira telle quelle : « ${note.trim()} »`
            : "Aucune note : le client ne verra que les deux montants. Une phrase sur ce qui est compris évite un aller-retour."
        }
        confirmLabel="Envoyer le devis"
      />
    </motion.article>
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

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="font-display text-2xl font-bold text-navy">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
        {label}
      </p>
    </div>
  );
}
