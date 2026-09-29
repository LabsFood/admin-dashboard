"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings,
  UserCircle2,
  X,
} from "lucide-react";
import { navItemByPath, NAV_SECTIONS } from "@/lib/nav";
import { useAuth } from "@/lib/auth";
import { cn, initials } from "@/lib/utils";
import Logo from "./Logo";

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const meta = navItemByPath(pathname);

  const logout = () => {
    signOut();
    router.replace("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[rgba(0,35,75,0.07)] bg-cream/85 backdrop-blur-md">
        <div className="flex items-center gap-4 px-4 py-3.5 sm:px-6">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(0,35,75,0.1)] bg-paper text-navy lg:hidden"
            aria-label="Menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="eyebrow mb-0.5 hidden sm:flex">{meta.eyebrow}</p>
            <h1 className="truncate font-display text-xl font-bold leading-tight text-navy lg:text-2xl">
              {meta.title}
            </h1>
            <p className="mt-0.5 hidden truncate text-xs text-ink-soft md:block">
              {meta.subtitle}
            </p>
          </div>

          <div className="relative hidden xl:block">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              placeholder="Rechercher un client, une réservation…"
              className="w-72 rounded-full border border-[rgba(0,35,75,0.1)] bg-paper py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-terra"
            />
          </div>

          <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(0,35,75,0.1)] bg-paper text-navy transition-colors hover:border-terra">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-terra" />
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-[rgba(0,35,75,0.1)] bg-paper py-1 pl-1 pr-2.5 transition-colors hover:border-terra"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                {user ? initials(user.name) : "AD"}
              </span>
              <span className="hidden max-w-[110px] truncate text-xs font-semibold text-navy md:inline">
                {user?.name.split(" ")[0] ?? "Admin"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-ink-soft" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-2xl border border-[rgba(0,35,75,0.08)] bg-paper p-2 shadow-[0_20px_60px_-20px_rgba(0,35,75,0.3)]"
                onMouseLeave={() => setMenuOpen(false)}
              >
                {/* Qui est connecté, et à quel titre : c'est ce que disait
                    l'encart de la barre latérale, posé là où on va déjà. */}
                <div className="border-b border-[rgba(0,35,75,0.07)] px-3 pb-2.5 pt-1">
                  <p className="truncate text-sm font-semibold text-navy">
                    {user?.name}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-terra">
                    {user?.role ?? "Console admin"}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-ink-soft">
                    {user?.email}
                  </p>
                </div>
                <Link
                  href="/parametres"
                  onClick={() => setMenuOpen(false)}
                  className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-navy hover:bg-cream-soft"
                >
                  <UserCircle2 className="h-4 w-4 text-terra" /> Mon profil
                </Link>
                <Link
                  href="/parametres"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-navy hover:bg-cream-soft"
                >
                  <Settings className="h-4 w-4 text-terra" /> Paramètres
                </Link>
                <button
                  onClick={logout}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-[rgba(0,35,75,0.07)] px-3 py-2 pt-2.5 text-sm text-navy hover:bg-cream-soft"
                >
                  <LogOut className="h-4 w-4 text-terra" /> Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Drawer mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col overflow-y-auto bg-navy text-white">
            <div className="flex items-center justify-between px-5 py-5">
              <Logo variant="light" />
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 pb-6">
              {NAV_SECTIONS.map((section) => (
                <div key={section.label} className="mb-4">
                  <p className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
                    {section.label}
                  </p>
                  <ul className="space-y-0.5">
                    {section.items.map(({ href, label, Icon }) => {
                      const active =
                        href === "/"
                          ? pathname === "/"
                          : pathname.startsWith(href);
                      return (
                        <li key={href}>
                          <Link
                            href={href}
                            onClick={() => setDrawerOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                              active
                                ? "bg-terra font-semibold text-white"
                                : "text-white/70",
                            )}
                          >
                            <Icon className="h-[18px] w-[18px]" />
                            {label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
