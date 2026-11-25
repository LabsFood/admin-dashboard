"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clock,
  Flame,
  Flame as Fire,
  Loader2,
  Pencil,
  Snowflake,
  Trash2,
  Users,
} from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";
import { countryLabel } from "@/lib/countries";
import {
  catalogLabel,
  catalogTone,
  continentLabel,
  difficultyLabel,
  difficultyTone,
} from "@/lib/catalog-labels";
import { readSteps, reheatingLine, seasonsLine, storageLine } from "@/lib/recipe-fields";
import { problemText } from "@/lib/readiness";
import {
  useAllergens,
  useComputedDiets,
  useDiets,
  useDishCategories,
  useRecipeProfiles,
  useReheatModes,
  useStepTypes,
  refLabel,
} from "@/lib/api/referentials";
import {
  ingredientLines,
  useDeleteMeal,
  useLabsFoodMenus,
  useUpdateMeal,
  type Meal,
  type MealStatus,
} from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
import OfferToChef from "@/components/admin/OfferToChef";

const STATUSES: MealStatus[] = ["published", "draft", "archived"];

/**
 * Le dossier d'un plat Lab's Food, et ce qu'on peut en faire sans ouvrir le
 * formulaire : changer son état, le proposer à un batch cooker ou retirer l'offre,
 * le supprimer.
 */
