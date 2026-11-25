"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Loader2, Search, ShieldAlert, UserMinus, UserPlus } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";
import {
  CHEF_STATE_LABEL,
  CHEF_STATE_TONE,
  useAdminChef,
  useAdminChefs,
  type AdminChef,
} from "@/lib/api/chefs";
import {
  useOfferLabsFoodMenu,
  useOfferMeal,
  useWithdrawLabsFoodMenuOffer,
  useWithdrawMealOffer,
} from "@/lib/api/catalog";
import { adminErrorMessage } from "@/lib/api/errors";

/* ─────────────────────────────────────────────────────────────────────────────
   Réserver un plat ou un menu Lab's Food à un seul batch cooker.

   L'API (`POST /admin/{meals|menus}/{id}/offer`) le repasse en brouillon, le
   retire des suggestions communes et ne le montre plus qu'à ce batch cooker,
   dans ses offres. Il ne devient le sien que s'il l'accepte. Proposer de
   nouveau déplace l'offre vers quelqu'un d'autre ; la retirer le rend à
   Lab's Food, toujours en brouillon.

   Deux états, un seul composant : sans offre, un bloc discret dans le tiroir
   (le bouton principal reste « Modifier ») ; avec offre, l'encadré terra en
   tête, qui nomme désormais le batch cooker.
   ───────────────────────────────────────────────────────────────────────────── */

type Kind = "meal" | "menu";

const WORDS: Record<Kind, { le: string; Le: string }> = {
  meal: { le: "le plat", Le: "Le plat" },
  menu: { le: "le menu", Le: "Le menu" },
};

