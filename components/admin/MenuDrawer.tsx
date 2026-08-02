"use client";

import Link from "next/link";
import { CalendarRange, Pencil, UtensilsCrossed } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import Badge from "@/components/ui/Badge";
import { cn, formatDate } from "@/lib/utils";
import { mealTone, mealLabel } from "@/lib/status";
import { mealById } from "@/lib/mock/menus";
import type { MealStatus, WeeklyMenu } from "@/lib/mock/types";

const STATUSES: MealStatus[] = ["published", "draft", "archived"];

export default function MenuDrawer({
  menu,
  open,
  onClose,
  status,
  onStatusChange,
}: {
  menu: WeeklyMenu | null;
  open: boolean;
  onClose: () => void;
  status: MealStatus;
  onStatusChange: (status: MealStatus) => void;
}) {
  const meals = menu
    ? menu.mealIds.map((id) => mealById(id)).filter((m) => m !== undefined)
    : [];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow={menu ? `Semaine ${menu.weekNumber}` : undefined}
      title={menu?.title}
      footer={
        menu && (
          <div className="flex items-center gap-2">
            <Link
              href={`/menus/composer?id=${menu.id}`}
              onClick={onClose}
              className="btn btn-primary flex-1"
            >
              <Pencil className="h-4 w-4" /> Modifier le menu
            </Link>
            <button onClick={onClose} className="btn btn-ghost">
              Fermer
            </button>
          </div>
        )
      }
    >
      {menu && (
        <div className="space-y-5">
          <div className="flex items-center gap-2.5 rounded-2xl bg-paper p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-terra/12 text-terra-deep">
              <CalendarRange className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink-soft">
                Période
              </p>
              <p className="text-sm font-semibold text-navy">
                {formatDate(menu.startDate)} → {formatDate(menu.endDate)}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              <UtensilsCrossed className="h-3.5 w-3.5" /> Plats ({meals.length})
            </p>
            <ul className="space-y-2">
              {meals.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl bg-paper p-2.5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.image}
                    alt={m.name}
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy">
                      {m.name}
                    </p>
                    <p className="font-mono text-[10px] text-ink-soft">
                      {m.country}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              Statut de publication
            </p>
            <div className="mb-3">
              <Badge tone={mealTone[status]}>{mealLabel[status]}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(s)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    s === status
                      ? "bg-navy text-white"
                      : "bg-cream-soft text-ink-mid hover:bg-cream-deep",
                  )}
                >
                  {mealLabel[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
