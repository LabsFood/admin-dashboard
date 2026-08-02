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
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-1",
          light ? "bg-white/10" : "bg-cream-soft",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/LogoOrange.png"
          alt="Lab's Food"
          className="h-full w-full object-contain"
        />
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
