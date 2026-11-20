"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, MapPin, Pencil, Plus, X } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toaster";
import { useRegionCommunes, useRegions } from "@/lib/api/referentials";
import { adminErrorMessage } from "@/lib/api/errors";
import {
  useUpdateChefZones,
  type InterventionCity,
  type InterventionZoneInput,
} from "@/lib/api/admin";

/* ─────────────────────────────────────────────────────────────────────────────
   Changer les zones d'un batch cooker approuvé.

   Le batch cooker approuvé règle aussi ses zones lui-même (`PATCH
   /me/chef-profile/zones`) ; la console le fait à sa place quand il le demande.
   Les deux sont audités.

   Jusqu'au 10/11 l'éditeur ne posait que des régions entières : la lecture
   ne rendait pas les codes INSEE que l'écriture exige, et il n'y avait pas de
   liste de communes. Les deux existent désormais (`GET /admin/chefs/{id}`
   rend les villes telles qu'enregistrées, `GET /referentials/regions/{code}/
   communes` liste toutes celles d'une région) : chaque région se règle
   « toute la région » ou ville par ville.

   Élargir une zone sans le dire serait pire que ne pas pouvoir l'éditer : un
   batch cooker se retrouverait proposé à trois cents kilomètres de chez lui.
   Le dialogue de confirmation nomme donc ce qui s'élargit et ce qui disparaît.
   ───────────────────────────────────────────────────────────────────────────── */

export interface ZoneLue {
  regionCode: string;
  regionLabel: string;
  scope: "region" | "cities";
  cities: { name: string; dept: string | null; insee: string | null }[];
}

interface Choix {
  regionCode: string;
  scope: "region" | "cities";
  /** `insee` ou `dept` vide : une ville lue incomplète, à retrouver dans la liste. */
  cities: InterventionCity[];
}

const depuisZones = (zones: ZoneLue[]): Choix[] =>
  zones.map((z) => ({
    regionCode: z.regionCode,
    scope: z.scope,
    cities: z.cities.map((c) => ({ name: c.name, dept: c.dept ?? "", insee: c.insee ?? "" })),
  }));

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
  const [choix, setChoix] = useState<Choix[]>(() => depuisZones(zones));
  const [aConfirmer, setAConfirmer] = useState(false);

  const labelDe = (code: string) =>
    regions.find((r) => r.code === code)?.label ??
    zones.find((z) => z.regionCode === code)?.regionLabel ??
    code;

  /** Ce que l'enregistrement élargit à toute la région, et ce qu'il retire. */
  const elargies = useMemo(
    () =>
      zones.filter(
        (z) =>
          z.scope === "cities" &&
          z.cities.length > 0 &&
          choix.find((c) => c.regionCode === z.regionCode)?.scope === "region",
      ),
    [zones, choix],
  );
  const retirees = zones.filter((z) => !choix.some((c) => c.regionCode === z.regionCode));

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
          setChoix(depuisZones(zones));
          setEdition(true);
        }}
        className="btn btn-sm btn-outline mt-3"
      >
        <Pencil className="h-3 w-3" /> Modifier les zones
      </button>
    );
  }

  const basculerRegion = (code: string) =>
    setChoix((c) =>
      c.some((x) => x.regionCode === code)
        ? c.filter((x) => x.regionCode !== code)
        : [...c, { regionCode: code, scope: "region", cities: [] }],
    );
  const majRegion = (code: string, patch: Partial<Choix>) =>
    setChoix((c) => c.map((x) => (x.regionCode === code ? { ...x, ...patch } : x)));

  /** Ce qui empêche d'enregistrer, dit en clair ; `null` si rien. */
  const probleme =
    choix.length === 0
      ? "Au moins une région."
      : choix.some((c) => c.scope === "cities" && c.cities.length === 0)
        ? `${labelDe(choix.find((c) => c.scope === "cities" && c.cities.length === 0)!.regionCode)} : choisissez au moins une ville, ou toute la région.`
        : choix.some((c) => c.scope === "cities" && c.cities.some((v) => !v.insee || !v.dept))
          ? "Une ville n'a pas de code INSEE ou de département : retirez-la, puis reprenez-la dans la liste."
          : null;

  const payload: InterventionZoneInput[] = choix.map((c) => ({
    regionCode: c.regionCode,
    regionLabel: labelDe(c.regionCode),
    scope: c.scope,
    cities: c.scope === "cities" ? c.cities : [],
  }));

  return (
    <div className="mt-3 rounded-2xl bg-cream-soft p-4">
      <p className="text-[13px] font-semibold text-navy">Régions couvertes</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {regions.map((r) => {
          const active = choix.some((c) => c.regionCode === r.code);
          return (
            <button
              key={r.code}
              type="button"
              onClick={() => basculerRegion(r.code)}
              aria-pressed={active}
              className={`rounded-full px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                active ? "bg-navy text-white" : "bg-paper text-navy hover:bg-cream-deep"
              }`}
            >
              {active && <Check className="mr-1 inline h-3 w-3" />}
              {r.label}
            </button>
          );
        })}
      </div>

      {choix.length > 0 && (
        <ul className="mt-4 space-y-3">
          {choix.map((c) => (
            <li key={c.regionCode} className="rounded-xl bg-paper p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-navy">{labelDe(c.regionCode)}</p>
                <div role="group" aria-label="Étendue" className="flex gap-1 rounded-lg bg-cream-soft p-0.5">
                  {(["region", "cities"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => majRegion(c.regionCode, { scope: s })}
                      aria-pressed={c.scope === s}
                      className={`rounded-md px-2.5 py-1 text-[12px] font-semibold ${
                        c.scope === s ? "bg-paper text-navy shadow-sm" : "text-ink-soft hover:text-navy"
                      }`}
                    >
                      {s === "region" ? "Toute la région" : "Villes précises"}
                    </button>
                  ))}
                </div>
              </div>
              {c.scope === "cities" && (
                <VillesPicker
                  regionCode={c.regionCode}
                  villes={c.cities}
                  onChange={(cities) => majRegion(c.regionCode, { cities })}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setAConfirmer(true)}
          disabled={enregistrer.isPending || probleme !== null}
          className="btn btn-sm btn-navy disabled:opacity-50"
        >
          {enregistrer.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <MapPin className="h-3 w-3" />
          )}
          Enregistrer
        </button>
        <button onClick={() => setEdition(false)} className="btn btn-sm btn-outline">
          Annuler
        </button>
        {probleme && <span className="text-[12px] text-ink-soft">{probleme}</span>}
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
                "Les clients de ces zones le voient dès maintenant.",
              );
            },
            onError: (e) => {
              setAConfirmer(false);
              toast.error("Zones inchangées", adminErrorMessage(e));
            },
          })
        }
        pending={enregistrer.isPending}
        tone={elargies.length > 0 ? "danger" : "primary"}
        title="Remplacer les zones de ce batch cooker ?"
        lead={`Il sera proposé dans ${choix.length} région${choix.length > 1 ? "s" : ""}. L'ancienne liste est remplacée, pas complétée.`}
        detail={
          elargies.length > 0
            ? `Attention : ${elargies
                .map((z) => `${z.regionLabel} (${z.cities.map((v) => v.name).join(", ")})`)
                .join(" ; ")} ${elargies.length > 1 ? "étaient limitées" : "était limitée"} à quelques villes. Enregistrer ${elargies.length > 1 ? "les élargit" : "l'élargit"} à toute la région.`
            : retirees.length > 0
              ? `${retirees.map((z) => z.regionLabel).join(", ")} ${retirees.length > 1 ? "ne seront plus couvertes" : "ne sera plus couverte"}.`
              : undefined
        }
        confirmLabel="Remplacer les zones"
      />
    </div>
  );
}

