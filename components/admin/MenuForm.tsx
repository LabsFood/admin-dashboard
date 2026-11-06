"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarRange,
  Check,
  Flame,
  Image as ImageIcon,
  LayoutList,
  Loader2,
  Save,
  Search,
  ShoppingBasket,
  Trash2,
  Upload,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toaster";
import {
  PHOTO_MAX_MB,
  checkPhoto,
  photoMessage,
  useDeleteLabsFoodMenuPhoto,
  useLabsFoodMenuPhoto,
} from "@/lib/api/photos";
import { cn, formatDate } from "@/lib/utils";
import { countryLabel } from "@/lib/countries";
import { catalogLabel, catalogTone, difficultyLabel, periodLabel } from "@/lib/catalog-labels";
import { refLabel, useDiets, useDishCategories } from "@/lib/api/referentials";
import {
  currentIsoWeek,
  isoWeekRange,
  useCreateLabsFoodMenu,
  useCreateMenuWeek,
  useMeals,
  useUpdateLabsFoodMenu,
  type LabsFoodMenu,
  type MealStatus,
  type MenuPeriod,
} from "@/lib/api/catalog";
import { adminErrorMessage } from "@/lib/api/errors";

/* ─────────────────────────────────────────────────────────────────────────────
   Composer — deux objets différents, un seul atelier.

   - **Un menu Lab's Food** : un assemblage ordonné de plats de la maison,
     qu'un batch cooker adopte tel quel. L'ordre compte : c'est celui dans
     lequel les plats seront montrés.
   - **Une semaine** : l'ardoise d'une semaine ISO, ce que les clients voient du
     lundi au dimanche. L'API ne sait que la créer, pas la modifier.

   Dans les deux cas on ne propose que des plats **publiés** : l'API refuse les
   autres, et un brouillon dans un menu public n'aurait pas de sens.
   ───────────────────────────────────────────────────────────────────────────── */

type Mode = "menu" | "semaine";
const PERIODS: MenuPeriod[] = ["week", "month"];
const STATUSES: MealStatus[] = ["draft", "published", "archived"];

