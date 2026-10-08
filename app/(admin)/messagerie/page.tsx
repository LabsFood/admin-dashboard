"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Loader2, MessageCircle, Search } from "lucide-react";
import ConversationThread from "@/components/admin/ConversationThread";
import EmptyState from "@/components/ui/EmptyState";
import FilterTabs from "@/components/ui/FilterTabs";
import { cn, initials, timeAgo } from "@/lib/utils";
import {
  conversationTitle,
  useAdminConversation,
  useAdminConversationCounts,
  useAdminConversations,
  useAdminMarkRead,
  useKeepThreadFresh,
  type AdminConversation,
  type InboxFilter,
} from "@/lib/api/messaging";

/* ─────────────────────────────────────────────────────────────────────────────
   Messagerie.

   Trois vues sur les mêmes conversations : la boîte support (ce à quoi l'équipe
   doit répondre), les fils entre clients et batch cookers (lecture et
   intervention), et la file des signalements (un numéro ou un email détecté).

   Le fil ouvert est dans l'URL (`?c=<id>`) : un lien vers une conversation
   l'ouvre même si elle n'est pas dans la vue affichée.
   ───────────────────────────────────────────────────────────────────────────── */

const EMPTY: Record<InboxFilter, { title: string; text: string }> = {
  support: {
    title: "Boîte support vide",
    text: "Les messages envoyés à l'équipe par les clients et les batch cookers arrivent ici.",
  },
  pairs: {
    title: "Aucune conversation",
    text: "Les fils entre clients et batch cookers apparaissent dès le premier message.",
  },
  flagged: {
    title: "Aucun signalement",
    text: "Une conversation est signalée quand un numéro ou un email y est détecté.",
  },
};

export default function MessageriePage() {
  return (
    // `useSearchParams` impose une frontière Suspense.
    <Suspense fallback={null}>
      <Messagerie />
    </Suspense>
  );
}

function Messagerie() {
  const router = useRouter();
  const pathname = usePathname();
  const selectedId = useSearchParams().get("c");

  const [filter, setFilter] = useState<InboxFilter>("support");
  const [query, setQuery] = useState("");

  const conversations = useAdminConversations(filter);
  const counts = useAdminConversationCounts();
  const markRead = useAdminMarkRead();

  const list = conversations.data?.data ?? [];
  // Le fil ouvert peut ne pas être dans la vue courante (lien direct, autre onglet).
  const fetched = useAdminConversation(
    selectedId && !list.some((c) => c.id === selectedId) ? selectedId : null,
  );
  const active =
    list.find((c) => c.id === selectedId) ?? (selectedId ? fetched.data : null) ?? null;

  useKeepThreadFresh(active);

  const select = (id: string | null) =>
    router.replace(id ? `${pathname}?c=${id}` : pathname, { scroll: false });

  // Ouvrir un fil support, ou y recevoir un message pendant qu'il est ouvert,
  // c'est le lire — pour toute l'équipe, la boîte étant partagée.
  const marked = useRef<string | null>(null);
  useEffect(() => {
    if (!active || active.type !== "support" || active.unreadCount === 0) return;
    const stamp = `${active.id}:${active.lastMessageAt}`;
    if (marked.current === stamp) return;
    marked.current = stamp;
    markRead.mutate(active.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `markRead` change à chaque rendu
  }, [active?.id, active?.unreadCount, active?.lastMessageAt]);

  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? list.filter((c) => conversationTitle(c).toLowerCase().includes(needle))
    : list;

  return (
    <div className="space-y-4">
      <FilterTabs<InboxFilter>
        value={filter}
        onChange={setFilter}
        options={[
          { id: "support", label: "Support", count: counts.data?.unread },
          { id: "pairs", label: "Clients ↔ batch cookers" },
          { id: "flagged", label: "Signalements", count: counts.data?.flagged },
        ]}
      />

      <div className="card grid h-[calc(100vh-15rem)] min-h-120 grid-cols-1 overflow-hidden lg:grid-cols-[320px_1fr]">
        {/* Liste des conversations */}
        <div
          className={cn(
            "flex min-h-0 flex-col border-r border-[rgba(0,35,75,0.07)]",
            active && "hidden lg:flex",
          )}
        >
          <div className="border-b border-[rgba(0,35,75,0.07)] p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un nom…"
                aria-label="Rechercher une conversation"
                className="input-base pl-9"
              />
            </div>
          </div>

          {conversations.isPending ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
            </p>
          ) : conversations.isError ? (
            <div role="alert" className="p-6 text-center text-sm text-ink-soft">
              Les conversations n&apos;ont pas pu être chargées.
              <button
                onClick={() => conversations.refetch()}
                className="btn btn-outline btn-sm mx-auto mt-3"
              >
                Réessayer
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              Icon={MessageCircle}
              title={needle ? "Aucun résultat" : EMPTY[filter].title}
              text={
                needle
                  ? "Aucune conversation ne correspond à cette recherche."
                  : EMPTY[filter].text
              }
            />
          ) : (
            <ul className="scroll-thin flex-1 overflow-y-auto">
              {filtered.map((c) => (
                <li key={c.id}>
                  <ConversationRow
                    conversation={c}
                    active={c.id === active?.id}
                    onSelect={() => select(c.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Conversation */}
        {active ? (
          <ConversationThread
            key={active.id}
            conversation={active}
            onBack={() => select(null)}
          />
        ) : (
          <div className="hidden items-center justify-center text-sm text-ink-soft lg:flex">
            {selectedId && fetched.isPending
              ? "Chargement de la conversation…"
              : "Choisissez une conversation."}
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationRow({
  conversation: c,
  active,
  onSelect,
}: {
  conversation: AdminConversation;
  active: boolean;
  onSelect: () => void;
}) {
  const title = conversationTitle(c);
  const last = c.lastMessage;

  return (
    <button
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-start gap-3 border-b border-[rgba(0,35,75,0.05)] px-4 py-3.5 text-left transition-colors",
        active ? "bg-terra-pale/35" : "hover:bg-cream-soft",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
        {initials(title)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-navy">{title}</p>
          {c.lastMessageAt && (
            <span className="shrink-0 text-[10px] text-ink-soft">
              {timeAgo(c.lastMessageAt)}
            </span>
          )}
        </div>
        <p className="flex items-center gap-1.5 truncate text-[11px] text-terra">
          {c.type === "support"
            ? "Support"
            : c.booking?.reference
              ? `Prestation ${c.booking.reference}`
              : "Sans prestation en cours"}
          {c.contactFlaggedAt && (
            <span className="flex items-center gap-1 text-[#8A6212]">
              <AlertTriangle className="h-3 w-3" /> signalée
            </span>
          )}
        </p>
        {last && (
          <p className="mt-0.5 truncate text-xs text-ink-soft">
            {last.senderRole === "support" && "Équipe : "}
            {last.body || "Pièce jointe"}
          </p>
        )}
      </div>
      {c.unreadCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-terra px-1 font-mono text-[10px] font-bold text-white">
          {c.unreadCount}
        </span>
      )}
    </button>
  );
}
