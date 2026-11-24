"use client";

import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AlertTriangle, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   Une carte de formulaire repliable (accordéon).

   - Repliée, elle dit en une ligne ce qu'elle contient (`summary`) et liste ses
     alertes (`notes`) : on relit une fiche sans tout ouvrir.
   - Le contenu reste monté (attribut `hidden`) : l'état des champs, leurs ids
     et la validation du formulaire ne dépendent pas de l'ouverture.
   - Un champ invalide d'une carte repliée l'ouvre avant que le navigateur ne
     le montre (`invalid`), et `revealSection` l'ouvre avant un focus.
   - Mouvement : rotation du chevron seulement, 120 ms, coupée en reduced-motion.
   ───────────────────────────────────────────────────────────────────────────── */

export type SectionNote = { tone: "danger" | "warning" | "info"; text: string };

const REVEAL = "lf:reveal-section";
/** Repliée, la carte montre au plus ce nombre d'alertes (Miller), puis « et N autres ». */
const MAX_NOTES = 3;

/** Ouvre la carte repliée qui contient `el`, de façon synchrone (avant un focus). */
export function revealSection(el: Element | null | undefined) {
  el?.closest("[data-section-body]")?.dispatchEvent(new Event(REVEAL));
}

const TONE: Record<SectionNote["tone"], string> = {
  danger: "text-danger",
  warning: "text-[#8A6212]",
  info: "text-ink-mid",
};

export default function SectionCard({
  title,
  aside,
  summary,
  notes = [],
  defaultOpen = false,
  className,
  children,
}: {
  title: string;
  /** À côté du titre, hors du bouton (ex. `InfoPopover`). */
  aside?: React.ReactNode;
  /** Une ligne qui décrit le contenu, lue quand la carte est repliée. */
  summary?: string;
  /** Les alertes de la carte, lues quand elle est repliée. */
  notes?: SectionNote[];
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = body.current;
    if (!el) return;
    // Synchrone : l'appelant donne le focus juste après.
    const reveal = () => flushSync(() => setOpen(true));
    el.addEventListener(REVEAL, reveal);
    // Capture : `invalid` ne remonte pas, et le navigateur montre le champ juste après.
    el.addEventListener("invalid", reveal, true);
    return () => {
      el.removeEventListener(REVEAL, reveal);
      el.removeEventListener("invalid", reveal, true);
    };
  }, []);

  const worst = notes.some((n) => n.tone === "danger")
    ? "danger"
    : notes.some((n) => n.tone === "warning")
      ? "warning"
      : null;

  return (
    <section className={cn("card p-6", className)}>
      <div className="flex items-start gap-1">
        <h3 className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={bodyId}
            className="group -m-2 flex w-[calc(100%+1rem)] items-start gap-2 rounded-md p-2 text-left"
          >
            <ChevronRight
              aria-hidden
              className={cn(
                // Retour d'action : le chevron tourne en 120 ms, coupé en reduced-motion.
                "mt-1 h-4 w-4 shrink-0 text-ink-soft transition-transform duration-[120ms] group-hover:text-navy motion-reduce:transition-none",
                open && "rotate-90",
              )}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-display text-base font-bold text-navy">
                {title}
                {!open && worst && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 font-sans text-[11px] font-semibold",
                      worst === "danger"
                        ? "bg-danger-soft text-danger"
                        : "bg-warning-soft text-[#8A6212]",
                    )}
                  >
                    {notes.filter((n) => n.tone !== "info").length} à revoir
                  </span>
                )}
              </span>
              {!open && summary && (
                <span className="mt-1 block text-[13px] leading-relaxed text-ink-mid">
                  {summary}
                </span>
              )}
            </span>
          </button>
        </h3>
        {aside && <span className="mt-0.5">{aside}</span>}
      </div>

      {!open && notes.length > 0 && (
        <ul className="mt-3 space-y-1 pl-6">
          {notes.slice(0, MAX_NOTES).map((n) => (
            <li
              key={n.text}
              className={cn("flex items-start gap-2 text-[12px] leading-relaxed", TONE[n.tone])}
            >
              {n.tone === "info" ? (
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              {n.text}
            </li>
          ))}
          {notes.length > MAX_NOTES && (
            <li className="pl-5.5 text-[12px] text-ink-soft">
              et {notes.length - MAX_NOTES} autre{notes.length - MAX_NOTES > 1 ? "s" : ""}
            </li>
          )}
        </ul>
      )}

      <div
        id={bodyId}
        ref={body}
        hidden={!open}
        data-section-body
        className="mt-4 space-y-4"
      >
        {children}
      </div>
    </section>
  );
}
