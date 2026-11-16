"use client";

import { InboxPageSkeleton, InboxRowsSkeleton } from "@/components/admin/InboxSkeleton";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Archive,
  ArchiveRestore,
  Globe,
  Loader2,
  Mail,
  Phone,
  Send,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import FilterTabs from "@/components/ui/FilterTabs";
import { useToast } from "@/components/ui/Toaster";
import { cn, formatTime, initials, timeAgo } from "@/lib/utils";
import { contactTone } from "@/lib/status";
import {
  CONTACT_SOURCE_LABEL,
  CONTACT_STATUS_LABEL,
  contactErrorText,
  useContactCounts,
  useContactMessage,
  useContactMessages,
  useReplyToContact,
  useSetContactStatus,
  type ContactMessage,
  type ContactStatus,
} from "@/lib/api/contact";

/* ─────────────────────────────────────────────────────────────────────────────
   Messages de contact.

   Ce qu'envoient les formulaires des sites publics. On lit, on répond par
   email depuis ici, on archive. Le message ouvert est dans l'URL (`?m=<id>`) :
   c'est là que mène le bouton de l'email d'alerte.
   ───────────────────────────────────────────────────────────────────────────── */

type Filter = "all" | ContactStatus;

const EMPTY: Record<Filter, string> = {
  all: "Les messages envoyés depuis les formulaires de contact des sites arrivent ici.",
  new: "Aucun nouveau message : tout a été lu.",
  read: "Aucun message lu en attente de réponse.",
  replied: "Aucune réponse envoyée pour le moment.",
  archived: "Aucun message archivé.",
};

/** La carte liste + message : partagée avec le squelette pour qu'il ait la même taille. */
const CARTE = "card grid h-[calc(100vh-13rem)] min-h-120 grid-cols-1 overflow-hidden lg:grid-cols-[340px_1fr]";

export default function ContactPage() {
  return (
    // `useSearchParams` impose une frontière Suspense.
    <Suspense fallback={<InboxPageSkeleton cardClassName={CARTE} tabs={5} />}>
      <ContactInbox />
    </Suspense>
  );
}

