"use client";

import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  Info,
  LayoutList,
  ShieldCheck,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import {
  CommandPaletteProvider,
  type PaletteItem,
} from "@/components/ui/CommandPalette";
import { cn, initials } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";
import { countryLabel } from "@/lib/countries";
import { catalogLabel } from "@/lib/catalog-labels";
import { useChefApplications, useClients } from "@/lib/api/admin";
import { useLabsFoodMenus, useMeals } from "@/lib/api/catalog";
import { useReviewQueue } from "@/lib/api/moderation";
import { rowToClientView } from "@/lib/api/adapt";
import { centimes } from "@/lib/api/money";
import { usePayoutsSummary } from "@/lib/api/payouts";

/* ─────────────────────────────────────────────────────────────────────────────
   Ce que la barre du haut de la console sait dire.

   La recherche charge ses sources à l'ouverture seulement — la console a
   beaucoup de listes, les charger toutes sur chaque page pour un champ qu'on
   n'ouvre pas serait absurde. Les deux compteurs de la cloche, eux, sont
   permanents : ils tiennent dans une ligne de méta chacun, et ce sont
   justement eux qui disent s'il y a du travail.
   ───────────────────────────────────────────────────────────────────────────── */

/* ── La recherche ──────────────────────────────────────────────────────────── */

function useAdminPaletteItems(actif: boolean): {
  items: PaletteItem[];
  loading: boolean;
} {
  const clients = useClients({ limit: 100, enabled: actif });
  const candidatures = useChefApplications({ limit: 100, enabled: actif });
  const meals = useMeals({ enabled: actif });
  const menus = useLabsFoodMenus({ enabled: actif });
  const file = useReviewQueue({ review: "pending", limit: 50, enabled: actif });

  const items = useMemo(() => {
    const out: PaletteItem[] = NAV_ITEMS.map((n) => ({
      id: `page:${n.href}`,
      label: n.label,
      group: "Aller à",
      href: n.href,
      Icon: n.Icon,
      keywords: `${n.eyebrow ?? ""} ${n.subtitle}`,
    }));

    for (const c of candidatures.data?.data ?? []) {
      out.push({
        id: `cand:${c.id}`,
        label: c.name || c.reference,
        hint: c.reference,
        group: "Candidatures",
        href: `/candidatures/${c.id}`,
        Icon: ShieldCheck,
        keywords: `${c.city ?? ""} ${c.status} candidature batch cooker`,
      });
    }

    for (const ligne of clients.data?.data ?? []) {
      const c = rowToClientView(ligne);
      out.push({
        id: `client:${c.id ?? c.userId}`,
        label: c.name,
        // Sans profil, on le dit : la fiche n'existe pas encore, et la
        // recherche mène à la liste des comptes plutôt qu'à un 404.
        hint: c.hasProfile ? (c.city ?? undefined) : "profil non renseigné",
        group: "Clients",
        href: c.id ? `/clients/${c.id}` : "/utilisateurs",
        Icon: Users,
        keywords: `${c.email} ${initials(c.name)} client`,
      });
    }

    for (const m of meals.data ?? []) {
      out.push({
        id: `meal:${m.id}`,
        label: m.name,
        hint: catalogLabel[m.status],
        group: "Plats Lab's Food",
        href: `/menus/nouveau?id=${m.id}`,
        Icon: UtensilsCrossed,
        keywords: `${countryLabel(m.country)} ${m.category ?? ""} plat recette`,
      });
    }

    for (const m of menus.data ?? []) {
      out.push({
        id: `lfmenu:${m.id}`,
        label: m.title,
        hint: catalogLabel[m.status],
        group: "Menus Lab's Food",
        href: `/menus/composer?menu=${m.id}`,
        Icon: LayoutList,
        keywords: m.pitch ?? "",
      });
    }

    for (const it of file.data?.items ?? []) {
      out.push({
        id: `mod:${it.kind}:${it.id}`,
        label: it.name,
        hint: it.chefName ?? "à relire",
        group: "À relire",
        href: "/moderation",
        Icon: ShieldCheck,
        keywords: `moderation relecture ${it.kind} ${it.chefName ?? ""}`,
      });
    }

    return out;
  }, [clients.data, candidatures.data, meals.data, menus.data, file.data]);

  return {
    items,
    loading:
      actif &&
      (clients.isLoading ||
        candidatures.isLoading ||
        meals.isLoading ||
        menus.isLoading ||
        file.isLoading),
  };
}

