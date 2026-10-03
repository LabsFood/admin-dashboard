"use client";

import { Download, FileText, Loader2, X } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   Consultation d'une pièce justificative.

   L'URL est signée et vit cinq minutes ; chaque consultation est écrite au
   journal d'audit côté API. On l'affiche donc dans un cadre, ici, plutôt que
   dans un onglet qui sortirait de la console et laisserait l'URL traîner dans
   l'historique du navigateur.
   ───────────────────────────────────────────────────────────────────────────── */

export interface SignedDoc {
  label: string;
  url?: string;
  fileName?: string | null;
}

export default function SignedDocDialog({
  doc,
  loading,
  error,
  onClose,
}: {
  doc: SignedDoc | null;
  loading: boolean;
  error: boolean;
  onClose: () => void;
}) {
  if (!doc) return null;

  const name = doc.fileName ?? "document";
  const isPdf = name.toLowerCase().endsWith(".pdf");

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-navy/60 p-4 sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={doc.label}
        className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-cream-soft"
      >
        <header className="flex items-center gap-4 border-b border-[rgba(0,35,75,0.1)] bg-paper px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-base font-bold text-navy">{doc.label}</h2>
            <p className="truncate text-xs text-ink-soft">
              {name} · lien valable 5 minutes, consultation journalisée
            </p>
          </div>
          {doc.url && (
            <a
              href={doc.url}
              download={name}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Télécharger
            </a>
          )}
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-cream-deep hover:text-navy"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {loading ? (
            <p className="flex h-full items-center justify-center gap-2 text-sm text-ink-mid">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ouverture du document…
            </p>
          ) : error || !doc.url ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <FileText className="h-8 w-8 text-ink-soft" />
              <p className="max-w-sm text-sm leading-relaxed text-ink-mid">
                Le document n&apos;a pas pu être ouvert. Le lien a pu expirer : refermez et
                réessayez.
              </p>
            </div>
          ) : isPdf ? (
            <iframe src={doc.url} title={doc.label} className="h-full w-full rounded-md bg-paper" />
          ) : (
            <div className="flex h-full items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.url}
                alt={doc.label}
                className="max-h-full max-w-full rounded-md object-contain"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
