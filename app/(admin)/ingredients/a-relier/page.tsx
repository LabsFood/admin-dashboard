"use client";

import { useState } from "react";
import { AlertTriangle, EyeOff, Link2, Loader2, Plus, Sparkles } from "lucide-react";
import IngredientEditor from "@/components/admin/IngredientEditor";
import IngredientTabs from "@/components/admin/IngredientTabs";
import FilterTabs from "@/components/ui/FilterTabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toaster";
import { adminErrorMessage } from "@/lib/api/errors";
import { useUpdateCatalogIngredient } from "@/lib/api/catalog";
import {
  useIgnoreUnlinkedName,
  useRefreshUnlinked,
  useUnlinkedNames,
  type UnlinkedName,
} from "@/lib/api/ai-usage";

/* ─────────────────────────────────────────────────────────────────────────────
   Les noms lus dans les imports — `/admin/ingredients/a-relier`.

   L'import de recettes par IA lit des ingrédients que la liste commune ne
   connaît pas (galanga, citronnelle, pâte de tamarin…). Ils remontent ici, les
   plus fréquents d'abord, pour que la liste apprenne : rattacher le nom à une
   entrée existante (il devient un « autre nom »), créer l'entrée (allergènes
   saisis à la main, jamais devinés), ou l'écarter (« huile », « échalote et
   ail »). Un nom traité disparaît de la file ; les imports suivants le relient.
   ───────────────────────────────────────────────────────────────────────────── */

const RANGES = [
  { id: "30", label: "30 jours" },
  { id: "90", label: "90 jours" },
  { id: "366", label: "1 an" },
] as const;

export default function IngredientsALierPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("30");
  const [creating, setCreating] = useState<string | null>(null);
  const names = useUnlinkedNames(Number(range));
  const refresh = useRefreshUnlinked();
  const toast = useToast();

  return (
    <div className="space-y-6">
      <section className="card flex flex-wrap items-center gap-4 p-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/12 text-teal">
          <Sparkles className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold text-navy">
            Ingrédients lus dans les imports
          </h2>
          <p className="text-sm text-ink-soft">
            Les noms que l’import de recettes n’a pas su relier à la liste commune. Chaque nom
            traité ici sera relié aux prochains imports.
          </p>
        </div>
        <FilterTabs
          options={RANGES.map((r) => ({ id: r.id, label: r.label }))}
          value={range}
          onChange={setRange}
        />
      </section>

      <IngredientTabs current="/ingredients/a-relier" />

      {creating !== null && (
        <IngredientEditor
          key={creating}
          initial={null}
          defaultName={capitalize(creating)}
          title={`Nouvel ingrédient, lu « ${creating} »`}
          onDone={() => setCreating(null)}
          onSaved={(write) => {
            setCreating(null);
            refresh();
            toast.success(`« ${write.ingredient.name} » ajouté à la liste commune`);
          }}
        />
      )}

      <section className="card p-5" aria-label="Noms à relier">
        {names.isPending ? (
          <Skeleton className="h-40" />
        ) : names.isError ? (
          <p
            role="alert"
            className="flex flex-wrap items-center gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {adminErrorMessage(names.error)}
            <button
              type="button"
              onClick={() => names.refetch()}
              className="font-semibold underline"
            >
              Réessayer
            </button>
          </p>
        ) : names.data.length === 0 ? (
          <p className="text-sm text-ink-mid">
            Rien à relier : tous les ingrédients lus dans les imports sont dans la liste commune.
          </p>
        ) : (
          <ul className="divide-y divide-cream-deep">
            {names.data.map((n) => (
              <NameRow
                key={n.name}
                item={n}
                onCreate={() => setCreating(n.name)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function NameRow({ item, onCreate }: { item: UnlinkedName; onCreate: () => void }) {
  const toast = useToast();
  const update = useUpdateCatalogIngredient();
  const ignore = useIgnoreUnlinkedName();
  const refresh = useRefreshUnlinked();
  const busy = update.isPending || ignore.isPending;
  const s = item.suggestion;

  function attach() {
    if (!s) return;
    const aliases = [...new Set([...s.aliases, item.name.toLowerCase()])];
    update.mutate(
      { id: s.id, patch: { aliases } },
      {
        onSuccess: () => {
          refresh();
          toast.success(`« ${item.name} » devient un autre nom de « ${s.name} »`);
        },
        onError: (e) => toast.error("Rattachement impossible", adminErrorMessage(e)),
      },
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="font-semibold text-navy">{item.name}</p>
        <p className="text-xs tabular-nums text-ink-soft">
          Lu {item.count} fois, chez {item.chefs} batch cooker{item.chefs > 1 ? "s" : ""}
          {s && <> · ressemble à « {s.name} »</>}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {busy && <Loader2 className="h-4 w-4 animate-spin text-ink-soft" aria-hidden />}
        {s && (
          <button
            type="button"
            onClick={attach}
            disabled={busy}
            className="btn btn-sm btn-outline disabled:opacity-55"
            title={`Ajouter « ${item.name} » aux autres noms de « ${s.name} »`}
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden /> Autre nom de « {s.name} »
          </button>
        )}
        <button
          type="button"
          onClick={onCreate}
          disabled={busy}
          className="btn btn-sm btn-primary disabled:opacity-55"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden /> Créer l’ingrédient
        </button>
        <button
          type="button"
          onClick={() =>
            ignore.mutate(item.name, {
              onSuccess: () => toast.success(`« ${item.name} » écarté`),
              onError: (e) => toast.error("Impossible d’écarter ce nom", adminErrorMessage(e)),
            })
          }
          disabled={busy}
          className="btn btn-sm btn-outline disabled:opacity-55"
          title="Ce n’est pas un ingrédient (« huile », « échalote et ail ») : il ne remontera plus."
        >
          <EyeOff className="h-3.5 w-3.5" aria-hidden /> Ignorer
        </button>
      </div>
    </li>
  );
}

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
