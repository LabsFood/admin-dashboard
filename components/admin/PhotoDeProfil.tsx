"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toaster";
import { cn, initials } from "@/lib/utils";
import { adminErrorMessage } from "@/lib/api/errors";
import { useDeleteUserAvatar } from "@/lib/api/admin";

/* ─────────────────────────────────────────────────────────────────────────────
   La photo de profil, et le geste de la retirer.

   Les deux fiches affichaient des initiales même quand la personne avait
   déposé une photo — donc la console ne pouvait pas voir ce que les clients
   voient, et encore moins retirer une photo qui n'a rien à faire sur une
   vitrine publique.

   Le compte n'est pas touché : la personne peut en déposer une autre. C'est la
   différence avec une suspension, et le dialogue le dit, pour que le geste ne
   soit pas pris pour une sanction.
   ───────────────────────────────────────────────────────────────────────────── */

export default function PhotoDeProfil({
  userId,
  nom,
  url,
  className,
  tone = "navy",
}: {
  /** L'identifiant du **compte**, pas celui de la fiche. */
  userId: string;
  nom: string;
  url?: string | null;
  className?: string;
  tone?: "navy" | "terra";
}) {
  const toast = useToast();
  const retirer = useDeleteUserAvatar();
  const [ouvert, setOuvert] = useState(false);

  return (
    <div className="relative shrink-0">
      {url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={url}
          alt=""
          className={cn("shrink-0 object-cover", className)}
        />
      ) : (
        <span
          aria-hidden
          className={cn(
            "flex shrink-0 items-center justify-center font-bold text-white",
            tone === "terra" ? "bg-terra" : "bg-navy",
            className,
          )}
        >
          {initials(nom)}
        </span>
      )}

      {url && (
        <button
          type="button"
          onClick={() => setOuvert(true)}
          title="Retirer la photo de profil"
          aria-label="Retirer la photo de profil"
          className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-paper text-ink-soft shadow-[0_1px_4px_rgba(31,42,55,0.25)] transition-colors hover:text-danger"
        >
          <ImageOff className="h-3 w-3" />
        </button>
      )}

      <ConfirmDialog
        open={ouvert}
        onClose={() => setOuvert(false)}
        onConfirm={() =>
          retirer.mutate(userId, {
            onSuccess: () => {
              setOuvert(false);
              toast.success(
                "Photo retirée",
                `${nom} apparaît de nouveau avec ses initiales.`,
              );
            },
            onError: (e) => {
              setOuvert(false);
              toast.error("Photo conservée", adminErrorMessage(e));
            },
          })
        }
        pending={retirer.isPending}
        tone="danger"
        title={`Retirer la photo de ${nom} ?`}
        lead="Elle disparaît de sa fiche et de sa page publique. Ses initiales la remplacent."
        detail="Le compte n'est pas touché : la personne pourra en déposer une autre. Ce n'est pas une suspension."
        confirmLabel="Retirer la photo"
      />
    </div>
  );
}
