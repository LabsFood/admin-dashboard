"use client";

import { useEffect, useRef } from "react";
import { Download, ExternalLink, FileText, Loader2, X } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   Consultation d'une pièce justificative.

   L'URL est signée, vit cinq minutes, et chaque consultation est écrite au
   journal d'audit côté API. On l'affiche donc dans un cadre, ici, plutôt que
   dans un onglet qui sortirait de la console et laisserait l'URL traîner dans
   l'historique du navigateur.

   Une fenêtre modale se ferme de trois façons, et les trois doivent marcher :
   la croix, la touche Échap, et un clic à côté. Il n'y en avait qu'une.
   ───────────────────────────────────────────────────────────────────────────── */

export interface SignedDoc {
  label: string;
  url?: string;
  fileName?: string | null;
  mimeType?: string | null;
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
  const fermer = useRef<HTMLButtonElement>(null);
  const ouvert = doc !== null;

  // Échap ferme, et le fond de page ne défile pas derrière la fenêtre.
  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = avant;
    };
  }, [ouvert, onClose]);

  // Le clavier arrive sur la croix : sans ça, Tab part dans la page derrière.
  useEffect(() => {
    if (ouvert) fermer.current?.focus();
  }, [ouvert]);

  if (!doc) return null;

  const name = doc.fileName ?? "document";
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const mime = doc.mimeType ?? "";
  // Le type se lit sur le MIME puis sur l'extension du nom. Jamais sur l'URL :
  // une URL signée finit par sa signature, pas par « .pdf ».
  const isPdf = mime === "application/pdf" || (!mime && ext === "pdf");
  const isImage =
    mime.startsWith("image/") ||
    (!mime && ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext));

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-navy/60 p-4 sm:p-8"
      // Un clic sur le fond ferme ; un clic dans la fenêtre ne remonte pas.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={doc.label}
        className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-cream-soft"
      >
        <header className="flex items-center gap-3 border-b border-[rgba(0,35,75,0.1)] bg-paper px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-base font-bold text-navy">
              {doc.label}
            </h2>
            <p className="truncate text-xs text-ink-soft">
              {name} · lien valable 5 minutes, consultation journalisée
            </p>
          </div>

          {doc.url && (
            <>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                title="Ouvrir dans un onglet"
                aria-label="Ouvrir dans un onglet"
                className="hit flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-cream-deep hover:text-navy"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <a
                href={doc.url}
                download={name}
                title="Télécharger"
                aria-label="Télécharger"
                className="hit flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-cream-deep hover:text-navy"
              >
                <Download className="h-4 w-4" />
              </a>
            </>
          )}

          <button
            ref={fermer}
            onClick={onClose}
            aria-label="Fermer"
            title="Fermer (Échap)"
            className="hit flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[rgba(0,35,75,0.12)] text-ink-mid transition-colors hover:border-navy hover:bg-cream-deep hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra"
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
                Le document n&apos;a pas pu être ouvert. Le lien a pu expirer :
                refermez et réessayez.
              </p>
            </div>
          ) : isPdf ? (
            /*
             * `<object>` et non `<iframe>` : si le stockage refuse d'être
             * encadré, c'est l'enfant qui s'affiche. Un cadre blanc muet est
             * pire qu'un message.
             */
            <object
              data={doc.url}
              type="application/pdf"
              aria-label={doc.label}
              className="h-full w-full rounded-md bg-paper"
            >
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <FileText className="h-8 w-8 text-ink-soft" />
                <p className="max-w-sm text-sm leading-relaxed text-ink-mid">
                  Votre navigateur n&apos;affiche pas ce PDF directement ici.
                </p>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Ouvrir dans un onglet
                </a>
              </div>
            </object>
          ) : isImage ? (
            <div className="flex h-full items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.url}
                alt={doc.label}
                className="max-h-full max-w-full rounded-md object-contain"
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <FileText className="h-8 w-8 text-ink-soft" />
              <p className="max-w-sm text-sm leading-relaxed text-ink-mid">
                Ce format ne s&apos;affiche pas dans le navigateur
                {ext ? ` (.${ext})` : ""}. Ouvrez-le dans un onglet ou
                téléchargez-le.
              </p>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline btn-sm"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Ouvrir dans un onglet
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
