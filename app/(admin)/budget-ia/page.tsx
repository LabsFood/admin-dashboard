"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import {
  AlertTriangle,
  Bot,
  Check,
  Gauge,
  Loader2,
  Save,
  Search,
  X,
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import FilterTabs from "@/components/ui/FilterTabs";
import { DataTable } from "@/components/ui/DataTable";
import { Skeleton } from "@/components/ui/Skeleton";
import { adminErrorMessage } from "@/lib/api/errors";
import { useAdminChefs } from "@/lib/api/chefs";
import {
  euros,
  useAiBreakdown,
  useAiBudgets,
  useAiDaily,
  useAiSummary,
  useRecipeImportSetting,
  useSetAiBudgets,
  useSetRecipeImportSetting,
  useUnlinkedNames,
  type AiBreakdown,
  type AiBudgets,
  type BreakdownBy,
  type Caps,
  type Period,
  type RecipeImportSetting,
} from "@/lib/api/ai-usage";

/* ─────────────────────────────────────────────────────────────────────────────
   Budget IA.

   Ce que coûte l'IA, d'où vient la dépense, et les plafonds qui la bornent.
   Huit périodes : quatre fixes en heure de Paris (jour, semaine depuis lundi,
   mois, année) et quatre fenêtres glissantes (24 h, 7, 30, 365 jours). Chaque
   appel est étiqueté (poste, fonctionnalité, tags) : le tableau dit quel usage
   consomme le plus. En bas, l'ouverture de l'import de recettes et les noms
   d'ingrédients que les imports n'ont pas su relier.
   ───────────────────────────────────────────────────────────────────────────── */

const FIXED: Period[] = ["day", "week", "month", "year"];
const ROLLING: Period[] = [
  "rolling24h",
  "rolling7d",
  "rolling30d",
  "rolling365d",
];

const AXES: { id: BreakdownBy; label: string }[] = [
  { id: "poste", label: "Postes" },
  { id: "feature", label: "Fonctionnalités" },
  { id: "tag", label: "Tags" },
  { id: "provider", label: "Fournisseurs" },
  { id: "model", label: "Modèles" },
  { id: "chef", label: "Batch cookers" },
];

const RANGES = [
  { id: "7", label: "7 jours" },
  { id: "30", label: "30 jours" },
  { id: "90", label: "90 jours" },
] as const;

export default function BudgetIaPage() {
  return (
    <div className="space-y-6">
      <Periods />
      <DailyChart />
      <Breakdown />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <BudgetsForm />
        <div className="space-y-6">
          <RecipeImportCard />
          <UnlinkedNames />
        </div>
      </div>
    </div>
  );
}

// ── Les huit périodes ───────────────────────────────────────────────────────

