"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   Le retour d'action de la console.

   Règle tenue partout : **une erreur reste jusqu'à ce qu'on la ferme**, une
   réussite s'efface seule au bout de cinq secondes. Un admin qui suspend un
   plat et quitte l'écran ne doit pas apprendre l'échec par hasard, trois
   minutes plus tard, en se demandant pourquoi le plat est toujours en ligne.
   ───────────────────────────────────────────────────────────────────────────── */

type Kind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: Kind;
  title: string;
  detail?: string;
}

interface ToastApi {
  success: (title: string, detail?: string) => void;
  error: (title: string, detail?: string) => void;
  info: (title: string, detail?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Hors provider, les appels ne jettent pas : ils ne font rien. */
const NOOP: ToastApi = { success: () => {}, error: () => {}, info: () => {} };

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP;
}

const SUCCESS_MS = 5_000;

export default function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: Kind, title: string, detail?: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { id, kind, title, detail }]);
      if (kind !== "error") {
        setTimeout(() => dismiss(id), SUCCESS_MS);
      }
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, detail) => push("success", title, detail),
      error: (title, detail) => push("error", title, detail),
      info: (title, detail) => push("info", title, detail),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        // `aria-live` sur le conteneur, pas sur chaque message : un lecteur
        // d'écran annonce ainsi les messages qui arrivent, dans l'ordre.
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

const STYLE: Record<Kind, { Icon: typeof Info; bar: string; icon: string }> = {
  success: { Icon: CheckCircle2, bar: "bg-success", icon: "text-success" },
  error: { Icon: AlertTriangle, bar: "bg-danger", icon: "text-danger" },
  info: { Icon: Info, bar: "bg-info", icon: "text-info" },
};

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const { Icon, bar, icon } = STYLE[toast.kind];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
      transition={{ type: "spring", damping: 26, stiffness: 340 }}
      role={toast.kind === "error" ? "alert" : "status"}
      className="pointer-events-auto flex overflow-hidden rounded-lg bg-paper shadow-[0_12px_32px_-12px_rgba(0,35,75,0.35)] ring-1 ring-[rgba(0,35,75,0.1)]"
    >
      <span aria-hidden className={cn("w-1 shrink-0", bar)} />
      <div className="flex min-w-0 flex-1 items-start gap-2.5 px-3.5 py-3">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", icon)} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug text-navy">
            {toast.title}
          </p>
          {toast.detail && (
            <p className="mt-0.5 text-xs leading-relaxed text-ink-mid">
              {toast.detail}
            </p>
          )}
        </div>
        <button
          onClick={onDismiss}
          aria-label="Fermer"
          className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-cream-soft hover:text-navy"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