export default function AdminSignals({ children }: { children: ReactNode }) {
  return (
    <CommandPaletteProvider
      useItems={useAdminPaletteItems}
      placeholder="Un écran, un client, une candidature, un plat…"
    >
      {children}
    </CommandPaletteProvider>
  );
}

/* ── La cloche ─────────────────────────────────────────────────────────────── */

type Tone = "urgent" | "todo" | "info";

interface Alerte {
  id: string;
  tone: Tone;
  title: string;
  detail?: string;
  href?: string;
  cta?: string;
}

const TONES: Record<Tone, { Icon: typeof Info; texte: string; fond: string; bord: string }> = {
  urgent: {
    Icon: AlertTriangle,
    texte: "text-danger",
    fond: "bg-danger-soft",
    bord: "border-danger/25",
  },
  todo: {
    Icon: Clock,
    texte: "text-[#8A6212]",
    fond: "bg-warning-soft",
    bord: "border-warning/35",
  },
  info: {
    Icon: Info,
    texte: "text-ink-mid",
    fond: "bg-cream-soft",
    bord: "border-[rgba(0,35,75,0.08)]",
  },
};

/**
 * Deux files, et elles suffisent : ce qui attend une décision et ce qui attend
 * une relecture. Le reste de la console se consulte, il ne s'accumule pas.
 */
function useAdminAlerts() {
  // `limit: 1` : on ne veut que `meta.total`, pas les lignes.
  const aDecider = useChefApplications({ status: "submitted", limit: 1 });
  const aCompleter = useChefApplications({ hasPendingDocuments: true, limit: 1 });
  const aRelire = useReviewQueue({ review: "pending", limit: 1 });
  // Les versements dus : la cloche se relit toutes les 5 minutes, sans recharger la page.
  const versements = usePayoutsSummary({ refetchInterval: 5 * 60_000 });

  const alerts = useMemo(() => {
    const out: Alerte[] = [];

    const v = versements.data;
    if (v && v.lateChefs > 0) {
      out.push({
        id: "payouts:late",
        tone: "urgent",
        title: `${v.lateChefs} versement${v.lateChefs > 1 ? "s" : ""} en retard`,
        detail: `${centimes(v.lateCents)} reçus depuis plus de 2 jours ouvrés et pas encore versés.`,
        href: "/transactions?volet=versements",
        cta: "Verser",
      });
    }
    if (v && v.payableChefs > 0) {
      out.push({
        id: "payouts:payable",
        tone: "todo",
        title: `${v.payableChefs} batch cooker${v.payableChefs > 1 ? "s" : ""} à verser · ${centimes(v.payableCents)}`,
        detail: "Argent reçu et rapproché, versement pas encore fait.",
        href: "/transactions?volet=versements",
        cta: "Ouvrir les versements",
      });
    }

    const nDecider = aDecider.data?.meta?.total ?? 0;
    if (nDecider > 0) {
      out.push({
        id: "cand:submitted",
        tone: nDecider > 5 ? "urgent" : "todo",
        title: `${nDecider} candidature${nDecider > 1 ? "s" : ""} attend${nDecider > 1 ? "ent" : ""} une décision`,
        detail:
          "La file est rangée du dossier le plus ancien au plus récent : commencez par le haut.",
        href: "/batchcookers?vue=candidatures",
        cta: "Ouvrir la file",
      });
    }

    const nPieces = aCompleter.data?.meta?.total ?? 0;
    if (nPieces > 0) {
      out.push({
        id: "cand:pending-docs",
        tone: "todo",
        title: `${nPieces} dossier${nPieces > 1 ? "s" : ""} avec des pièces à vérifier`,
        detail:
          "Des pièces ont été déposées et personne ne les a encore validées ni refusées.",
        href: "/batchcookers?vue=candidatures",
        cta: "Vérifier les pièces",
      });
    }

    const nRelire = aRelire.data?.meta?.total ?? 0;
    if (nRelire > 0) {
      out.push({
        id: "moderation:pending",
        tone: nRelire > 20 ? "urgent" : "todo",
        title: `${nRelire} publication${nRelire > 1 ? "s" : ""} à relire`,
        detail:
          "Des plats et des menus sont en ligne sans que personne les ait regardés.",
        href: "/moderation",
        cta: "Relire",
      });
    }

    return out;
  }, [aDecider.data, aCompleter.data, aRelire.data, versements.data]);

  return {
    alerts,
    loading: aDecider.isPending || aCompleter.isPending || aRelire.isPending,
    enPanne: aDecider.isError && aCompleter.isError && aRelire.isError,
  };
}

