"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/ingredients", label: "Liste commune" },
  { href: "/ingredients/a-valider", label: "À valider" },
  { href: "/ingredients/a-relier", label: "Lus dans les imports" },
  { href: "/ingredients/import", label: "Import" },
] as const;

/** Les écrans des ingrédients, côte à côte. */
export default function IngredientTabs({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="Ingrédients" className="flex flex-wrap gap-2">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.href === current ? "page" : undefined}
          className={cn("btn btn-sm", t.href === current ? "btn-navy" : "btn-outline")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
