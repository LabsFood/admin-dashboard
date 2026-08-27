"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { SignIn } from "@clerk/nextjs";
import Logo from "@/components/admin/Logo";
import { clerkAuthAppearance } from "@/lib/clerk-appearance";
import { cn } from "@/lib/utils";

/* Bols de nourriture décoratifs qui flottent autour de la carte (desktop only).
   Images Unsplash chargées en <img> simple (pas de config next/image requise). */
const FOOD = [
  {
    src: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=440&h=440&q=80&auto=format&fit=crop",
    pos: "left-[3%] top-[14%]",
    size: "h-44 w-44",
    rotate: -6,
  },
  {
    src: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=460&h=460&q=80&auto=format&fit=crop",
    pos: "right-[5%] top-[9%]",
    size: "h-48 w-48",
    rotate: 5,
  },
  {
    src: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=420&h=420&q=80&auto=format&fit=crop",
    pos: "right-[3%] bottom-[13%]",
    size: "h-40 w-40",
    rotate: -4,
  },
  {
    src: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=460&h=460&q=80&auto=format&fit=crop",
    pos: "left-[6%] bottom-[10%]",
    size: "h-48 w-48",
    rotate: 7,
  },
] as const;

function LoginInner() {
  const params = useSearchParams();
  const forbidden = params.get("error") === "forbidden";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-cream-soft via-paper to-cream px-4 py-12">
      {/* Halos colorés diffus */}
      <div className="pointer-events-none absolute -left-40 top-0 h-[28rem] w-[28rem] rounded-full bg-terra/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[30rem] w-[30rem] rounded-full bg-teal-soft/10 blur-3xl" />

      {/* Mot filigrane */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-[6%] select-none font-display text-[22vw] font-bold leading-none text-navy/[0.045]"
      >
        Login
      </span>

      {/* Bols de nourriture flottants */}
      {FOOD.map((item, i) => (
        <motion.div
          key={item.src}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1, rotate: item.rotate }}
          transition={{ duration: 0.55, delay: 0.15 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "absolute hidden overflow-hidden rounded-full ring-[6px] ring-white/70 shadow-[0_28px_60px_-20px_rgba(0,35,75,0.45)] md:block",
            item.pos,
            item.size,
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.src} alt="" className="h-full w-full object-cover" />
        </motion.div>
      ))}

      {/* Carte de connexion */}
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10  border border-white/60 bg-white/90 p-8 shadow-[0_40px_100px_-30px_rgba(0,35,75,0.4)] backdrop-blur-md sm:p-10"
      >
        <div className="mb-7 flex justify-center">
          <Logo />
        </div>

        <h1 className="text-center font-display text-3xl font-bold text-navy">
          Bon retour
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-ink-mid">
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

        <div className="mt-7">
          <SignIn
            appearance={clerkAuthAppearance}
            signInUrl="/login"
            forceRedirectUrl="/"
          />
        </div>
      </motion.div>

      {/* Pied de page */}
      <p className="absolute bottom-5 left-0 right-0 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft/70">
        Lab&apos;s Food · Console · {new Date().getFullYear()}
      </p>
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