export default function OfferToChef({
  kind,
  id,
  name,
  offeredTo,
  published,
  blockedReason,
}: {
  kind: Kind;
  id: string;
  name: string;
  /** `offeredToChefProfileId` du plat ou du menu. */
  offeredTo: string | null | undefined;
  /** Publié aujourd'hui : l'offre le repasse en brouillon, on le dit. */
  published: boolean;
  /** Raison connue d'avance pour laquelle l'API refuserait (plat d'un menu). */
  blockedReason?: string | null;
}) {
  const toast = useToast();
  const [picking, setPicking] = useState(false);
  const withdrawMeal = useWithdrawMealOffer();
  const withdrawMenu = useWithdrawLabsFoodMenuOffer();
  const withdraw = kind === "meal" ? withdrawMeal : withdrawMenu;
  const chef = useAdminChef(offeredTo ?? undefined);

  const dialog = (
    <OfferDialog
      open={picking}
      onClose={() => setPicking(false)}
      kind={kind}
      id={id}
      name={name}
      published={published}
      currentChefId={offeredTo ?? null}
    />
  );

  if (offeredTo) {
    const who = chef.data?.displayName ?? chef.data?.fullName;
    return (
      <div className="rounded-2xl border border-terra/30 bg-terra/8 p-4">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-terra-deep">
          <ShieldAlert className="h-4 w-4" aria-hidden /> Réservé à un batch cooker
        </p>
        <div className="mt-2.5 flex items-center gap-2.5">
          {chef.isPending ? (
            <span className="h-8 w-40 animate-pulse rounded-md bg-terra/10" aria-hidden />
          ) : chef.data ? (
            <>
              <Avatar
                url={chef.data.avatarUrl}
                name={who}
                className="h-8 w-8 text-xs"
              />
              <div className="min-w-0">
                <Link
                  href={`/batchcookers/${chef.data.id}`}
                  className="block truncate text-sm font-semibold text-navy hover:underline"
                >
                  {who}
                </Link>
                {chef.data.city && (
                  <p className="text-xs text-ink-soft">{chef.data.city}</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-ink-soft">Batch cooker introuvable.</p>
          )}
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-ink-mid">
          Lui seul le voit, dans ses offres, et {WORDS[kind].le} ne devient le
          sien que s&apos;il l&apos;accepte. Tant que l&apos;offre tient,
          l&apos;API refuse toute modification.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() =>
              withdraw.mutate(id, {
                onSuccess: () => toast.success("Offre retirée"),
                onError: (e) =>
                  toast.error("L'offre n'a pas été retirée", adminErrorMessage(e)),
              })
            }
            disabled={withdraw.isPending}
            className="btn btn-sm border border-terra/40 text-terra-deep hover:bg-terra/10"
          >
            {withdraw.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <UserMinus className="h-3 w-3" aria-hidden />
            )}
            Retirer l&apos;offre
          </button>
          <button
            onClick={() => setPicking(true)}
            disabled={withdraw.isPending}
            className="btn btn-sm btn-ghost"
          >
            <UserPlus className="h-3 w-3" aria-hidden /> Proposer à un autre
          </button>
        </div>
        {dialog}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Proposer à un batch cooker
      </p>
      <p className="text-[13px] leading-relaxed text-ink-mid">
        Réservez {WORDS[kind].le} à un seul batch cooker : il le reçoit dans ses
        offres et il devient le sien s&apos;il l&apos;accepte.
      </p>
      {blockedReason ? (
        <p className="mt-2 text-[13px] leading-relaxed text-[#8A6212]">{blockedReason}</p>
      ) : (
        <button
          onClick={() => setPicking(true)}
          className="btn btn-sm mt-2.5 border border-[rgba(0,35,75,0.14)] text-navy hover:bg-cream-soft"
        >
          <UserPlus className="h-3 w-3" aria-hidden /> Proposer à un batch cooker
        </button>
      )}
      {dialog}
    </div>
  );
}

/** Le choix du batch cooker, puis la confirmation, dans le même dialogue. */
function OfferDialog({
  open,
  onClose,
  kind,
  id,
  name,
  published,
  currentChefId,
}: {
  open: boolean;
  onClose: () => void;
  kind: Kind;
  id: string;
  name: string;
  published: boolean;
  currentChefId: string | null;
}) {
  const toast = useToast();
  const offerMeal = useOfferMeal();
  const offerMenu = useOfferLabsFoodMenu();
  const offer = kind === "meal" ? offerMeal : offerMenu;
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<AdminChef | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // On interroge l'API quand la frappe se pose, pas à chaque lettre.
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const chefs = useAdminChefs({ q: query || undefined, sort: "name", limit: 8, enabled: open });
  const list = (chefs.data?.data ?? []).filter((c) => c.id !== currentChefId);

  const pending = offer.isPending;
  const close = () => {
    if (pending) return;
    setQ("");
    setChosen(null);
    offer.reset();
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !offer.isPending) {
        setQ("");
        setChosen(null);
        offer.reset();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, offer, onClose]);

  if (!open) return null;

  function confirm() {
    if (!chosen) return;
    offer.mutate(
      { id, chefProfileId: chosen.id },
      {
        onSuccess: () => {
          toast.success(
            `« ${name} » proposé à ${chosen.displayName}`,
            "Il le trouve dans ses offres. Vous pouvez la retirer tant qu'il n'a pas répondu.",
          );
          setQ("");
          setChosen(null);
          onClose();
        },
      },
    );
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/50 p-4"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Proposer « ${name} » à un batch cooker`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-paper p-6 shadow-[0_18px_48px_-18px_rgba(0,35,75,0.35)]"
      >
        <h2 className="font-display text-lg font-bold leading-snug text-navy">
          {currentChefId ? "Proposer à un autre batch cooker" : "Proposer à un batch cooker"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-mid">
          « {name} » ne sera visible que par lui, dans ses offres. {WORDS[kind].Le}{" "}
          devient le sien s&apos;il l&apos;accepte.
        </p>

        <label className="relative mt-4 block">
          <span className="sr-only">Chercher un batch cooker</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
            aria-hidden
          />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom, e-mail ou ville"
            className="input-base w-full pl-9"
          />
        </label>

        <div
          role="radiogroup"
          aria-label="Batch cookers"
          className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto"
        >
          {chefs.isPending ? (
            Array.from({ length: 4 }).map((_, i) => (
              <span key={i} className="block h-[52px] animate-pulse rounded-xl bg-cream-soft" aria-hidden />
            ))
          ) : list.length === 0 ? (
            <p className="rounded-xl bg-cream-soft px-3.5 py-3 text-[13px] text-ink-soft">
              {query ? `Aucun batch cooker pour « ${query} ».` : "Aucun batch cooker."}
            </p>
          ) : (
            list.map((c) => {
              const on = chosen?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setChosen(c)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                    on
                      ? "border-navy bg-cream-soft ring-1 ring-navy"
                      : "border-[rgba(0,35,75,0.08)] hover:bg-cream-soft",
                  )}
                >
                  <Avatar url={c.avatarUrl} name={c.displayName} className="h-8 w-8 text-xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-navy">
                      {c.displayName}
                    </span>
                    <span className="block truncate text-xs text-ink-soft">
                      {[c.city, c.email].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <Badge tone={CHEF_STATE_TONE[c.state]} dot>
                    {CHEF_STATE_LABEL[c.state]}
                  </Badge>
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      on ? "border-navy bg-navy text-white" : "border-[rgba(0,35,75,0.2)]",
                    )}
                  >
                    {on && <Check className="h-3 w-3" />}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {chosen && (
          <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
            {published
              ? `${WORDS[kind].Le} repasse en brouillon et quitte les suggestions des autres batch cookers.`
              : `${WORDS[kind].Le} reste en brouillon et n'apparaît chez aucun autre batch cooker.`}{" "}
            {currentChefId && "L'offre actuelle est retirée. "}
            Vous pourrez la retirer tant qu&apos;il n&apos;a pas répondu.
          </p>
        )}

        {offer.error && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-md bg-danger-soft p-3 text-[13px] leading-relaxed text-danger"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {adminErrorMessage(offer.error)}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={confirm}
            disabled={!chosen || pending}
            className="btn btn-primary"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {chosen ? `Proposer à ${chosen.displayName}` : "Choisissez un batch cooker"}
          </button>
          <button type="button" onClick={close} disabled={pending} className="btn btn-ghost">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
