"use client";

import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useState } from "react";
import { ChevronDown, Clock, LayoutList, UtensilsCrossed } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import Badge from "@/components/ui/Badge";
import { cn, formatDate } from "@/lib/utils";
import { countryLabel } from "@/lib/countries";
import { difficultyLabel, difficultyTone, moderatedLabel, moderatedTone } from "@/lib/catalog-labels";
import { useAllergens, useDiets, useDishCategories, refLabel } from "@/lib/api/referentials";
import InfoPopover from "@/components/ui/InfoPopover";
import { problemText } from "@/lib/readiness";
import {
  reviewFlagText,
  useChefDishes,
  useChefMenus,
  type ReviewItem,
} from "@/lib/api/moderation";

/** Les champs qu'on rend déjà : le reste va dans le panneau de la réponse brute. */
const RENDERED = new Set([
  "id",
  "kind",
  "type",
  "name",
  "title",
  "description",
  "pitch",
  "imageUrl",
  "image",
  "country",
  "category",
  "status",
  "portions",
  "prepMinutes",
  "prepTime",
  "difficulty",
  "diets",
  "dietaryTags",
  "customDiets",
  "allergens",
  "allergensNone",
  "customAllergens",
  "publishedAt",
  "reviewedAt",
  "lastReviewedAt",
  "chefProfileId",
  "chefName",
  "chef",
  "chefProfile",
  "dishes",
  "dishCount",
  "reviewState",
  "pendingSince",
  "flags",
]);

/**
 * La fiche telle que le client la voit, plus ce que l'API renvoie et que
 * l'écran ne montre pas encore. Une décision de modération se prend sur ce que
 * l'auteur a réellement écrit, pas sur un résumé.
 *
 * La file (`GET /admin/dishes`) s'est enrichie le 17/10 : photo, allèrgènes
 * et temps de préparation y sont maintenant, et la liste les affiche sans
 * second appel. Elle reste une **liste légère** : description, pays,
 * catégorie, portions, difficulté et régimes n'y sont pas. Comme une décision
 * de modération se prend sur ce que l'auteur a écrit, le tiroir va chercher
 * la fiche entière chez lui (`/admin/chefs/{id}/dishes` ou `/menus`) et
 * fusionne les deux. Si elle ne vient pas, l'écran le dit au lieu d'afficher
 * une fiche à moitié vide comme si c'était l'original.
 */
