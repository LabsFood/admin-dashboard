"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import RoleSelect from "@/components/admin/RoleSelect";
import { adminErrorMessage } from "@/lib/api/errors";
import { useSetUserRole } from "@/lib/api/admin";
import { rememberRole } from "@/lib/recent-users";
import type { Role } from "@/lib/api/types";

/**
 * Changement de rôle applicatif (`PATCH /admin/users/{id}/role`).
 *
 * `userId` doit être l'uuid `users.id` — côté fiche client, c'est
 * `ClientView.userId` (et non l'id du profil, qui sert de clé de route).
 * La sélection est optimiste et revient en arrière si l'API refuse.
 */
export default function RoleEditor({
  userId,
  role,
  hint = true,
}: {
  userId: string;
  role: Role;
  hint?: boolean;
}) {
  const setRole = useSetUserRole();
  const [current, setCurrent] = useState<Role>(role);
  const [done, setDone] = useState(false);

  const change = (next: Role) => {
    if (next === current || setRole.isPending) return;
    const previous = current;
    setCurrent(next);
    setDone(false);

    setRole.mutate(
      { id: userId, role: next },
      {
        onSuccess: (user) => {
          // On s'aligne sur ce que l'API a réellement persisté.
          setCurrent(user.role);
          rememberRole(userId, user.role);
          setDone(true);
        },
        onError: () => setCurrent(previous),
      },
    );
  };

  return (
    <div className="space-y-2">
      <RoleSelect
        value={current}
        onChange={change}
        disabled={setRole.isPending}
        hint={hint}
      />

      {setRole.isPending && (
        <p className="flex items-center gap-1.5 text-[11px] text-ink-soft">
          <Loader2 className="h-3 w-3 animate-spin" /> Mise à jour du rôle…
        </p>
      )}

      {done && !setRole.isPending && (
        <p className="flex items-center gap-1.5 text-[11px] text-success">
          <Check className="h-3 w-3" /> Rôle mis à jour.
        </p>
      )}

      {setRole.isError && (
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-danger">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {adminErrorMessage(setRole.error)}
        </p>
      )}
    </div>
  );
}
