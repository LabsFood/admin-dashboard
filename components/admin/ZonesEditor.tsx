"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, MapPin, Pencil } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toaster";
import { useRegions } from "@/lib/api/referentials";
import { adminErrorMessage } from "@/lib/api/errors";
import { useUpdateChefZones, type InterventionZoneInput } from "@/lib/api/admin";

/* ─────────────────────────────────────────────────────────────────────────────
   Changer les zones d'un batch cooker approuvé.

   Jusqu'au 24/10 personne ne le pouvait : ni lui — ses zones ont été vérifiées
   sur pièces pendant sa candidature — ni nous, faute de route. Un batch cooker
   qui déménageait n'avait aucun chemin.

   Une réserve, et elle est visible à l'écran plutôt que cachée dans un
   commentaire : l'API **rend** les villes d'une zone comme de simples noms et
   **attend** des objets complets, code INSEE compris. On ne peut donc pas
   renvoyer une zone « quelques villes » telle qu'on l'a lue. L'éditeur ne
   propose que des régions entières, et quand une zone au détail de villes
   existe, le dialogue nomme précisément ce qu'enregistrer lui ferait perdre.

   Élargir une zone sans le dire serait pire que ne pas pouvoir l'éditer : un
   batch cooker se retrouverait proposé à trois cents kilomètres de chez lui.
   ───────────────────────────────────────────────────────────────────────────── */

export interface ZoneLue {
  regionCode: string;
  regionLabel: string;
  scope: "region" | "cities";
  cities: string[];
}

export default function ZonesEditor({
  chefProfileId,
  zones,
  verifie,
}: {
  chefProfileId: string;
  zones: ZoneLue[];
  /** Avant l'approbation, les zones restent celles de la candidature (409). */
  verifie: boolean;
}) {
  const toast = useToast();
  // `useRegions` rend la requête, pas la liste : le repli local sert tant
  // qu'elle n'a pas répondu.
  const regions = useRegions().data ?? [];
  const enregistrer = useUpdateChefZones(chefProfileId);

  const [edition, setEdition] = useState(false);
  const [choisies, setChoisies] = useState<string[]>(() =>
    zones.map((z) => z.regionCode),
  );
  const [aConfirmer, setAConfirmer] = useState(false);

  /** Les zones détaillées ville par ville : ce que l'enregistrement perdrait. */
  const detaillees = useMemo(
    () => zones.filter((z) => z.scope === "cities" && z.cities.length > 0),
    [zones],
  );

  const perdues = detaillees.filter((z) => choisies.includes(z.regionCode));
  const retirees = zones.filter((z) => !choisies.includes(z.regionCode));

  if (!verifie) {
    return (
      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
        Les zones restent celles de la candidature tant que le batch cooker
        n&apos;est pas approuvé.
      </p>
    );
  }

  if (!edition) {
    return (
      <button
        onClick={() => {
          setChoisies(zones.map((z) => z.regionCode));
          setEdition(true);
        }}
        className="btn btn-sm btn-outline mt-3"
      >
        <Pencil className="h-3 w-3" /> Modifier les zones
      </button>
    );
  }

  const basculer = (code: string) =>
    setChoisies((c) =>
      c.includes(code) ? c.filter((x) => x !== code) : [...c, code],
    );

  const payload: InterventionZoneInput[] = choisies.map((code) => ({
    regionCode: code,
    regionLabel:
      regions.find((r) => r.code === code)?.label ??
      zones.find((z) => z.regionCode === code)?.regionLabel ??
      code,
    scope: "region",
    cities: [],
  }));

  return (
    <div className="mt-3 rounded-2xl bg-cream-soft p-4">
      <p className="text-[13px] font-semibold text-navy">
        Régions couvertes
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
        La console ne pose que des régions entières. Le détail ville par ville
        se fixe à la candidature et ne se relit pas encore par l&apos;API.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {regions.map((r) => {
          const active = choisies.includes(r.code);
          return (
            <button
              key={r.code}
              type="button"
              onClick={() => basculer(r.code)}
              aria-pressed={active}
              className={`rounded-full px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                active
                  ? "bg-navy text-white"
                  : "bg-paper text-navy hover:bg-cream-deep"
              }`}
            >
              {active && <Check className="mr-1 inline h-3 w-3" />}
              {r.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => setAConfirmer(true)}
          disabled={enregistrer.isPending || choisies.length === 0}
          className="btn btn-sm btn-navy disabled:opacity-50"
        >
          {enregistrer.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <MapPin className="h-3 w-3" />
          )}
          Enregistrer
        </button>
        <button
          onClick={() => setEdition(false)}
          className="btn btn-sm btn-outline"
        >
          Annuler
        </button>
        {choisies.length === 0 && (
          <span className="text-[12px] text-ink-soft">
            Au moins une région.
          </span>
        )}
      </div>

      <ConfirmDialog
        open={aConfirmer}
        onClose={() => setAConfirmer(false)}
        onConfirm={() =>
          enregistrer.mutate(payload, {
            onSuccess: () => {
              setAConfirmer(false);
              setEdition(false);
              toast.success(
                "Zones mises à jour",
                "Les clients de ces régions le voient dès maintenant.",
              );
            },
            onError: (e) => {
              setAConfirmer(false);
              toast.error("Zones inchangées", adminErrorMessage(e));
            },
          })
        }
        pending={enregistrer.isPending}
        tone={perdues.length > 0 ? "danger" : "primary"}
        title="Remplacer les zones de ce batch cooker ?"
        lead={`Il sera proposé dans ${choisies.length} région${choisies.length > 1 ? "s" : ""} entière${choisies.length > 1 ? "s" : ""}. L'ancienne liste est remplacée, pas complétée.`}
        detail={
          perdues.length > 0
            ? `Attention : ${perdues
                .map((z) => `${z.regionLabel} (${z.cities.join(", ")})`)
                .join(" ; ")} ${perdues.length > 1 ? "étaient limitées" : "était limitée"} à quelques villes. Enregistrer ${perdues.length > 1 ? "les élargit" : "l'élargit"} à toute la région.`
            : retirees.length > 0
              ? `${retirees.map((z) => z.regionLabel).join(", ")} ${retirees.length > 1 ? "ne seront plus couvertes" : "ne sera plus couverte"}.`
              : undefined
        }
        confirmLabel="Remplacer les zones"
      />
    </div>
  );
}
