"use client";

import Link from "next/link";
import { Clock, Flame, Pencil, TrendingUp, Users } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { mealTone, mealLabel } from "@/lib/status";
import type { Meal, MealStatus } from "@/lib/mock/types";

const STATUSES: MealStatus[] = ["published", "draft", "archived"];

export default function MealDrawer({
  meal,
  open,
  onClose,
  status,
  onStatusChange,
  editHref,
}: {
  meal: Meal | null;
  open: boolean;
  onClose: () => void;
  status: MealStatus;
  onStatusChange: (status: MealStatus) => void;
  editHref: string;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow={meal ? `${meal.country} · ${meal.continent}` : undefined}
      title={meal?.name}
      footer={
        meal && (
          <div className="flex items-center gap-2">
            <Link href={editHref} onClick={onClose} className="btn btn-primary flex-1">
              <Pencil className="h-4 w-4" /> Modifier
            </Link>
            <button onClick={onClose} className="btn btn-ghost">
              Fermer
            </button>
          </div>
        )
      }
    >
      {meal && (
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meal.image}
              alt={meal.name}
              className="aspect-[16/10] w-full object-cover"
            />
            {meal.isFeatured && (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-navy/85 px-2 py-1 text-[10px] font-semibold uppercase text-terra-soft">
                <Flame className="h-3 w-3" /> Vedette
              </span>
            )}
          </div>

          {meal.description && (
            <p className="text-sm leading-relaxed text-ink-mid">
              {meal.description}
            </p>
          )}

          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat Icon={Users} value={meal.portions} label="portions" />
            <Stat Icon={Clock} value={`${meal.prepTime}′`} label="prépa" />
            <Stat Icon={TrendingUp} value={meal.timesOrdered} label="commandes" />
          </div>

          <Block title="Difficulté & calories">
            <div className="flex flex-wrap gap-2">
              <Badge tone="navy">{meal.difficulty}</Badge>
              <Badge tone="neutral">{meal.calories} kcal</Badge>
            </div>
          </Block>

          {meal.dietaryTags.length > 0 && (
            <Block title="Régimes">
              <div className="flex flex-wrap gap-1.5">
                {meal.dietaryTags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-teal-pale px-2.5 py-0.5 text-[11px] font-medium text-teal"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Block>
          )}

          {meal.allergens.length > 0 && (
            <Block title="Allergènes">
              <div className="flex flex-wrap gap-1.5">
                {meal.allergens.map((a) => (
                  <span
                    key={a}
                    className="rounded-full bg-danger-soft px-2.5 py-0.5 text-[11px] font-medium text-danger"
                  >
                    ⚠ {a}
                  </span>
                ))}
              </div>
            </Block>
          )}

          <Block title="Statut de publication">
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
          </Block>
        </div>
      )}
    </Drawer>
  );
}

function Stat({
  Icon,
  value,
  label,
}: {
  Icon: typeof Clock;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-paper p-3">
      <Icon className="mx-auto h-4 w-4 text-terra" />
      <p className="mt-1 font-display text-base font-bold text-navy">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-ink-soft">{label}</p>
    </div>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {title}
      </p>
      {children}
    </div>
  );
}
