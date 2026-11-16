"use client";

import FormSkeleton from "@/components/admin/FormSkeleton";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, RotateCw } from "lucide-react";
import MenuForm from "@/components/admin/MenuForm";
import { useLabsFoodMenus } from "@/lib/api/catalog";
import { adminErrorMessage } from "@/lib/api/errors";

/**
 * Composer — `?menu=<id>` modifie un menu Lab's Food existant ; sans
 * paramètre, on choisit sur place entre un menu et une semaine.
 */
function Composer() {
  const id = useSearchParams().get("menu");
  const menus = useLabsFoodMenus();
  const menu = id ? menus.data?.find((m) => m.id === id) : undefined;

  if (!id) return <MenuForm />;

  if (menus.isPending) {
    return <FormSkeleton />;
  }

  if (menus.isError) {
    return (
      <section className="card p-6">
        <p className="flex items-start gap-2 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {adminErrorMessage(menus.error)}
        </p>
        <button onClick={() => menus.refetch()} className="btn btn-outline btn-sm mt-4">
          <RotateCw className="h-3 w-3" aria-hidden /> Réessayer
        </button>
      </section>
    );
  }

  if (!menu) {
    return (
      <section className="card mx-auto max-w-lg p-6 text-center">
        <p className="font-display text-lg font-bold text-navy">
          Ce menu n&apos;existe plus
        </p>
        <p className="mt-1.5 text-sm text-ink-mid">
          Il a peut-être été supprimé depuis un autre onglet.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button onClick={() => menus.refetch()} className="btn btn-outline btn-sm">
            <RotateCw className="h-3 w-3" aria-hidden /> Recharger
          </button>
          <Link href="/menus" className="btn btn-primary btn-sm">
            Tous les menus
          </Link>
        </div>
      </section>
    );
  }

  return <MenuForm menu={menu} />;
}

export default function ComposerPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <Composer />
    </Suspense>
  );
}
