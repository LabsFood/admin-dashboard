"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import posthog from "posthog-js";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  LayoutList,
  RotateCw,
  ShieldCheck,
  UtensilsCrossed,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import FilterTabs from "@/components/ui/FilterTabs";
import ReasonDialog from "@/components/ui/ReasonDialog";
import { useToast } from "@/components/ui/Toaster";
import ModerationDrawer from "@/components/admin/ModerationDrawer";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import { moderatedLabel, moderatedTone, reasonCodeHint, reasonCodeLabel } from "@/lib/catalog-labels";
import {
  REASON_CODES,
  reviewFlagText,
  useMarkReviewed,
  useModerate,
  useReviewQueue,
  type ReasonCode,
  type ReviewItem,
  type ReviewKind,
} from "@/lib/api/moderation";
import { adminErrorMessage } from "@/lib/api/errors";

/* ─────────────────────────────────────────────────────────────────────────────
   Modération du catalogue des batch cookers.

   Ce contenu ne s'édite pas : il appartient à son auteur. La console le relit,
   et au besoin le retire du public avec un motif que l'auteur lira mot pour
   mot. Trois gestes, pas quatre.

   La file par défaut est `review=pending` : ce qui a été publié et que
   personne n'a encore regardé. C'est le travail du jour, pas l'inventaire.
   ───────────────────────────────────────────────────────────────────────────── */

type Scope = "pending" | "all";
type KindFilter = "both" | ReviewKind;
const PAGE_SIZE = 25;

export default function ModerationPage() {
  const [scope, setScope] = useState<Scope>("pending");
  const [kind, setKind] = useState<KindFilter>("both");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const queue = useReviewQueue({
    page,
    limit: PAGE_SIZE,
    review: scope === "pending" ? "pending" : undefined,
    type: kind === "both" ? undefined : kind,
  });

  const items = queue.data?.items ?? [];
  const meta = queue.data?.meta ?? null;
  const open = items.find((i) => i.id === openId) ?? null;

  const changeScope = (s: Scope) => {
    setScope(s);
    setPage(1);
  };
  const changeKind = (k: KindFilter) => {
    setKind(k);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="card flex flex-wrap items-center justify-between gap-4 p-6"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-pale text-teal">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold text-navy">
              {queue.isPending
                ? "Lecture de la file…"
                : scope === "pending"
                  ? `${meta?.total ?? items.length} à relire`
                  : `${meta?.total ?? items.length} publications`}
            </h2>
            <p className="text-sm text-ink-soft">
              {scope === "pending"
                ? "Les plats et menus mis en ligne que personne n'a encore regardés."
                : "Tout ce que les batch cookers ont publié, relu ou non."}
            </p>
          </div>
        </div>
        <div className="hairline flex items-center gap-1 rounded-full border bg-paper p-1">
          {(
            [
              { id: "pending", label: "À relire" },
              { id: "all", label: "Tout" },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={scope === id}
              onClick={() => changeScope(id)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-semibold transition-colors",
                scope === id ? "bg-navy text-white" : "text-ink-mid hover:text-navy",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </motion.section>

      <FilterTabs<KindFilter>
        value={kind}
        onChange={changeKind}
        options={[
          { id: "both", label: "Plats et menus" },
          { id: "dish", label: "Plats seuls" },
          { id: "menu", label: "Menus seuls" },
        ]}
      />

      {queue.isError ? (
        <section className="card p-6">
          <p className="flex items-start gap-2 text-sm text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {adminErrorMessage(queue.error)}
          </p>
          <button onClick={() => queue.refetch()} className="btn btn-outline btn-sm mt-4">
            <RotateCw className="h-3 w-3" aria-hidden /> Réessayer
          </button>
        </section>
      ) : queue.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-20 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <section className="card">
          <EmptyState
            Icon={ShieldCheck}
            title={scope === "pending" ? "Rien à relire" : "Aucune publication"}
            text={
              scope === "pending"
                ? "Tout ce qui a été publié a été regardé. La file se remplira d'elle-même."
                : "Les batch cookers n'ont encore rien mis en ligne."
            }
          />
        </section>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((item, i) => (
              <QueueRow
                key={item.id || i}
                item={item}
                onOpen={() => setOpenId(item.id)}
                delay={Math.min(i * 0.03, 0.3)}
              />
            ))}
          </ul>

          {meta && meta.totalPages > 1 && (
            <nav
              aria-label="Pagination de la file"
              className="flex items-center justify-between"
            >
              <p className="text-[13px] text-ink-soft">
                Page {meta.page} sur {meta.totalPages} · {meta.total} au total
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!meta.hasPreviousPage}
                  className="btn btn-outline btn-sm"
                >
                  <ChevronLeft className="h-3 w-3" aria-hidden /> Précédent
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!meta.hasNextPage}
                  className="btn btn-outline btn-sm"
                >
                  Suivant <ChevronRight className="h-3 w-3" aria-hidden />
                </button>
              </div>
            </nav>
          )}
        </>
      )}

      <ModerationDrawer item={open} onClose={() => setOpenId(null)} />
    </div>
  );
}

