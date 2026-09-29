"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChefHat, LogOut, ArrowRight } from "lucide-react";
import Logo from "./Logo";
import { NAV_SECTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { RESERVATIONS } from "@/lib/mock/reservations";
import { DEMANDES } from "@/lib/mock/demandes";
import { THREADS } from "@/lib/mock/messages";
import { CONTACT_MESSAGES } from "@/lib/mock/contact";

const BADGES: Record<string, number> = {
  "/reservations": RESERVATIONS.filter((r) => r.status === "pending").length,
  "/demandes": DEMANDES.filter((d) => d.status === "submitted").length,
  "/messagerie": THREADS.reduce((n, t) => n + t.unreadCount, 0),
  "/contact": CONTACT_MESSAGES.filter((c) => c.status === "new").length,
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  const handleLogout = () => {
    signOut();
    router.replace("/login");
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="sticky top-4 my-4 ml-4 hidden h-[calc(100vh-2rem)] w-72 shrink-0 lg:flex">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-navy text-white">
        {/* Logo */}
        <div className="px-5 pb-5 pt-5">
          <Logo variant="light" />
        </div>

        {/* Navigation */}
        <nav className="scroll-thin flex-1 overflow-y-auto px-3 pb-2">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-4">
              <p className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map(({ href, label, Icon }) => {
                  const active = isActive(href);
                  const badge = BADGES[href];
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-terra font-semibold text-white"
                            : "text-white/70 hover:bg-white/[0.07] hover:text-white",
                        )}
                      >
                        <Icon
                          className="h-[18px] w-[18px] shrink-0"
                          strokeWidth={active ? 2.4 : 2}
                        />
                        <span className="flex-1 truncate">{label}</span>
                        {badge ? (
                          <span
                            className={cn(
                              "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-[10px] font-semibold",
                              active
                                ? "bg-white text-terra"
                                : "bg-terra text-white",
                            )}
                          >
                            {badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* CTA + logout */}
        <div className="space-y-2 p-4">
          <Link
            href="/reservations?nouvelle=1"
            className="group flex w-full items-center justify-between rounded-lg bg-terra px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-terra-deep"
          >
            <span className="flex items-center gap-2">
              <ChefHat className="h-4 w-4" />
              Nouvelle session
            </span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/55 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Déconnexion
          </button>
        </div>
      </div>
    </aside>
  );
}
