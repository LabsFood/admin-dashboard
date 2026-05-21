"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import Logo from "@/components/admin/Logo";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isAuthenticated, isReady } = useAuth();
  const [email, setEmail] = useState("admin@labsfood.fr");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isReady && isAuthenticated) router.replace("/");
  }, [isReady, isAuthenticated, router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = signIn(email, password);
    if (!res.ok) {
      setError(res.error ?? "Connexion impossible.");
      setLoading(false);
      return;
    }
    setTimeout(() => router.replace("/"), 400);
  };

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

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@labsfood.fr"
                  className="input-base pl-10"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-base px-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-soft hover:text-navy"
                >
                  {showPwd ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-xs font-medium text-danger">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-ink-mid">
                <input type="checkbox" defaultChecked className="accent-terra" />
                Se souvenir de moi
              </label>
              <button
                type="button"
                className="font-semibold text-terra hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full disabled:opacity-60"
            >
              {loading ? "Connexion…" : "Se connecter"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-dashed border-terra/35 bg-terra-pale/30 px-4 py-3">
            <p className="text-xs leading-relaxed text-ink-mid">
              <span className="font-semibold text-navy">Démo —</span> n&apos;importe
              quel email et mot de passe non vides ouvrent la console.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
