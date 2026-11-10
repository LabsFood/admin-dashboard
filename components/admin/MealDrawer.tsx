"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clock,
  Flame,
  Flame as Fire,
  Loader2,
  Pencil,
  ShieldAlert,
  Snowflake,
  Trash2,
  UserMinus,
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
  useUpdateMeal,
  useWithdrawMealOffer,
  type Meal,
  type MealStatus,
} from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";

const STATUSES: MealStatus[] = ["published", "draft", "archived"];

/**
 * Le dossier d'un plat Lab's Food, et ce qu'on peut en faire sans ouvrir le
 * formulaire : changer son état, retirer l'offre faite à un batch cooker,
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
  const withdraw = useWithdrawMealOffer();
  const diets = useDiets();
  const allergens = useAllergens();
  const categories = useDishCategories();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const stepTypes = useStepTypes();
  const reheatModes = useReheatModes();
  const computedDiets = useComputedDiets();
  const profileList = useRecipeProfiles();
  const offered = Boolean(meal?.offeredToChefProfileId);
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
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-navy/85 px-2 py-1 text-[10px] font-semibold uppercase text-terra-soft">
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
            <div className="rounded-2xl border border-terra/30 bg-terra/8 p-4">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-terra-deep">
                <ShieldAlert className="h-4 w-4" /> Réservé à un batch cooker
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-mid">
                Tant que l&apos;offre tient, l&apos;API refuse toute
                modification : on ne change pas sous ses yeux ce qu&apos;il a
                accepté.
              </p>
              <button
                onClick={() =>
                  withdraw.mutate(meal.id, {
                    onSuccess: () => toast.success("Offre retirée"),
                    onError: () => toast.error("L'offre n'a pas été retirée"),
                  })
                }
                disabled={withdraw.isPending}
                className="btn btn-sm mt-3 border border-terra/40 text-terra-deep hover:bg-terra/10"
              >
                {withdraw.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <UserMinus className="h-3 w-3" />
                )}
                Retirer l&apos;offre
              </button>
            </div>
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
                Non renseignés. Ni liste, ni mention «&nbsp;aucun&nbsp;» : la
                fiche est muette sur un point réglementé.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {meal.allergens.map((a) => (
                  <span key={a} className="chip-danger">
                    {refLabel(allergens.data, a)}
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
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-xs bg-cream-deep font-mono text-[10px] font-semibold text-navy">
                      {i + 1}
                    </span>
                    <span>
                      {(s.type || s.durationMinutes) && (
                        <span className="mr-1.5 font-mono text-[10px] uppercase tracking-wide text-ink-soft">
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
      <p className="text-[10px] uppercase tracking-wide text-ink-soft">{label}</p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {title}
      </p>
      {children}
    </div>
  );
}
