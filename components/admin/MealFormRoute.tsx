"use client";

import FormSkeleton from "@/components/admin/FormSkeleton";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, RotateCw } from "lucide-react";
import MealForm from "@/components/admin/MealForm";
import { useMeals } from "@/lib/api/catalog";
import { adminErrorMessage } from "@/lib/api/errors";

/**
 * Écrire ou modifier un plat, selon `?id=`. Le plat se lit dans la
 * bibliothèque, relue à l'arrivée pour partir de la version courante.
 */
export default function MealFormRoute({
  variant,
  backHref,
  backLabel,
}: {
  variant: "menu" | "recette";
  backHref: string;
  backLabel: string;
}) {
  const id = useSearchParams().get("id");
  // Le formulaire fige la fiche qu'on lui donne : on la relit à l'arrivée, pour
  // que sa version (`lockVersion`) soit celle d'aujourd'hui et non celle du cache.
  const meals = useMeals({ refetchOnMount: "always" });
  const meal = id ? meals.data?.find((m) => m.id === id) : undefined;

  // Création : aucune raison d'attendre la bibliothèque.
  if (!id) return <MealForm variant={variant} backHref={backHref} />;

  if (meals.isPending || (meals.isFetching && !meals.isFetchedAfterMount && !meals.isError)) {
    return <FormSkeleton />;
  }

  // Une relecture en arrière-plan qui échoue ne remplace pas une fiche ouverte : la
  // version lue reste celle du formulaire, et l'API répond 409 si elle a vieilli.
  if (meals.isError && !meals.data) {
    return (
      <section className="card p-6">
        <p className="flex items-start gap-2 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {adminErrorMessage(meals.error)}
        </p>
        <button onClick={() => meals.refetch()} className="btn btn-outline btn-sm mt-4">
          <RotateCw className="h-3 w-3" aria-hidden /> Réessayer
        </button>
      </section>
    );
  }

  if (!meal) {
    return (
      <section className="card mx-auto max-w-lg p-6 text-center">
        <p className="font-display text-lg font-bold text-navy">
          Ce plat n&apos;existe plus
        </p>
        <p className="mt-1.5 text-sm text-ink-mid">
          Il a peut-être été supprimé depuis un autre onglet.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button onClick={() => meals.refetch()} className="btn btn-outline btn-sm">
            <RotateCw className="h-3 w-3" aria-hidden /> Recharger
          </button>
          <Link href={backHref} className="btn btn-primary btn-sm">
            {backLabel}
          </Link>
        </div>
      </section>
    );
  }

  return <MealForm meal={meal} variant={variant} backHref={backHref} />;
}
