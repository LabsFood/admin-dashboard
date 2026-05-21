"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Pencil, Sparkles, Star, TrendingUp } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { euros } from "@/lib/utils";
import { FORMULES } from "@/lib/mock/formules";

export default function FormulesPage() {
  const [active, setActive] = useState<Record<string, boolean>>(
    Object.fromEntries(FORMULES.map((f) => [f.id, f.active])),
  );

  const totalSessions = FORMULES.reduce((n, f) => n + f.sessionsSold, 0);
  const revenue = FORMULES.reduce(
    (n, f) => n + f.sessionsSold * f.price,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Bandeau crédit d'impôt */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <div className="card flex items-center gap-3 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-terra/12 text-terra-deep">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-2xl font-bold text-navy">
              {totalSessions}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-ink-soft">
              Sessions vendues
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-pale text-teal">
            <Star className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-2xl font-bold text-navy">
              {euros(revenue)}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-ink-soft">
              CA forfaits
            </p>
          </div>
        </div>
        <div className="rounded-3xl bg-navy p-5 text-white">
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-terra-soft">
            <Sparkles className="h-3.5 w-3.5" /> Avantage fiscal
          </p>
          <p className="mt-1 text-sm leading-relaxed text-white/75">
            Service à la personne — crédit d&apos;impôt de{" "}
            <span className="font-bold text-terra-soft">50 %</span> sur toutes
            les formules.
          </p>
        </div>
      </motion.section>

      {/* Cartes formules */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4">
        {FORMULES.map((f, i) => (
          <motion.article
            key={f.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, delay: i * 0.06 }}
            className={`card relative flex flex-col p-6 ${
              f.popular ? "ring-2 ring-terra" : ""
            }`}
          >
            {f.popular && (
              <span className="absolute -top-3 left-6 rounded-full bg-terra px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                Populaire
              </span>
            )}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl font-bold text-navy">
                  {f.name}
                </h3>
                <p className="mt-0.5 text-xs text-ink-soft">{f.persons}</p>
              </div>
              <Badge tone={active[f.id] ? "success" : "neutral"}>
                {active[f.id] ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="mt-4">
              {f.price > 0 ? (
                <>
                  <p className="font-display text-3xl font-bold text-navy">
                    {euros(f.price)}
                  </p>
                  <p className="text-xs text-terra">
                    soit {euros(f.priceAfterTax)} après crédit d&apos;impôt
                  </p>
                </>
              ) : (
                <p className="font-display text-2xl font-bold text-navy">
                  Sur devis
                </p>
              )}
            </div>

            <p className="mt-3 text-xs leading-relaxed text-ink-mid">
              {f.description}
            </p>

            <ul className="mt-4 flex-1 space-y-1.5">
              {f.features.slice(0, 5).map((feat) => (
                <li
                  key={feat}
                  className="flex items-start gap-1.5 text-xs text-ink-mid"
                >
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-terra" />
                  {feat}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between border-t border-[rgba(0,35,75,0.06)] pt-3">
              <span className="text-[11px] text-ink-soft">
                {f.sessionsSold} vendues
              </span>
              <div className="flex items-center gap-2">
                <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-cream-soft text-navy hover:bg-cream-deep">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() =>
                    setActive((s) => ({ ...s, [f.id]: !s[f.id] }))
                  }
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    active[f.id] ? "bg-terra" : "bg-cream-deep"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                      active[f.id] ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
