"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calculator,
  Check,
  ChefHat,
  Sparkles,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import FilterTabs from "@/components/ui/FilterTabs";
import EmptyState from "@/components/ui/EmptyState";
import { euros, formatDate } from "@/lib/utils";
import { demandeTone } from "@/lib/status";
import { DEMANDES, DEMANDE_STATUS_LABEL } from "@/lib/mock/demandes";
import { TEAM } from "@/lib/mock/team";
import type { Demande, DemandeStatus } from "@/lib/mock/types";

type Filter = "all" | DemandeStatus;

export default function DemandesPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<string | null>(null);
  // quotes locaux (mock) : id → montant TTC
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [sent, setSent] = useState<Record<string, boolean>>({});

  const counts = DEMANDES.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = DEMANDES.filter(
    (d) => filter === "all" || d.status === filter,
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <MiniStat label="Demandes" value={DEMANDES.length} />
        <MiniStat label="À traiter" value={(counts.submitted ?? 0) + (counts["in-review"] ?? 0)} />
        <MiniStat
          label="Devis acceptés"
          value={counts.accepted ?? 0}
        />
      </div>

      <FilterTabs<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { id: "all", label: "Toutes", count: DEMANDES.length },
          { id: "submitted", label: "Nouvelles", count: counts.submitted ?? 0 },
          {
            id: "in-review",
            label: "En analyse",
            count: counts["in-review"] ?? 0,
          },
          { id: "quoted", label: "Devis envoyés", count: counts.quoted ?? 0 },
          { id: "accepted", label: "Acceptées", count: counts.accepted ?? 0 },
        ]}
      />

      {filtered.length === 0 && (
        <div className="card">
          <EmptyState
            Icon={Sparkles}
            title="Aucune demande"
            text="Aucune demande sur-mesure dans cette catégorie."
          />
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((d, i) => (
          <DemandeCard
            key={d.id}
            demande={d}
            index={i}
            editing={editing === d.id}
            draft={drafts[d.id]}
            sentQuote={sent[d.id]}
            onEdit={() => setEditing(editing === d.id ? null : d.id)}
            onDraftChange={(v) => setDrafts((s) => ({ ...s, [d.id]: v }))}
            onSend={() => {
              setSent((s) => ({ ...s, [d.id]: true }));
              setEditing(null);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function DemandeCard({
  demande: d,
  index,
  editing,
  draft,
  sentQuote,
  onEdit,
  onDraftChange,
  onSend,
}: {
  demande: Demande;
  index: number;
  editing: boolean;
  draft?: number;
  sentQuote?: boolean;
  onEdit: () => void;
  onDraftChange: (v: number) => void;
  onSend: () => void;
}) {
  const chef = TEAM.find((t) => t.id === d.assignedChefId);
  const quote = d.quote;
  const showQuote = quote || sentQuote;
  const draftAmount = draft ?? 250;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
      className="card p-5 lg:p-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[11px] text-ink-soft">{d.reference}</p>
            <Badge tone={demandeTone[d.status]} dot>
              {DEMANDE_STATUS_LABEL[d.status]}
            </Badge>
            <span className="text-[11px] text-ink-soft">
              {formatDate(d.createdAt)}
            </span>
          </div>
          <h3 className="mt-1.5 font-display text-lg font-bold text-navy">
            {d.title}
          </h3>
          <p className="text-xs text-ink-soft">
            Demandé par <span className="font-semibold">{d.clientName}</span>
          </p>
          <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-ink-mid">
            {d.brief}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Meta Icon={Users} label={`${d.persons} pers.`} />
            <Meta Icon={UtensilsCrossed} label={`${d.mealsCount} plats`} />
            <Meta Icon={ChefHat} label={d.cuisine} />
            {d.diet.map((dt) => (
              <span
                key={dt}
                className="rounded-full bg-terra/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-terra-deep"
              >
                {dt}
              </span>
            ))}
          </div>
        </div>

        {/* Devis / actions */}
        <div className="w-full shrink-0 lg:w-72">
          {showQuote ? (
            <div className="rounded-2xl border border-terra/25 bg-terra-pale/30 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-terra-deep">
                {sentQuote ? "Devis envoyé ✓" : "Devis"}
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-navy">
                {euros(quote ? quote.amountTTC : draftAmount)}
              </p>
              <p className="text-[11px] text-ink-mid">
                soit{" "}
                {euros(
                  quote
                    ? quote.amountAfterTax
                    : Math.round(draftAmount / 2),
                )}{" "}
                après crédit d&apos;impôt
              </p>
              {quote?.note && (
                <p className="mt-1.5 text-[11px] italic text-ink-mid">
                  {quote.note}
                </p>
              )}
              {chef && (
                <p className="mt-2 text-[11px] text-ink-soft">
                  Chef assigné · {chef.name}
                </p>
              )}
            </div>
          ) : editing ? (
            <div className="rounded-2xl border border-[rgba(0,35,75,0.1)] bg-cream-soft p-4">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                Établir un devis
              </p>
              <label className="text-[11px] text-ink-mid">Montant TTC (€)</label>
              <input
                type="number"
                value={draftAmount}
                onChange={(e) => onDraftChange(Number(e.target.value))}
                className="input-base mt-1"
              />
              <p className="mt-1.5 text-[11px] text-ink-soft">
                Reste à charge estimé : {euros(Math.round(draftAmount / 2))}
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={onSend} className="btn btn-primary flex-1">
                  <Check className="h-4 w-4" /> Envoyer
                </button>
                <button onClick={onEdit} className="btn btn-ghost">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onEdit}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-terra/40 bg-terra-pale/20 px-4 py-6 text-sm font-semibold text-terra-deep transition-colors hover:bg-terra-pale/40"
            >
              <Calculator className="h-4 w-4" />
              Chiffrer cette demande
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function Meta({
  Icon,
  label,
}: {
  Icon: typeof Users;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-2.5 py-1 text-[11px] font-medium text-ink-mid">
      <Icon className="h-3 w-3 text-ink-soft" />
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