/* ── Une ligne de la file ──────────────────────────────────────────────────── */

function QueueRow({
  item,
  onOpen,
  delay,
}: {
  item: ReviewItem;
  onOpen: () => void;
  delay: number;
}) {
  const toast = useToast();
  const review = useMarkReviewed();
  const moderate = useModerate();
  const [dialog, setDialog] = useState<"suspend" | "reinstate" | null>(null);

  const Icon = item.kind === "menu" ? LayoutList : UtensilsCrossed;
  /*
   * Ce qui mérite un regard vient de `flags`, décidé par l'API.
   *
   * On le calculait ici depuis `allergens` et `allergensNone` — deux champs
   * que cette route n'envoie pas. Résultat : « allergènes non déclarés »
   * s'affichait sur **chaque** ligne de la file, y compris les fiches
   * complètes.
   */
  const drapeaux = item.flags;

  function markReviewed() {
    review.mutate(
      { id: item.id, kind: item.kind },
      {
        onSuccess: () => {
          posthog.capture("moderation_item_reviewed", {
            content_type: item.kind,
          });
          toast.success(`« ${item.name} » marqué comme relu`, "Il quitte la file.");
        },
        onError: (e) => toast.error("Le marquage a échoué", adminErrorMessage(e)),
      },
    );
  }

  function decide(
    status: "suspended" | "published",
    reason: string,
    extra: { code?: string; notify: boolean },
  ) {
    moderate.mutate(
      {
        id: item.id,
        kind: item.kind,
        status,
        reason,
        ...(status === "suspended" && extra.code
          ? { reasonCode: extra.code as ReasonCode }
          : {}),
        ...(status === "suspended" ? { notifyChef: extra.notify } : {}),
      },
      {
        onSuccess: () => {
          posthog.capture(
            status === "suspended" ? "moderation_item_suspended" : "moderation_item_reinstated",
            {
              content_type: item.kind,
              notify_chef: status === "suspended" ? extra.notify : undefined,
            },
          );
          setDialog(null);
          toast.success(
            status === "suspended"
              ? `« ${item.name} » est retiré du public`
              : `« ${item.name} » est de nouveau en ligne`,
            status === "suspended" && extra.notify
              ? "Le batch cooker reçoit le motif par email."
              : undefined,
          );
        },
        onError: (e) =>
          toast.error(
            status === "suspended" ? "La suspension a échoué" : "La remise en ligne a échoué",
            adminErrorMessage(e),
          ),
      },
    );
  }

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.16, 1, 0.3, 1] }}
      className="card p-4"
    >
      <div className="flex flex-wrap items-center gap-4">
        {/*
         * La vignette revient : la ligne porte `imageUrl` depuis le 17/10. Un
         * contenu sans photo garde son icône plutôt qu'un cadre vide — c'est
         * aussi une information pour le modérateur.
         */}
        {item.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.imageUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-cream-deep text-ink-soft"
          >
            <Icon className="h-5 w-5" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpen}
              className="truncate text-sm font-semibold text-navy underline-offset-2 hover:underline"
            >
              {item.name}
            </button>
            <Badge tone={moderatedTone[item.status]} dot>
              {moderatedLabel[item.status]}
            </Badge>
            {item.kind === "menu" && (
              <Badge tone="navy">
                Menu{item.dishCount != null ? ` · ${item.dishCount} plats` : ""}
              </Badge>
            )}
            {drapeaux.map((f) => (
              <Badge
                key={f}
                tone={f === "no-allergens-declared" ? "warning" : "info"}
                dot
              >
                {reviewFlagText(f)}
              </Badge>
            ))}
          </div>
          <p className="mt-1 truncate font-mono text-[11px] text-ink-soft">
            {[
              item.chefName ?? "Batch cooker inconnu",
              item.kind === "menu" && item.dishCount != null
                ? `${item.dishCount} plats`
                : null,
              /* Un menu ne déclare pas ses allèrgènes : ses plats le font. */
              item.kind === "dish" && item.prepMinutes != null
                ? `${item.prepMinutes} min`
                : null,
              item.kind === "dish" && item.allergensNone
                ? "sans allèrgène déclaré"
                : item.kind === "dish" && item.allergens.length > 0
                  ? `${item.allergens.length} allèrgène${item.allergens.length > 1 ? "s" : ""}`
                  : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {item.publishedAt && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-ink-soft">
              <Clock className="h-3 w-3" aria-hidden />
              publié {timeAgo(item.publishedAt)}
              {item.reviewedAt && ` · relu le ${formatDate(item.reviewedAt)}`}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button onClick={onOpen} className="btn btn-sm btn-outline">
            <Eye className="h-3 w-3" aria-hidden /> Voir la fiche
          </button>
          {item.status === "published" && (
            <>
              {/* En attente, pas « jamais relu » : une fiche modifiée ou republiée revient avec sa date de relecture. */}
              {item.pendingSince && (
                <button
                  onClick={markReviewed}
                  disabled={review.isPending}
                  className="btn btn-sm btn-ghost"
                >
                  <ShieldCheck className="h-3 w-3" aria-hidden /> Relu
                </button>
              )}
              <button
                onClick={() => setDialog("suspend")}
                className="btn btn-sm border border-danger/40 text-danger hover:bg-danger-soft"
              >
                <EyeOff className="h-3 w-3" aria-hidden /> Suspendre
              </button>
            </>
          )}
          {item.status === "suspended" && (
            <button
              onClick={() => setDialog("reinstate")}
              className="btn btn-sm border border-success/40 text-success hover:bg-success-soft"
            >
              <Eye className="h-3 w-3" aria-hidden /> Remettre en ligne
            </button>
          )}
        </div>
      </div>

      <ReasonDialog
        open={dialog === "suspend"}
        onClose={() => setDialog(null)}
        title={`Suspendre « ${item.name} »`}
        lead="La fiche quitte le public immédiatement. Le batch cooker lit ce motif mot pour mot : dites ce qui bloque et ce qu'il doit corriger."
        placeholder="La recette contient du beurre et de la crème, mais le lait n'est pas déclaré dans les allergènes."
        confirmLabel="Suspendre"
        pending={moderate.isPending}
        error={moderate.isError ? adminErrorMessage(moderate.error) : null}
        codes={REASON_CODES.map((c) => ({
          code: c,
          label: reasonCodeLabel[c],
          hint: reasonCodeHint[c],
        }))}
        notify={{
          label: "Prévenir le batch cooker par email",
          hint: "Sans email, il découvrira la suspension en ouvrant sa vitrine.",
          defaultOn: true,
        }}
        onConfirm={(reason, extra) => decide("suspended", reason, extra)}
      />

      <ReasonDialog
        open={dialog === "reinstate"}
        onClose={() => setDialog(null)}
        title={`Remettre « ${item.name} » en ligne`}
        lead="La fiche redevient publique. Le motif reste au dossier : il dit pourquoi la suspension est levée."
        placeholder="Les allergènes ont été corrigés : le lait est maintenant déclaré."
        confirmLabel="Remettre en ligne"
        pending={moderate.isPending}
        error={moderate.isError ? adminErrorMessage(moderate.error) : null}
        onConfirm={(reason, extra) => decide("published", reason, extra)}
      />
    </motion.li>
  );
}
