"use client";

import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CalendarClock, Receipt } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { ApiError, useApiFetch } from "@/lib/api/client";
import {
  INVOICE_STATUS,
  centimes,
  useCesuPayments,
  useCommissionInvoices,
} from "@/lib/api/money";

/* ─────────────────────────────────────────────────────────────────────────────
   Les créneaux d'un batch cooker, et ce qu'il doit.

   Cette fiche portait une liste de manques dont deux lignes étaient devenues
   fausses :

   - « son agenda et ses disponibilités : aucune route, nulle part » — la route
     publique `GET /chefs/{id}/availability` donne ses créneaux libres, celle
     que voit un client avant de réserver ;
   - « sa rémunération : les transactions ne se lisent ni par chef, ni du
     tout » — les factures de commission et les déclarations CESU portent le
     batch cooker depuis qu'elles sont branchées.

   Reste vrai : ce qui **occupe** son agenda. L'API ne dit jamais ce qui rend un
   créneau indisponible — une prestation, un bloc, une journée fermée se
   ressemblent toutes vues de dehors. Les prestations se lisent dans l'onglet
   voisin ; ses blocs et ses fermetures, non.
   ───────────────────────────────────────────────────────────────────────────── */

const JOURS = 14;

interface Creneaux {
  offer: { id: string; name?: string | null } | null;
  durationMinutes: number;
  /** `false` : aucune semaine type posée — il n'a pas réglé ses horaires. */
  scheduled: boolean;
  slots: string[];
}

const jour = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

const heure = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

/** `GET /chefs/{id}/availability` — publique, donc lisible par un admin. */
function useCreneaux(chefProfileId: string, enLigne: boolean) {
  const apiFetch = useApiFetch();
  /* La fenêtre est figée au montage : lire l'horloge pendant le rendu rendrait
     la clef de requête différente à chaque passage. */
  const [debut, fin] = useState(() => {
    const d = (x: Date) => x.toISOString().slice(0, 10);
    return [d(new Date()), d(new Date(Date.now() + JOURS * 86400000))];
  })[0];

  return useQuery({
    queryKey: ["chef", chefProfileId, "availability", debut, fin],
    queryFn: () =>
      apiFetch<Creneaux>(
        `/chefs/${chefProfileId}/availability?from=${debut}&to=${fin}`,
      ),
    enabled: enLigne,
    retry: false,
  });
}

