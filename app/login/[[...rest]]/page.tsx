"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, Sparkles, ShieldAlert } from "lucide-react";
import { SignIn } from "@clerk/nextjs";
import Logo from "@/components/admin/Logo";
import { clerkAuthAppearance } from "@/lib/clerk-appearance";

function LoginInner() {
  const params = useSearchParams();
  const forbidden = params.get("error") === "forbidden";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ── Volet marque ───────────────────────────────────────────────── */}
      <div className="relative hidden overflow-hidden bg-navy lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-terra/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-teal-soft/30 blur-3xl" />

        <div className="relative">
          <Logo variant="light" />
        </div>

        <div className="relative">
          <span className="eyebrow text-terra-soft">Maison culinaire</span>
          <h1 className="mt-4 font-display text-5xl font-bold leading-[1.05] text-white">
            Pilote tout
            <br />
            <span className="text-terra-soft italic">en un seul endroit.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/65">
            Réservations batch cooking, demandes sur-mesure, clients, produits
            Kossam et site principal — la console réunit l&apos;activité
            complète de Lab&apos;s Food.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {[
              { Icon: Sparkles, label: "Batch cooking" },
              { Icon: ShieldCheck, label: "Données sécurisées" },
            ].map(({ Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3.5 py-1.5 text-xs text-white/75"
              >
                <Icon className="h-3.5 w-3.5 text-terra-soft" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <p className="relative font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
          Lab&apos;s Food · Côte d&apos;Azur · {new Date().getFullYear()}
        </p>
      </div>

      {/* ── Volet formulaire ───────────────────────────────────────────── */}
      <div className="flex items-center justify-center bg-cream px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <span className="eyebrow">Connexion</span>
          <h2 className="mt-3 font-display text-3xl font-bold text-navy">
            Bon retour 👋
          </h2>
          <p className="mt-1.5 text-sm text-ink-mid">
            Connecte-toi pour accéder à la console d&apos;administration.
          </p>

          {forbidden && (
            <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p className="text-xs leading-relaxed text-danger">
                Ce compte n&apos;a pas accès à la console d&apos;administration.
                Connecte-toi avec un compte administrateur.
              </p>
            </div>
          )}

          <div className="mt-8">
            <SignIn
              appearance={clerkAuthAppearance}
              signInUrl="/login"
              forceRedirectUrl="/"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
