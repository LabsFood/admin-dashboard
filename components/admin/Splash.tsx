"use client";

import { motion, useReducedMotion } from "framer-motion";

/* ─────────────────────────────────────────────────────────────────────────────
   Écran de chargement plein écran de la console (garde d'accès du layout admin).

   Marque plutôt qu'icône générique : logo Lab's Food, anneau de progression
   indéterminé et barre de scan. L'animation est neutralisée si le système
   demande `prefers-reduced-motion`.
   ───────────────────────────────────────────────────────────────────────────── */

export default function Splash({ label }: { label: string }) {
  const still = useReducedMotion();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cream px-6">
      {/* Halos d'ambiance */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-terra/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-navy/5 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative flex flex-col items-center text-center"
      >
        {/* Logo + anneau */}
        <div className="relative flex h-28 w-28 items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 h-full w-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-navy/10"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-terra"
              style={{ transformOrigin: "50% 50%" }}
              animate={
                still
                  ? { strokeDasharray: "90 200", rotate: 0 }
                  : {
                      strokeDasharray: ["18 271", "150 139", "18 271"],
                      rotate: [0, 180, 360],
                    }
              }
              transition={{
                duration: 1.9,
                ease: "easeInOut",
                repeat: still ? 0 : Infinity,
              }}
            />
          </svg>

          <motion.span
            animate={still ? undefined : { scale: [1, 1.05, 1] }}
            transition={{ duration: 1.9, ease: "easeInOut", repeat: Infinity }}
            className="flex h-[74px] w-[74px] items-center justify-center p-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/LogoOrange.png"
              alt="Lab's Food"
              className="h-full w-full object-contain"
            />
          </motion.span>
        </div>

        {/* Marque */}
        <p className="mt-5 font-display text-2xl font-bold tracking-tight text-navy">
          Lab&apos;s Food
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.24em] text-ink-soft">
          Console admin
        </p>

        {/* Barre indéterminée */}
        <div className="mt-6 h-[3px] w-36 overflow-hidden rounded-full bg-navy/10">
          <motion.div
            className="h-full w-1/3 rounded-full bg-terra"
            animate={still ? { x: "100%" } : { x: ["-120%", "320%"] }}
            transition={{
              duration: 1.4,
              ease: "easeInOut",
              repeat: still ? 0 : Infinity,
            }}
          />
        </div>

        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          {label}
        </p>
      </motion.div>
    </div>
  );
}