export default function ModerationDrawer({
  item,
  onClose,
}: {
  item: ReviewItem | null;
  onClose: () => void;
}) {
  const diets = useDiets();
  const allergens = useAllergens();
  const categories = useDishCategories();
  const [rawOpen, setRawOpen] = useState(false);

  // La fiche complète, cherchée chez son auteur. Les deux requêtes dorment
  // tant que le tiroir est fermé, et seule celle du bon genre s'exécute.
  const chefId = item?.chefProfileId ?? undefined;
  const plats = useChefDishes(item?.kind === "dish" ? chefId : undefined);
  const menus = useChefMenus(item?.kind === "menu" ? chefId : undefined);
  const source = item?.kind === "menu" ? menus : plats;
  const complete = (source.data ?? []).find((x) => x.id === item?.id) ?? null;

  /*
   * Ce que la file donne, complété par la fiche quand elle arrive. La relecture
   * reste celle de la file : la fiche la range sous `review.*`, et la lire en
   * tête de fiche affichait « jamais relu » pour tout ce qui l'avait été.
   */
  const fiche: ReviewItem | null = item
    ? complete
      ? {
          ...complete,
          flags: item.flags,
          reviewState: item.reviewState,
          pendingSince: item.pendingSince,
          reviewedAt: item.reviewedAt,
          raw: item.raw,
        }
      : item
    : null;
  /* Un menu ne déclare ni pays ni allergènes : ce sont ses plats qui le font. */
  const isDish = fiche?.kind === "dish";
  const incomplete = Boolean(item && !complete && !source.isPending);

  const extra = item
    ? Object.entries(item.raw).filter(
        ([k, v]) => !RENDERED.has(k) && v !== null && v !== undefined && v !== "",
      )
    : [];

  const Icon = item?.kind === "menu" ? LayoutList : UtensilsCrossed;

  return (
    <Drawer
      open={item !== null}
      onClose={onClose}
      eyebrow={
        item
          ? [item.kind === "menu" ? "Menu" : "Plat", item.chefName ?? "Batch cooker"]
              .filter(Boolean)
              .join(" · ")
          : undefined
      }
      title={item?.name}
      footer={
        <button onClick={onClose} className="btn btn-ghost w-full">
          Fermer
        </button>
      }
    >
      {fiche && (
        <div className="space-y-5">
          {source.isPending ? (
            <SkeletonGroup>
              <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
            </SkeletonGroup>
          ) : fiche.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={fiche.imageUrl}
              alt={fiche.name}
              className="aspect-[16/10] w-full rounded-2xl object-cover"
            />
          ) : (
            <p className="flex items-center gap-2 rounded-2xl bg-cream-soft px-4 py-3 text-[13px] text-ink-soft">
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              Aucune photo sur cette fiche.
            </p>
          )}

          {incomplete && (
            <p className="rounded-2xl bg-cream-soft px-4 py-3 text-[13px] leading-relaxed text-ink-mid">
              La fiche complète n’a pas pu être retrouvée chez son auteur : ce
              qui suit est la ligne de la file, qui porte la photo et les
              allèrgènes mais ni description, ni pays, ni régimes. À vérifier
              sur sa vitrine avant de décider.
            </p>
          )}

          {fiche.flags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {fiche.flags.map((f) => (
                <Badge
                  key={f}
                  tone={f === "no-allergens-declared" ? "warning" : "info"}
                  dot
                >
                  {reviewFlagText(f)}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={moderatedTone[fiche.status]} dot>
              {moderatedLabel[fiche.status]}
            </Badge>
            {fiche.difficulty && (
              <Badge tone={difficultyTone[fiche.difficulty]}>
                {difficultyLabel[fiche.difficulty]}
              </Badge>
            )}
            {fiche.category && (
              <Badge tone="navy">{refLabel(categories.data, fiche.category)}</Badge>
            )}
            {fiche.portions != null && (
              <Badge tone="neutral">{fiche.portions} portions</Badge>
            )}
            {fiche.prepMinutes != null && (
              <Badge tone="neutral">{fiche.prepMinutes} min</Badge>
            )}
          </div>

          {fiche.description && (
            <p className="text-sm leading-relaxed text-ink-mid">{fiche.description}</p>
          )}

          <dl className="hairline space-y-2.5 border-t pt-3 text-[13px]">
            {isDish && (
              <Row label="Pays annoncé" value={countryLabel(fiche.country) || "—"} />
            )}
            <Row
              label="Mis en ligne"
              value={fiche.publishedAt ? formatDate(fiche.publishedAt) : "—"}
            />
            <Row
              label="Dernière relecture"
              value={fiche.reviewedAt ? formatDate(fiche.reviewedAt) : "jamais relu"}
            />
            {fiche.pendingSince && (
              <Row label="En attente depuis" value={formatDate(fiche.pendingSince)} />
            )}
            {fiche.kind === "menu" && fiche.dishCount != null && (
              <Row label="Plats au menu" value={String(fiche.dishCount)} />
            )}
          </dl>

          {(fiche.diets.length > 0 || fiche.customDiets.length > 0) && (
            <Block title="Régimes déclarés">
              <div className="flex flex-wrap gap-1.5">
                {fiche.diets.map((d) => (
                  <span key={d} className="chip-teal">
                    {refLabel(diets.data, d)}
                  </span>
                ))}
                {fiche.customDiets.map((d) => (
                  <span key={d} className="chip-teal italic">
                    {d}
                  </span>
                ))}
              </div>
              {fiche.customDiets.length > 0 && (
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                  En italique : tapé à la main, hors liste de référence.
                </p>
              )}
            </Block>
          )}

          {isDish && fiche.readiness && (
            <Block title={fiche.readiness.ready ? "Fiche Prête" : "Fiche pas encore Prête"}>
              {fiche.readiness.problems.length + fiche.readiness.toPublish.length > 0 ? (
                <ul className="space-y-1 text-[13px] text-ink-mid">
                  {[...fiche.readiness.problems, ...fiche.readiness.toPublish].map((p) => (
                    <li key={`${p.code}-${p.field}`}>· {problemText(p)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-success">Rien ne manque.</p>
              )}
              <p className="mt-1.5 flex items-center gap-1 text-[12px] text-ink-soft">
                {fiche.allergensVerifiedAt
                  ? `Allergènes confirmés le ${formatDate(fiche.allergensVerifiedAt)}`
                  : "Allergènes non confirmés depuis le dernier changement d'ingrédient : pas réservable"}
                {fiche.recipeVersion != null && ` · version ${fiche.recipeVersion}`}
                <InfoPopover label="Que vérifie le batch cooker ?">
                  Il confirme que les allergènes déclarés correspondent aux ingrédients.
                  Ajouter, retirer ou renommer un ingrédient efface la confirmation : le
                  plat reste publié mais ne peut plus être réservé avant une nouvelle
                  confirmation.
                </InfoPopover>
              </p>
            </Block>
          )}

          {isDish && (
            <Block title="Allergènes déclarés">
              {fiche.allergensNone ? (
                <p className="text-[13px] text-success">
                  Aucun des 14 allergènes — déclaré explicitement par le batch
                  cooker.
                </p>
              ) : fiche.allergens.length === 0 && fiche.customAllergens.length === 0 ? (
                <p className="rounded-md bg-warning-soft px-3 py-2.5 text-[13px] leading-relaxed text-[#8A6212]">
                  Ni liste, ni mention «&nbsp;aucun&nbsp;». La fiche est muette sur
                  un point réglementé : c&apos;est le premier motif de suspension.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {fiche.allergens.map((a) => (
                      <span key={a} className="chip-danger">
                        {refLabel(allergens.data, a)}
                      </span>
                    ))}
                    {fiche.customAllergens.map((a) => (
                      <span key={a} className="chip-danger italic">
                        {a}
                      </span>
                    ))}
                  </div>
                  {fiche.customAllergens.length > 0 && (
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                      En italique : hors des 14 réglementés.
                    </p>
                  )}
                </>
              )}
            </Block>
          )}

          {extra.length > 0 && (
            <div className="hairline border-t pt-4">
              <button
                type="button"
                onClick={() => setRawOpen((v) => !v)}
                aria-expanded={rawOpen}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {extra.length} champ{extra.length > 1 ? "s" : ""} renvoyé
                  {extra.length > 1 ? "s" : ""} et non affiché
                  {extra.length > 1 ? "s" : ""}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-ink-soft transition-transform",
                    rawOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              {rawOpen && (
                <>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    La réponse de la file n&apos;est pas décrite dans le Swagger.
                    Ce panneau montre ce que l&apos;API envoie en plus, pour que
                    rien ne se perde en attendant.
                  </p>
                  <pre className="scroll-thin mt-2 max-h-64 overflow-auto rounded-md bg-cream-soft p-3 font-mono text-xs leading-relaxed text-ink-mid">
                    {JSON.stringify(Object.fromEntries(extra), null, 2)}
                  </pre>
                </>
              )}
            </div>
          )}

          <p className="flex items-start gap-2 rounded-md bg-cream-soft px-3.5 py-3 text-[12px] leading-relaxed text-ink-mid">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Cette fiche appartient à son auteur : la console ne la modifie pas.
            Elle peut la marquer relue, ou la retirer du public avec un motif.
          </p>
        </div>
      )}
    </Drawer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-ink-soft">{label}</dt>
      <dd className="text-right font-medium text-navy">{value}</dd>
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
