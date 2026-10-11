"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  Loader2,
  Paperclip,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import ConversationAttachments from "@/components/admin/ConversationAttachments";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toaster";
import { cn, formatDateLong, formatTime, initials } from "@/lib/utils";
import {
  MAX_ATTACHMENTS,
  attachmentError,
  conversationTitle,
  flattenMessages,
  messagingErrorText,
  useAdminMessages,
  useAdminSendMessage,
  useAdminUploadAttachment,
  useDismissFlag,
  type AdminConversation,
  type AdminMessage,
  type AttachmentRef,
} from "@/lib/api/messaging";

const QUICK = [
  "Bonjour, je reviens vers vous rapidement 🙂",
  "C'est noté, je transmets au chef.",
  "Votre liste de courses arrive ce soir.",
];

const ROLE_LABEL = {
  client: "Client",
  chef: "Batch cooker",
  support: "Lab's Food",
} as const;

interface PendingFile {
  key: string;
  file: File;
  ref?: AttachmentRef;
}

/**
 * Un fil vu par l'équipe : le texte tel qu'il a été écrit, les messages qui ont
 * déclenché le signalement marqués d'un triangle, et de quoi répondre.
 *
 * À monter avec `key={conversation.id}` : le brouillon et les fichiers en cours
 * appartiennent à un fil, pas à l'écran.
 */
