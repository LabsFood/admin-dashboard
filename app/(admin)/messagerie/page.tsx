"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Phone, Search, Send, User } from "lucide-react";
import { cn, formatTime, initials, timeAgo } from "@/lib/utils";
import { THREADS } from "@/lib/mock/messages";
import type { ChatThread, ChatMessage } from "@/lib/mock/types";

const QUICK = [
  "Bonjour, je reviens vers vous rapidement 🙂",
  "C'est noté, je transmets au chef.",
  "Votre liste de courses arrive ce soir.",
];

export default function MessageriePage() {
  const [threads, setThreads] = useState<ChatThread[]>(THREADS);
  const [activeId, setActiveId] = useState<string>(THREADS[0].id);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = threads.find((t) => t.id === activeId)!;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [active.messages.length, activeId]);

  const openThread = (id: string) => {
    setActiveId(id);
    setMobileView("chat");
    setThreads((ts) =>
      ts.map((t) =>
        t.id === id
          ? {
              ...t,
              unreadCount: 0,
              messages: t.messages.map((m) => ({ ...m, read: true })),
            }
          : t,
      ),
    );
  };

  const send = (text: string) => {
    if (!text.trim()) return;
    const msg: ChatMessage = {
      id: `m_${Date.now()}`,
      from: "admin",
      text: text.trim(),
      at: new Date().toISOString(),
      read: true,
    };
    setThreads((ts) =>
      ts.map((t) =>
        t.id === activeId
          ? {
              ...t,
              messages: [...t.messages, msg],
              lastMessageAt: msg.at,
            }
          : t,
      ),
    );
    setDraft("");
  };

  const filtered = threads
    .filter((t) => t.clientName.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));

  return (
    <div className="card grid h-[calc(100vh-11rem)] grid-cols-1 overflow-hidden lg:grid-cols-[320px_1fr]">
      {/* Liste des conversations */}
      <div
        className={cn(
          "flex flex-col border-r border-[rgba(0,35,75,0.07)]",
          mobileView === "chat" && "hidden lg:flex",
        )}
      >
        <div className="border-b border-[rgba(0,35,75,0.07)] p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un client…"
              className="input-base pl-9"
            />
          </div>
        </div>
        <ul className="scroll-thin flex-1 overflow-y-auto">
          {filtered.map((t) => {
            const last = t.messages[t.messages.length - 1];
            return (
              <li key={t.id}>
                <button
                  onClick={() => openThread(t.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-[rgba(0,35,75,0.05)] px-4 py-3.5 text-left transition-colors",
                    t.id === activeId
                      ? "bg-terra-pale/35"
                      : "hover:bg-cream-soft",
                  )}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                    {initials(t.clientName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-navy">
                        {t.clientName}
                      </p>
                      <span className="shrink-0 text-[10px] text-ink-soft">
                        {timeAgo(t.lastMessageAt)}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-terra">
                      {t.topic}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-soft">
                      {last.from === "admin" && "Vous : "}
                      {last.text}
                    </p>
                  </div>
                  {t.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-terra px-1 font-mono text-[10px] font-bold text-white">
                      {t.unreadCount}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Conversation */}
      <div
        className={cn(
          "flex flex-col",
          mobileView === "list" && "hidden lg:flex",
        )}
      >
        {/* En-tête */}
        <header className="flex items-center gap-3 border-b border-[rgba(0,35,75,0.07)] px-4 py-3.5">
          <button
            onClick={() => setMobileView("list")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-soft text-navy lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
            {initials(active.clientName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy">
              {active.clientName}
            </p>
            <p className="truncate text-[11px] text-ink-soft">
              {active.topic}
            </p>
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-soft text-navy hover:bg-cream-deep">
            <Phone className="h-4 w-4" />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-soft text-navy hover:bg-cream-deep">
            <User className="h-4 w-4" />
          </button>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="scroll-thin flex-1 space-y-3 overflow-y-auto bg-cream-soft px-4 py-5"
        >
          {active.messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "flex",
                m.from === "admin" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                  m.from === "admin"
                    ? "rounded-br-md bg-navy text-white"
                    : "rounded-bl-md bg-paper text-navy",
                )}
              >
                {m.text}
                <span
                  className={cn(
                    "mt-1 block text-[10px]",
                    m.from === "admin" ? "text-white/45" : "text-ink-soft",
                  )}
                >
                  {formatTime(m.at)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="border-t border-[rgba(0,35,75,0.07)] p-3"
        >
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setDraft(q)}
                className="rounded-full bg-cream-soft px-2.5 py-1 text-[11px] text-ink-mid transition-colors hover:bg-terra-pale/50 hover:text-terra-deep"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              rows={1}
              placeholder="Écrire un message…"
              className="input-base flex-1 resize-none"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terra text-white transition-colors hover:bg-terra-deep disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
