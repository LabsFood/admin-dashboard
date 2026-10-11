"use client";

import { useRouter } from "next/navigation";
import { Loader2, MessageCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";
import {
  messagingErrorText,
  useOpenSupportConversation,
} from "@/lib/api/messaging";

/**
 * « Écrire » à un client ou à un batch cooker depuis sa fiche.
 *
 * Ouvre son fil support — celui qu'il a peut-être déjà avec l'équipe, sinon un
 * nouveau — puis y conduit. C'est le seul moyen pour l'équipe d'écrire la
 * première : la boîte support ne liste que les fils qui ont déjà un message.
 *
 * `card` reprend la carte de la fiche client ; `link` tient dans une ligne de
 * tableau ou un en-tête.
 */
export default function WriteToUserButton({
  userId,
  variant = "link",
  className,
}: {
  /** `users.id` du compte, pas l'identifiant Clerk. */
  userId: string;
  variant?: "card" | "link";
  className?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const open = useOpenSupportConversation();

  const start = () =>
    open.mutate(userId, {
      onSuccess: (conversation) => router.push(`/messagerie?c=${conversation.id}`),
      onError: (error) =>
        toast.error("Conversation non ouverte", messagingErrorText(error)),
    });

  const Icon = open.isPending ? Loader2 : MessageCircle;

  if (variant === "card") {
    return (
      <button
        type="button"
        onClick={start}
        disabled={open.isPending}
        className={cn(
          "flex w-full items-center gap-3 rounded-3xl bg-teal p-4 text-left text-white transition-transform hover:-translate-y-0.5 disabled:opacity-70",
          className,
        )}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
          <Icon className={cn("h-4 w-4", open.isPending && "animate-spin")} />
        </span>
        <span className="text-sm">
          <span className="block font-semibold">Envoyer un message</span>
          <span className="block text-xs text-white/60">
            Ouvrir sa conversation avec l&apos;équipe
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={open.isPending}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold text-terra underline-offset-4 hover:underline disabled:opacity-60",
        className,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", open.isPending && "animate-spin")} />
      Écrire
    </button>
  );
}
