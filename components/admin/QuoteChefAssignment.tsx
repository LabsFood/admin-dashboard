"use client";

import Link from "next/link";
import { ArrowUpRight, ChefHat, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toaster";
import { useAdminChefs } from "@/lib/api/chefs";
import { ApiError } from "@/lib/api/client";
import { useUpdateQuote, type Quote } from "@/lib/api/quotes";

const REFUS: Record<string, string> = {
  CHEF_NOT_ASSIGNABLE: "Ce compte n'est pas un batch cooker vérifié.",
  QUOTE_CLOSED: "Cette demande est close.",
};

/**
 * Qui prend la demande sur-mesure.
 *
 * On choisit parmi les batch cookers vérifiés — en ligne ou non : répondre à une
 * demande sur-mesure ne suppose pas une vitrine ouverte. L'API refuse tout autre
 * compte (422 `CHEF_NOT_ASSIGNABLE`). Changer de batch cooker retire l'offre que
 * le précédent avait en attente : elle part avec lui.
 */
export default function QuoteChefAssignment({ quote }: { quote: Quote }) {
  const toast = useToast();
  const update = useUpdateQuote();
  // La même requête pour toutes les cartes de la page : une seule part.
  // 100 est le plafond d'une page de l'API ; au-delà il faudra une recherche.
  const chefs = useAdminChefs({ state: "verified", sort: "name", limit: 100 });
  const options = chefs.data?.data ?? [];

  const assigned = quote.assignedChef ?? null;
  // Un batch cooker affecté puis sorti du réseau n'est plus dans la liste : on
  // garde son nom dans le sélecteur plutôt que d'afficher « personne ».
  const horsListe =
    assigned && !options.some((chef) => chef.userId === assigned.userId);

  const affecter = (userId: string) =>
    update.mutate(
      { id: quote.id, patch: { assignedChefUserId: userId || null } },
      {
        onSuccess: () =>
          toast.success(userId ? "Batch cooker affecté" : "Affectation retirée"),
        onError: (error) =>
          toast.error(
            "Affectation non enregistrée",
            (error instanceof ApiError &&
              REFUS[(error.body as { code?: string } | null)?.code ?? ""]) ||
              (error instanceof Error ? error.message : undefined),
          ),
      },
    );

  return (
    <div className="mt-4 border-t border-[rgba(0,35,75,0.08)] pt-3">
      <label className="block">
        <span className="field-label flex items-center gap-1.5">
          <ChefHat className="h-3.5 w-3.5" aria-hidden /> Batch cooker affecté
          {update.isPending && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
        </span>
        <select
          value={quote.assignedChefUserId ?? ""}
          onChange={(e) => affecter(e.target.value)}
          disabled={update.isPending || chefs.isPending}
          className="input-base"
        >
          <option value="">Personne pour l&apos;instant</option>
          {horsListe && assigned && (
            <option value={assigned.userId}>{assigned.displayName} (hors réseau)</option>
          )}
          {options.map((chef) => (
            <option key={chef.userId} value={chef.userId}>
              {chef.displayName}
              {chef.city ? ` · ${chef.city}` : ""}
              {chef.state !== "online" ? " (hors ligne)" : ""}
            </option>
          ))}
        </select>
      </label>
      {quote.activeOffer && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
          Une offre attend la réponse du client : changer de batch cooker la retire.
        </p>
      )}
      {chefs.isError && (
        <p className="mt-1.5 text-[11px] text-danger">
          La liste des batch cookers n&apos;a pas pu être chargée.
        </p>
      )}
      {assigned && (
        <Link
          href={`/batchcookers/${assigned.chefProfileId}`}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-terra hover:underline"
        >
          Voir la fiche de {assigned.displayName}
          <ArrowUpRight className="h-3 w-3" aria-hidden />
        </Link>
      )}
    </div>
  );
}
