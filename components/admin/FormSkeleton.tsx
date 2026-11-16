import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";

/** Attente d'un formulaire de plat ou de menu : une carte pleine page (h-96). */
export default function FormSkeleton() {
  return (
    <SkeletonGroup>
      <div className="card h-96 p-4">
        <Skeleton className="h-full rounded-[10px]" />
      </div>
    </SkeletonGroup>
  );
}
