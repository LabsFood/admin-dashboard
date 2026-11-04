"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarRange,
  Check,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  IdCard,
  LayoutList,
  Loader2,
  Mail,
  MapPin,
  RotateCw,
  Send,
  ShieldCheck,
  UtensilsCrossed,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import WriteToUserButton from "@/components/admin/WriteToUserButton";
import { cn, euros, formatDate } from "@/lib/utils";
import { countryLabel } from "@/lib/countries";
import { moderatedLabel, moderatedTone } from "@/lib/catalog-labels";
import {
  useChefApplication,
  useChefShowcase,
  useChefTierNames,
  useResendInvitation,
  useSetChefTier,
  useSetChefVerification,
  useSetSapExternalStatus,
  SAP_EXTERNAL_LABEL,
  SAP_EXTERNAL_STATUSES,
  type SapExternalStatus,
  verificationMessage,
} from "@/lib/api/admin";
import {
  bookingPortions,
  bookingStatusText,
  useBookings,
} from "@/lib/api/bookings";
import { useChefDishes, useChefMenus, type ReviewItem } from "@/lib/api/moderation";
import {
  CHEF_STATE_HELP,
  CHEF_STATE_LABEL,
  CHEF_STATE_TONE,
  CHEF_TIERS,
  useAdminChef,
  type AdminChefDetail,
  type ChefTier,
} from "@/lib/api/chefs";
import InfoPopover from "@/components/ui/InfoPopover";
import { ApiError } from "@/lib/api/client";
import DeleteAccountButton from "@/components/admin/DeleteAccountButton";
import ZonesEditor from "@/components/admin/ZonesEditor";
import PhotoDeProfil from "@/components/admin/PhotoDeProfil";
import ChefAgendaEtArgent from "@/components/admin/ChefAgendaEtArgent";
import { adminErrorMessage } from "@/lib/api/errors";

/* ─────────────────────────────────────────────────────────────────────────────
   La fiche d'un batch cooker.

   Le paramètre de route est l'id de **candidature**, parce que c'est par là
   qu'on arrive — aucune route ne liste les batch cookers, et la liste du
   réseau est bâtie sur les candidatures approuvées. Le détail de la
   candidature porte `chefProfileId`, qui ouvre ensuite ses plats, ses menus
   et sa vitrine.

   Ce que l'API ne sait pas dire, l'écran le nomme au lieu de l'inventer :
   l'agenda n'existe nulle part et il n'y a pas d'avis. Les prestations, elles,
   se reconstituent — `GET /bookings` rend toute la base et l'onglet filtre
   après coup, en disant ce que ce détour coûte.
   ───────────────────────────────────────────────────────────────────────────── */

type Onglet = "profil" | "plats" | "menus" | "vitrine" | "prestations";

const WORK_STATUS_LABEL: Record<string, string> = {
  "eu-citizen": "Ressortissant français ou de l'Union européenne",
  "residence-permit": "Titre de séjour autorisant à travailler",
  "renewal-pending": "Titre de séjour en cours de renouvellement",
  other: "Autre situation",
};

const LEGAL_FORM_LABEL: Record<string, string> = {
  micro: "Micro ou auto-entrepreneur",
  "other-company": "Autre forme d'entreprise",
  "not-registered": "Pas d'entreprise",
};

