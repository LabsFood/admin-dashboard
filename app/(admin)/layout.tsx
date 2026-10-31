"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ShieldAlert, RotateCw, LogOut, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMe } from "@/lib/api/me";
import { ApiError } from "@/lib/api/client";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import MobileNav from "@/components/admin/MobileNav";
import Splash from "@/components/admin/Splash";
import { useTooLong } from "@/lib/use-too-long";
import AdminSignals from "@/components/admin/AdminSignals";
import { useAdminMessagingSocket } from "@/lib/api/messaging";

/**
 * Le site de batch cooking et ses deux espaces connectés — à ne pas confondre
 * avec `NEXT_PUBLIC_SITE_URL`, qui désigne cette console. Une seule session
 * Clerk sert les deux applications : y renvoyer quelqu'un suffit, il y est
 * déjà connecté.
 */
const BATCHCOOKING_URL =
  process.env.NEXT_PUBLIC_BATCHCOOKING_URL ?? "https://batchcooking.labsfood.fr";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isReady, signOut, hardSignOut } = useAuth();
  const me = useMe();
  const router = useRouter();

  const role = me.data?.role;
  const isAdmin = role === "admin";

  useEffect(() => {
    if (!isReady) return;
    // On ne redirige vers /login QUE si Clerk lui-même n'a pas de session.
    // Un 401 de l'API alors que Clerk est connecté ne doit PAS rediriger :
    // la page de login renverrait aussitôt ici (session Clerk active) → boucle.
    if (!isAuthenticated) router.replace("/login");
  }, [isReady, isAuthenticated, router]);

  /*
   * Une attente peut ne jamais finir : onglet réveillé après des heures, token
   * que Clerk n'arrive pas à rafraîchir, requête qui se fige. L'écran de
   * chargement promettait alors quelque chose qui n'arrivait pas, sans aucune
   * sortie. On met une limite à la patience.
   *
   * `me.isPending` vaut aussi `true` quand la requête est **désactivée**
   * (Clerk pas encore prêt) : c'est pourquoi la condition la teste en dernier,
   * une fois la session connue.
   */
  const attente = !isReady || !isAuthenticated || me.isPending;
  const tropLong = useTooLong(attente, 12_000);

  if (attente && !tropLong) {
    return <Splash label="Chargement de la console…" />;
  }

  if (attente && tropLong) {
    return (
      <FullscreenState
        Icon={Clock}
        label="La console met trop de temps à répondre"
        detail="Votre session a peut-être expiré pendant que l'onglet dormait. Reconnectez-vous : c'est le plus sûr."
        actions={
          <>
            <button onClick={hardSignOut} className="btn btn-navy">
              <LogOut className="h-4 w-4" /> Se reconnecter
            </button>
            <button onClick={() => window.location.reload()} className="btn btn-outline">
              <RotateCw className="h-4 w-4" /> Recharger
            </button>
          </>
        }
      />
    );
  }

  // ── Erreur API (401 token rejeté, 503, réseau…) : état terminal, pas de
  //    redirection — sinon boucle avec la page de login. Sortie = se déconnecter.
  if (me.isError) {
    const code = me.error instanceof ApiError ? me.error.status : null;
    const expiree = code === 401;
    const injoignable = code === 0;
    return (
      <FullscreenState
        Icon={expiree ? Clock : ShieldAlert}
        label={
          expiree
            ? "Votre session a expiré"
            : injoignable
              ? "L'API ne répond pas"
              : "Impossible de vérifier votre accès"
        }
        detail={
          expiree
            ? "L'API a refusé votre jeton de session. Reconnectez-vous, cela suffit presque toujours."
            : injoignable
              ? "La requête n'a pas abouti dans le temps imparti. Vérifiez votre connexion, puis réessayez."
              : me.error instanceof ApiError
                ? me.error.message
                : "Le service est momentanément indisponible."
        }
        actions={
          <>
            <button
              onClick={expiree || injoignable ? hardSignOut : signOut}
              className="btn btn-navy"
            >
              <LogOut className="h-4 w-4" />
              {expiree ? "Se reconnecter" : "Se déconnecter"}
            </button>
            <button onClick={() => me.refetch()} className="btn btn-outline">
              <RotateCw className="h-4 w-4" /> Réessayer
            </button>
          </>
        }
      />
    );
  }

  /*
   * ── Rôle non admin ──────────────────────────────────────────────────────
   *
   * Cet écran déconnectait, puis renvoyait au login. Un batch cooker qui
   * ouvrait l'URL de la console par erreur — un lien, un favori, une faute de
   * frappe — perdait donc la session de **son propre espace** : la session
   * Clerk est la même pour les deux sites. Il s'était trompé de porte, et on
   * lui prenait ses clés.
   *
   * On lui dit où aller, et on ne touche à rien. Changer de compte reste
   * possible, mais c'est son geste, pas le nôtre.
   */
  if (!isAdmin) {
    return (
      <FullscreenState
        Icon={ShieldAlert}
        label="Cette console est réservée à l'administration"
        detail={
          role === "chef"
            ? "Votre espace batch cooker est sur le site, pas ici. Vous y êtes déjà connecté."
            : role === "client"
              ? "Votre espace client est sur le site, pas ici. Vous y êtes déjà connecté."
              : "Ce compte n'a pas accès à la console."
        }
        actions={
          <>
            <a href={BATCHCOOKING_URL} className="btn btn-navy">
              <ArrowUpRight className="h-4 w-4" /> Aller sur le site
            </a>
            <button onClick={signOut} className="btn btn-outline">
              <LogOut className="h-4 w-4" /> Changer de compte
            </button>
          </>
        }
      />
    );
  }

  return (
    <AdminSignals>
      <MessagingRealtime />
      <div className="flex min-h-screen bg-cream">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:pb-10">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </AdminSignals>
  );
}

/** Écoute temps réel de la messagerie, une fois la console ouverte à un admin. */
function MessagingRealtime() {
  useAdminMessagingSocket();
  return null;
}

/** État terminal d'erreur (accès non vérifiable) — le chargement passe par `Splash`. */
function FullscreenState({
  Icon = ShieldAlert,
  label,
  detail,
  actions,
}: {
  Icon?: typeof ShieldAlert;
  label: string;
  detail?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
          <Icon className="h-6 w-6" />
        </span>
        <p className="font-display text-lg font-bold text-navy">{label}</p>
        {detail && <p className="text-sm text-ink-mid">{detail}</p>}
        {actions && <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
