import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

/*
 * Les squelettes des deux boîtes (contact, messagerie) : liste à gauche, fil à
 * droite. Les hauteurs reprennent celles des vraies lignes et des vraies bulles.
 */

/** Lignes de liste : pastille ronde + trois lignes de texte, 84 px comme une vraie ligne. */
function Rows({ count = 6 }: { count?: number }) {
  return (
    <div className="flex-1 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex h-[84px] items-start gap-3 border-b border-[rgba(0,35,75,0.05)] px-4 py-3.5"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InboxRowsSkeleton({ count }: { count?: number }) {
  return (
    <SkeletonGroup className="flex min-h-0 flex-1 flex-col">
      <Rows count={count} />
    </SkeletonGroup>
  );
}

/** Bulles alternées (équipe à droite, correspondant à gauche), sur le fond du fil. */
function Bubbles({ className }: { className?: string }) {
  const bulles = [
    { droite: false, w: "w-2/3", h: "h-14" },
    { droite: true, w: "w-1/2", h: "h-11" },
    { droite: false, w: "w-3/5", h: "h-11" },
    { droite: true, w: "w-2/3", h: "h-14" },
  ];
  return (
    <div className={cn("space-y-3 bg-cream-soft px-4 py-5", className)}>
      {bulles.map((b, i) => (
        <div key={i} className={cn("flex", b.droite ? "justify-end" : "justify-start")}>
          <Skeleton className={cn("rounded-2xl", b.w, b.h)} />
        </div>
      ))}
    </div>
  );
}

export function ThreadSkeleton({ className }: { className?: string }) {
  return (
    <SkeletonGroup>
      <Bubbles className={className} />
    </SkeletonGroup>
  );
}

/**
 * Fallback de la page entière : onglets de filtre, puis la carte à deux
 * colonnes. `cardClassName` est celui de la vraie carte (hauteur, colonnes).
 */
export function InboxPageSkeleton({
  cardClassName,
  tabs,
  search = false,
}: {
  cardClassName: string;
  tabs: number;
  search?: boolean;
}) {
  return (
    <SkeletonGroup className="space-y-4">
      {/* Onglets : py-2 + texte 16 + bordure = 34 px, pb-1 sous la rangée. */}
      <div className="flex gap-2 pb-1">
        {Array.from({ length: tabs }).map((_, i) => (
          <Skeleton key={i} className="h-[34px] w-24" />
        ))}
      </div>
      <div className={cardClassName}>
        <div className="flex min-h-0 flex-col border-r border-[rgba(0,35,75,0.07)]">
          {search && (
            <div className="border-b border-[rgba(0,35,75,0.07)] p-4">
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          <Rows />
        </div>
        <Bubbles className="hidden lg:block" />
      </div>
    </SkeletonGroup>
  );
}
