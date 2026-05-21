import { ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Logo({
  variant = "dark",
  className,
}: {
  variant?: "dark" | "light";
  className?: string;
}) {
  const light = variant === "light";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl",
          light ? "bg-terra text-white" : "bg-navy text-white",
        )}
      >
        <ChefHat className="h-5 w-5" />
      </span>
      <div className="leading-none">
        <p
          className={cn(
            "font-display text-lg font-bold tracking-tight",
            light ? "text-white" : "text-navy",
          )}
        >
          Lab&apos;s Food
        </p>
        <p
          className={cn(
            "font-mono text-[9px] uppercase tracking-[0.22em]",
            light ? "text-white/55" : "text-ink-soft",
          )}
        >
          Console admin
        </p>
      </div>
    </div>
  );
}