export default function MenuForm({ menu }: { menu?: LabsFoodMenu }) {
  const router = useRouter();
  const toast = useToast();
  const meals = useMeals();
  const diets = useDiets();
  const categories = useDishCategories();
  const createMenu = useCreateLabsFoodMenu();
  const updateMenu = useUpdateLabsFoodMenu();
  const createWeek = useCreateMenuWeek();

  const isEdit = Boolean(menu);
  const [mode, setMode] = useState<Mode>("menu");
  const effectiveMode: Mode = isEdit ? "menu" : mode;

  const now = currentIsoWeek();

  // Menu Lab's Food
  const [title, setTitle] = useState(menu?.title ?? "");
  const [pitch, setPitch] = useState(menu?.pitch ?? "");
  const [period, setPeriod] = useState<MenuPeriod>(menu?.period ?? "week");
  const [shoppingIncluded, setShoppingIncluded] = useState(
    menu?.shoppingIncluded ?? false,
  );
  const [status, setStatus] = useState<MealStatus>(menu?.status ?? "draft");

  // Semaine
  const [year, setYear] = useState(now.year);
  const [weekNumber, setWeekNumber] = useState(now.week);

  // Sélection commune, dans l'ordre d'ajout
  const [picked, setPicked] = useState<string[]>(
    () => menu?.dishIds ?? menu?.dishes?.map((d) => d.id) ?? [],
  );
  const [query, setQuery] = useState("");
  /** `null` = toutes les places dans le repas. */
  const [place, setPlace] = useState<string | null>(null);
  const [aConfirmer, setAConfirmer] = useState(false);

  const library = useMemo(
    () => (meals.data ?? []).filter((m) => m.status === "published"),
    [meals.data],
  );
  const drafts = (meals.data ?? []).length - library.length;

  const q = query.trim().toLowerCase();
  const visible = library
    .filter((m) => !place || m.category === place)
    .filter(
      (m) =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.description ?? "").toLowerCase().includes(q) ||
        (countryLabel(m.country) || "").toLowerCase().includes(q),
    );

  /** Les places réellement représentées : un filtre vide n'a rien à proposer. */
  const places = categories.data.filter((c) =>
    library.some((m) => m.category === c.code),
  );

  const pickedMeals = picked
    .map((id) => library.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => m !== undefined);

  const toggle = (id: string) =>
    setPicked((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const move = (i: number, delta: number) =>
    setPicked((ids) => {
      const j = i + delta;
      if (j < 0 || j >= ids.length) return ids;
      const next = [...ids];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const saving = createMenu.isPending || updateMenu.isPending || createWeek.isPending;
  const error = createMenu.error ?? updateMenu.error ?? createWeek.error;
  const range = isoWeekRange(year, weekNumber);

  /**
   * Enregistrer ce formulaire peut publier le menu, c'est-à-dire l'ouvrir à
   * l'adoption par tout le réseau — ou le retirer à ceux qui l'attendaient.
   * Un bouton « Enregistrer » ne dit pas ça : le dialogue, si.
   */
  const publieIci = effectiveMode === "menu" && status === "published";
  const etaitPublie = menu?.status === "published";
  const besoinConfirmation =
    effectiveMode === "menu" && (publieIci ? !etaitPublie : etaitPublie);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (besoinConfirmation) {
      setAConfirmer(true);
      return;
    }
    enregistrer();
  }

  function enregistrer() {
    setAConfirmer(false);

    if (effectiveMode === "semaine") {
      createWeek.mutate(
        { year, weekNumber, mealIds: picked },
        {
          onSuccess: () => {
            toast.success(
              `Semaine ${weekNumber} composée`,
              `${picked.length} plat${picked.length > 1 ? "s" : ""} à l'ardoise.`,
            );
            router.push("/menus");
          },
          onError: (err) =>
            toast.error("La semaine n'a pas été créée", adminErrorMessage(err)),
        },
      );
      return;
    }

    const body = {
      title: title.trim(),
      pitch: pitch.trim() || null,
      period,
      shoppingIncluded,
      dishIds: picked,
      status,
    };

    if (menu) {
      updateMenu.mutate(
        { id: menu.id, patch: body },
        {
          onSuccess: () => {
            toast.success(`« ${body.title} » enregistré`);
            router.push("/menus");
          },
          onError: (err) =>
            toast.error("Les modifications n'ont pas été enregistrées", adminErrorMessage(err)),
        },
      );
    } else {
      createMenu.mutate(body, {
        onSuccess: () => {
          toast.success(
            `« ${body.title} » créé`,
            status === "published"
              ? "Tous les batch cookers peuvent l'adopter."
              : "En brouillon : personne ne le voit encore.",
          );
          router.push("/menus");
        },
        onError: (err) => toast.error("Le menu n'a pas été créé", adminErrorMessage(err)),
      });
    }
  }

  const ready =
    effectiveMode === "semaine"
      ? weekNumber >= 1 && weekNumber <= 53 && year > 2000
      : title.trim().length > 0;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Link
        href="/menus"
        className="inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Retour aux menus
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl bg-teal p-6 text-white lg:p-7"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-terra/25 blur-3xl"
        />
        <p className="relative font-mono text-[10px] uppercase tracking-[0.2em] text-terra-soft">
          Composition
        </p>
        <h2 className="relative mt-1.5 font-display text-2xl font-bold lg:text-3xl">
          {isEdit
            ? "Modifier le menu"
            : effectiveMode === "menu"
              ? "Composer un menu Lab's Food"
              : "Composer une semaine"}
        </h2>
        <p className="relative mt-1 text-sm text-white/65">
          {effectiveMode === "menu"
            ? "Un assemblage de plats de la maison, qu'un batch cooker peut adopter tel quel."
            : "Ce que les clients verront à l'ardoise, du lundi au dimanche."}
        </p>
      </motion.div>

      {!isEdit && (
        <div
          role="tablist"
          aria-label="Ce qu'on compose"
          className="hairline flex w-full items-center gap-1 rounded-full border bg-paper p-1 sm:w-auto sm:self-start"
        >
          {(
            [
              { id: "menu", Icon: LayoutList, label: "Menu Lab's Food" },
              { id: "semaine", Icon: CalendarRange, label: "Semaine" },
            ] as const
          ).map(({ id, Icon, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors sm:flex-none",
                mode === id ? "bg-navy text-white" : "text-ink-mid hover:text-navy",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Choix des plats ────────────────────────────────────────────────── */}
        <div className="space-y-4 lg:col-span-2">
          <section className="card overflow-hidden">
            <div className="hairline flex flex-col gap-3 border-b bg-cream-soft px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-display text-base font-bold text-navy">
                Plats disponibles
                <span className="ml-2 font-mono text-xs font-normal text-ink-soft">
                  {picked.length} retenu{picked.length > 1 ? "s" : ""}
                </span>
              </h3>
              <div className="relative sm:w-56">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
                  aria-hidden
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher un plat…"
                  aria-label="Rechercher un plat"
                  className="input-base pl-9"
                />
              </div>
            </div>

            {meals.isPending ? (
              <div className="space-y-2 p-5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-cream-soft" />
                ))}
              </div>
            ) : meals.isError ? (
              <p className="flex items-start gap-2 p-5 text-sm text-danger">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {adminErrorMessage(meals.error)}
              </p>
            ) : library.length === 0 ? (
              <div className="p-5">
                <p className="text-sm text-ink-mid">
                  Aucun plat publié dans la bibliothèque.
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                  {drafts > 0
                    ? `${drafts} plat${drafts > 1 ? "s" : ""} existe${drafts > 1 ? "nt" : ""} en brouillon ou archivé : publiez-le${drafts > 1 ? "s" : ""} d'abord.`
                    : "Commencez par écrire un plat."}
                </p>
                <Link href="/menus/nouveau" className="btn btn-outline btn-sm mt-3">
                  Écrire un plat
                </Link>
              </div>
            ) : (
              <>
                {places.length > 1 && (
                  <div className="hairline flex flex-wrap items-center gap-1.5 border-b px-5 py-2.5">
                    <button
                      type="button"
                      onClick={() => setPlace(null)}
                      aria-pressed={place === null}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                        place === null
                          ? "bg-navy text-white"
                          : "bg-cream-soft text-ink-mid hover:bg-cream-deep",
                      )}
                    >
                      Tous
                    </button>
                    {places.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setPlace(c.code)}
                        aria-pressed={place === c.code}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                          place === c.code
                            ? "bg-navy text-white"
                            : "bg-cream-soft text-ink-mid hover:bg-cream-deep",
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}

                {visible.length === 0 ? (
                  <p className="p-5 text-sm text-ink-soft">
                    Aucun plat ne correspond
                    {q ? ` à « ${query} »` : " à ce filtre"}.
                  </p>
                ) : (
                  <ul className="max-h-[32rem] divide-y divide-[rgba(0,35,75,0.06)] overflow-y-auto">
                    {visible.map((m) => {
                      const on = picked.includes(m.id);
                      // Un plat sans déclaration d'allergènes ne devrait pas
                      // entrer dans un menu public : on le dit au moment du
                      // choix, pas après la publication.
                      const trou =
                        !m.allergensNone &&
                        m.allergens.length === 0 &&
                        m.customAllergens.length === 0;
                      return (
                        <li key={m.id}>
                          <button
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggle(m.id)}
                            className={cn(
                              "flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-cream-soft",
                              on && "bg-cream-soft/60",
                            )}
                          >
                            {m.imageUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={m.imageUrl}
                                alt=""
                                className="h-16 w-16 shrink-0 rounded-xl object-cover"
                              />
                            ) : (
                              <span
                                aria-hidden
                                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-cream-deep text-ink-soft"
                              >
                                <UtensilsCrossed className="h-5 w-5" />
                              </span>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="text-sm font-semibold text-navy">
                                  {m.name}
                                </span>
                                {m.category && (
                                  <Badge tone="navy" dot={false}>
                                    {refLabel(categories.data, m.category)}
                                  </Badge>
                                )}
                                {m.isFeatured && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-terra-deep">
                                    <Flame className="h-3 w-3" aria-hidden /> Vedette
                                  </span>
                                )}
                              </p>

                              <p className="mt-0.5 font-mono text-[11px] text-ink-soft">
                                {[
                                  countryLabel(m.country) || "Origine à renseigner",
                                  `${m.portions ?? "?"} portions`,
                                  m.cookTime
                                    ? `${m.prepTime} + ${m.cookTime} min`
                                    : `${m.prepTime} min`,
                                  m.difficulty ? difficultyLabel[m.difficulty] : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>

                              {m.description && (
                                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-mid">
                                  {m.description}
                                </p>
                              )}

                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                {m.dietaryTags.slice(0, 4).map((t) => (
                                  <span key={t} className="chip-teal">
                                    {refLabel(diets.data, t)}
                                  </span>
                                ))}
                                {m.allergensNone && (
                                  <span className="chip-muted">Sans allergène</span>
                                )}
                                {trou && (
                                  <Badge tone="warning" dot>
                                    Allergènes non déclarés
                                  </Badge>
                                )}
                                {m.offeredToChefProfileId && (
                                  <Badge tone="terra" dot>
                                    Réservé
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <span
                              aria-hidden
                              className={cn(
                                "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-xs border",
                                on
                                  ? "border-navy bg-navy text-white"
                                  : "border-ink-soft/40",
                              )}
                            >
                              {on && <Check className="h-3 w-3" strokeWidth={3} />}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </section>

          {/* L'ordre retenu — il part tel quel à l'API pour un menu. */}
          {pickedMeals.length > 0 && (
            <section className="card p-5">
              <h3 className="font-display text-base font-bold text-navy">
                {effectiveMode === "menu" ? "Ordre d'affichage" : "À l'ardoise"}
              </h3>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                {effectiveMode === "menu"
                  ? "Les plats seront montrés dans cet ordre."
                  : `${pickedMeals.length} plat${pickedMeals.length > 1 ? "s" : ""} pour la semaine ${weekNumber}.`}
              </p>
              <ol className="mt-3 space-y-2">
                {pickedMeals.map((m, i) => (
                  <li key={m.id} className="flex items-center gap-2.5 rounded-xl bg-cream-soft p-2.5">
                    <span
                      aria-hidden
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xs bg-paper font-mono text-[10px] font-semibold text-navy"
                    >
                      {i + 1}
                    </span>
                    {m.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={m.imageUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-paper text-ink-soft"
                      >
                        <UtensilsCrossed className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-navy">{m.name}</p>
                      <p className="truncate font-mono text-[10px] text-ink-soft">
                        {[
                          m.category ? refLabel(categories.data, m.category) : null,
                          countryLabel(m.country) || null,
                          `${m.prepTime} min`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {effectiveMode === "menu" && (
                      <>
                        <button
                          type="button"
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                          aria-label={`Monter ${m.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper hover:text-navy disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(i, 1)}
                          disabled={i === pickedMeals.length - 1}
                          aria-label={`Descendre ${m.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper hover:text-navy disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => toggle(m.id)}
                      aria-label={`Retirer ${m.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* ── Détails ────────────────────────────────────────────────────────── */}
        <aside className="space-y-6">
          {effectiveMode === "menu" ? (
            <section className="card space-y-4 p-6">
              <h3 className="font-display text-base font-bold text-navy">Le menu</h3>
              <label className="block">
                <span className="field-label">
                  Titre<span className="text-terra"> *</span>
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Semaine méditerranéenne"
                  className="input-base"
                />
              </label>
              <label className="block">
                <span className="field-label">Accroche</span>
                <textarea
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  rows={3}
                  placeholder="Une ou deux phrases, lues sur la carte publique."
                  className="input-base resize-y"
                />
              </label>
              <label className="block">
                <span className="field-label">Période</span>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as MenuPeriod)}
                  className="input-base"
                >
                  {PERIODS.map((p) => (
                    <option key={p} value={p}>
                      {periodLabel[p]}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => setShoppingIncluded((v) => !v)}
                aria-pressed={shoppingIncluded}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-md border px-3.5 py-3 text-left transition-colors",
                  shoppingIncluded
                    ? "border-teal/40 bg-teal-pale"
                    : "border-[rgba(0,35,75,0.12)] hover:border-teal/40",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border",
                    shoppingIncluded
                      ? "border-teal bg-teal text-white"
                      : "border-ink-soft/40",
                  )}
                >
                  {shoppingIncluded && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
                </span>
                <span>
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-navy">
                    <ShoppingBasket className="h-3.5 w-3.5" aria-hidden />
                    Courses faites par le batch cooker
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-soft">
                    Décoché, les courses restent à la charge du client.
                  </span>
                </span>
              </button>

              <CoverField menu={menu} />

              <div>
                <p className="field-label">Statut</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                        s === status
                          ? "bg-navy text-white"
                          : "bg-cream-soft text-ink-mid hover:bg-cream-deep",
                      )}
                    >
                      {catalogLabel[s]}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                  {status === "published"
                    ? "Publié, ce menu devient une suggestion que tout batch cooker peut adopter."
                    : status === "draft"
                      ? "Un brouillon reste dans la console."
                      : "Archivé : plus proposé, toujours lisible."}
                </p>
              </div>
            </section>
          ) : (
            <section className="card space-y-4 p-6">
              <h3 className="font-display text-base font-bold text-navy">La semaine</h3>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="field-label">Année</span>
                  <input
                    type="number"
                    min={2024}
                    max={2100}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="input-base"
                  />
                </label>
                <label className="block">
                  <span className="field-label">Semaine ISO</span>
                  <input
                    type="number"
                    min={1}
                    max={53}
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(Number(e.target.value))}
                    className="input-base"
                  />
                </label>
              </div>
              <p className="rounded-md bg-cream-soft px-3.5 py-3 text-[13px] text-ink-mid">
                Du <strong>{formatDate(range.start.toISOString())}</strong> au{" "}
                <strong>{formatDate(range.end.toISOString())}</strong>
                {year === now.year && weekNumber === now.week && (
                  <span className="mt-1 block text-[12px] text-teal">
                    C&apos;est la semaine en cours.
                  </span>
                )}
              </p>
              <p className="text-[12px] leading-relaxed text-ink-soft">
                L&apos;API ne sait que créer une semaine. Pour en corriger une,
                composez-la de nouveau.
              </p>
            </section>
          )}

          {error != null && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md bg-danger-soft p-3.5 text-[13px] leading-relaxed text-danger"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {adminErrorMessage(error)}
            </p>
          )}

          {picked.length === 0 && (
            <p className="text-[12px] leading-relaxed text-[#8A6212]">
              Aucun plat retenu.{" "}
              {effectiveMode === "menu"
                ? "Un menu vide ne peut pas être adopté."
                : "Les clients ne verront rien cette semaine-là."}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={saving || !ready}
              className="btn btn-primary w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Enregistrement…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden />
                  {isEdit
                    ? "Enregistrer les modifications"
                    : effectiveMode === "menu"
                      ? "Créer le menu"
                      : "Créer la semaine"}
                </>
              )}
            </button>
            <Link href="/menus" className="btn btn-ghost w-full">
              Annuler
            </Link>
          </div>

          {isEdit && menu && (
            <p className="text-[12px] leading-relaxed text-ink-soft">
              Statut actuel :{" "}
              <Badge tone={catalogTone[menu.status]}>{catalogLabel[menu.status]}</Badge>
            </p>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={aConfirmer}
        onClose={() => setAConfirmer(false)}
        onConfirm={enregistrer}
        pending={saving}
        error={error != null ? adminErrorMessage(error) : null}
        tone={publieIci ? "primary" : "danger"}
        title={
          publieIci
            ? `Publier « ${title.trim() || "ce menu"} » ?`
            : `Retirer « ${title.trim() || "ce menu"} » du catalogue ?`
        }
        lead={
          publieIci
            ? `Ses ${picked.length} plat${picked.length > 1 ? "s" : ""} partent ensemble : tout batch cooker du réseau pourra adopter ce menu d'un clic.`
            : "Le menu cesse d'être proposé au réseau. Les batch cookers qui l'ont adopté gardent leur copie — elle est à eux."
        }
        detail={
          publieIci
            ? "Adopter crée une copie chez eux : vos corrections ultérieures la signalent, elles ne la modifient pas."
            : undefined
        }
        confirmLabel={
          publieIci ? "Publier le menu" : "Enregistrer et retirer"
        }
      />
    </form>
  );
}

/* ── La photo de couverture ────────────────────────────────────────────────── */

/**
 * La couverture d'un menu Lab's Food.
 *
 * Les trois routes existaient depuis le 06/10 (`photo/upload-url`,
 * `photo/confirm`, `DELETE …/photo`) et les hooks étaient écrits — sans un
 * seul bouton pour les appeler. D'où des cartes de menu sans image alors que
 * les plats en avaient une.
 *
 * Comme pour un plat, l'envoi a besoin de l'identifiant : à la création il
 * n'existe pas, et `POST /admin/menus` n'accepte pas d'URL. On le dit plutôt
 * que d'afficher un champ qui ne marcherait pas.
 */
function CoverField({ menu }: { menu?: LabsFoodMenu }) {
  const envoi = useLabsFoodMenuPhoto<LabsFoodMenu>();
  const retrait = useDeleteLabsFoodMenuPhoto<LabsFoodMenu>();
  const champ = useRef<HTMLInputElement>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  if (!menu) {
    return (
      <div className="flex items-start gap-2.5 rounded-md bg-cream-soft px-3.5 py-3">
        <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
        <p className="text-[12px] leading-relaxed text-ink-mid">
          Enregistrez d&apos;abord le menu : l&apos;envoi d&apos;une couverture a
          besoin de son identifiant.
        </p>
      </div>
    );
  }

  // `menu` est garanti par le retour ci-dessus, mais le narrowing ne suit pas
  // dans la closure : on le capture.
  const m = menu;

  function choisir(file: File | null) {
    setErreur(null);
    if (!file) return;
    const probleme = checkPhoto(file);
    if (probleme) {
      setErreur(probleme);
      return;
    }
    envoi.mutate(
      { id: m.id, file },
      {
        onSuccess: () => {
          if (champ.current) champ.current.value = "";
        },
        onError: (e) => setErreur(photoMessage(e)),
      },
    );
  }

  return (
    <div>
      <p className="field-label">Couverture</p>
      {menu.imageUrl && (
        <div className="mb-2 overflow-hidden rounded-2xl bg-cream-deep">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={menu.imageUrl}
            alt="Couverture du menu"
            className="aspect-[16/9] w-full object-cover"
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={champ}
          id={`cover-${menu.id}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => choisir(e.target.files?.[0] ?? null)}
        />
        <label
          htmlFor={`cover-${menu.id}`}
          className={cn(
            "btn btn-outline btn-sm cursor-pointer",
            envoi.isPending && "pointer-events-none opacity-50",
          )}
        >
          {envoi.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          ) : (
            <Upload className="h-3 w-3" aria-hidden />
          )}
          {menu.imageUrl ? "Remplacer" : "Envoyer une photo"}
        </label>
        {menu.imageUrl && (
          <button
            type="button"
            onClick={() =>
              retrait.mutate(menu.id, { onError: (e) => setErreur(photoMessage(e)) })
            }
            disabled={retrait.isPending}
            className="btn btn-sm text-danger hover:bg-danger-soft"
          >
            {retrait.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <X className="h-3 w-3" aria-hidden />
            )}
            Retirer
          </button>
        )}
        <span className="text-[11px] text-ink-soft">
          JPG, PNG ou WebP, {PHOTO_MAX_MB} Mo au plus
        </span>
      </div>
      {erreur && (
        <p role="alert" className="mt-1.5 text-[12px] leading-relaxed text-danger">
          {erreur}
        </p>
      )}
    </div>
  );
}