function ContactInbox() {
  const router = useRouter();
  const pathname = usePathname();
  const selectedId = useSearchParams().get("m");
  const [filter, setFilter] = useState<Filter>("all");

  const messages = useContactMessages(filter);
  const counts = useContactCounts();
  const setStatus = useSetContactStatus();

  const list = messages.data?.data ?? [];
  // Le message ouvert peut ne pas être dans l'onglet affiché (lien de l'email).
  const fetched = useContactMessage(
    selectedId && !list.some((m) => m.id === selectedId) ? selectedId : null,
  );
  const active =
    list.find((m) => m.id === selectedId) ?? (selectedId ? fetched.data : null) ?? null;

  const select = (id: string | null) =>
    router.replace(id ? `${pathname}?m=${id}` : pathname, { scroll: false });

  // Ouvrir un nouveau message, c'est le lire — pour toute l'équipe.
  const marked = useRef<string | null>(null);
  useEffect(() => {
    if (!active || active.status !== "new" || marked.current === active.id) return;
    marked.current = active.id;
    setStatus.mutate({ id: active.id, status: "read" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `setStatus` change à chaque rendu
  }, [active?.id, active?.status]);

  const total = counts.data
    ? counts.data.new + counts.data.read + counts.data.replied + counts.data.archived
    : undefined;

  return (
    <div className="space-y-4">
      <FilterTabs<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { id: "all", label: "Tous", count: total },
          { id: "new", label: "Nouveaux", count: counts.data?.new },
          { id: "read", label: "Lus", count: counts.data?.read },
          { id: "replied", label: "Répondus", count: counts.data?.replied },
          { id: "archived", label: "Archivés", count: counts.data?.archived },
        ]}
      />

      <div className={CARTE}>
        {/* Liste */}
        <div
          className={cn(
            "flex min-h-0 flex-col border-r border-[rgba(0,35,75,0.07)]",
            active && "hidden lg:flex",
          )}
        >
          {messages.isPending ? (
            <InboxRowsSkeleton />
          ) : messages.isError ? (
            <div role="alert" className="p-6 text-center text-sm text-ink-soft">
              Les messages n&apos;ont pas pu être chargés.
              <button
                onClick={() => messages.refetch()}
                className="btn btn-outline btn-sm mx-auto mt-3"
              >
                Réessayer
              </button>
            </div>
          ) : list.length === 0 ? (
            <EmptyState Icon={Mail} title="Aucun message" text={EMPTY[filter]} />
          ) : (
            <ul className="scroll-thin flex-1 overflow-y-auto">
              {list.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => select(m.id)}
                    aria-current={m.id === active?.id ? "true" : undefined}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-[rgba(0,35,75,0.05)] px-4 py-3.5 text-left transition-colors",
                      m.id === active?.id ? "bg-terra-pale/35" : "hover:bg-cream-soft",
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                      {initials(m.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-navy">
                          {m.name}
                        </p>
                        {m.status === "new" && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full bg-terra"
                            aria-label="Nouveau"
                          />
                        )}
                      </div>
                      <p className="truncate text-xs font-medium text-ink-mid">
                        {m.subject}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-soft">
                        <Globe className="h-3 w-3" />
                        {CONTACT_SOURCE_LABEL[m.source]} · {timeAgo(m.createdAt)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Détail */}
        {active ? (
          <Detail key={active.id} message={active} onBack={() => select(null)} />
        ) : selectedId && fetched.isPending ? (
          <SkeletonGroup className="hidden space-y-3 p-6 lg:block">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-40" />
          </SkeletonGroup>
        ) : (
          <div className="hidden items-center justify-center text-sm text-ink-soft lg:flex">
            {selectedId && fetched.isError
              ? "Ce message est introuvable."
              : "Choisissez un message."}
          </div>
        )}
      </div>
    </div>
  );
}

/** À monter avec `key={message.id}` : le brouillon appartient à un message. */
function Detail({ message, onBack }: { message: ContactMessage; onBack: () => void }) {
  const toast = useToast();
  const setStatus = useSetContactStatus();
  const sendReply = useReplyToContact();
  const [reply, setReply] = useState("");

  const archived = message.status === "archived";

  const submit = () => {
    const body = reply.trim();
    if (!body || sendReply.isPending) return;
    sendReply.mutate(
      { id: message.id, body },
      {
        // Le brouillon n'est vidé qu'une fois l'email réellement parti.
        onSuccess: () => {
          setReply("");
          toast.success("Réponse envoyée", `Un email est parti à ${message.email}.`);
        },
        onError: (error) => toast.error("Réponse non envoyée", contactErrorText(error)),
      },
    );
  };

  return (
    <div className="flex min-h-0 flex-col">
      <header className="flex items-start gap-3 border-b border-[rgba(0,35,75,0.07)] px-5 py-4">
        <button
          onClick={onBack}
          aria-label="Retour aux messages"
          className="hit flex h-9 w-9 items-center justify-center rounded-full bg-cream-soft text-navy lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-bold text-navy">{message.subject}</h3>
            <Badge tone={contactTone[message.status]}>
              {CONTACT_STATUS_LABEL[message.status]}
            </Badge>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
            <span className="font-medium text-ink-mid">{message.name}</span>
            <a
              href={`mailto:${message.email}`}
              className="inline-flex items-center gap-1 hover:text-terra-ink"
            >
              <Mail className="h-3 w-3" /> {message.email}
            </a>
            {message.phone && (
              <a
                href={`tel:${message.phone}`}
                className="inline-flex items-center gap-1 hover:text-terra-ink"
              >
                <Phone className="h-3 w-3" /> {message.phone}
              </a>
            )}
          </p>
        </div>
      </header>

      <div className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <div>
          <div className="rounded-2xl bg-cream-soft p-4">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
              {message.message}
            </p>
          </div>
          <p className="mt-2 text-xs text-ink-soft tabular-nums">
            Reçu {timeAgo(message.createdAt)} via {CONTACT_SOURCE_LABEL[message.source]}
          </p>
        </div>

        {message.replies.map((r) => (
          <div key={r.id} className="ml-6">
            <div className="rounded-2xl rounded-br-md bg-navy p-4 text-white">
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {r.body}
              </p>
            </div>
            <p className="mt-2 text-right text-xs text-ink-soft">
              Réponse envoyée par email
              {r.sentByName ? ` par ${r.sentByName}` : ""} · {timeAgo(r.createdAt)} à{" "}
              {formatTime(r.createdAt)}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-[rgba(0,35,75,0.07)] p-4">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={3}
          maxLength={5000}
          placeholder={`Répondre à ${message.name}…`}
          aria-label={`Réponse à ${message.name}`}
          className="input-base resize-none"
        />
        <p className="mt-1.5 text-xs text-ink-soft">
          La réponse part par email à {message.email}, telle que vous l&apos;écrivez.
        </p>
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={() =>
              setStatus.mutate(
                { id: message.id, status: archived ? "read" : "archived" },
                {
                  onError: (error) =>
                    toast.error("Action non enregistrée", contactErrorText(error)),
                },
              )
            }
            disabled={setStatus.isPending}
            className="btn btn-ghost"
          >
            {archived ? (
              <>
                <ArchiveRestore className="h-4 w-4" /> Désarchiver
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" /> Archiver
              </>
            )}
          </button>
          <button
            onClick={submit}
            disabled={!reply.trim() || sendReply.isPending}
            className="btn btn-primary disabled:opacity-50"
          >
            {sendReply.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Envoyer la réponse
          </button>
        </div>
      </div>
    </div>
  );
}
