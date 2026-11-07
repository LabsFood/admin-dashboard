"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export default function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Rendu dans <body> : monté sous un parent à `backdrop-filter` (la Topbar,
  // sticky et floutée), `fixed inset-0` se mesurait sur ce parent et non sur
  // l'écran — voile tronqué, contenu écrasé sous le pied du tiroir.
  const isClient = useSyncExternalStore(subscribeNothing, () => true, () => false);
  if (!isClient) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-navy/40 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="relative flex h-full w-full max-w-md flex-col bg-cream-soft shadow-[0_0_80px_-20px_rgba(0,35,75,0.6)]"
          >
            <header className="flex items-start justify-between gap-4 border-b border-[rgba(0,35,75,0.08)] bg-paper px-5 py-4">
              <div className="min-w-0">
                {eyebrow && (
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-terra">
                    {eyebrow}
                  </p>
                )}
                {title && (
                  <h2 className="mt-0.5 font-display text-lg font-bold leading-tight text-navy">
                    {title}
                  </h2>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Fermer"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-cream-deep hover:text-navy"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="scroll-thin flex-1 overflow-y-auto px-5 py-5">
              {children}
            </div>

            {footer && (
              <footer className="border-t border-[rgba(0,35,75,0.08)] bg-paper px-5 py-4">
                {footer}
              </footer>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

const subscribeNothing = () => () => {};
