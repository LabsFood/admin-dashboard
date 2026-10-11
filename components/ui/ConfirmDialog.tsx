"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   Demander confirmation, et dire ce qui va se passer.

   `ReasonDialog` sert quand l'API exige un motif écrit. Ici il n'y a rien à
   écrire : il y a un geste dont les conséquences dépassent la console — un
   menu publié devient adoptable par tout le réseau, un menu dépublié disparaît
   des vitrines qui le montraient. Le dialogue n'existe que pour nommer ces
   conséquences avant, pas pour ralentir après.

   Fermeture par Échap et par le fond, focus sur l'action, défilement bloqué :
   un dialogue qu'on ne peut pas fermer est le bug qu'on a déjà corrigé une
   fois dans cette console.
   ───────────────────────────────────────────────────────────────────────────── */

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  lead,
  detail,
  confirmLabel,
  cancelLabel = "Annuler",
  tone = "primary",
  pending = false,
  error = null,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** Ce que le geste fait, en une phrase. */
  lead: string;
  /** Ce qu'il entraîne ailleurs, s'il y a lieu. */
  detail?: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  pending?: boolean;
  error?: string | null;
}) {
  const action = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    action.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKey);

    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, pending, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/50 p-4"
      onClick={() => !pending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-paper p-6 shadow-[0_18px_48px_-18px_rgba(0,35,75,0.35)]"
      >
        <h2 className="font-display text-lg font-bold leading-snug text-navy">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-mid">{lead}</p>
        {detail && (
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{detail}</p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-md bg-danger-soft p-3 text-[13px] leading-relaxed text-danger"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            ref={action}
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={cn(
              "btn",
              tone === "danger"
                ? "bg-danger text-white hover:bg-danger/90"
                : "btn-primary",
            )}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="btn btn-ghost"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