export default function ChefAgendaEtArgent({
  chefProfileId,
  enLigne,
}: {
  chefProfileId: string;
  /** Approuvé **et** en ligne : sans ça, la route publique répond 404. */
  enLigne: boolean;
}) {
  const creneaux = useCreneaux(chefProfileId, enLigne);
  const factures = useCommissionInvoices("all");
  const cesu = useCesuPayments("all");

  const siennes = useMemo(
    () => (factures.data ?? []).filter((f) => f.chefProfileId === chefProfileId),
    [factures.data, chefProfileId],
  );
  const du = siennes
    .filter((f) => f.status === "issued")
    .reduce((n, f) => n + f.amountTtcCents, 0);

  /* Les déclarations CESU ne portent que le nom affiché, pas l'id : on ne
     filtre donc que ce qu'on peut rapprocher sans se tromper. */
  const sansOffre =
    creneaux.error instanceof ApiError && creneaux.error.status === 404;

  const parJour = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const iso of creneaux.data?.slots ?? []) {
      const k = iso.slice(0, 10);
      m.set(k, [...(m.get(k) ?? []), iso]);
    }
    return [...m.entries()].slice(0, 7);
  }, [creneaux.data]);

  return (
    <div className="space-y-5">
      {/* ── Ses créneaux ────────────────────────────────────────────────── */}
      <section className="card p-5">
        <h3 className="flex items-center gap-2 font-display text-base font-bold text-navy">
          <CalendarClock className="h-4 w-4 text-ink-soft" />
          Ses créneaux libres, les {JOURS} prochains jours
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
          Ce qu&apos;un client voit avant de réserver. L&apos;API ne dit jamais
          ce qui rend une heure indisponible : une prestation, un bloc ou une
          journée fermée s&apos;y ressemblent.
        </p>

        {!enLigne ? (
          <p className="mt-3 text-[13px] text-ink-mid">
            Hors ligne : ses créneaux ne sont lisibles qu&apos;une fois sa
            vitrine publiée.
          </p>
        ) : creneaux.isPending ? (
          <SkeletonGroup className="mt-3">
            <Skeleton className="h-20 rounded-xl" />
          </SkeletonGroup>
        ) : sansOffre ? (
          <p className="mt-3 text-[13px] text-ink-mid">
            Aucune formule active : sans elle, l&apos;API ne peut calculer aucun
            créneau — et personne ne peut le réserver en ligne.
          </p>
        ) : creneaux.isError ? (
          <p className="mt-3 text-[13px] text-ink-mid">
            Ses créneaux n&apos;ont pas pu être chargés.
          </p>
        ) : creneaux.data?.scheduled === false ? (
          <p className="mt-3 text-[13px] text-ink-mid">
            Il n&apos;a posé aucune semaine type : tout horaire est donc
            proposé, ce qui est rarement voulu.
          </p>
        ) : parJour.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-mid">
            Complet : aucun créneau libre sur la période.
          </p>
        ) : (
          <>
            {creneaux.data?.offer && (
              <p className="mt-2 text-[12px] text-ink-soft">
                Calculés sur sa formule{" "}
                <span className="font-semibold text-navy">
                  {creneaux.data.offer.name ?? "principale"}
                </span>{" "}
                ({creneaux.data.durationMinutes / 60} h).
              </p>
            )}
            <ul className="mt-3 space-y-2">
              {parJour.map(([k, heures]) => (
                <li key={k} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="w-44 shrink-0 text-[13px] font-semibold capitalize text-navy">
                    {jour(k)}
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {heures.slice(0, 8).map((iso) => (
                      <span
                        key={iso}
                        className="rounded-md bg-cream-soft px-1.5 py-0.5 font-mono text-xs text-ink-mid"
                      >
                        {heure(iso)}
                      </span>
                    ))}
                    {heures.length > 8 && (
                      <span className="text-xs text-ink-soft tabular-nums">
                        +{heures.length - 8}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* ── Ce qu'il doit ───────────────────────────────────────────────── */}
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-base font-bold text-navy">
            <Receipt className="h-4 w-4 text-ink-soft" />
            Ses commissions
          </h3>
          <Link href="/transactions" className="btn btn-sm btn-outline">
            Toutes les transactions <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {factures.isPending ? (
          <SkeletonGroup className="mt-3">
            <Skeleton className="h-16 rounded-xl" />
          </SkeletonGroup>
        ) : siennes.length === 0 ? (
          <p className="mt-2 text-[13px] text-ink-mid">
            Aucune facture de commission émise à son nom.
            {(cesu.data ?? []).length === 0 &&
              " Aucune déclaration CESU dans le réseau non plus."}
          </p>
        ) : (
          <>
            {du > 0 && (
              <p className="mt-2 text-[13px] text-ink-mid">
                <span className="font-display text-lg font-bold text-navy tabular-nums">
                  {centimes(du)}
                </span>{" "}
                encore dus.
              </p>
            )}
            <ul className="mt-3 space-y-1.5">
              {siennes.slice(0, 6).map((f) => (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center gap-2 text-[13px] text-ink-mid"
                >
                  <span className="font-mono text-navy">{f.invoiceNumber}</span>
                  <Badge
                    tone={
                      f.status === "settled"
                        ? "success"
                        : f.status === "issued"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {INVOICE_STATUS[f.status]}
                  </Badge>
                  <span>{centimes(f.amountTtcCents)}</span>
                  <span className="text-ink-soft tabular-nums">
                    {new Date(f.issuedAt).toLocaleDateString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
