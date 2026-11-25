"use client";

import { SkeletonRows } from "@/components/ui/Skeleton";
import { useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Pencil,
  ShoppingBasket,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";
import { countryLabel } from "@/lib/countries";
import { catalogLabel, catalogTone, periodLabel } from "@/lib/catalog-labels";
import {
  useDeleteLabsFoodMenu,
  useMeals,
  useUpdateLabsFoodMenu,
  type LabsFoodMenu,
  type MealStatus,
} from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
import { adminErrorMessage } from "@/lib/api/errors";
import OfferToChef from "@/components/admin/OfferToChef";

const STATUSES: MealStatus[] = ["published", "draft", "archived"];

/**
 * Un menu Lab's Food : un assemblage de plats de la maison, qui devient une
 * suggestion adoptable par n'importe quel batch cooker dès qu'il est publié —
 * sauf s'il est réservé à l'un d'eux.
 */
export default function MenuDrawer({
  menu,
  open,
  onClose,
}: {
  menu: LabsFoodMenu | null;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const update = useUpdateLabsFoodMenu();
  const remove = useDeleteLabsFoodMenu();
  const meals = useMeals();
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** Le statut qu'on s'apprête à poser, le temps de le confirmer. */
  const [aConfirmer, setAConfirmer] = useState<MealStatus | null>(null);

  const offered = Boolean(menu?.offeredToChefProfileId);

  // L'API peut renvoyer les plats dépliés ou seulement leurs ids : dans le
  // second cas on les retrouve dans la bibliothèque déjà en cache.
  const dishes =
    menu?.dishes ??
    (menu?.dishIds ?? [])
      .map((id) => (meals.data ?? []).find((m) => m.id === id))
      .filter((m): m is NonNullable<typeof m> => m !== undefined);

  // Plats non dépliés et bibliothèque pas encore là : on n'affiche pas « Aucun plat » à tort.
  const chargePlats = !menu?.dishes && meals.isPending;

  const missing = menu?.dishes
    ? 0
    : (menu?.dishIds?.length ?? 0) - dishes.length;

  /**
   * Publier ou dépublier sort de la console : le menu devient adoptable par
   * tout le réseau, ou cesse de l'être. On confirme ces deux-là, et seulement
   * ceux-là — passer un brouillon en archive ne change rien pour personne.
   */
  function demander(status: MealStatus) {
    if (!menu || status === menu.status) return;
    if (status === "published" || menu.status === "published") {
      setAConfirmer(status);
      return;
    }
    setStatus(status);
  }

  function setStatus(status: MealStatus) {
    if (!menu || status === menu.status) return;
    update.mutate(
      { id: menu.id, patch: { status } },
      {
        onSuccess: () => {
          setAConfirmer(null);
          toast.success(
            `« ${menu.title} » passe en ${catalogLabel[status].toLowerCase()}`,
            status === "published"
              ? "Tous les batch cookers peuvent désormais l'adopter."
              : undefined,
          );
        },
        onError: (e) =>
          toast.error(
            "Le statut n'a pas changé",
            e instanceof ApiError && e.status === 409
              ? "Ce menu est réservé à un batch cooker. Retirez l'offre d'abord."
              : e instanceof Error
                ? e.message
                : undefined,
          ),
      },
    );
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow={menu ? (menu.period ? periodLabel[menu.period] : "Menu Lab's Food") : undefined}
      title={menu?.title}
      footer={
        menu && (
          <div className="flex items-center gap-2">
            <Link
              href={`/menus/composer?menu=${menu.id}`}
              onClick={onClose}
              className="btn btn-primary flex-1"
            >
              <Pencil className="h-4 w-4" aria-hidden /> Modifier le menu
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
          {menu.imageUrl && (
            <div className="overflow-hidden rounded-2xl bg-cream-deep">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={menu.imageUrl}
                alt=""
                className="aspect-[16/9] w-full object-cover"
              />
            </div>
          )}

          {menu.pitch && (
            <p className="text-sm leading-relaxed text-ink-mid">{menu.pitch}</p>
          )}

          {offered && (
            <OfferToChef
              kind="menu"
              id={menu.id}
              name={menu.title}
              offeredTo={menu.offeredToChefProfileId}
              published={menu.status === "published"}
            />
          )}

          <div className="flex items-center gap-2.5 rounded-2xl bg-paper p-4">
            <span
              aria-hidden
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                menu.shoppingIncluded
                  ? "bg-teal-pale text-teal"
                  : "bg-cream-deep text-ink-soft",
              )}
            >
              <ShoppingBasket className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-soft">
                Courses
              </p>
              <p className="text-sm font-semibold text-navy">
                {menu.shoppingIncluded
                  ? "Faites par le batch cooker"
                  : "À la charge du client"}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden /> Plats (
              {dishes.length})
            </p>
            {chargePlats ? (
              /* Une ligne de plat fait 60 px (vignette 40 + p-2.5) ; autant de lignes que d'ids. */
              <SkeletonRows
                count={menu?.dishIds?.length || 3}
                rowClassName="h-[60px] rounded-xl"
                className="space-y-2"
              />
            ) : dishes.length === 0 ? (
              <p className="rounded-xl bg-cream-soft px-3.5 py-3 text-[13px] text-ink-soft">
                Aucun plat. Un menu vide ne peut pas être adopté.
              </p>
            ) : (
              <ol className="space-y-2">
                {dishes.map((m, i) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 rounded-xl bg-paper p-2.5"
                  >
                    <span
                      aria-hidden
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xs bg-cream-deep tabular-nums text-xs font-semibold text-navy"
                    >
                      {i + 1}
                    </span>
                    {m.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={m.imageUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="h-10 w-10 shrink-0 rounded-lg bg-cream-deep"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-navy">{m.name}</p>
                      <p className="text-xs text-ink-soft">
                        {countryLabel(m.country) || "—"}
                      </p>
                    </div>
                    {m.status !== "published" && (
                      <Badge tone={catalogTone[m.status]}>
                        {catalogLabel[m.status]}
                      </Badge>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {missing > 0 && (
              <p className="mt-2 text-[12px] leading-relaxed text-[#8A6212]">
                {missing} plat{missing > 1 ? "s" : ""} de ce menu
                {missing > 1 ? " ne sont" : " n'est"} plus dans la bibliothèque.
              </p>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Statut de publication
            </p>
            <div className="mb-3 flex items-center gap-2">
              <Badge tone={catalogTone[menu.status]}>{catalogLabel[menu.status]}</Badge>
              {update.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-soft" aria-hidden />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => demander(s)}
                  disabled={update.isPending || offered}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
                    s === menu.status
                      ? "bg-navy text-white"
                      : "bg-cream-soft text-ink-mid hover:bg-cream-deep",
                  )}
                >
                  {catalogLabel[s]}
                </button>
              ))}
            </div>
          </div>

          {!offered && (
            <OfferToChef
              kind="menu"
              id={menu.id}
              name={menu.title}
              offeredTo={null}
              published={menu.status === "published"}
              blockedReason={
                dishes.length === 0 && !chargePlats
                  ? "Ajoutez des plats d'abord : un menu vide ne peut pas être accepté."
                  : null
              }
            />
          )}

          <div className="border-t border-[rgba(0,35,75,0.08)] pt-4">
            {confirmDelete ? (
              <div className="rounded-md bg-danger-soft p-3.5">
                <p className="text-[13px] font-semibold text-danger">
                  Supprimer «&nbsp;{menu.title}&nbsp;» ?
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-mid">
                  Les plats ne sont pas touchés : seul l&apos;assemblage
                  disparaît.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() =>
                      remove.mutate(menu.id, {
                        onSuccess: () => {
                          toast.success(`« ${menu.title} » supprimé`);
                          setConfirmDelete(false);
                          onClose();
                        },
                        onError: (e) =>
                          toast.error(
                            "La suppression a échoué",
                            adminErrorMessage(e),
                          ),
                      })
                    }
                    disabled={remove.isPending}
                    className="btn btn-sm bg-danger text-white hover:bg-danger/90"
                  >
                    {remove.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="h-3 w-3" aria-hidden />
                    )}
                    Supprimer
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="btn btn-sm btn-ghost"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="btn btn-sm text-danger hover:bg-danger-soft"
              >
                <Trash2 className="h-3 w-3" aria-hidden /> Supprimer ce menu
              </button>
            )}
          </div>

          <ConfirmDialog
            open={aConfirmer !== null}
            onClose={() => setAConfirmer(null)}
            onConfirm={() => aConfirmer && setStatus(aConfirmer)}
            pending={update.isPending}
            tone={aConfirmer === "published" ? "primary" : "danger"}
            title={
              aConfirmer === "published"
                ? `Publier « ${menu.title} » ?`
                : `Retirer « ${menu.title} » du catalogue ?`
            }
            lead={
              aConfirmer === "published"
                ? `Le menu devient une suggestion que les ${dishes.length} plat${dishes.length > 1 ? "s" : ""} qu'il contient accompagnent. Tout batch cooker du réseau pourra l'adopter d'un clic.`
                : "Le menu cesse d'être proposé au réseau. Les batch cookers qui l'ont déjà adopté gardent leur copie : elle est à eux, elle ne bouge pas."
            }
            detail={
              aConfirmer === "published"
                ? "Adopter crée une copie chez eux : les corrections faites ici après coup ne la modifient pas, elles la signalent."
                : aConfirmer === "archived"
                  ? "Archivé, il reste lisible dans la console et dans l'historique."
                  : "Il repasse en brouillon : vous pouvez le republier à tout moment."
            }
            confirmLabel={
              aConfirmer === "published" ? "Publier le menu" : "Retirer du catalogue"
            }
          />
        </div>
      )}
    </Drawer>
  );
}
