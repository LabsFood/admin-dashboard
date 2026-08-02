"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Save, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { MEALS } from "@/lib/mock/menus";
import type { MealStatus, WeeklyMenu } from "@/lib/mock/types";

const STATUSES: { id: MealStatus; label: string }[] = [
  { id: "published", label: "Publié" },
  { id: "draft", label: "Brouillon" },
  { id: "archived", label: "Archivé" },
];

export default function MenuForm({ menu }: { menu?: WeeklyMenu }) {
  const router = useRouter();
  const isEdit = Boolean(menu);

  const [title, setTitle] = useState(menu?.title ?? "");
  const [weekNumber, setWeekNumber] = useState(menu?.weekNumber ?? 21);
  const [startDate, setStartDate] = useState(menu?.startDate ?? "");
  const [endDate, setEndDate] = useState(menu?.endDate ?? "");
  const [status, setStatus] = useState<MealStatus>(menu?.status ?? "draft");
  const [mealIds, setMealIds] = useState<string[]>(menu?.mealIds ?? []);
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState(false);

  const toggleMeal = (id: string) =>
    setMealIds((ids) =>
      ids.includes(id) ? ids.filter((m) => m !== id) : [...ids, id],
    );

  const q = query.toLowerCase();
  const visible = MEALS.filter(
    (m) =>
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.country.toLowerCase().includes(q),
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Données mock : pas de persistance backend, on simule l'enregistrement.
    setSaved(true);
    setTimeout(() => router.push("/menus"), 1100);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Link
        href="/menus"
        className="inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour aux menus
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl bg-teal p-6 text-white lg:p-7"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-terra/25 blur-3xl" />
        <p className="relative font-mono text-[10px] uppercase tracking-[0.2em] text-terra-soft">
          Composition
        </p>
        <h2 className="relative mt-1.5 font-display text-2xl font-bold lg:text-3xl">
          {isEdit ? "Modifier le menu" : "Composer le menu de la semaine"}
        </h2>
        <p className="relative mt-1 text-sm text-white/65">
          Choisissez la période puis sélectionnez les plats proposés.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sélection des plats */}
        <div className="space-y-4 lg:col-span-2">
          <section className="card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-[rgba(0,35,75,0.07)] bg-cream-soft px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-display text-base font-bold text-navy">
                Plats du menu
                <span className="ml-2 font-mono text-xs font-normal text-ink-soft">
                  {mealIds.length} sélectionné{mealIds.length > 1 ? "s" : ""}
                </span>
              </h3>
              <div className="relative sm:w-56">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher un plat…"
                  className="input-base pl-9"
                />
              </div>
            </div>
            <ul className="max-h-[28rem] divide-y divide-[rgba(0,35,75,0.06)] overflow-y-auto">
              {visible.map((m) => {
                const selected = mealIds.includes(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => toggleMeal(m.id)}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-cream-soft"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.image}
                        alt={m.name}
                        className="h-11 w-11 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-navy">
                          {m.name}
                        </p>
                        <p className="font-mono text-[11px] text-ink-soft">
                          {m.country} · {m.prepTime} min
                        </p>
                      </div>
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-colors",
                          selected
                            ? "border-terra bg-terra text-white"
                            : "border-ink-soft/40",
                        )}
                      >
                        {selected && <Check className="h-4 w-4" strokeWidth={3} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Réglages */}
        <aside className="space-y-6">
          <section className="card space-y-4 p-6">
            <h3 className="font-display text-base font-bold text-navy">
              Période & infos
            </h3>
            <Field label="Intitulé">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Menu de la semaine ${weekNumber}`}
                className="input-base"
              />
            </Field>
            <Field label="Numéro de semaine">
              <input
                type="number"
                min={1}
                max={53}
                value={weekNumber}
                onChange={(e) => setWeekNumber(Number(e.target.value))}
                className="input-base"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Du" required>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="input-base"
                />
              </Field>
              <Field label="Au" required>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="input-base"
                />
              </Field>
            </div>
            <Field label="Statut">
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatus(s.id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      s.id === status
                        ? "bg-navy text-white"
                        : "bg-cream-soft text-ink-mid hover:bg-cream-deep",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Field>
          </section>

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={saved || mealIds.length === 0}
              className="btn btn-primary w-full disabled:opacity-60"
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" /> Enregistré
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEdit ? "Enregistrer le menu" : "Publier le menu"}
                </>
              )}
            </button>
            {mealIds.length === 0 && (
              <p className="text-center text-[11px] text-ink-soft">
                Sélectionnez au moins un plat.
              </p>
            )}
            <Link href="/menus" className="btn btn-ghost w-full">
              Annuler
            </Link>
          </div>
        </aside>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {label}
        {required && <span className="text-terra"> *</span>}
      </span>
      {children}
    </label>
  );
}
