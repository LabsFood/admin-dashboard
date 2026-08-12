"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, ShieldAlert, RotateCw, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMe } from "@/lib/api/me";
import { ApiError } from "@/lib/api/client";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import MobileNav from "@/components/admin/MobileNav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isReady, signOut } = useAuth();
  const me = useMe();
  const router = useRouter();

  const role = me.data?.role;
  const isAdmin = role === "admin";

  useEffect(() => {
    if (!isReady) return;
    // On ne redirige vers /login QUE si Clerk lui-même n'a pas de session.
    // Un 401 de l'API alors que Clerk est connecté ne doit PAS rediriger :
    // la page de login renverrait aussitôt ici (session Clerk active) → boucle.
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    // Rôle résolu et non admin → compte sans accès console.
    if (me.isSuccess && !isAdmin) {
      signOut();
      router.replace("/login?error=forbidden");
    }
  }, [isReady, isAuthenticated, me.isSuccess, isAdmin, signOut, router]);

  // ── Chargement (Clerk ou /me en cours) ───────────────────────────────────
  if (!isReady || !isAuthenticated || me.isPending) {
    return <FullscreenState label="Chargement de la console…" />;
  }

  // ── Erreur API (401 token rejeté, 503, réseau…) : état terminal, pas de
  //    redirection — sinon boucle avec la page de login. Sortie = se déconnecter.
  if (me.isError) {
    const is401 = me.error instanceof ApiError && me.error.status === 401;
    return (
      <FullscreenState
        variant="error"
        label={
          is401
            ? "Session non reconnue par l'API"
            : "Impossible de vérifier votre accès."
        }
        detail={
          is401
            ? "Tu es connecté à Clerk, mais l'API a refusé le token (401). Déconnecte-toi et reconnecte-toi ; si le problème persiste, c'est la validation du token côté backend qu'il faut corriger."
            : me.error instanceof ApiError
              ? me.error.message
              : "Le service est momentanément indisponible."
        }
        actions={
          <>
            <button onClick={signOut} className="btn btn-navy">
              <LogOut className="h-4 w-4" /> Se déconnecter
            </button>
            <button onClick={() => me.refetch()} className="btn btn-outline">
              <RotateCw className="h-4 w-4" /> Réessayer
            </button>
          </>
        }
      />
    );
  }

  // ── Rôle non admin (redirection en cours via l'effet) ────────────────────
  if (!isAdmin) {
    return <FullscreenState label="Redirection…" />;
  }

  return (
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
  );
}

function FullscreenState({
  label,
  detail,
  variant = "loading",
  actions,
}: {
  label: string;
  detail?: string;
  variant?: "loading" | "error";
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <span
          className={
            variant === "error"
              ? "flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-soft text-danger"
              : "flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-navy text-white"
          }
        >
          {variant === "error" ? (
            <ShieldAlert className="h-6 w-6" />
          ) : (
            <ChefHat className="h-6 w-6" />
          )}
        </span>
        <p
          className={
            variant === "error"
              ? "font-display text-lg font-bold text-navy"
              : "font-mono text-xs uppercase tracking-[0.2em] text-ink-soft"
          }
        >
          {label}
        </p>
        {detail && <p className="text-sm text-ink-mid">{detail}</p>}
        {actions && <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
