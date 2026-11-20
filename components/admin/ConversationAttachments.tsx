"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, FileText, ImageOff, Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";
import {
  messagingErrorText,
  useAdminAttachmentUrl,
  useAdminOpenAttachment,
  type Attachment,
} from "@/lib/api/messaging";

/**
 * Les pièces jointes d'un message, vues de la console : les images en vignette,
 * cliquables pour un aperçu plein écran ; les autres fichiers (PDF) en ligne,
 * ouverts dans un onglet.
 */
export default function ConversationAttachments({
  conversationId,
  attachments,
  fromTeam,
  className,
}: {
  conversationId: string;
  attachments: Attachment[];
  /** Message de l'équipe : la bulle est sombre. */
  fromTeam: boolean;
  className?: string;
}) {
  if (attachments.length === 0) return null;
  return (
    <ul className={cn("space-y-1.5", className)}>
      {attachments.map((attachment) => (
        <li key={attachment.id}>
          {attachment.mimeType.startsWith("image/") ? (
            <ImageAttachment
              conversationId={conversationId}
              attachment={attachment}
              fromTeam={fromTeam}
            />
          ) : (
            <FileAttachment
              conversationId={conversationId}
              attachment={attachment}
              fromTeam={fromTeam}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function ImageAttachment({
  conversationId,
  attachment,
  fromTeam,
}: {
  conversationId: string;
  attachment: Attachment;
  fromTeam: boolean;
}) {
  const link = useAdminAttachmentUrl(conversationId, attachment.id);
  const [open, setOpen] = useState(false);
  // Le lien signé a pu expirer entre son obtention et l'affichage.
  const [broken, setBroken] = useState(false);
  const surface = fromTeam ? "bg-white/10" : "bg-cream-soft";

  if (link.isError || broken) {
    return (
      <p className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs", surface)}>
        <ImageOff className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{attachment.fileName}</span>
        <button
          type="button"
          onClick={() => {
            setBroken(false);
            void link.refetch();
          }}
          className="shrink-0 font-semibold underline"
        >
          Réessayer
        </button>
      </p>
    );
  }

  if (!link.data) {
    return (
      <div
        className={cn(
          "flex h-36 w-52 max-w-full items-center justify-center rounded-lg",
          surface,
        )}
        aria-label={`Chargement de ${attachment.fileName}`}
      >
        <Loader2 className="h-4 w-4 animate-spin opacity-60" />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Agrandir ${attachment.fileName}`}
        className="block overflow-hidden rounded-lg"
      >
        {/* Lien signé vers le stockage privé : `next/image` ne sait pas l'optimiser. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={link.data}
          alt={attachment.fileName}
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-36 w-52 max-w-full object-cover transition-transform hover:scale-[1.02]"
        />
      </button>
      {open && (
        <ImageLightbox
          url={link.data}
          fileName={attachment.fileName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function FileAttachment({
  conversationId,
  attachment,
  fromTeam,
}: {
  conversationId: string;
  attachment: Attachment;
  fromTeam: boolean;
}) {
  const toast = useToast();
  const openAttachment = useAdminOpenAttachment(conversationId);
  return (
    <button
      type="button"
      onClick={() =>
        openAttachment(attachment.id).catch((error) =>
          toast.error("Pièce jointe indisponible", messagingErrorText(error)),
        )
      }
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs",
        fromTeam ? "bg-white/10 hover:bg-white/20" : "bg-cream-soft hover:bg-cream-deep",
      )}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate font-medium">{attachment.fileName}</span>
    </button>
  );
}

/**
 * Aperçu plein écran. Se ferme avec Échap, la croix ou un clic hors de l'image.
 * Rendu dans `body` : le fil a un `overflow` qui rognerait un calque posé dedans.
 */
function ImageLightbox({
  url,
  fileName,
  onClose,
}: {
  url: string;
  fileName: string;
  onClose: () => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Aperçu de ${fileName}`}
      onClick={onClose}
      className="fixed inset-0 z-100 flex flex-col bg-navy/90 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-3 px-4 py-3 text-white sm:px-6"
      >
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{fileName}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Ouvrir dans un onglet</span>
        </a>
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label="Fermer l'aperçu"
          className="hit flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={fileName}
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        />
      </div>
    </div>,
    document.body,
  );
}