export default function BatchCookerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // `id` est l'identifiant de la page batch cooker (`chefProfile.id`), celui que
  // portent les liens de la liste, des candidatures et des autres écrans.
  const { id } = use(params);
  const router = useRouter();
  const chef = useAdminChef(id);
  // Le dossier vient de la candidature, quand il y en a une.
  const app = useChefApplication(chef.data?.application?.id);
  const [onglet, setOnglet] = useState<Onglet>("profil");

  // Cette fiche s'ouvrait autrefois avec l'identifiant de la candidature. Un
  // ancien lien ou un favori ne trouve donc pas de batch cooker : on regarde si
  // c'est une candidature, et on renvoie vers la bonne adresse.
  const introuvable = chef.error instanceof ApiError && chef.error.status === 404;
  const ancienLien = useChefApplication(introuvable ? id : undefined);
  const cible = ancienLien.data?.chefProfileId;
  useEffect(() => {
    if (cible) router.replace(`/batchcookers/${cible}`);
  }, [cible, router]);

  if (chef.isPending || (introuvable && (ancienLien.isPending || cible))) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-lg bg-paper" />
        <div className="h-96 animate-pulse rounded-lg bg-paper" />
      </div>
    );
  }

  if (chef.isError || !chef.data) {
    return (
      <section className="card mx-auto max-w-lg p-6 text-center">
        <p className="font-display text-lg font-bold text-navy">Fiche introuvable</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-mid">
          {introuvable
            ? "Aucun batch cooker ne porte cet identifiant. Son compte a peut-être été supprimé."
            : adminErrorMessage(chef.error)}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button onClick={() => chef.refetch()} className="btn btn-outline btn-sm">
            <RotateCw className="h-3 w-3" /> Réessayer
          </button>
          <Link href="/batchcookers" className="btn btn-primary btn-sm">
            Le réseau
          </Link>
        </div>
      </section>
    );
  }

  const c = chef.data;
  const nom = c.displayName;
  const ville = c.city;

  return (
    <div className="space-y-6">
      <Link
        href="/batchcookers"
        className="inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Le réseau
      </Link>

      {/* ── Qui c'est, et dans quel état ──────────────────────────────── */}
      <section className="card p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4">
            <PhotoDeProfil
              userId={c.userId}
              nom={nom}
              url={c.avatarUrl}
              className="h-14 w-14 rounded-2xl text-base"
            />
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold leading-tight text-navy">
                {nom}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-soft">
                {ville && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {ville}
                  </span>
                )}
                <span>{c.email}</span>
                {c.phone && <span className="font-mono">{c.phone}</span>}
              </p>
              <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                {c.application?.reference ?? "Sans candidature"}
              </p>
              {c.regions.length > 0 && (
                <p className="mt-1.5 text-[12px] text-ink-mid">
                  Couvre : {c.regions.map((r) => r.label).join(" · ")}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Badge tone={CHEF_STATE_TONE[c.state]} dot>
              {CHEF_STATE_LABEL[c.state]}
            </Badge>
            {c.application ? (
              <Link
                href={`/candidatures/${c.application.id}`}
                className="btn btn-outline btn-sm"
              >
                <FileText className="h-3 w-3" /> Le dossier et ses pièces
              </Link>
            ) : (
              <span className="text-[11px] text-ink-soft">Compte sans candidature</span>
            )}
            <WriteToUserButton userId={c.userId} />
          </div>
        </div>

        {c.state !== "online" && (
          <p
            className={cn(
              "mt-4 text-[13px] leading-relaxed",
              c.state === "suspended" ? "text-danger" : "text-[#8A6212]",
            )}
          >
            {CHEF_STATE_HELP[c.state]}
          </p>
        )}
        {c.reactivatedPendingReview && (
          <p className="mt-4 text-[13px] leading-relaxed text-[#8A6212]">
            En ligne sur un document de remplacement que personne n&apos;a encore relu.
          </p>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Compteur label="Plats publiés" valeur={c.counts.publishedDishes} />
          <Compteur label="Menus publiés" valeur={c.counts.publishedMenus} />
          <Compteur label="Prestations à venir" valeur={c.counts.upcomingBookings} />
          <Compteur label="Prestations réalisées" valeur={c.counts.completedBookings} />
        </dl>

        {c.isVerified && <MiseEnLigne chefProfileId={c.id} enLigne={c.isActive} />}

        {c.userId && <LienConnexion userId={c.userId} email={c.email} />}

        {c.tier && <Palier chefProfileId={c.id} actuel={c.tier} />}

        {c.isVerified && (
          <StatutsSap
            chefProfileId={c.id}
            crcesuActuel={c.crcesuAffiliationStatus}
            urssafActuel={c.urssafTiersPrestationStatus}
          />
        )}

        {c.userId && (
          <div className="hairline mt-4 border-t pt-4">
            <p className="mb-1 text-[13px] font-semibold text-navy">
              Fermer ce compte
            </p>
            <p className="mb-3 max-w-prose text-[11px] leading-relaxed text-ink-soft">
              Définitif : le compte Clerk est supprimé et la personne ne peut plus
              se connecter. L&apos;API refuse tant qu&apos;une réservation est
              ouverte.
            </p>
            <DeleteAccountButton
              userId={c.userId}
              nom={c.displayName ?? c.fullName ?? "ce batch cooker"}
              role="batch cooker"
              retourVers="/batchcookers"
            />
          </div>
        )}
      </section>

      {/* ── Onglets ───────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Fiche du batch cooker"
        className="hairline no-scrollbar inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border bg-paper p-1"
      >
        {(
          [
            { id: "profil", Icon: IdCard, label: "Profil" },
            { id: "plats", Icon: UtensilsCrossed, label: "Ses plats" },
            { id: "menus", Icon: LayoutList, label: "Ses menus" },
            { id: "vitrine", Icon: CalendarRange, label: "Sa vitrine" },
            { id: "prestations", Icon: ClipboardList, label: "Ses prestations" },
          ] as const
        ).map(({ id: tid, Icon, label }) => (
          <button
            key={tid}
            type="button"
            role="tab"
            aria-selected={onglet === tid}
            onClick={() => setOnglet(tid)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              onglet === tid ? "bg-navy text-white" : "text-ink-mid hover:text-navy",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {onglet === "profil" &&
        (app.data ? (
          <Profil app={app.data} />
        ) : c.application && app.isPending ? (
          <div className="h-64 animate-pulse rounded-lg bg-paper" />
        ) : (
          <ProfilSansCandidature chef={c} />
        ))}
      {onglet === "plats" && <Contenu chefProfileId={c.id} genre="dish" />}
      {onglet === "menus" && <Contenu chefProfileId={c.id} genre="menu" />}
      {onglet === "vitrine" && <Vitrine chefProfileId={c.id} />}
      {onglet === "prestations" && <Prestations chefProfileId={c.id} />}

      <ChefAgendaEtArgent
        chefProfileId={c.id}
        enLigne={Boolean(c.isActive && c.isVerified)}
      />

      {/* Ce que la console ne sait pas montrer, nommé plutôt qu'inventé. */}
      <section className="card p-5">
        <h3 className="font-display text-base font-bold text-navy">
          Ce qui manque encore sur cette fiche
        </h3>
        <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-mid">
          <li>
            <strong>Ce qui occupe son agenda</strong> — ses créneaux libres se
            lisent, mais l&apos;API ne dit jamais ce qui rend une heure
            indisponible. Ses prestations figurent dans l&apos;onglet voisin ;
            ses blocs et ses journées fermées, nulle part.
          </li>
          <li>
            <strong>Ses avis et sa note</strong> — pas de module d&apos;avis.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Compteur({ label, valeur }: { label: string; valeur: number }) {
  return (
    <div className="rounded-lg bg-cream-soft px-3 py-2.5">
      <dd className="font-display text-xl font-bold text-navy">{valeur}</dd>
      <dt className="text-[11px] text-ink-soft">{label}</dt>
    </div>
  );
}

/**
 * Le profil d'un batch cooker qui n'a jamais déposé de candidature : il n'y a
 * pas de dossier à lire, seulement ce que porte sa page.
 */
function ProfilSansCandidature({ chef }: { chef: AdminChefDetail }) {
  return (
    <section className="card space-y-4 p-5">
      <p className="text-[13px] leading-relaxed text-ink-mid">
        Ce compte n&apos;a pas de candidature : il existait avant le parcours de
        candidature, ou a été créé à la main. Il n&apos;y a donc ni dossier ni
        pièces à consulter.
      </p>
      {chef.bio && (
        <div>
          <h3 className="font-display text-base font-bold text-navy">Présentation</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {chef.bio}
          </p>
        </div>
      )}
      <div>
        <h3 className="font-display text-base font-bold text-navy">
          Zones d&apos;intervention
        </h3>
        {chef.zones.length === 0 ? (
          <p className="mt-1 text-sm text-ink-soft">
            Aucune zone déclarée. Rayon d&apos;intervention : {chef.serviceRadiusKm} km
            {chef.city ? ` autour de ${chef.city}` : ""}.
          </p>
        ) : (
          <ul className="mt-1 space-y-1 text-sm text-ink">
            {chef.zones.map((zone) => (
              <li key={zone.regionCode}>
                <strong>{zone.regionLabel}</strong>
                {zone.scope === "cities" && zone.cities.length > 0
                  ? ` : ${zone.cities.join(", ")}`
                  : " : toute la région"}
              </li>
            ))}
          </ul>
        )}

        <ZonesEditor
          chefProfileId={chef.id}
          zones={chef.zones}
          verifie={chef.isVerified}
        />
      </div>
    </section>
  );
}

/* ── Mettre la vitrine en ligne ────────────────────────────────────────────── */

/**
 * Approuver une candidature ne met personne en ligne : c'est un second geste,
 * et c'est ici qu'on le fait.
 *
 * `enLigne` vient de la fiche du batch cooker (`GET /admin/chefs/{id}`).
 */
function MiseEnLigne({
  chefProfileId,
  enLigne,
}: {
  chefProfileId: string;
  enLigne?: boolean;
}) {
  const verif = useSetChefVerification(chefProfileId);
  const [dernier, setDernier] = useState<"online" | "offline" | null>(null);

  const agir = (isActive: boolean) =>
    verif.mutate(
      { isActive },
      { onSuccess: () => setDernier(isActive ? "online" : "offline") },
    );

  // Après un aller-retour réussi, l'état affiché est celui qu'on vient de
  // poser : la candidature mettra un instant à se recharger.
  const etat = dernier ? dernier === "online" : enLigne;

  return (
    <div className="hairline mt-5 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-navy">
            {etat === undefined ? (
              "Vitrine publique"
            ) : etat ? (
              <>
                <Eye className="h-3.5 w-3.5 text-success" aria-hidden /> Vitrine en
                ligne
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5 text-ink-soft" aria-hidden /> Vitrine
                hors ligne
              </>
            )}
          </p>
          <p className="mt-0.5 max-w-prose text-[11px] leading-relaxed text-ink-soft">
            {etat === undefined
              ? "Tant qu'elle n'est pas en ligne, aucun client ne le voit ni ne peut le réserver. Les deux boutons sont sans danger à répéter."
              : etat
                ? "Les clients le voient sur la page des menus et peuvent le réserver."
                : "Personne ne le voit : il n'apparaît ni dans la semaine, ni dans une recherche."}
          </p>
        </div>
        <div className="flex gap-2">
          {etat !== true && (
            <button
              type="button"
              onClick={() => agir(true)}
              disabled={verif.isPending}
              className="btn btn-primary btn-sm"
            >
              {verif.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              Mettre en ligne
            </button>
          )}
          {etat !== false && (
            <button
              type="button"
              onClick={() => agir(false)}
              disabled={verif.isPending}
              className="btn btn-outline btn-sm"
            >
              {verif.isPending && etat === true ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
              Retirer du public
            </button>
          )}
        </div>
      </div>

      {dernier && !verif.isPending && (
        <p className="mt-2 flex items-start gap-1.5 text-[12px] text-success">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {dernier === "online"
            ? "Vitrine en ligne : les clients peuvent le réserver."
            : "Vitrine retirée : il n'apparaît plus aux clients."}
        </p>
      )}
      {verif.isError && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-[12px] text-danger">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {verificationMessage(verif.error)}
        </p>
      )}
    </div>
  );
}

/* ── Profil ────────────────────────────────────────────────────────────────── */

function Profil({ app }: { app: NonNullable<ReturnType<typeof useChefApplication>["data"]> }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Bloc titre="Identité">
        <Ligne label="Prénom" valeur={app.identity?.firstName} />
        <Ligne label="Nom" valeur={app.identity?.lastName} />
        <Ligne label="Email" valeur={app.identity?.email} mono />
        <Ligne label="Téléphone" valeur={app.identity?.phone} mono />
      </Bloc>

      <Bloc titre="Adresse">
        <Ligne label="Rue" valeur={app.address?.street} />
        <Ligne label="Complément" valeur={app.address?.line2 ?? undefined} />
        <Ligne
          label="Ville"
          valeur={[app.address?.postcode, app.address?.city].filter(Boolean).join(" ")}
        />
        <Ligne label="Pays" valeur={countryLabel(app.address?.country)} />
      </Bloc>

      <Bloc titre="Activité">
        <Ligne
          label="Statut"
          valeur={
            app.company?.legalForm
              ? (LEGAL_FORM_LABEL[app.company.legalForm] ?? app.company.legalForm)
              : undefined
          }
        />
        <Ligne label="SIRET" valeur={app.company?.siret ?? undefined} mono />
        <Ligne
          label="Services à la personne"
          valeur={
            app.company?.sap?.path === "type-a"
              ? "Déclaration à son nom"
              : app.company?.sap?.path === "type-b"
                ? "Par sa coopérative SAP"
                : undefined
          }
        />
        <Ligne
          label="N° de déclaration"
          valeur={app.company?.sap?.declarationNumber ?? undefined}
          mono
        />
        <Ligne
          label="Autorisation de travail"
          valeur={
            app.workAuthorization?.status
              ? (WORK_STATUS_LABEL[app.workAuthorization.status] ??
                app.workAuthorization.status)
              : undefined
          }
        />
      </Bloc>

      <Bloc titre="Zones d'intervention">
        {(app.interventionZones?.length ?? 0) === 0 ? (
          <p className="text-sm text-ink-soft">Aucune zone renseignée.</p>
        ) : (
          <ul className="space-y-2.5">
            {app.interventionZones.map((z, i) => (
              <li key={z.regionCode ?? i} className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-terra" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-navy">
                    {z.regionLabel ?? z.regionCode}
                  </span>
                  <span className="block text-[13px] leading-relaxed text-ink-mid">
                    {z.scope === "cities" && z.cities?.length
                      ? z.cities.map((c) => c.name).join(", ")
                      : "Toute la région"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Bloc>
    </div>
  );
}

/* ── Plats et menus ────────────────────────────────────────────────────────── */

function Contenu({
  chefProfileId,
  genre,
}: {
  chefProfileId: string;
  genre: "dish" | "menu";
}) {
  const plats = useChefDishes(genre === "dish" ? chefProfileId : undefined);
  const menus = useChefMenus(genre === "menu" ? chefProfileId : undefined);
  const q = genre === "dish" ? plats : menus;
  const items: ReviewItem[] = q.data ?? [];
  const mot = genre === "dish" ? "plat" : "menu";

  if (q.isError) {
    return (
      <section className="card p-6">
        <p className="flex items-start gap-2 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {adminErrorMessage(q.error)}
        </p>
      </section>
    );
  }

  if (q.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card">
        <EmptyState
          Icon={genre === "dish" ? UtensilsCrossed : LayoutList}
          title={`Aucun ${mot}`}
          text={`Ce batch cooker n'a écrit aucun ${mot} pour l'instant.`}
        />
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-ink-mid">
        {items.length} {mot}
        {items.length > 1 ? "s" : ""}, brouillons et suspendus compris.
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <article key={it.id} className="card overflow-hidden">
            {it.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={it.imageUrl}
                alt=""
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center bg-cream-deep text-ink-soft">
                {genre === "dish" ? (
                  <UtensilsCrossed className="h-7 w-7" />
                ) : (
                  <LayoutList className="h-7 w-7" />
                )}
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 text-sm font-semibold leading-snug text-navy">
                  {it.name}
                </h3>
                <Badge tone={moderatedTone[it.status]} dot>
                  {moderatedLabel[it.status]}
                </Badge>
              </div>
              <p className="mt-1 font-mono text-[11px] text-ink-soft">
                {[
                  countryLabel(it.country),
                  it.prepMinutes ? `${it.prepMinutes} min` : null,
                  it.dishCount != null ? `${it.dishCount} plats` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
              {!it.allergensNone &&
                it.allergens.length === 0 &&
                it.customAllergens.length === 0 &&
                genre === "dish" && (
                  <p className="mt-2 text-[12px] leading-relaxed text-[#8A6212]">
                    Allergènes non déclarés.
                  </p>
                )}
            </div>
          </article>
        ))}
      </div>
      <Link href="/moderation" className="btn btn-outline btn-sm mt-4">
        Modérer ce contenu
      </Link>
    </>
  );
}

/* ── Vitrine ───────────────────────────────────────────────────────────────── */

function Vitrine({ chefProfileId }: { chefProfileId: string }) {
  const q = useChefShowcase(chefProfileId);
  const semaines = q.data ?? [];

  if (q.isPending) {
    return <div className="card h-48 animate-pulse" />;
  }

  if (q.isError) {
    return (
      <section className="card p-5">
        <p className="text-sm leading-relaxed text-ink-mid">
          Sa vitrine publique n&apos;est pas lisible. C&apos;est normal tant
          qu&apos;il n&apos;est pas en ligne : cette route ne rend que ce
          qu&apos;un client verrait.
        </p>
      </section>
    );
  }

  if (semaines.length === 0) {
    return (
      <div className="card">
        <EmptyState
          Icon={CalendarRange}
          title="Aucune semaine programmée"
          text="Il n'a pas encore choisi quel menu montrer, semaine par semaine."
        />
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-ink-mid">
        Ce qu&apos;un client voit sur sa page, semaine par semaine. Une semaine
        sans menu publié reste vide.
      </p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {semaines.map((s, i) => (
          <li key={s.weekStart ?? i} className="card p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-terra">
              {s.weekStart ? formatDate(s.weekStart) : `Semaine ${i + 1}`}
            </p>
            {s.menu ? (
              <>
                <p className="mt-1 text-sm font-semibold leading-snug text-navy">
                  {s.menu.title}
                </p>
                {s.menu.status && (
                  <p className="mt-1 text-[11px] text-ink-soft">{s.menu.status}</p>
                )}
              </>
            ) : (
              <p className="mt-1 text-[13px] text-ink-soft">Rien de programmé.</p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

/* ── Prestations ───────────────────────────────────────────────────────────── */

/**
 * Ses prestations, reconstituées.
 *
 * Il fallait autrefois lire la base entière et la filtrer ici, faute de route
 * « les réservations de ce batch cooker ». Depuis le 16/10,
 * `GET /admin/bookings?chefId=` fait le tri côté serveur et pagine : le
 * décompte est exact, et la page ne charge plus que ce qu'elle montre.
 */
function Prestations({ chefProfileId }: { chefProfileId: string }) {
  const q = useBookings({ chefId: chefProfileId, limit: 50 });
  const siennes = q.data?.data ?? [];
  const total = q.data?.meta?.total ?? siennes.length;

  if (q.isPending) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (q.isError) {
    return (
      <section className="card p-5">
        <p className="flex items-start gap-2 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {adminErrorMessage(q.error)}
        </p>
        <button onClick={() => q.refetch()} className="btn btn-outline btn-sm mt-4">
          <RotateCw className="h-3 w-3" /> Réessayer
        </button>
      </section>
    );
  }

  if (siennes.length === 0) {
    return (
      <div className="card">
        <EmptyState
          Icon={ClipboardList}
          title="Aucune prestation"
          text="Il n'a encore été réservé par personne. Pour l'être, il lui faut des horaires de travail posés dans son agenda."
        />
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-ink-mid">
        {total} prestation{total > 1 ? "s" : ""}, de la plus récente à la plus
        ancienne.
      </p>
      {total > siennes.length && (
        <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
          Les {siennes.length} premières sont affichées.
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {siennes.map((b) => (
          <li
            key={b.id}
            className="card flex flex-wrap items-center justify-between gap-x-5 gap-y-2 p-4"
          >
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="text-sm font-semibold text-navy">
                  {b.client?.name ?? "Client non nommé"}
                </span>
                {b.status && <Badge tone="navy">{bookingStatusText(b.status)}</Badge>}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-ink-soft">
                {[
                  b.startsAt ? formatDate(b.startsAt) : null,
                  b.timeSlot,
                  b.city,
                  bookingPortions(b) > 0 ? `${bookingPortions(b)} portions` : null,
                  b.reference,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
            </div>
            {b.priceCents != null && (
              <p className="font-display text-base font-bold text-navy">
                {euros(Math.round(b.priceCents / 100))}
              </p>
            )}
          </li>
        ))}
      </ul>

      <Link href="/reservations" className="btn btn-outline btn-sm mt-4">
        Toutes les réservations
      </Link>
    </>
  );
}

/* ── Petits blocs ──────────────────────────────────────────────────────────── */

/* ── Le lien de connexion ──────────────────────────────────────────────────── */

/**
 * Renvoyer son lien de connexion à un batch cooker.
 *
 * Il n'a pas de mot de passe à réinitialiser : son compte s'ouvre par un lien
 * reçu par email. Si ce lien n'est jamais arrivé — service d'envoi muet, boîte
 * pleine, adresse mal saisie — il ne peut rien faire seul, et nous croyons à
 * un candidat qui ne donne pas suite. C'était la fiche DEM-01.
 *
 * L'API dit si l'email est **parti** (`delivered`). On le répète tel quel :
 * un échec silencieux est exactement ce qu'on cherche à ne plus reproduire.
 */
function LienConnexion({ userId, email }: { userId: string; email: string | null }) {
  const renvoyer = useResendInvitation();
  const r = renvoyer.data;

  return (
    <div className="hairline mt-4 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-navy">
            <Mail className="h-3.5 w-3.5 text-ink-soft" aria-hidden /> Lien de
            connexion
          </p>
          <p className="mt-0.5 max-w-prose text-[11px] leading-relaxed text-ink-soft">
            Son compte s&apos;ouvre par un lien reçu par email, jamais par un mot
            de passe. S&apos;il ne l&apos;a pas reçu, il ne peut rien faire seul.
          </p>
        </div>
        <button
          type="button"
          onClick={() => renvoyer.mutate(userId)}
          disabled={renvoyer.isPending}
          className="btn btn-outline btn-sm shrink-0"
        >
          {renvoyer.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Send className="h-3.5 w-3.5" aria-hidden />
          )}
          Renvoyer le lien
        </button>
      </div>

      {r && (
        <p
          className={cn(
            "mt-2 flex items-start gap-1.5 text-[12px] leading-relaxed",
            r.delivered ? "text-success" : "text-danger",
          )}
        >
          {r.delivered ? (
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : (
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          )}
          {r.delivered
            ? `Lien envoyé à ${r.sentTo}${
                r.expiresAt
                  ? `, valable jusqu'au ${new Date(r.expiresAt).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : ""
              }.`
            : `L'email n'est pas parti vers ${r.sentTo || (email ?? "son adresse")}. Le service d'envoi est muet : prévenez l'équipe technique plutôt que de réessayer.`}
        </p>
      )}
      {renvoyer.isError && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-[12px] text-danger">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {adminErrorMessage(renvoyer.error)}
        </p>
      )}
    </div>
  );
}

/* ── Les statuts SAP instruits par la maison ───────────────────────────────── */

/**
 * L'affiliation CRCESU et l'avance immédiate URSSAF.
 *
 * Ces deux statuts décident de ce qu'un client peut utiliser pour payer. Ils
 * s'obtiennent auprès du CRCESU et de l'URSSAF, pas chez nous : la console ne
 * fait que **noter la réponse** reçue. L'espace du batch cooker les affiche en
 * lecture seule et renvoie à l'équipe — c'est ici que l'équipe répond.
 *
 * Les deux statuts se relisent depuis le 24/10 : la fiche ouvre donc sur leur
 * valeur courante, au lieu d'un « ne pas changer » qui obligeait à se
 * rappeler ce qu'on avait noté la fois d'avant.
 */
function StatutsSap({
  chefProfileId,
  crcesuActuel,
  urssafActuel,
}: {
  chefProfileId: string;
  crcesuActuel?: SapExternalStatus | null;
  urssafActuel?: SapExternalStatus | null;
}) {
  const save = useSetSapExternalStatus(chefProfileId);
  const [crcesu, setCrcesu] = useState<SapExternalStatus>(
    crcesuActuel ?? "not_started",
  );
  const [urssaf, setUrssaf] = useState<SapExternalStatus>(
    urssafActuel ?? "not_started",
  );

  const rien =
    crcesu === (crcesuActuel ?? "not_started") &&
    urssaf === (urssafActuel ?? "not_started");

  return (
    <div className="hairline mt-4 border-t pt-4">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-navy">
        <ShieldCheck className="h-3.5 w-3.5 text-ink-soft" aria-hidden /> Affiliation
        CESU et avance immédiate
      </p>
      <p className="mt-0.5 max-w-prose text-[11px] leading-relaxed text-ink-soft">
        Notez ici ce que le CRCESU et l&apos;URSSAF ont répondu. Ces deux statuts
        décident de ce qu&apos;un client peut utiliser pour le payer, et son
        espace les affiche sans pouvoir les changer.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="min-w-44 flex-1">
          <span className="field-label">Affiliation CRCESU</span>
          <select
            value={crcesu}
            onChange={(e) => setCrcesu(e.target.value as SapExternalStatus)}
            className="input-base"
          >
            {SAP_EXTERNAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SAP_EXTERNAL_LABEL[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-44 flex-1">
          <span className="field-label">Avance immédiate URSSAF</span>
          <select
            value={urssaf}
            onChange={(e) => setUrssaf(e.target.value as SapExternalStatus)}
            className="input-base"
          >
            {SAP_EXTERNAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SAP_EXTERNAL_LABEL[s]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() =>
            save.mutate({
              crcesuAffiliationStatus: crcesu,
              urssafTiersPrestationStatus: urssaf,
            })
          }
          disabled={rien || save.isPending}
          className="btn btn-primary btn-sm"
        >
          {save.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden />
          )}
          Enregistrer
        </button>
      </div>

      {save.isSuccess && (
        <p className="mt-2 flex items-start gap-1.5 text-[12px] text-success">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Statuts enregistrés. Son espace les affiche désormais.
        </p>
      )}
      {save.isError && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-[12px] text-danger">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {adminErrorMessage(save.error)}
        </p>
      )}
      <p className="mt-2 max-w-prose text-[11px] leading-relaxed text-ink-soft">
        Ces deux statuts ne disent pas si le batch cooker <em>accepte</em> le
        CESU — ça, c&apos;est son choix, dans son espace Rémunération. Ils
        disent si le CRCESU et l&apos;URSSAF l&apos;ont habilité. Les deux
        doivent être réunis pour qu&apos;un client puisse le payer ainsi.
      </p>
    </div>
  );
}

/** Le palier du batch cooker (module Recettes, R34). Ses noms se règlent dans Paramètres. */
function Palier({ chefProfileId, actuel }: { chefProfileId: string; actuel: ChefTier }) {
  const save = useSetChefTier(chefProfileId);
  const noms = useChefTierNames();
  const [tier, setTier] = useState<ChefTier>(actuel);
  const nom = (t: ChefTier) =>
    noms.data?.labels[t] ?? `Palier ${CHEF_TIERS.indexOf(t) + 1}`;

  return (
    <div className="hairline mt-4 border-t pt-4">
      <p className="flex items-center gap-1 text-[13px] font-semibold text-navy">
        Palier
        <InfoPopover label="À quoi sert le palier ?">
          Le batch cooker voit ce nom dans son espace. Aucune facturation et aucune
          règle de publication n&apos;en dépendent encore. Chaque changement est
          tracé dans le journal d&apos;audit.
        </InfoPopover>
      </p>

      <div className="mt-2 flex flex-wrap items-end gap-3">
        <label className="min-w-44 flex-1">
          <span className="sr-only">Palier du batch cooker</span>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as ChefTier)}
            className="input-base"
          >
            {CHEF_TIERS.map((t) => (
              <option key={t} value={t}>
                {nom(t)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => save.mutate(tier)}
          disabled={tier === actuel || save.isPending}
          className="btn btn-primary btn-sm"
        >
          {save.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden />
          )}
          Enregistrer
        </button>
      </div>

      {save.isSuccess && tier === actuel && (
        <p className="mt-2 flex items-start gap-1.5 text-[12px] text-success">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Palier enregistré : {nom(actuel)}.
        </p>
      )}
      {save.isError && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-[12px] text-danger">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {adminErrorMessage(save.error)}
        </p>
      )}
    </div>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h3 className="font-display text-base font-bold text-navy">{titre}</h3>
      <dl className="hairline mt-3 space-y-2 border-t pt-3">{children}</dl>
    </section>
  );
}

function Ligne({
  label,
  valeur,
  mono,
}: {
  label: string;
  valeur?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-sm">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={cn("text-right text-navy", mono && "font-mono text-[13px]")}>
        {valeur || <span className="text-ink-soft">Non renseigné</span>}
      </dd>
    </div>
  );
}