function Periods() {
  const summary = useAiSummary();
  const byPeriod = new Map(summary.data?.periods.map((p) => [p.period, p]));
  const card = (period: Period) => {
    const p = byPeriod.get(period);
    const reached =
      p?.percent !== null && p?.percent !== undefined && p.percent >= 100;
    return (
      <StatCard
        key={period}
        Icon={reached ? AlertTriangle : Gauge}
        tone={
          reached ? "terra" : period.startsWith("rolling") ? "teal" : "navy"
        }
        label={p?.label ?? "…"}
        value={p ? euros(p.spentCents) : "—"}
        sub={
          p
            ? p.capCents === null
              ? "Sans plafond"
              : `sur ${euros(p.capCents)} (${p.percent} %)`
            : undefined
        }
        loading={summary.isPending}
      />
    );
  };
  if (summary.isError) {
    return (
      <ErrorLine
        message={adminErrorMessage(summary.error)}
        onRetry={() => summary.refetch()}
      />
    );
  }
  return (
    <section className="space-y-3" aria-label="Dépense par période">
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
        <span>Périodes fixes, heure de Paris</span>
        {summary.data && (
          <span className="rounded-full bg-cream-deep px-2 py-0.5 font-semibold text-ink-mid">
            Mode{" "}
            {summary.data.mode === "strict"
              ? "strict : appels refusés au plafond"
              : "souple : alerte seulement"}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {FIXED.map(card)}
      </div>
      <p className="text-xs text-ink-soft">Fenêtres glissantes</p>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {ROLLING.map(card)}
      </div>
    </section>
  );
}

// ── 90 jours ────────────────────────────────────────────────────────────────

function DailyChart() {
  const daily = useAiDaily(90);
  const [hover, setHover] = useState<number | null>(null);
  const days = daily.data?.days ?? [];
  const max = Math.max(1, ...days.map((d) => d.totalCents));
  const total = days.reduce((n, d) => n + d.totalCents, 0);
  const W = 900;
  const H = 160;
  const slot = days.length ? W / days.length : W;
  const bar = Math.max(1, slot - 2); // 2 px d'écart entre barres
  const shown = hover !== null ? days[hover] : null;

  return (
    <section className="card p-5" aria-label="Dépense par jour, 90 jours">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-base font-bold text-navy">
          Dépense par jour, 90 derniers jours
        </h2>
        <p className="text-xs tabular-nums text-ink-soft">
          {shown
            ? `${new Date(shown.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} : ${euros(shown.totalCents)}, ${shown.calls} appel${shown.calls > 1 ? "s" : ""}`
            : `Total ${euros(total)}`}
        </p>
      </div>
      {daily.isPending ? (
        <Skeleton className="mt-4 h-40" />
      ) : daily.isError ? (
        <ErrorLine
          message={adminErrorMessage(daily.error)}
          onRetry={() => daily.refetch()}
        />
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H + 18}`}
          className="mt-4 h-44 w-full"
          role="img"
          aria-label={`Dépense quotidienne sur 90 jours, ${euros(total)} au total, maximum ${euros(max)} sur un jour.`}
          onMouseLeave={() => setHover(null)}
        >
          <line
            x1={0}
            x2={W}
            y1={H}
            y2={H}
            className="stroke-cream-deep"
            strokeWidth={1}
          />
          {days.map((d, i) => {
            const h =
              d.totalCents === 0
                ? 0
                : Math.max(2, (d.totalCents / max) * (H - 8));
            const x = i * slot;
            return (
              <g
                key={d.date}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                tabIndex={-1}
              >
                {/* Zone de survol plus large que la barre. */}
                <rect x={x} y={0} width={slot} height={H} fill="transparent" />
                <rect
                  x={x + 1}
                  y={H - h}
                  width={bar}
                  height={h}
                  rx={Math.min(4, bar / 2)}
                  className={hover === i ? "fill-navy" : "fill-terra"}
                />
              </g>
            );
          })}
          {days.length > 0 &&
            [0, Math.floor(days.length / 2), days.length - 1].map((i) => (
              <text
                key={i}
                x={i * slot + slot / 2}
                y={H + 14}
                textAnchor={
                  i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"
                }
                className="fill-ink-soft text-[11px]"
              >
                {new Date(days[i].date).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
              </text>
            ))}
        </svg>
      )}
    </section>
  );
}

// ── Répartition ─────────────────────────────────────────────────────────────

type Row = AiBreakdown["rows"][number];
const column = createColumnHelper<Row>();
/**
 * Pendant le chargement d'un onglet, toujours le même tableau vide : un `[]`
 * neuf à chaque rendu relance le tri, qui remet la pagination à zéro, qui
 * provoque un rendu... jusqu'à bloquer la page.
 */
const NO_ROWS: Row[] = [];

function Breakdown() {
  const [by, setBy] = useState<BreakdownBy>("poste");
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("30");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "costCents", desc: true },
  ]);
  const query = useAiBreakdown(by, Number(range));

  const columns = useMemo(
    () => [
      column.accessor("label", {
        header: AXES.find((a) => a.id === by)?.label.replace(/s$/, "") ?? "Clé",
      }),
      column.accessor("costCents", {
        header: "Coût",
        cell: (c) => euros(c.getValue()),
        meta: { cellClass: "tabular-nums" },
      }),
      column.accessor("calls", {
        header: "Appels",
        meta: { cellClass: "tabular-nums" },
      }),
      column.accessor("avgCostCents", {
        header: "Coût moyen",
        cell: (c) => euros(c.getValue()),
        meta: { cellClass: "tabular-nums" },
      }),
      column.accessor("failures", {
        header: "Échecs",
        cell: (c) => {
          const calls = c.row.original.calls;
          return calls
            ? `${c.getValue()} (${Math.round((c.getValue() / calls) * 100)} %)`
            : "0";
        },
        meta: { cellClass: "tabular-nums" },
      }),
      column.accessor("avgDurationMs", {
        header: "Durée moyenne",
        cell: (c) =>
          c.getValue() === null
            ? "—"
            : `${((c.getValue() ?? 0) / 1000).toFixed(1)} s`,
        meta: { cellClass: "tabular-nums" },
      }),
    ],
    [by],
  );

  const table = useReactTable({
    data: query.data?.rows ?? NO_ROWS,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <section
      className="card overflow-hidden"
      aria-label="Répartition de la dépense"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
        <h2 className="font-display text-base font-bold text-navy">
          Qui consomme le plus
        </h2>
        <FilterTabs
          options={RANGES.map((r) => ({ id: r.id, label: r.label }))}
          value={range}
          onChange={setRange}
        />
      </div>
      <div className="px-5 pb-3">
        <FilterTabs options={AXES} value={by} onChange={setBy} />
      </div>
      <DataTable
        table={table}
        loading={query.isPending}
        emptyLabel="Aucun appel sur la période."
        error={
          query.isError
            ? {
                message: adminErrorMessage(query.error),
                onRetry: () => query.refetch(),
              }
            : undefined
        }
      />
    </section>
  );
}

// ── Plafonds ────────────────────────────────────────────────────────────────

const toEuros = (cents: number | undefined) =>
  cents === undefined ? "" : String(cents / 100);
const toCents = (text: string): number | undefined => {
  const t = text.trim().replace(",", ".");
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
};

type CapDraft = Partial<Record<Period, string>>;
const draftOf = (caps: Caps | undefined): CapDraft =>
  Object.fromEntries(
    Object.entries(caps ?? {}).map(([k, v]) => [k, toEuros(v)]),
  );
const capsOf = (draft: CapDraft): Caps =>
  Object.fromEntries(
    Object.entries(draft).flatMap(([k, v]) => {
      const c = toCents(v ?? "");
      return c === undefined ? [] : [[k, c]];
    }),
  );

function BudgetsForm() {
  const budgets = useAiBudgets();
  return (
    <section className="card p-5" aria-label="Plafonds">
      <h2 className="font-display text-base font-bold text-navy">Plafonds</h2>
      <p className="mt-1 text-xs text-ink-soft">
        En euros. Une case vide : pas de plafond sur cette période. Alerte par
        e-mail au seuil choisi puis à 100 %, une fois par période.
      </p>
      {budgets.isPending ? (
        <Skeleton className="mt-4 h-64" />
      ) : budgets.isError ? (
        <ErrorLine
          message={adminErrorMessage(budgets.error)}
          onRetry={() => budgets.refetch()}
        />
      ) : (
        <BudgetsEditor key={budgets.dataUpdatedAt} data={budgets.data} />
      )}
    </section>
  );
}

function BudgetsEditor({ data }: { data: AiBudgets }) {
  const save = useSetAiBudgets();
  const [mode, setMode] = useState<"soft" | "strict">(data.mode);
  const [alert, setAlert] = useState(String(data.alertPercent));
  const [global, setGlobal] = useState<CapDraft>(draftOf(data.global));
  const [postes, setPostes] = useState<Record<string, CapDraft>>(
    Object.fromEntries(
      data.postesList.map((p) => [p.code, draftOf(data.postes[p.code])]),
    ),
  );
  const [done, setDone] = useState(false);

  function submit() {
    setDone(false);
    save.mutate(
      {
        mode,
        alertPercent: Math.min(
          99,
          Math.max(10, Math.round(Number(alert) || 80)),
        ),
        global: capsOf(global),
        postes: Object.fromEntries(
          Object.entries(postes).map(([k, d]) => [k, capsOf(d)]),
        ),
      },
      { onSuccess: () => setDone(true) },
    );
  }

  const periods = data.periods;
  const capRow = (
    draft: CapDraft,
    onChange: (d: CapDraft) => void,
    name: string,
  ) => (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {periods.map((p) => (
        <label key={p.code} className="block">
          <span className="text-[11px] text-ink-soft">{p.label}</span>
          <input
            inputMode="decimal"
            placeholder="—"
            aria-label={`${name}, ${p.label}, en euros`}
            value={draft[p.code] ?? ""}
            onChange={(e) => onChange({ ...draft, [p.code]: e.target.value })}
            className="input-base mt-0.5 h-9 w-full text-sm tabular-nums"
          />
        </label>
      ))}
    </div>
  );

  return (
    <div className="mt-4 space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <fieldset>
          <legend className="field-label">Au plafond</legend>
          <div className="mt-1 flex gap-2">
            {(["soft", "strict"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`btn text-xs ${mode === m ? "btn-primary" : "btn-outline"}`}
              >
                {m === "soft" ? "Alerter seulement" : "Refuser les appels"}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="field-label">Seuil d’alerte (%)</span>
          <input
            inputMode="numeric"
            value={alert}
            onChange={(e) => setAlert(e.target.value)}
            className="input-base mt-1 h-9 w-24 text-sm tabular-nums"
          />
        </label>
      </div>
      <div>
        <p className="text-sm font-semibold text-navy">Global</p>
        <div className="mt-2">{capRow(global, setGlobal, "Global")}</div>
      </div>
      {data.postesList.map((p) => (
        <div key={p.code}>
          <p className="text-sm font-semibold text-navy">{p.label}</p>
          <div className="mt-2">
            {capRow(
              postes[p.code] ?? {},
              (d) => setPostes({ ...postes, [p.code]: d }),
              p.label,
            )}
          </div>
        </div>
      ))}
      {save.isError && <ErrorLine message={adminErrorMessage(save.error)} />}
      <button
        type="button"
        onClick={submit}
        disabled={save.isPending}
        className="btn btn-primary text-xs disabled:opacity-55"
      >
        {save.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
        ) : done ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Save className="h-3.5 w-3.5" />
        )}
        {done ? "Enregistré" : "Enregistrer les plafonds"}
      </button>
    </div>
  );
}

// ── Import de recettes ──────────────────────────────────────────────────────

function RecipeImportCard() {
  const setting = useRecipeImportSetting();
  const save = useSetRecipeImportSetting();
  const [q, setQ] = useState("");
  const chefs = useAdminChefs({ q, limit: 8, enabled: q.trim().length >= 2 });
  const [draft, setDraft] = useState<RecipeImportSetting | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  const value = draft ?? setting.data;
  const dirty = JSON.stringify(value) !== JSON.stringify(setting.data);

  return (
    <section className="card p-5" aria-label="Import de recettes">
      <h2 className="flex items-center gap-2 font-display text-base font-bold text-navy">
        <Bot className="h-4 w-4" aria-hidden /> Import de recettes
      </h2>
      {!value ? (
        <Skeleton className="mt-4 h-32" />
      ) : (
        <div className="mt-3 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["off", "Fermé"],
                ["beta", "Bêta"],
                ["all", "Tous les batch cookers"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                aria-pressed={value.mode === m}
                onClick={() => setDraft({ ...value, mode: m })}
                className={`btn text-xs ${value.mode === m ? "btn-primary" : "btn-outline"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {value.mode === "beta" && (
            <div>
              <p className="field-label">
                Batch cookers de la bêta ({value.betaChefProfileIds.length})
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {value.betaChefProfileIds.map((id) => (
                  <li
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-2.5 py-1 text-xs text-ink"
                  >
                    {names[id] ?? `${id.slice(0, 8)}…`}
                    <button
                      type="button"
                      aria-label="Retirer"
                      className="text-ink-soft hover:text-danger"
                      onClick={() =>
                        setDraft({
                          ...value,
                          betaChefProfileIds: value.betaChefProfileIds.filter(
                            (x) => x !== id,
                          ),
                        })
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
              <label className="relative mt-2 block">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft"
                  aria-hidden
                />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Ajouter : nom, e-mail…"
                  className="input-base h-9 w-full pl-8 text-sm"
                />
              </label>
              {q.trim().length >= 2 && (
                <ul className="mt-1.5 space-y-1">
                  {(chefs.data?.data ?? [])
                    .filter((c) => !value.betaChefProfileIds.includes(c.id))
                    .map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-cream-soft"
                          onClick={() => {
                            setNames({ ...names, [c.id]: c.displayName });
                            setDraft({
                              ...value,
                              betaChefProfileIds: [
                                ...value.betaChefProfileIds,
                                c.id,
                              ],
                            });
                            setQ("");
                          }}
                        >
                          {c.displayName}{" "}
                          <span className="text-xs text-ink-soft">
                            {c.city ?? ""}
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
          <label className="flex items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="mt-1"
              checked={value.allowNonEuFallback}
              onChange={(e) =>
                setDraft({ ...value, allowNonEuFallback: e.target.checked })
              }
            />
            <span>
              Renfort par Claude (hors UE) quand Mistral échoue ou lit mal
              <span className="block text-xs text-ink-soft">
                À cocher seulement une fois la politique de confidentialité à
                jour.
              </span>
            </span>
          </label>
          {save.isError && (
            <ErrorLine message={adminErrorMessage(save.error)} />
          )}
          <button
            type="button"
            disabled={!dirty || save.isPending}
            onClick={() =>
              value && save.mutate(value, { onSuccess: () => setDraft(null) })
            }
            className="btn btn-primary text-xs disabled:opacity-55"
          >
            {save.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Enregistrer
          </button>
        </div>
      )}
    </section>
  );
}

// ── Ingrédients inconnus ────────────────────────────────────────────────────

function UnlinkedNames() {
  const names = useUnlinkedNames(30);
  return (
    <section className="card p-5" aria-label="Ingrédients non reliés">
      <h2 className="font-display text-base font-bold text-navy">
        Ingrédients non reliés, 30 jours
      </h2>
      <p className="mt-1 text-xs text-ink-soft">
        Les noms lus dans les imports qui ne correspondent à aucune entrée. Les
        traiter (autre nom, nouvel ingrédient ou ignorer) dans{" "}
        <Link
          href="/ingredients/a-relier"
          className="font-semibold text-navy underline"
        >
          Ingrédients, lus dans les imports
        </Link>
        .
      </p>
      {names.isPending ? (
        <Skeleton className="mt-4 h-24" />
      ) : names.isError ? (
        <ErrorLine
          message={adminErrorMessage(names.error)}
          onRetry={() => names.refetch()}
        />
      ) : names.data.length === 0 ? (
        <p className="mt-4 text-sm text-ink-mid">
          Rien à relier pour l’instant.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-cream-deep">
          {names.data.slice(0, 10).map((n) => (
            <li
              key={n.name}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <span className="text-navy">{n.name}</span>
              <span className="text-xs tabular-nums text-ink-soft">
                {n.count} fois, {n.chefs} batch cooker{n.chefs > 1 ? "s" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ErrorLine({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <p
      role="alert"
      className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
      {message}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="font-semibold underline"
        >
          Réessayer
        </button>
      )}
    </p>
  );
}
