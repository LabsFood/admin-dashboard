"use client";

import { ShieldCheck, ChefHat, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { roleHint, roleLabel } from "@/lib/status";
import type { Role } from "@/lib/api/types";

const ROLES: { id: Role; Icon: typeof User }[] = [
  { id: "client", Icon: User },
  { id: "chef", Icon: ChefHat },
  { id: "admin", Icon: ShieldCheck },
];

/**
 * Sélecteur segmenté du rôle applicatif (`users.role`).
 * Utilisé à la création d'un compte et pour `PATCH /admin/users/{id}/role`.
 */
export default function RoleSelect({
  value,
  onChange,
  disabled,
  hint = true,
}: {
  value: Role;
  onChange: (role: Role) => void;
  disabled?: boolean;
  /** Affiche la ligne d'explication sous le sélecteur. */
  hint?: boolean;
}) {
  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Rôle applicatif"
        className="flex items-center gap-1 rounded-2xl border border-[rgba(0,35,75,0.13)] bg-paper p-1"
      >
        {ROLES.map(({ id, Icon }) => {
          const active = id === value;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                active
                  ? "bg-navy text-white"
                  : "text-ink-mid hover:bg-cream-soft hover:text-navy",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {roleLabel[id]}
            </button>
          );
        })}
      </div>
      {hint && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
          {roleHint[value]}
        </p>
      )}
    </div>
  );
}
