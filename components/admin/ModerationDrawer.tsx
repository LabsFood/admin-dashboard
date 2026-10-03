"use client";

import { useState } from "react";
import { ChevronDown, Clock, LayoutList, UtensilsCrossed } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import Badge from "@/components/ui/Badge";
import { cn, formatDate } from "@/lib/utils";
import { countryLabel } from "@/lib/countries";
import { difficultyLabel, difficultyTone, moderatedLabel, moderatedTone } from "@/lib/catalog-labels";
import { useAllergens, useDiets, useDishCategories, refLabel } from "@/lib/api/referentials";
import type { ReviewItem } from "@/lib/api/moderation";

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
]);

/**
 * La fiche telle que le client la voit, plus ce que l'API renvoie et que
 * l'écran ne montre pas encore. Une décision de modération se prend sur ce que
 * l'auteur a réellement écrit, pas sur un résumé.
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
      {item && (
        <div className="space-y-5">
          {item.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={item.imageUrl}
              alt={item.name}
              className="aspect-[16/10] w-full rounded-2xl object-cover"
            />
          ) : (
            <p className="flex items-center gap-2 rounded-2xl bg-cream-soft px-4 py-3 text-[13px] text-ink-soft">
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              Aucune photo sur cette fiche.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={moderatedTone[item.status]} dot>
              {moderatedLabel[item.status]}
            </Badge>
            {item.difficulty && (
              <Badge tone={difficultyTone[item.difficulty]}>
                {difficultyLabel[item.difficulty]}
              </Badge>
            )}
            {item.category && (
              <Badge tone="navy">{refLabel(categories.data, item.category)}</Badge>
            )}
            {item.portions != null && (
              <Badge tone="neutral">{item.portions} portions</Badge>
            )}
            {item.prepMinutes != null && (
              <Badge tone="neutral">{item.prepMinutes} min</Badge>
            )}
          </div>

          {item.description && (
            <p className="text-sm leading-relaxed text-ink-mid">{item.description}</p>
          )}

          <dl className="hairline space-y-2.5 border-t pt-3 text-[13px]">
            <Row label="Pays annoncé" value={countryLabel(item.country) || "—"} />
            <Row
              label="Mis en ligne"
              value={item.publishedAt ? formatDate(item.publishedAt) : "—"}
            />
            <Row
              label="Dernière relecture"
              value={item.reviewedAt ? formatDate(item.reviewedAt) : "jamais relu"}
            />
            {item.kind === "menu" && item.dishCount != null && (
              <Row label="Plats au menu" value={String(item.dishCount)} />
            )}
          </dl>

          {(item.diets.length > 0 || item.customDiets.length > 0) && (
            <Block title="Régimes déclarés">
              <div className="flex flex-wrap gap-1.5">
                {item.diets.map((d) => (
                  <span key={d} className="chip-teal">
                    {refLabel(diets.data, d)}
                  </span>
                ))}
                {item.customDiets.map((d) => (
                  <span key={d} className="chip-teal italic">
                    {d}
                  </span>
                ))}
              </div>
              {item.customDiets.length > 0 && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
                  En italique : tapé à la main, hors liste de référence.
                </p>
              )}
            </Block>
          )}

          <Block title="Allergènes déclarés">
            {item.allergensNone ? (
              <p className="text-[13px] text-success">
                Aucun des 14 allergènes — déclaré explicitement par le batch
                cooker.
              </p>
            ) : item.allergens.length === 0 && item.customAllergens.length === 0 ? (
              <p className="rounded-md bg-warning-soft px-3 py-2.5 text-[13px] leading-relaxed text-[#8A6212]">
                Ni liste, ni mention «&nbsp;aucun&nbsp;». La fiche est muette sur
                un point réglementé : c&apos;est le premier motif de suspension.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {item.allergens.map((a) => (
                    <span key={a} className="chip-danger">
                      {refLabel(allergens.data, a)}
                    </span>
                  ))}
                  {item.customAllergens.map((a) => (
                    <span key={a} className="chip-danger italic">
                      {a}
                    </span>
                  ))}
                </div>
                {item.customAllergens.length > 0 && (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
                    En italique : hors des 14 réglementés.
                  </p>
                )}
              </>
            )}
          </Block>

          {extra.length > 0 && (
            <div className="hairline border-t pt-4">
              <button
                type="button"
                onClick={() => setRawOpen((v) => !v)}
                aria-expanded={rawOpen}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
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
                  <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                    La réponse de la file n&apos;est pas décrite dans le Swagger.
                    Ce panneau montre ce que l&apos;API envoie en plus, pour que
                    rien ne se perde en attendant.
                  </p>
                  <pre className="scroll-thin mt-2 max-h-64 overflow-auto rounded-md bg-cream-soft p-3 font-mono text-[10px] leading-relaxed text-ink-mid">
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
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {title}
      </p>
      {children}
    </div>
  );
}
