"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  FileText,
  Check,
  Copy,
  Download,
  Hourglass,
  Landmark,
  Loader2,
  Percent,
  RotateCw,
  Search,
  Wallet,
  X,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import FilterTabs from "@/components/ui/FilterTabs";
import StatCard from "@/components/ui/StatCard";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toaster";
import { adminErrorMessage } from "@/lib/api/errors";
import { bps, centimes } from "@/lib/api/money";
import {
  PAYMENT_METHOD_LABEL,
  STATEMENT_BLOCKER_LABEL,
  transferLabel,
  usePayableLinesExport,
  useStatementDownload,
  useChefPayouts,
  useMarkPayoutsPaid,
  usePayoutChefSearch,
  usePayoutsSummary,
  useReconcileNow,
  type PayableLine,
  type PayoutChefHit,
  type PayoutLine,
  type PayoutPeriod,
  type PayoutView,
} from "@/lib/api/payouts";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   Versements aux batch cookers (« prix net », 25/11/2026).

   Une fiche à la fois : à cent batch cookers, une liste de cartes ne se gère
   plus. On cherche, on ouvre, on verse. Les filtres (à verser, en attente
   d'encaissement, versés) et la période agissent sur la fiche ouverte.
   ───────────────────────────────────────────────────────────────────────────── */

const VIEWS: { id: PayoutView; label: string }[] = [
  { id: "payable", label: "À verser" },
  { id: "awaiting", label: "En attente d'encaissement" },
  { id: "paid", label: "Versés" },
];

/** « Tout », puis le mois en cours et les cinq précédents. */
function periodOptions(now = new Date()) {
  const out: { id: string; label: string; period: PayoutPeriod }[] = [
    { id: "all", label: "Toute période", period: {} },
  ];
  for (let i = 0; i < 6; i += 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    out.push({
      id: iso(start),
      label: start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
      period: { from: iso(start), to: iso(end) },
    });
  }
  return out;
}

const heure = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const dateCourte = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR") : "—";

export default function VoletVersements({
  chefId,
  onChefChange,
}: {
  chefId: string | null;
  onChefChange: (id: string | null) => void;
}) {
  const resume = usePayoutsSummary();
  const s = resume.data;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cream-deep text-navy">
          <Wallet className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold text-navy">Prix nets à verser</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-mid">
            La SAS facture le client avec la TVA et encaisse tout. Elle achète la prestation
            du batch cooker au prix net et lui verse ce montant. Une ligne n&apos;est à verser
            qu&apos;une fois son argent arrivé sur le compte bancaire et rapproché.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          Icon={Banknote}
          tone="navy"
          label="À verser"
          value={centimes(s?.payableCents)}
          sub={
            s
              ? `${s.payableChefs} batch cooker${s.payableChefs > 1 ? "s" : ""}${
                  s.lateChefs > 0 ? `, dont ${s.lateChefs} en retard` : ""
                }`
              : undefined
          }
          loading={resume.isPending}
        />
        <StatCard
          Icon={Percent}
          tone="teal"
          label="TVA collectée sur ces prestations"
          value={centimes(s?.vatCents)}
          loading={resume.isPending}
        />
        <StatCard
          Icon={Landmark}
          tone="terra"
          label="Marge Lab’s Food (part + frais CESU)"
          value={centimes(s?.marginCents)}
          loading={resume.isPending}
        />
        <StatCard
          Icon={Hourglass}
          tone="teal"
          label="En attente d'encaissement"
          value={centimes(s?.awaitingCents)}
          loading={resume.isPending}
        />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <ChefSearch onPick={onChefChange} />
        <Rapprochement lastAt={s?.lastReconciliation?.at ?? null} />
      </div>

      {chefId ? (
        <FicheVersements
          key={chefId}
          chefProfileId={chefId}
          onClose={() => onChefChange(null)}
        />
      ) : (
        <div className="card">
          <EmptyState
            Icon={Search}
            title="Cherchez un batch cooker"
            text="Par nom, ville, e-mail ou référence de réservation. Sans rien taper, la liste montre ceux qui ont de l'argent à recevoir."
          />
        </div>
      )}
    </div>
  );
}