export default function MealDrawer({
  meal,
  open,
  onClose,
  editHref,
}: {
  meal: Meal | null;
  open: boolean;
  onClose: () => void;
  editHref: string;
}) {
  const toast = useToast();
  const update = useUpdateMeal();
  const remove = useDeleteMeal();
  const menus = useLabsFoodMenus({ enabled: open });
  const diets = useDiets();
  const allergens = useAllergens();
  const categories = useDishCategories();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const stepTypes = useStepTypes();
  const reheatModes = useReheatModes();
  const computedDiets = useComputedDiets();
  const profileList = useRecipeProfiles();
  const offered = Boolean(meal?.offeredToChefProfileId);
  // L'API refuse d'offrir un plat qui sert dans un menu Lab's Food (MEAL_IN_MENU) : on le dit avant.
  const inMenus = meal
    ? (menus.data ?? []).filter(
        (m) => m.dishIds?.includes(meal.id) || m.dishes?.some((d) => d.id === meal.id),
      )
    : [];
  const lines = ingredientLines(meal?.ingredients);
  const steps = readSteps(meal?.steps);

  function setStatus(status: MealStatus) {
    if (!meal || status === meal.status) return;
    update.mutate(
      { id: meal.id, patch: { status } },
      {
        onSuccess: () =>
          toast.success(
            `« ${meal.name} » passe en ${catalogLabel[status].toLowerCase()}`,
            status === "published"
              ? "Il peut maintenant entrer dans une semaine de menu."
              : undefined,
          ),
        onError: (e) =>
          toast.error(
            "Le statut n'a pas changé",
            e instanceof ApiError && e.status === 409
              ? "Ce plat est réservé à un batch cooker. Retirez l'offre d'abord."
              : e instanceof Error
                ? e.message
                : undefined,
          ),
      },
    );
  }

  function doDelete() {
    if (!meal) return;
    remove.mutate(meal.id, {
      onSuccess: () => {
        toast.success(`« ${meal.name} » supprimé`);
        setConfirmDelete(false);
        onClose();
      },
      onError: (e) =>
        toast.error(
          "La suppression a été refusée",
          e instanceof ApiError && e.status === 409
            ? "Ce plat a déjà été commandé : l'API refuse d'en effacer la trace. Archivez-le à la place."
            : e instanceof Error
              ? e.message
              : undefined,
        ),
    });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow={
        meal
          ? [countryLabel(meal.country), meal.continent ? continentLabel[meal.continent] : null]
              .filter(Boolean)
              .join(" · ") || "Plat Lab's Food"
          : undefined
      }
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
          {meal.imageUrl ? (
            <div className="relative overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={meal.imageUrl}
                alt={meal.name}
                className="aspect-[16/10] w-full object-cover"
              />
              {meal.isFeatured && (
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-navy/85 px-2 py-1 text-xs font-semibold uppercase text-terra-soft">
                  <Flame className="h-3 w-3" /> Vedette
                </span>
              )}
            </div>
          ) : (
            <p className="rounded-2xl bg-cream-soft px-4 py-3 text-[13px] text-ink-soft">
              Pas de photo. Le plat ne tiendra pas sur une carte publique sans
              image.
            </p>
          )}

          {offered && (
            <OfferToChef
              kind="meal"
              id={meal.id}
              name={meal.name}
              offeredTo={meal.offeredToChefProfileId}
              published={meal.status === "published"}
            />
          )}

          {meal.description && (
            <p className="text-sm leading-relaxed text-ink-mid">{meal.description}</p>
          )}

          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat Icon={Users} value={meal.portions ?? "—"} label="portions" />
            <Stat Icon={Clock} value={`${meal.prepTime}′`} label="prépa" />
            <Stat
              Icon={Fire}
              value={meal.calories ? `${meal.calories}` : "—"}
              label="kcal"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {meal.difficulty && (
              <Badge tone={difficultyTone[meal.difficulty]}>
                {difficultyLabel[meal.difficulty]}
              </Badge>
            )}
            {meal.category && (
              <Badge tone="navy">{refLabel(categories.data, meal.category)}</Badge>
            )}
            {meal.cookTime != null && (
              <Badge tone="neutral">{meal.cookTime}′ de cuisson</Badge>
            )}
          </div>

          {(meal.dietaryTags.length > 0 || meal.customDiets.length > 0) && (
            <Block title="Régimes">
              <div className="flex flex-wrap gap-1.5">
                {meal.dietaryTags.map((t) => (
                  <span key={t} className="chip-teal">
                    {refLabel(diets.data, t)}
                  </span>
                ))}
                {meal.customDiets.map((t) => (
                  <span key={t} className="chip-teal italic">
                    {t}
                  </span>
                ))}
              </div>
            </Block>
          )}

          <Block title="Allergènes">
            {meal.allergensNone &&
            meal.allergens.length === 0 &&
            meal.customAllergens.length === 0 ? (
              <p className="text-[13px] text-success">
                Aucun des 14 allergènes réglementés — déclaré explicitement.
              </p>
            ) : meal.allergens.length === 0 && meal.customAllergens.length === 0 ? (
              <p className="text-[13px] text-[#8A6212]">
                Pas encore calculés : ils viennent des ingrédients reliés à la
                liste commune, et aucun ne l&apos;est assez pour conclure.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {meal.allergens.map((a) => (
                  <span key={a} className="chip-danger">
                    {refLabel(allergens.data, a)}
                    {meal.conditionalAllergens?.includes(a) && " (si l'ingrédient facultatif est utilisé)"}
                    {meal.addedAllergens?.includes(a) && !meal.allergenSources?.[a]?.length && " (ajouté)"}
                  </span>
                ))}
                {meal.customAllergens.map((a) => (
                  <span key={a} className="chip-danger italic">
                    {a}
                  </span>
                ))}
              </div>
            )}
          </Block>

          {lines.length > 0 && (
            <Block title={`Ingrédients (${lines.length})`}>
              <ul className="space-y-1 text-[13px] text-ink-mid">
                {lines.map((l, i) => (
                  <li key={`${l}-${i}`} className="flex gap-2">
                    <span aria-hidden className="text-ink-soft">
                      ·
                    </span>
                    {l}
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {meal.readiness && (
            <Block title={meal.readiness.ready ? "Fiche Prête" : "Pas encore Prête"}>
              {meal.readiness.problems.length + meal.readiness.toPublish.length > 0 ? (
                <ul className="space-y-1 text-[13px] text-ink-mid">
                  {[...meal.readiness.problems, ...meal.readiness.toPublish].map((p) => (
                    <li key={`${p.code}-${p.field}`}>· {problemText(p)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-success">Rien ne manque pour publier.</p>
              )}
              <p className="mt-1.5 text-[12px] text-ink-soft">
                {meal.allergensVerifiedAt
                  ? `Allergènes vérifiés le ${new Date(meal.allergensVerifiedAt).toLocaleDateString("fr-FR")}`
                  : "Allergènes non vérifiés : pas réservable"}
                {meal.recipeVersion != null && ` · version ${meal.recipeVersion}`}
              </p>
            </Block>
          )}

          {steps.length > 0 && (
            <Block title={`Préparation (${steps.length} étapes)`}>
              <ol className="space-y-2 text-[13px] leading-relaxed text-ink-mid">
                {steps.map((s, i) => (
                  <li key={`${i}-${s.text.slice(0, 12)}`} className="flex gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-xs bg-cream-deep tabular-nums text-xs font-semibold text-navy">
                      {i + 1}
                    </span>
                    <span>
                      {(s.type || s.durationMinutes) && (
                        <span className="mr-1.5 text-xs uppercase tracking-wide text-ink-soft">
                          {[
                            s.type ? refLabel(stepTypes.data, s.type) : null,
                            s.durationMinutes ? `${s.durationMinutes} min` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                      {s.text}
                    </span>
                  </li>
                ))}
              </ol>
            </Block>
          )}

          <Block title="Classement">
            <ul className="space-y-1 text-[13px] text-ink-mid">
              <li>
                Régimes calculés :{" "}
                {meal.classification
                  ? meal.classification.diets.map((c) => refLabel(computedDiets.data, c)).join(", ") ||
                    "aucun en commun"
                  : "non calculé"}
              </li>
              {(meal.declaredDiets?.length ?? 0) > 0 && (
                <li>Déclarés : {meal.declaredDiets!.join(", ")}</li>
              )}
              <li>
                Saisons :{" "}
                {seasonsLine(
                  meal.seasonsOverride?.length
                    ? meal.seasonsOverride
                    : meal.classification?.seasonMonths,
                ) ?? "non calculées"}
              </li>
              {(meal.profiles?.length ?? 0) > 0 && (
                <li>
                  Profils : {meal.profiles!.map((p) => refLabel(profileList.data, p)).join(", ")}
                </li>
              )}
            </ul>
          </Block>

          {meal.equipment && meal.equipment.length > 0 && (
            <Block title="Matériel">
              <p className="text-[13px] text-ink-mid">{meal.equipment.join(", ")}</p>
            </Block>
          )}

          {(reheatingLine(meal.reheating, reheatModes.data) || storageLine(meal.storage)) && (
            <Block title="Après la session">
              <ul className="space-y-1.5 text-[13px] text-ink-mid">
                {reheatingLine(meal.reheating, reheatModes.data) && (
                  <li className="flex items-center gap-2">
                    <Flame className="h-3.5 w-3.5 shrink-0 text-terra" aria-hidden />
                    {reheatingLine(meal.reheating, reheatModes.data)}
                  </li>
                )}
                {storageLine(meal.storage) && (
                  <li className="flex items-center gap-2">
                    <Snowflake className="h-3.5 w-3.5 shrink-0 text-teal" aria-hidden />
                    {storageLine(meal.storage)}
                  </li>
                )}
              </ul>
              {meal.reheating?.note && (
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
                  {meal.reheating.note}
                </p>
              )}
            </Block>
          )}

          <Block title="Statut de publication">
            <div className="mb-3 flex items-center gap-2">
              <Badge tone={catalogTone[meal.status]}>{catalogLabel[meal.status]}</Badge>
              {update.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-soft" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  disabled={update.isPending || offered}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
                    s === meal.status
                      ? "bg-navy text-white"
                      : "bg-cream-soft text-ink-mid hover:bg-cream-deep",
                  )}
                >
                  {catalogLabel[s]}
                </button>
              ))}
            </div>
          </Block>

          {!offered && (
            <OfferToChef
              kind="meal"
              id={meal.id}
              name={meal.name}
              offeredTo={null}
              published={meal.status === "published"}
              blockedReason={
                inMenus.length > 0
                  ? `Ce plat fait partie ${inMenus.length > 1 ? "des menus" : "du menu"} ${inMenus.map((m) => `« ${m.title} »`).join(", ")} : c'est le menu entier qui se propose.`
                  : null
              }
            />
          )}

          <div className="border-t border-[rgba(0,35,75,0.08)] pt-4">
            {confirmDelete ? (
              <div className="rounded-md bg-danger-soft p-3.5">
                <p className="text-[13px] font-semibold text-danger">
                  Supprimer «&nbsp;{meal.name}&nbsp;» ?
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-mid">
                  Définitif. Si le plat a déjà été commandé, l&apos;API refusera
                  et il faudra l&apos;archiver.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={doDelete}
                    disabled={remove.isPending}
                    className="btn btn-sm bg-danger text-white hover:bg-danger/90"
                  >
                    {remove.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
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
                <Trash2 className="h-3 w-3" /> Supprimer ce plat
              </button>
            )}
          </div>
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
      <Icon className="mx-auto h-4 w-4 text-terra" aria-hidden />
      <p className="mt-1 font-display text-base font-bold text-navy">{value}</p>
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {title}
      </p>
      {children}
    </div>
  );
}
