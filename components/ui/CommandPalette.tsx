"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, Loader2, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   La recherche de la console.

   Un champ qui ne cherche rien promet pour rien. Celui-ci cherche les écrans de
   la console et les objets que l'API connaît : des clients, des candidatures,
   des plats, des menus, du contenu en attente de relecture.

   Ses sources ne se chargent **qu'à l'ouverture** : la console a beaucoup de
   listes, et il serait absurde de toutes les charger sur chaque page pour un
   champ que l'on n'ouvre pas. Le temps d'un aller-retour, la palette le dit.

   ⌘K ou Ctrl+K pour l'ouvrir, « / » quand on n'écrit pas ailleurs.
   ───────────────────────────────────────────────────────────────────────────── */

export interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  keywords?: string;
  group: string;
  href?: string;
  run?: () => void;
  Icon?: LucideIcon;
}

interface PaletteApi {
  open: () => void;
}

const PaletteContext = createContext<PaletteApi | null>(null);

export function usePalette(): PaletteApi {
  return useContext(PaletteContext) ?? { open: () => {} };
}

/** « Crème brûlée » doit se trouver en tapant « creme brulee ». */
function plat(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * `useItems` n'est appelé que quand la palette est ouverte : c'est ce qui
 * permet aux sources de ne rien charger le reste du temps.
 */
export function CommandPaletteProvider({
  useItems,
  placeholder,
  children,
}: {
  useItems: (actif: boolean) => { items: PaletteItem[]; loading: boolean };
  placeholder: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const api = useMemo<PaletteApi>(() => ({ open: () => setOpen(true) }), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Le remplissage auto de Chrome envoie des keydown sans `key`.
      if (typeof e.key !== "string") return;
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const el = document.activeElement;
        const ecrit =
          el instanceof HTMLElement &&
          (el.tagName === "INPUT" ||
            el.tagName === "TEXTAREA" ||
            el.tagName === "SELECT" ||
            el.isContentEditable);
        if (!ecrit) {
          e.preventDefault();
          setOpen(true);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <PaletteContext.Provider value={api}>
      {children}
      <Palette
        open={open}
        onClose={() => setOpen(false)}
        useItems={useItems}
        placeholder={placeholder}
      />
    </PaletteContext.Provider>
  );
}

function Palette({
  open,
  onClose,
  useItems,
  placeholder,
}: {
  open: boolean;
  onClose: () => void;
  useItems: (actif: boolean) => { items: PaletteItem[]; loading: boolean };
  placeholder: string;
}) {
  const router = useRouter();
  const { items, loading } = useItems(open);
  const [q, setQ] = useState("");
  const [choix, setChoix] = useState({ q: "", i: 0 });
  const listeRef = useRef<HTMLUListElement>(null);

  const terme = plat(q.trim());

  const trouves = useMemo(() => {
    if (!terme) return items.slice(0, 12);
    const mots = terme.split(/\s+/);
    const note = (it: PaletteItem) => {
      const foin = plat(
        `${it.label} ${it.hint ?? ""} ${it.keywords ?? ""} ${it.group}`,
      );
      if (!mots.every((m) => foin.includes(m))) return -1;
      const cible = plat(it.label);
      if (cible.startsWith(terme)) return 3;
      if (cible.includes(terme)) return 2;
      return 1;
    };
    return items
      .map((it) => [it, note(it)] as const)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([it]) => it);
  }, [items, terme]);

  const curseur =
    choix.q === q ? Math.min(choix.i, Math.max(trouves.length - 1, 0)) : 0;
  const bouger = useCallback(
    (f: (i: number) => number) =>
      setChoix((c) => ({ q, i: f(c.q === q ? c.i : 0) })),
    [q],
  );

  const choisir = useCallback(
    (it: PaletteItem | undefined) => {
      if (!it) return;
      onClose();
      setQ("");
      if (it.run) it.run();
      else if (it.href) router.push(it.href);
    },
    [onClose, router],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      bouger((i) => Math.min(i + 1, trouves.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      bouger((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choisir(trouves[curseur]);
    }
  }

  useEffect(() => {
    if (!open) return;
    const el = listeRef.current?.querySelector<HTMLElement>('[data-actif="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [curseur, open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const lignes = trouves.map((it, i) => ({
    it,
    i,
    entete: i === 0 || trouves[i - 1].group !== it.group,
  }));

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center">
          {/* mise en scène : on assombrit derrière, fondu de 180 ms */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-navy/45 backdrop-blur-[2px]"
          />
          {/* slow-out : la palette descend de 8 px et se pose en ~200 ms (ressort amorti) */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Rechercher"
            onKeyDown={onKeyDown}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="relative mt-[12vh] w-[calc(100vw-2rem)] max-w-xl overflow-hidden rounded-lg bg-paper shadow-[0_30px_80px_-20px_rgba(0,35,75,0.5)]"
          >
            <div className="hairline flex items-center gap-3 border-b px-4">
              <Search className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={placeholder}
                aria-label="Rechercher"
                className="h-14 flex-1 bg-transparent text-[15px] text-navy outline-none placeholder:text-ink-soft"
              />
              {loading && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-soft" aria-hidden />
              )}
              <kbd className="hidden shrink-0 rounded-sm bg-cream-soft px-1.5 py-1 font-mono text-xs text-ink-soft sm:block">
                Échap
              </kbd>
            </div>

            {trouves.length === 0 ? (
              <div className="px-5 py-8 text-center">
                {loading ? (
                  <p className="text-sm text-ink-soft">Lecture des listes…</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-navy">
                      Rien pour «&nbsp;{q.trim()}&nbsp;»
                    </p>
                    <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-ink-soft">
                      Cette recherche porte sur les écrans de la console, les
                      clients, les candidatures et le catalogue. Pas encore sur
                      les réservations.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <ul ref={listeRef} className="max-h-[52vh] overflow-y-auto p-2" role="listbox">
                {lignes.map(({ it, i, entete }) => {
                  const actif = i === curseur;
                  const Icon = it.Icon;
                  return (
                    <li key={it.id}>
                      {entete && (
                        <p className="px-3 pb-1 pt-3 text-xs uppercase tracking-[0.18em] text-ink-soft">
                          {it.group}
                        </p>
                      )}
                      <button
                        type="button"
                        role="option"
                        aria-selected={actif}
                        data-actif={actif}
                        onMouseMove={() => bouger(() => i)}
                        onClick={() => choisir(it)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                          actif ? "bg-cream-soft" : "hover:bg-cream-soft/60",
                        )}
                      >
                        {Icon ? (
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              actif ? "text-terra" : "text-ink-soft",
                            )}
                            aria-hidden
                          />
                        ) : (
                          <span aria-hidden className="h-4 w-4 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm text-navy">
                          {it.label}
                        </span>
                        {it.hint && (
                          <span className="hidden shrink-0 text-xs text-ink-soft sm:block">
                            {it.hint}
                          </span>
                        )}
                        {actif && (
                          <CornerDownLeft
                            className="h-3.5 w-3.5 shrink-0 text-ink-soft"
                            aria-hidden
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="hairline flex items-center justify-between gap-3 border-t bg-cream-soft px-4 py-2.5 text-xs text-ink-soft">
              <span className="flex items-center gap-3">
                <span>
                  <kbd className="rounded-xs bg-paper px-1 font-mono">↑</kbd>
                  <kbd className="ml-0.5 rounded-xs bg-paper px-1 font-mono">↓</kbd> parcourir
                </span>
                <span>
                  <kbd className="rounded-xs bg-paper px-1 font-mono">↵</kbd> ouvrir
                </span>
              </span>
              <span className="tabular-nums">
                {trouves.length} résultat{trouves.length > 1 ? "s" : ""}
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ── Le déclencheur de la barre du haut ───────────────────────────────────── */

const sAbonner = () => () => {};
const estMac = () =>
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function PaletteTrigger({
  label = "Rechercher",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const { open } = usePalette();
  const mac = useSyncExternalStore(sAbonner, estMac, () => false);

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "flex items-center gap-2.5 rounded-full border border-[rgba(0,35,75,0.1)] bg-paper py-2.5 pl-4 pr-2.5 text-left text-sm text-ink-soft transition-colors hover:border-terra",
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1 truncate">{label}</span>
      <kbd className="shrink-0 rounded-sm bg-cream-soft px-1.5 py-0.5 font-mono text-xs text-ink-mid">
        {mac ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}

export function PaletteIconTrigger({ className }: { className?: string }) {
  const { open } = usePalette();
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Rechercher"
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(0,35,75,0.1)] bg-paper text-navy transition-colors hover:border-terra",
        className,
      )}
    >
      <Search className="h-4 w-4" aria-hidden />
    </button>
  );
}