/* ── La recherche ──────────────────────────────────────────────────────────── */

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function ChefSearch({ onPick }: { onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const debounced = useDebounced(q, 200);
  const hits = usePayoutChefSearch(debounced, open);
  const list = hits.data ?? [];

  // « / » place le curseur dans la recherche, comme dans les consoles connues (Jacob).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (hit: PayoutChefHit) => {
    onPick(hit.chefProfileId);
    setOpen(false);
    setQ(hit.displayName);
    input.current?.blur();
  };

  return (
    <div className="relative w-full max-w-xl">
      <label className="relative block">
        <span className="sr-only">Chercher un batch cooker</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
        <input
          ref={input}
          value={q}
          role="combobox"
          aria-expanded={open}
          aria-controls="versements-resultats"
          aria-autocomplete="list"
          placeholder="Nom, ville, e-mail ou référence (LF-2026-0142)"
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, list.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && list[active]) {
              e.preventDefault();
              pick(list[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="input-base h-11 w-full pl-9 pr-10 text-sm"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-sm border border-cream-deep px-1.5 text-xs font-semibold text-ink-soft">
          /
        </kbd>
      </label>

      {open && (
        <div
          id="versements-resultats"
          role="listbox"
          className="absolute z-20 mt-1 w-full rounded-md bg-paper p-1 shadow-[0_8px_24px_-12px_rgba(0,35,75,0.35)]"
        >
          {hits.isPending ? (
            <SkeletonGroup className="space-y-1 p-1">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 rounded-sm" />
              ))}
            </SkeletonGroup>
          ) : hits.isError ? (
            <p className="px-3 py-3 text-sm text-danger">{adminErrorMessage(hits.error)}</p>
          ) : list.length === 0 ? (
            <p className="px-3 py-3 text-sm text-ink-soft">
              {q.trim() ? "Aucun batch cooker ne correspond." : "Personne n'attend de versement."}
            </p>
          ) : (
            <>
              <p className="px-3 pb-1 pt-2 text-xs font-semibold text-ink-soft">
                {list.length} batch cooker{list.length > 1 ? "s" : ""} · triés par montant à verser
              </p>
              {list.map((hit, i) => (
                <button
                  key={hit.chefProfileId}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(hit)}
                  className={cn(
                    "flex min-h-10 w-full items-center justify-between gap-3 rounded-sm px-3 py-2 text-left text-sm",
                    i === active && "bg-cream-soft",
                  )}
                >
                  <span className="min-w-0 truncate">
                    <span className="font-semibold text-navy">{hit.displayName}</span>
                    <span className="text-ink-soft">
                      {hit.city ? ` · ${hit.city}` : ""} · {hit.tierLabel}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums">
                    {hit.payableCents > 0 ? (
                      <span className="font-semibold text-navy">{centimes(hit.payableCents)}</span>
                    ) : hit.awaitingCents > 0 ? (
                      <span className="text-ink-soft">en attente {centimes(hit.awaitingCents)}</span>
                    ) : (
                      <span className="text-ink-soft">{centimes(0)}</span>
                    )}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Le rapprochement ──────────────────────────────────────────────────────── */

function Rapprochement({ lastAt }: { lastAt: string | null }) {
  const toast = useToast();
  const rapprocher = useReconcileNow();
  const exporter = usePayableLinesExport();

  return (
    <div className="flex flex-wrap items-center gap-3">
      {lastAt && (
        <span className="text-xs text-ink-soft">
          Rapproché à <span className="font-mono tabular-nums">{heure(lastAt)}</span>
        </span>
      )}
      <button
        type="button"
        disabled={rapprocher.isPending}
        onClick={() =>
          rapprocher.mutate(undefined, {
            onSuccess: (run) => {
              if (!run.configured) {
                toast.info(
                  "Banque pas encore connectée",
                  "Les accès au compte bancaire ne sont pas configurés : rien n'a été lu.",
                );
              } else {
                toast.success(
                  `${run.matched} rapproché${run.matched > 1 ? "s" : ""} sur ${run.received} reçu${run.received > 1 ? "s" : ""}`,
                  run.exceptions > 0
                    ? `${run.exceptions} virement${run.exceptions > 1 ? "s" : ""} sans réservation reconnue.`
                    : undefined,
                );
              }
            },
            onError: (e) => toast.error("Rapprochement impossible", adminErrorMessage(e)),
          })
        }
        className="btn btn-sm btn-outline"
      >
        {rapprocher.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
        ) : (
          <RotateCw className="h-3.5 w-3.5" />
        )}
        Rapprocher maintenant
      </button>
      <button
        type="button"
        disabled={exporter.isPending}
        onClick={() =>
          exporter.mutate(undefined, {
            onSuccess: (lines) =>
              lines.length === 0
                ? toast.info("Rien à exporter", "Aucune ligne à verser aujourd'hui.")
                : exportDayCsv(lines),
            onError: (e) => toast.error("Export impossible", adminErrorMessage(e)),
          })
        }
        className="btn btn-sm btn-outline"
      >
        {exporter.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        Exporter la journée (CSV)
      </button>
    </div>
  );
}

/* ── La fiche ──────────────────────────────────────────────────────────────── */

function FicheVersements({
  chefProfileId,
  onClose,
}: {
  chefProfileId: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [view, setView] = useState<PayoutView>("payable");
  const periods = useMemo(() => periodOptions(), []);
  const [periodId, setPeriodId] = useState("all");
  const period = periods.find((p) => p.id === periodId)?.period ?? {};
  const fiche = useChefPayouts(chefProfileId, view, period);
  const verser = useMarkPayoutsPaid();
  const [aConfirmer, setAConfirmer] = useState(false);
  const [copie, setCopie] = useState(false);

  const data = fiche.data;
  const lines = data?.lines ?? [];
  const blockers = data?.chef.statementBlockers ?? [];
  const libelle = transferLabel(lines);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(libelle);
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
    } catch {
      toast.error("Copie impossible", "Sélectionnez le libellé à la main.");
    }
  };

  return (
    <section className="card p-5">
      {fiche.isPending ? (
        <SkeletonGroup className="space-y-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-40 w-full" />
        </SkeletonGroup>
      ) : fiche.isError ? (
        <div className="py-8 text-center">
          <p className="font-display text-base font-bold text-navy">Fiche indisponible</p>
          <p className="mt-1 text-sm text-ink-soft">{adminErrorMessage(fiche.error)}</p>
          <button onClick={() => fiche.refetch()} className="btn btn-sm btn-outline mt-4">
            Réessayer
          </button>
        </div>
      ) : data ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-navy">
                  {data.chef.displayName}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fermer la fiche"
                  className="hit flex h-8 w-8 items-center justify-center rounded-md text-ink-soft hover:text-navy"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-0.5 text-xs text-ink-mid">
                {data.chef.tierLabel}
                {data.chef.city ? ` · ${data.chef.city}` : ""} ·{" "}
                {data.chef.ibanLast4 ? (
                  <>
                    IBAN <span className="font-mono">•••• {data.chef.ibanLast4}</span>
                  </>
                ) : (
                  "IBAN non renseigné"
                )}
              </p>
              {view === "payable" && lines.length > 0 && (
                <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-mid">
                  Libellé du virement :
                  <span className="font-mono text-ink">{libelle}</span>
                  <button
                    type="button"
                    onClick={copier}
                    className="btn btn-sm btn-outline h-8 px-2"
                    aria-label="Copier le libellé du virement"
                  >
                    {copie ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </p>
              )}
            </div>

            {view === "payable" && lines.length > 0 && (
              <div className="text-right">
                <p className="font-display text-2xl font-bold tabular-nums text-navy">
                  {centimes(data.totalNetCents)}
                </p>
                <button
                  type="button"
                  disabled={blockers.length > 0}
                  title={
                    blockers.length > 0
                      ? "Complétez d'abord l'identité légale du batch cooker"
                      : undefined
                  }
                  onClick={() => setAConfirmer(true)}
                  className="btn btn-sm btn-navy mt-2"
                >
                  Marquer versé
                </button>
              </div>
            )}
          </div>

          {blockers.length > 0 && view === "payable" && lines.length > 0 && (
            <p className="mt-4 flex items-start gap-2 rounded-md bg-warning-soft p-3 text-[13px] leading-relaxed text-[#8A6212]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                L&apos;autofacture ne peut pas être émise : il manque{" "}
                {blockers.map((b) => STATEMENT_BLOCKER_LABEL[b]).join(", ")}. Complétez la
                fiche légale du batch cooker avant de faire le virement.
              </span>
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <FilterTabs<PayoutView>
                value={view}
                onChange={setView}
                options={VIEWS.map((v) => ({ ...v, count: data.counts[v.id] }))}
              />
              <label className="flex items-center gap-2 text-xs font-semibold text-ink-mid">
                Période
                <select
                  value={periodId}
                  onChange={(e) => setPeriodId(e.target.value)}
                  className="input-base h-9 text-sm"
                >
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {lines.length > 0 && (
              <button
                type="button"
                onClick={() => exportCsv(data.chef.displayName, view, lines)}
                className="btn btn-sm btn-outline"
              >
                <Download className="h-3.5 w-3.5" /> Exporter (CSV)
              </button>
            )}
          </div>

          {lines.length === 0 ? (
            <EmptyState
              Icon={Wallet}
              title={
                view === "payable"
                  ? "Rien à verser"
                  : view === "awaiting"
                    ? "Rien en attente"
                    : "Aucun versement"
              }
              text={
                view === "payable"
                  ? "Tout ce que la SAS a reçu pour ce batch cooker lui a été versé."
                  : view === "awaiting"
                    ? "Aucun CESU déclaré ni avance immédiate en cours pour ce batch cooker."
                    : "Aucun versement sur cette période."
              }
            />
          ) : (
            <TableVersements lines={lines} view={view} />
          )}

          {view === "awaiting" && lines.length > 0 && (
            <p className="mt-3 text-xs text-ink-soft">
              Estimation aux taux du jour. Les montants sont figés à l&apos;arrivée de l&apos;argent.
            </p>
          )}

          <ConfirmDialog
            open={aConfirmer}
            onClose={() => setAConfirmer(false)}
            pending={verser.isPending}
            error={verser.error ? adminErrorMessage(verser.error) : null}
            title={`Marquer ${centimes(data.totalNetCents)} versés à ${data.chef.displayName} ?`}
            lead="À faire une fois le virement parti du compte de la SAS. Les lignes passent dans « Versés », la part Lab’s Food est encaissée et l'autofacture est émise au nom du batch cooker."
            detail={`Libellé : ${libelle}`}
            confirmLabel="Le virement est fait"
            onConfirm={() =>
              verser.mutate(
                {
                  chefProfileId,
                  payoutIds: lines.map((l) => l.id).filter((id): id is string => id !== null),
                  reference: libelle,
                },
                {
                  onSuccess: (r) => {
                    setAConfirmer(false);
                    toast.success(
                      `${centimes(r.netCents)} versés`,
                      `Autofacture ${r.statementNumber} émise, ${r.paid} ligne${r.paid > 1 ? "s" : ""} en « Versés ».`,
                    );
                  },
                },
              )
            }
          />
        </>
      ) : null}
    </section>
  );
}

function TableVersements({ lines, view }: { lines: PayoutLine[]; view: PayoutView }) {
  const total = lines.reduce((sum, l) => sum + l.netCents, 0);
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[920px] table-fixed text-sm">
        <colgroup>
          <col className="w-[13%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-[13%]" />
          <col className="w-[10%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-cream-deep text-left text-xs font-semibold text-ink-soft">
            <th className="px-2 py-2">Réservation</th>
            <th className="px-2 py-2">Paiement</th>
            <th className="px-2 py-2 text-right">Prix TTC</th>
            <th className="px-2 py-2 text-right">TVA</th>
            <th className="px-2 py-2 text-right">Prix HT</th>
            <th className="px-2 py-2 text-right">Part Lab’s Food</th>
            <th className="px-2 py-2 text-right">Frais CESU</th>
            <th className="px-2 py-2 text-right">Net à verser</th>
            <th className="px-2 py-2">{view === "paid" ? "Versé le" : "Encaissement"}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.paymentId} className="border-b border-cream-soft align-top">
              <td className="px-2 py-2.5 font-mono text-xs">{l.bookingReference ?? "—"}</td>
              <td className="px-2 py-2.5">{PAYMENT_METHOD_LABEL[l.method]}</td>
              <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums">
                {centimes(l.amountTtcCents)}
              </td>
              <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums">
                {centimes(l.amountVatCents)}{" "}
                <span className="text-ink-soft">({bps(l.vatRateBps)})</span>
              </td>
              <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums">
                {centimes(l.amountHtCents)}
              </td>
              <td
                className="px-2 py-2.5 text-right font-mono text-xs tabular-nums"
                title={`${bps(l.commissionRateBps)} du HT`}
              >
                − {centimes(l.commissionCents)}
              </td>
              <td
                className="px-2 py-2.5 text-right font-mono text-xs tabular-nums"
                title={l.cesuFeeCents ? `${bps(l.cesuFeeBps)} de la part CESU nette` : undefined}
              >
                {l.cesuFeeCents ? `− ${centimes(l.cesuFeeCents)}` : "—"}
              </td>
              <td className="px-2 py-2.5 text-right font-mono text-xs font-semibold tabular-nums text-navy">
                {centimes(l.netCents)}
              </td>
              <td className="px-2 py-2.5">
                {view === "paid" ? (
                  <span className="flex items-center gap-1">
                    <span className="font-mono text-xs tabular-nums">{dateCourte(l.paidAt)}</span>
                    {l.statementId && <StatementLink statementId={l.statementId} />}
                  </span>
                ) : view === "awaiting" ? (
                  <Badge tone="warning">
                    {l.method === "cesu" ? "CESU non reçu" : "URSSAF en cours"}
                  </Badge>
                ) : l.late ? (
                  <Badge tone="danger">En retard</Badge>
                ) : (
                  <Badge tone="success">Rapproché</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        {lines.length > 1 && (
          <tfoot>
            <tr className="font-semibold text-navy">
              <td className="px-2 py-2.5" colSpan={7}>
                Total
              </td>
              <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums">
                {centimes(total)}
              </td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function StatementLink({ statementId }: { statementId: string }) {
  const toast = useToast();
  const lien = useStatementDownload();
  return (
    <button
      type="button"
      aria-label="Télécharger l'autofacture"
      title="Autofacture et relevé"
      disabled={lien.isPending}
      onClick={() =>
        lien.mutate(statementId, {
          onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
          onError: (e) => toast.error("Autofacture indisponible", adminErrorMessage(e)),
        })
      }
      className="hit flex h-8 w-8 items-center justify-center rounded-md text-ink-soft hover:text-navy"
    >
      {lien.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
      ) : (
        <FileText className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

const eurosCsv = (c: number) => (c / 100).toFixed(2).replace(".", ",");

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Toutes les lignes à verser de la journée, tous batch cookers. */
function exportDayCsv(lines: PayableLine[]) {
  const jour = new Date().toISOString().slice(0, 10);
  downloadCsv(`versements-a-faire-${jour}.csv`, [
    ["Batch cooker", "Réservation", "Paiement", "Prix TTC", "Taux TVA", "TVA", "Prix HT", "Part Lab’s Food", "Frais CESU", "Net à verser", "Reçu le", "En retard"],
    ...lines.map((l) => [
      l.chefName,
      l.bookingReference ?? "",
      PAYMENT_METHOD_LABEL[l.method],
      eurosCsv(l.amountTtcCents),
      bps(l.vatRateBps),
      eurosCsv(l.amountVatCents),
      eurosCsv(l.amountHtCents),
      eurosCsv(l.commissionCents),
      eurosCsv(l.cesuFeeCents),
      eurosCsv(l.netCents),
      dateCourte(l.receivedAt),
      l.late ? "oui" : "non",
    ]),
  ]);
}

/** Le détail de la fiche ouverte, pour le comptable ou le virement. */
function exportCsv(chef: string, view: PayoutView, lines: PayoutLine[]) {
  const euros = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  const header = [
    "Réservation",
    "Paiement",
    "Prix TTC",
    "Taux TVA",
    "TVA",
    "Prix HT",
    "Taux part Lab’s Food",
    "Part Lab’s Food",
    "Taux frais CESU",
    "Frais CESU",
    "Net à verser",
    "Reçu le",
    "Versé le",
  ];
  const rows = lines.map((l) => [
    l.bookingReference ?? "",
    PAYMENT_METHOD_LABEL[l.method],
    euros(l.amountTtcCents),
    bps(l.vatRateBps),
    euros(l.amountVatCents),
    euros(l.amountHtCents),
    bps(l.commissionRateBps),
    euros(l.commissionCents),
    bps(l.cesuFeeBps),
    euros(l.cesuFeeCents),
    euros(l.netCents),
    dateCourte(l.receivedAt),
    dateCourte(l.paidAt),
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `versements-${chef.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}-${view}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