export function AdminAlertBell() {
  const [open, setOpen] = useState(false);
  const { alerts, loading, enPanne } = useAdminAlerts();
  const n = alerts.filter((a) => a.tone !== "info").length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={
          loading
            ? "Notifications"
            : n > 0
              ? `Notifications : ${n} à traiter`
              : "Notifications : rien à traiter"
        }
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(0,35,75,0.1)] bg-paper text-navy transition-colors hover:border-terra"
      >
        <Bell className="h-4 w-4" aria-hidden />
        {!loading && n > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 tabular-nums text-[9px] font-bold text-white">
            {n > 9 ? "9+" : n}
          </span>
        )}
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Console"
        title="À traiter"
        footer={
          <p className="text-xs leading-relaxed text-ink-soft">
            Ces files sont comptées à chaque ouverture, depuis les candidatures
            et la file de relecture. Le journal des notifications — qui a fait
            quoi, et quand — attend son endpoint côté API.
          </p>
        }
      >
        {loading ? (
          <SkeletonGroup className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 rounded-md" />
            ))}
          </SkeletonGroup>
        ) : enPanne ? (
          <p className="flex items-start gap-2 rounded-md bg-danger-soft p-3.5 text-[13px] leading-relaxed text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Les files ne répondent pas. Tant que l&apos;API est injoignable, ce
            panneau ne peut rien affirmer.
          </p>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-success-soft text-success">
              <CheckCircle2 className="h-6 w-6" aria-hidden />
            </span>
            <p className="mt-4 font-display text-base font-bold text-navy">
              Les files sont vides
            </p>
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-ink-soft">
              Aucune candidature en attente, aucune publication à relire.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a) => {
              const t = TONES[a.tone];
              return (
                <li key={a.id}>
                  <Link
                    href={a.href ?? "#"}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-start gap-3 rounded-md border p-3.5 transition-colors hover:brightness-[0.98]",
                      t.fond,
                      t.bord,
                    )}
                  >
                    <t.Icon className={cn("mt-0.5 h-4 w-4 shrink-0", t.texte)} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug text-navy">
                        {a.title}
                      </span>
                      {a.detail && (
                        <span className="mt-0.5 block text-xs leading-relaxed text-ink-mid">
                          {a.detail}
                        </span>
                      )}
                      {a.cta && (
                        <span
                          className={cn(
                            "mt-2 inline-flex items-center gap-1 text-xs font-semibold",
                            t.texte,
                          )}
                        >
                          {a.cta}
                          <ArrowRight className="h-3 w-3" aria-hidden />
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Drawer>
    </>
  );
}