export default function ConversationThread({
  conversation,
  onBack,
}: {
  conversation: AdminConversation;
  onBack: () => void;
}) {
  const toast = useToast();
  const isSupport = conversation.type === "support";

  const messagesQuery = useAdminMessages(conversation.id);
  const messages = flattenMessages(messagesQuery.data);
  const send = useAdminSendMessage(conversation.id);
  const upload = useAdminUploadAttachment(conversation.id);
  const dismissFlag = useDismissFlag();

  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const scroller = useRef<HTMLDivElement>(null);
  const lastId = messages[messages.length - 1]?.id;
  const firstId = messages[0]?.id;
  const heightBefore = useRef(0);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  // Page plus ancienne ajoutée en haut : on garde sous les yeux ce qu'on lisait.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && heightBefore.current) {
      el.scrollTop += el.scrollHeight - heightBefore.current;
      heightBefore.current = 0;
    }
  }, [firstId]);

  const uploading = files.some((f) => !f.ref);
  const canSend =
    (draft.trim().length > 0 || files.length > 0) && !uploading && !send.isPending;

  const addFiles = async (picked: File[]) => {
    const room = MAX_ATTACHMENTS - files.length;
    if (picked.length > room) {
      toast.error(`${MAX_ATTACHMENTS} pièces jointes maximum par message.`);
    }
    for (const file of picked.slice(0, Math.max(0, room))) {
      const refused = attachmentError(file);
      if (refused) {
        toast.error("Pièce jointe refusée", refused);
        continue;
      }
      const key = `${file.name}-${file.size}-${Date.now()}`;
      setFiles((current) => [...current, { key, file }]);
      try {
        const ref = await upload(file);
        setFiles((current) =>
          current.map((f) => (f.key === key ? { ...f, ref } : f)),
        );
      } catch (error) {
        setFiles((current) => current.filter((f) => f.key !== key));
        toast.error("Pièce jointe non envoyée", messagingErrorText(error));
      }
    }
  };

  const submit = () => {
    if (!canSend) return;
    send.mutate(
      { body: draft.trim(), attachments: files.map((f) => f.ref!) },
      {
        // Le brouillon n'est vidé qu'une fois le message accepté.
        onSuccess: () => {
          setDraft("");
          setFiles([]);
        },
        onError: (error) =>
          toast.error("Message non envoyé", messagingErrorText(error)),
      },
    );
  };

  return (
    <div className="flex min-h-0 flex-col">
      {/* En-tête */}
      <header className="border-b border-[rgba(0,35,75,0.07)] px-4 py-3.5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Retour aux conversations"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-soft text-navy lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
            {initials(
              isSupport
                ? (conversation.supportUser?.name ?? "?")
                : (conversation.client?.name ?? "?"),
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy">
              {conversationTitle(conversation)}
            </p>
            <p className="truncate text-[11px] text-ink-soft">
              {isSupport
                ? `Support · ${ROLE_LABEL[conversation.supportUser?.role ?? "client"]}` +
                  (conversation.supportUser?.email
                    ? ` · ${conversation.supportUser.email}`
                    : "")
                : conversation.booking
                  ? `Prestation ${conversation.booking.reference ?? ""} · ${formatDateLong(conversation.booking.startsAt)}`
                  : "Aucune prestation en cours"}
            </p>
          </div>
          {!isSupport && (
            <Badge tone={conversation.contactReleased ? "success" : "neutral"}>
              {conversation.contactReleased
                ? "Coordonnées libérées"
                : "Coordonnées masquées"}
            </Badge>
          )}
        </div>

        {conversation.contactFlaggedAt && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-warning-soft px-3 py-2">
            <p className="flex items-center gap-2 text-xs text-[#8A6212]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Un numéro ou un email a été détecté dans cette conversation.
            </p>
            <button
              onClick={() =>
                dismissFlag.mutate(conversation.id, {
                  onSuccess: () => toast.success("Signalement classé"),
                  onError: (error) =>
                    toast.error("Signalement non classé", messagingErrorText(error)),
                })
              }
              disabled={dismissFlag.isPending}
              className="btn btn-outline btn-sm"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Classer le signalement
            </button>
          </div>
        )}
      </header>

      {/* Messages */}
      <div
        ref={scroller}
        className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto bg-cream-soft px-4 py-5"
      >
        {messagesQuery.hasNextPage && (
          <div className="text-center">
            <button
              onClick={() => {
                heightBefore.current = scroller.current?.scrollHeight ?? 0;
                void messagesQuery.fetchNextPage();
              }}
              disabled={messagesQuery.isFetchingNextPage}
              className="rounded-md bg-paper px-3 py-1 text-[11px] font-semibold text-ink-mid hover:text-navy disabled:opacity-60"
            >
              {messagesQuery.isFetchingNextPage
                ? "Chargement…"
                : "Messages précédents"}
            </button>
          </div>
        )}
        {messagesQuery.isPending && (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </p>
        )}
        {messagesQuery.isError && (
          <p role="alert" className="py-8 text-center text-sm text-ink-soft">
            La conversation n&apos;a pas pu être chargée.{" "}
            <button
              onClick={() => messagesQuery.refetch()}
              className="font-semibold text-navy underline"
            >
              Réessayer
            </button>
          </p>
        )}
        {messagesQuery.isSuccess && messages.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-soft">
            Aucun message. Écrivez le premier.
          </p>
        )}
        {messages.map((m) => (
          <Bubble
            key={m.id}
            message={m}
            conversationId={conversation.id}
            // Dans un fil à deux, on précise qui parle ; en support c'est évident.
            showSender={!isSupport}
          />
        ))}
      </div>

      {/* Saisie */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="border-t border-[rgba(0,35,75,0.07)] p-3"
      >
        {isSupport ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setDraft(q)}
                className="rounded-md bg-cream-soft px-2.5 py-1 text-[11px] text-ink-mid transition-colors hover:bg-terra-pale/50 hover:text-terra-deep"
              >
                {q}
              </button>
            ))}
          </div>
        ) : (
          <p className="mb-2 text-[11px] text-ink-soft">
            Votre message sera lu par le client et le batch cooker, signé
            «&nbsp;Lab&apos;s Food&nbsp;». L&apos;intervention est journalisée.
          </p>
        )}

        {files.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-2">
            {files.map((f) => (
              <li
                key={f.key}
                className="flex items-center gap-2 rounded-md bg-cream-soft px-2.5 py-1 text-xs text-ink-mid"
              >
                {f.ref ? (
                  <FileText className="h-3.5 w-3.5" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                <span className="max-w-[160px] truncate">{f.file.name}</span>
                <button
                  type="button"
                  aria-label={`Retirer ${f.file.name}`}
                  onClick={() =>
                    setFiles((current) => current.filter((x) => x.key !== f.key))
                  }
                  className="text-ink-soft hover:text-navy"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => {
              void addFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <button
            type="button"
            aria-label="Joindre un fichier"
            disabled={files.length >= MAX_ATTACHMENTS}
            onClick={() => fileInput.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-soft text-navy hover:bg-cream-deep disabled:opacity-50"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder="Écrire un message…"
            aria-label="Votre message"
            className="input-base flex-1 resize-none"
          />
          <button
            type="submit"
            aria-label="Envoyer"
            disabled={!canSend}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terra text-white transition-colors hover:bg-terra-deep disabled:opacity-50"
          >
            {send.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function Bubble({
  message,
  conversationId,
  showSender,
}: {
  message: AdminMessage;
  conversationId: string;
  showSender: boolean;
}) {
  const fromTeam = message.senderRole === "support";

  return (
    <div className={cn("flex", fromTeam ? "justify-end" : "justify-start")}>
      <div className="max-w-[80%]">
        {(showSender || fromTeam) && (
          <p
            className={cn(
              "mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-soft",
              fromTeam && "text-right",
            )}
          >
            {ROLE_LABEL[message.senderRole]}
            {message.senderName && ` · ${message.senderName}`}
          </p>
        )}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
            fromTeam
              ? "rounded-br-md bg-navy text-white"
              : message.senderRole === "chef"
                ? "rounded-bl-md bg-terra-pale/60 text-navy"
                : "rounded-bl-md bg-paper text-navy",
          )}
        >
          {message.body && (
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
          )}
          <ConversationAttachments
            conversationId={conversationId}
            attachments={message.attachments}
            fromTeam={fromTeam}
            className={message.body ? "mt-2" : undefined}
          />
          <span
            className={cn(
              "mt-1 flex items-center gap-1.5 text-[10px]",
              fromTeam ? "text-white/45" : "text-ink-soft",
            )}
          >
            {formatTime(message.createdAt)}
            {message.contactDetected && (
              <span className="flex items-center gap-1 text-[#8A6212]">
                <AlertTriangle className="h-3 w-3" /> coordonnées détectées
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
