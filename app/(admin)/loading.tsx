import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";

/**
 * Chargement générique d'une route : titre, quatre tuiles, un bloc de liste.
 * Pas de padding : le layout (admin) le met déjà autour de `children`.
 */
export default function Loading() {
  return (
    <SkeletonGroup className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4">
            <Skeleton className="h-24 rounded-[10px]" />
          </div>
        ))}
      </div>
      <div className="card p-4">
        <Skeleton className="h-80 rounded-[10px]" />
      </div>
    </SkeletonGroup>
  );
}
