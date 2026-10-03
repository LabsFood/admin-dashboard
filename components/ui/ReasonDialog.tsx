"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   Écrire la décision avant de la prendre.

   Partout où l'API exige un motif — refuser une pièce, rejeter une
   candidature, suspendre un plat — c'est la même boîte. Le motif part tel quel
   chez la personne concernée : le compteur et le seuil sont là pour éviter
   qu'un « non conforme » lapidaire soit tout ce qu'elle reçoive.
   ───────────────────────────────────────────────────────────────────────────── */

export interface ReasonOption {
  code: string;
  label: string;
  /** Ce que l'admin vérifie derrière ce motif — affiché sous la sélection. */
  hint?: string;
}

export default function ReasonDialog({
  open,
  onClose,
  title,
  lead,
  placeholder,
  confirmLabel,
  minLength = 15,
  maxLength = 500,
  pending,
  error,
  onConfirm,
  codes,
  codeLabel = "Motif",
  notify,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  lead: string;
  placeholder: string;
  confirmLabel: string;
  minLength?: number;
  maxLength?: number;
  pending: boolean;
  error: string | null;
  onConfirm: (text: string, extra: { code?: string; notify: boolean }) => void;
  /** Quand l'API attend un `reasonCode` en plus du texte libre. */
  codes?: ReasonOption[];
  codeLabel?: string;
  /** Intitulé de la case « prévenir la personne ». Absent = pas de case. */
  notify?: { label: string; hint?: string; defaultOn?: boolean };
  children?: ReactNode;
}) {
  const [text, setText] = useState("");
  const [code, setCode] = useState<string | undefined>(undefined);
  const [notifyOn, setNotifyOn] = useState(notify?.defaultOn ?? true);

  if (!open) return null;

  const trimmed = text.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < minLength;
  const ready = trimmed.length >= minLength && !pending;
  const selected = codes?.find((c) => c.code === code);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-paper p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-bold text-navy">{title}</h2>
          <button
            onClick={onClose}
            disabled={pending}
            aria-label="Fermer"
            className="text-ink-soft hover:text-navy"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-mid">{lead}</p>

        {children}

        {codes && codes.length > 0 && (
          <fieldset className="mt-4">
            <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              {codeLabel}
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {codes.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  aria-pressed={code === c.code}
                  onClick={() => setCode(code === c.code ? undefined : c.code)}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                    code === c.code
                      ? "bg-navy text-white"
                      : "bg-cream-soft text-ink-mid hover:bg-cream-deep",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 min-h-[1.25rem] text-[11px] leading-relaxed text-ink-soft">
              {selected?.hint ?? "Facultatif : il classe la décision, il ne la remplace pas."}
            </p>
          </fieldset>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, maxLength))}
          placeholder={placeholder}
          rows={4}
          className="input-base mt-4 resize-y"
        />
        <p className="mt-1 flex items-center justify-between text-[11px] text-ink-soft">
          <span className={tooShort ? "text-danger" : ""}>
            {tooShort
              ? `Encore ${minLength - trimmed.length} caractères`
              : "Lu tel quel par la personne concernée"}
          </span>
          <span className="tabular-nums">
            {text.length}/{maxLength}
          </span>
        </p>

        {notify && (
          <button
            type="button"
            onClick={() => setNotifyOn((v) => !v)}
            aria-pressed={notifyOn}
            className={cn(
              "mt-4 flex w-full items-start gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors",
              notifyOn
                ? "border-navy/25 bg-cream-soft"
                : "border-[rgba(0,35,75,0.12)] hover:border-navy/25",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border",
                notifyOn ? "border-navy bg-navy text-white" : "border-ink-soft/40",
              )}
            >
              {notifyOn && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-navy">
                {notify.label}
              </span>
              {notify.hint && (
                <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-soft">
                  {notify.hint}
                </span>
              )}
            </span>
          </button>
        )}

        {error && (
          <p role="alert" className="mt-3 flex items-start gap-2 text-[13px] text-danger">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => onConfirm(trimmed, { code, notify: notifyOn })}
            disabled={!ready}
            className="btn btn-primary flex-1 justify-center"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Envoi…
              </>
            ) : (
              confirmLabel
            )}
          </button>
          <button onClick={onClose} disabled={pending} className="btn btn-outline">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
