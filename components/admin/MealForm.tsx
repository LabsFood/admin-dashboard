"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Flame,
  Link2,
  Save,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Continent, Difficulty, Meal, MealStatus } from "@/lib/mock/types";

const CONTINENTS: Continent[] = [
  "Europe",
  "Afrique",
  "Asie",
  "Amériques",
  "Moyen-Orient",
];
const DIFFICULTIES: Difficulty[] = ["Facile", "Moyen", "Difficile"];
const STATUSES: { id: MealStatus; label: string }[] = [
  { id: "published", label: "Publié" },
  { id: "draft", label: "Brouillon" },
  { id: "archived", label: "Archivé" },
];
const DIET_TAGS = [
  "végétarien",
  "vegan",
  "sans-gluten",
  "sans-lactose",
  "halal",
  "high-protein",
];
const ALLERGENS = [
  "gluten",
  "lait",
  "œufs",
  "poisson",
  "crustacés",
  "fruits à coque",
  "arachides",
  "soja",
  "sulfites",
];

export default function MealForm({
  meal,
  variant,
  backHref,
}: {
  meal?: Meal;
  variant: "menu" | "recette";
  backHref: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(meal);
  const isRecette = variant === "recette";

  const [name, setName] = useState(meal?.name ?? "");
  const [country, setCountry] = useState(meal?.country ?? "");
  const [continent, setContinent] = useState<Continent>(
    meal?.continent ?? "Europe",
  );
  const [description, setDescription] = useState(meal?.description ?? "");
  const [image, setImage] = useState(meal?.image ?? "");
  const [portions, setPortions] = useState(meal?.portions ?? 4);
  const [prepTime, setPrepTime] = useState(meal?.prepTime ?? 45);
  const [calories, setCalories] = useState(meal?.calories ?? 400);
  const [difficulty, setDifficulty] = useState<Difficulty>(
    meal?.difficulty ?? "Moyen",
  );
  const [status, setStatus] = useState<MealStatus>(meal?.status ?? "draft");
  const [weekNumber, setWeekNumber] = useState(meal?.weekNumber ?? 21);
  const [dietaryTags, setDietaryTags] = useState<string[]>(
    meal?.dietaryTags ?? [],
  );
  const [allergens, setAllergens] = useState<string[]>(meal?.allergens ?? []);
  const [isFeatured, setIsFeatured] = useState(meal?.isFeatured ?? false);
  const [saved, setSaved] = useState(false);

  const toggle = (
    list: string[],
    set: (v: string[]) => void,
    value: string,
  ) => {
    set(list.includes(value) ? list.filter((t) => t !== value) : [...list, value]);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Données mock : pas de persistance backend, on simule l'enregistrement.
    setSaved(true);
    setTimeout(() => router.push(backHref), 1100);
  };

  const noun = isRecette ? "la recette" : "le plat";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {isRecette ? "Toutes les recettes" : "Tous les plats"}
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white lg:p-7"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-terra/25 blur-3xl" />
        <p className="relative font-mono text-[10px] uppercase tracking-[0.2em] text-terra-soft">
          {isRecette ? "Carte des recettes" : "Catalogue de plats"}
        </p>
        <h2 className="relative mt-1.5 font-display text-2xl font-bold lg:text-3xl">
          {isEdit
            ? `Modifier ${noun}`
            : isRecette
              ? "Ajouter une recette"
              : "Nouveau plat"}
        </h2>
        <p className="relative mt-1 text-sm text-white/65">
          {isEdit
            ? "Mettez à jour les informations puis enregistrez."
            : "Renseignez les informations du plat pour l'ajouter au catalogue."}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          <section className="card space-y-4 p-6">
            <h3 className="font-display text-base font-bold text-navy">
              Informations générales
            </h3>
            <Field label="Nom du plat" required>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ex. Poulet rôti aux herbes de Provence"
                className="input-base"
              />
            </Field>
            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Ingrédients principaux, préparation, particularités…"
                className="input-base resize-none"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Pays d'origine" required>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  required
                  placeholder="France"
                  className="input-base"
                />
              </Field>
              <Field label="Continent">
                <select
                  value={continent}
                  onChange={(e) => setContinent(e.target.value as Continent)}
                  className="input-base"
                >
                  {CONTINENTS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Photo du plat">
              <ImagePicker value={image} onChange={setImage} />
            </Field>
          </section>

          <section className="card space-y-4 p-6">
            <h3 className="font-display text-base font-bold text-navy">
              Caractéristiques
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Portions">
                <input
                  type="number"
                  min={1}
                  value={portions}
                  onChange={(e) => setPortions(Number(e.target.value))}
                  className="input-base"
                />
              </Field>
              <Field label="Préparation (min)">
                <input
                  type="number"
                  min={0}
                  value={prepTime}
                  onChange={(e) => setPrepTime(Number(e.target.value))}
                  className="input-base"
                />
              </Field>
              <Field label="Calories">
                <input
                  type="number"
                  min={0}
                  value={calories}
                  onChange={(e) => setCalories(Number(e.target.value))}
                  className="input-base"
                />
              </Field>
              <Field label="Difficulté">
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="input-base"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Régimes alimentaires">
              <ChipGroup
                options={DIET_TAGS}
                selected={dietaryTags}
                onToggle={(v) => toggle(dietaryTags, setDietaryTags, v)}
                tone="teal"
              />
            </Field>
            <Field label="Allergènes">
              <ChipGroup
                options={ALLERGENS}
                selected={allergens}
                onToggle={(v) => toggle(allergens, setAllergens, v)}
                tone="danger"
              />
            </Field>
          </section>
        </div>

        {/* Sidebar publication */}
        <aside className="space-y-6">
          <section className="card space-y-4 p-6">
            <h3 className="font-display text-base font-bold text-navy">
              Publication
            </h3>
            <Field label="Statut">
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatus(s.id)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
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

            {!isRecette && (
              <Field label="Semaine du menu">
                <input
                  type="number"
                  min={1}
                  max={53}
                  value={weekNumber}
                  onChange={(e) => setWeekNumber(Number(e.target.value))}
                  className="input-base"
                />
              </Field>
            )}

            <button
              type="button"
              onClick={() => setIsFeatured((v) => !v)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-sm font-semibold transition-colors",
                isFeatured
                  ? "border-terra/40 bg-terra/10 text-terra-deep"
                  : "border-[rgba(0,35,75,0.12)] text-ink-mid hover:border-terra/40",
              )}
            >
              <span className="flex items-center gap-2">
                <Flame className="h-4 w-4" />
                Mettre en vedette
              </span>
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border",
                  isFeatured
                    ? "border-terra bg-terra text-white"
                    : "border-ink-soft/40",
                )}
              >
                {isFeatured && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
            </button>
          </section>

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={saved}
              className="btn btn-primary w-full disabled:opacity-70"
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" /> Enregistré
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEdit ? "Enregistrer les modifications" : `Créer ${noun}`}
                </>
              )}
            </button>
            <Link href={backHref} className="btn btn-ghost w-full">
              Annuler
            </Link>
          </div>
        </aside>
      </div>
    </form>
  );
}

function ImagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [mode, setMode] = useState<"link" | "upload">("link");
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex rounded-full border border-[rgba(0,35,75,0.13)] bg-paper p-0.5 text-xs font-semibold">
        {(
          [
            { id: "link", Icon: Link2, label: "Lien" },
            { id: "upload", Icon: Upload, label: "Téléverser" },
          ] as const
        ).map(({ id, Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
              mode === id ? "bg-navy text-white" : "text-ink-soft hover:text-navy",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {mode === "link" ? (
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={value.startsWith("data:") ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://…"
            className="input-base pl-9"
          />
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFile(e.dataTransfer.files?.[0]);
          }}
          className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[rgba(0,35,75,0.18)] bg-cream-soft px-4 py-6 text-center transition-colors hover:border-terra/50"
        >
          <Upload className="h-5 w-5 text-terra" />
          <p className="text-sm font-semibold text-navy">
            Glissez une image ou cliquez
          </p>
          <p className="text-[11px] text-ink-soft">PNG, JPG · 5 Mo max</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? undefined)}
          />
        </div>
      )}

      {value && (
        <div className="relative overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Aperçu"
            className="aspect-[16/9] w-full object-cover"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Retirer l'image"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-navy/80 text-white transition-colors hover:bg-navy"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
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

function ChipGroup({
  options,
  selected,
  onToggle,
  tone,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  tone: "teal" | "danger";
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? tone === "teal"
                  ? "bg-teal-pale text-teal"
                  : "bg-danger-soft text-danger"
                : "bg-cream-soft text-ink-mid hover:bg-cream-deep",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
