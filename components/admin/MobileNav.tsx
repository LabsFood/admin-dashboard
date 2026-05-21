"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarRange,
  Sparkles,
  MessageCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/", label: "Accueil", Icon: LayoutDashboard },
  { href: "/reservations", label: "Sessions", Icon: CalendarRange },
  { href: "/demandes", label: "Devis", Icon: Sparkles },
  { href: "/messagerie", label: "Messages", Icon: MessageCircle },
  { href: "/clients", label: "Clients", Icon: Users },
];

export default function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-3 left-3 right-3 z-30 rounded-2xl bg-navy px-2 py-2 shadow-[0_20px_50px_-20px_rgba(0,35,75,0.6)] lg:hidden">
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ href, label, Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-colors",
                  active ? "text-terra-soft" : "text-white/55",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
