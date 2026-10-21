"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toaster";
import { blockingBookings, useDeleteUser } from "@/lib/api/admin";
import { adminErrorMessage } from "@/lib/api/errors";
import { ApiError } from "@/lib/api/client";

/* ─────────────────────────────────────────────────────────────────────────────
   Supprimer un compte.

   C'est le geste le plus définitif de la console : le compte Clerk disparaît,
   la personne ne peut plus se connecter, et rien ne la fera revenir. Il se
   confirme donc toujours, et le dialogue nomme ce qui va se passer **avant**
   plutôt que de l'expliquer après.

   Deux issues que l'API distingue et que l'écran doit distinguer aussi :

   - `deleted` : la ligne est partie avec le compte ;
   - `anonymised` : des prestations passées la référencent, elle reste donc,
     vidée de son nom, de son email et de son téléphone — et la vitrine d'un
     batch cooker passe hors ligne.

   Et un refus qui n'en est pas un : tant qu'une réservation est ouverte,
   l'API répond `409` **et dit lesquelles**. On les affiche, parce que
   « supprimez d'abord ses réservations » sans dire lesquelles ne fait avancer
   personne.
   ───────────────────────────────────────────────────────────────────────────── */

export default function DeleteAccountButton({
  userId,
  nom,
  role,
  retourVers,
}: {
  /** L'identifiant du **compte**, pas celui de la page ni de la candidature. */
  userId: string;
  nom: string;
  role: "batch cooker" | "client" | "compte";
  /** Où aller une fois le compte supprimé. */
  retourVers: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const supprimer = useDeleteUser();
  const [ouvert, setOuvert] = useState(false);

  const refus =
    supprimer.error instanceof ApiError && supprimer.error.status === 409
      ? blockingBookings(supprimer.error)
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        disabled={supprimer.isPending}
        className="btn btn-sm text-danger hover:bg-danger-soft"
      >
        {supprimer.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="h-3 w-3" aria-hidden />
        )}
        Supprimer ce compte
      </button>

      {refus && refus.length > 0 && (
        <div className="mt-3 rounded-xl bg-danger-soft px-3.5 py-3">
          <p className="flex items-start gap-2 text-[13px] font-semibold text-danger">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {refus.length} réservation{refus.length > 1 ? "s" : ""} encore ouverte
            {refus.length > 1 ? "s" : ""}
          </p>
          <ul className="mt-2 space-y-1 text-[12px] text-ink-mid">
            {refus.map((b, i) => (
              <li key={b.id ?? i} className="font-mono">
                {b.reference ?? b.id}
                {b.startsAt
                  ? ` · ${new Date(b.startsAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                    })}`
                  : ""}
                {b.status ? ` · ${b.status}` : ""}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
            Annulez-les ou terminez-les depuis l&apos;écran des réservations, puis
            revenez ici.
          </p>
        </div>
      )}

      <ConfirmDialog
        open={ouvert}
        onClose={() => setOuvert(false)}
        onConfirm={() =>
          supprimer.mutate(userId, {
            onSuccess: (r) => {
              setOuvert(false);
              toast.success(
                r.outcome === "anonymised"
                  ? `Compte de ${nom} anonymisé`
                  : `Compte de ${nom} supprimé`,
                r.outcome === "anonymised"
                  ? "Des prestations passées le référençaient : la ligne reste, vidée de ses coordonnées."
                  : "Le compte Clerk et la ligne en base ont été supprimés.",
              );
              router.push(retourVers);
            },
            onError: (e) => {
              setOuvert(false);
              if (e instanceof ApiError && e.status === 409) {
                toast.error(
                  "Suppression refusée",
                  "Des réservations sont encore ouvertes : la liste s'affiche sous le bouton.",
                );
              } else {
                toast.error("Le compte n'a pas été supprimé", adminErrorMessage(e));
              }
            },
          })
        }
        pending={supprimer.isPending}
        tone="danger"
        title={`Supprimer le compte de ${nom} ?`}
        lead={`Son compte Clerk est supprimé : ${
          role === "client" ? "ce client" : role === "batch cooker" ? "ce batch cooker" : "cette personne"
        } ne pourra plus se connecter, et rien ne le fera revenir.`}
        detail={
          role === "batch cooker"
            ? "Si des prestations passées le référencent, sa ligne reste mais vidée de son nom, de son email et de son téléphone, et sa vitrine passe hors ligne. L'API refuse tant qu'une réservation est ouverte."
            : "Si des prestations passées le référencent, sa ligne reste mais vidée de son nom, de son email et de son téléphone. L'API refuse tant qu'une réservation est ouverte."
        }
        confirmLabel="Supprimer définitivement"
      />
    </>
  );
}