/** Assez pour trouver d'un coup d'œil ; le filtre fait le reste. */
const PROPOSEES = 40;

const normaliser = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Les villes d'une région : celles choisies, et la recherche dans toutes les
 * communes de la région. Une ville lue sans code INSEE ou sans département
 * (zone déclarée avant qu'ils soient exigés) est complétée d'après son nom dès
 * que la liste arrive.
 */
function VillesPicker({
  regionCode,
  villes,
  onChange,
}: {
  regionCode: string;
  villes: InterventionCity[];
  onChange: (villes: InterventionCity[]) => void;
}) {
  const communes = useRegionCommunes(regionCode);
  const [filtre, setFiltre] = useState("");

  useEffect(() => {
    if (!communes.data || !villes.some((v) => !v.insee || !v.dept)) return;
    onChange(
      villes.map((v) => {
        if (v.insee && v.dept) return v;
        const c = communes.data.find((x) => normaliser(x.name) === normaliser(v.name));
        return c ? { name: c.name, dept: c.department, insee: c.insee } : v;
      }),
    );
    // Une fois, à l'arrivée de la liste : `villes` change ensuite par nos soins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communes.data]);

  const choisies = new Set(villes.map((v) => v.insee).filter(Boolean));
  const f = normaliser(filtre);
  const propositions = f
    ? (communes.data ?? [])
        .filter((c) => !choisies.has(c.insee) && normaliser(c.name).includes(f))
        .slice(0, PROPOSEES)
    : [];

  return (
    <div className="mt-2.5 tabular-nums">
      {villes.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Villes choisies">
          {villes.map((v) => (
            <li key={v.insee || v.name}>
              <span
                className={`inline-flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1 text-[12px] font-semibold ${
                  v.insee && v.dept ? "bg-navy text-white" : "bg-red-50 text-red-700"
                }`}
              >
                {v.name}
                {v.dept && <span className="font-normal opacity-70">{v.dept}</span>}
                <button
                  type="button"
                  onClick={() => onChange(villes.filter((x) => x !== v))}
                  aria-label={`Retirer ${v.name}`}
                  className="hit ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-white/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {communes.isPending ? (
        <p className="flex items-center gap-2 text-[12px] text-ink-soft">
          <Loader2 className="h-3 w-3 animate-spin" /> Chargement des communes…
        </p>
      ) : communes.isError ? (
        <p className="text-[12px] text-ink-soft">
          La liste des communes est indisponible pour le moment : réessayez, ou posez
          toute la région.
        </p>
      ) : (
        <>
          <input
            type="search"
            value={filtre}
            onChange={(e) => setFiltre(e.target.value)}
            placeholder={`Chercher parmi ${(communes.data?.length ?? 0).toLocaleString("fr-FR")} communes`}
            aria-label="Chercher une commune de la région"
            className="input-base w-full text-[13px]"
          />
          {f && (
            <ul className="mt-1.5 max-h-56 overflow-y-auto rounded-lg border border-[rgba(31,42,55,0.08)]">
              {propositions.length === 0 ? (
                <li className="px-3 py-2 text-[12px] text-ink-soft">Aucune commune ne correspond.</li>
              ) : (
                propositions.map((c) => (
                  <li key={c.insee}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange([...villes, { name: c.name, dept: c.department, insee: c.insee }]);
                        setFiltre("");
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-cream-soft"
                    >
                      <Plus className="h-3 w-3 shrink-0 text-amber-deep" />
                      <span className="min-w-0 truncate text-navy">{c.name}</span>
                      <span className="ml-auto text-xs text-ink-soft">{c.department}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
