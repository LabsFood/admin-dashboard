"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Archive,
  Mail,
  MessageSquare,
  Phone,
  Send,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import FilterTabs from "@/components/ui/FilterTabs";
import { cn, initials, timeAgo } from "@/lib/utils";
import { contactTone } from "@/lib/status";
import {
  CONTACT_MESSAGES,
  CONTACT_STATUS_LABEL,
} from "@/lib/mock/contact";
import type {
  ContactMessage,
  ContactStatus,
  ContactChannel,
} from "@/lib/mock/types";

type Filter = "all" | ContactStatus;

const CHANNEL_ICON: Record<ContactChannel, typeof Mail> = {
  form: MessageSquare,
  whatsapp: Phone,
  email: Mail,
};
const CHANNEL_LABEL: Record<ContactChannel, string> = {
  form: "Formulaire",
  whatsapp: "WhatsApp",
  email: "Email",
};

export default function ContactPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [messages, setMessages] = useState<ContactMessage[]>(CONTACT_MESSAGES);
  const [activeId, setActiveId] = useState<string>(CONTACT_MESSAGES[0].id);
  const [reply, setReply] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  const counts = messages.reduce<Record<string, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = messages
    .filter((m) => filter === "all" || m.status === filter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const active = messages.find((m) => m.id === activeId) ?? filtered[0];

  const open = (id: string) => {
    setActiveId(id);
    setMobileView("detail");
    setMessages((ms) =>
      ms.map((m) =>
        m.id === id && m.status === "new" ? { ...m, status: "read" } : m,
      ),
    );
  };

  const setStatus = (id: string, status: ContactStatus) =>
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, status } : m)));

  return (
    <div className="space-y-4">
      <FilterTabs<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { id: "all", label: "Tous", count: messages.length },
          { id: "new", label: "Nouveaux", count: counts.new ?? 0 },
          { id: "read", label: "Lus", count: counts.read ?? 0 },
          { id: "replied", label: "Répondus", count: counts.replied ?? 0 },
          { id: "archived", label: "Archivés", count: counts.archived ?? 0 },
        ]}
      />

      <div className="card grid h-[calc(100vh-13rem)] grid-cols-1 overflow-hidden lg:grid-cols-[340px_1fr]">
        {/* Liste */}
        <ul
          className={cn(
            "scroll-thin overflow-y-auto border-r border-[rgba(0,35,75,0.07)]",
            mobileView === "detail" && "hidden lg:block",
          )}
        >
          {filtered.map((m) => {
            const Icon = CHANNEL_ICON[m.channel];
            return (
              <li key={m.id}>
                <button
                  onClick={() => open(m.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-[rgba(0,35,75,0.05)] px-4 py-3.5 text-left transition-colors",
                    m.id === active?.id
                      ? "bg-terra-pale/35"
                      : "hover:bg-cream-soft",
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
                    {initials(m.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-navy">
                        {m.name}
                      </p>
                      {m.status === "new" && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-terra" />
                      )}
                    </div>
                    <p className="truncate text-xs font-medium text-ink-mid">
                      {m.subject}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-soft">
                      <Icon className="h-3 w-3" />
                      {CHANNEL_LABEL[m.channel]} · {timeAgo(m.createdAt)}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Détail */}
        {active && (
          <div
            className={cn(
              "flex flex-col",
              mobileView === "list" && "hidden lg:flex",
            )}
          >
            <header className="flex items-start gap-3 border-b border-[rgba(0,35,75,0.07)] px-5 py-4">
              <button
                onClick={() => setMobileView("list")}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-soft text-navy lg:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-navy">
                    {active.subject}
                  </h3>
                  <Badge tone={contactTone[active.status]}>
                    {CONTACT_STATUS_LABEL[active.status]}
                  </Badge>
                </div>
                <p className="text-xs text-ink-soft">
                  {active.name} · {active.email}
                </p>
              </div>
            </header>

            <div className="scroll-thin flex-1 overflow-y-auto px-5 py-5">
              <div className="rounded-2xl bg-cream-soft p-4">
                <p className="text-sm leading-relaxed text-ink">
                  {active.message}
                </p>
              </div>
              <p className="mt-2 text-[11px] text-ink-soft">
                Reçu {timeAgo(active.createdAt)} via{" "}
                {CHANNEL_LABEL[active.channel]}
              </p>
            </div>

            <div className="border-t border-[rgba(0,35,75,0.07)] p-4">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder={`Répondre à ${active.name}…`}
                className="input-base resize-none"
              />
              <div className="mt-2 flex items-center justify-between">
                <button
                  onClick={() => setStatus(active.id, "archived")}
                  className="btn btn-ghost"
                >
                  <Archive className="h-4 w-4" /> Archiver
                </button>
                <button
                  onClick={() => {
                    setStatus(active.id, "replied");
                    setReply("");
                  }}
                  disabled={!reply.trim()}
                  className="btn btn-primary disabled:opacity-50"
                >
                  <Send className="h-4 w-4" /> Envoyer la réponse
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
