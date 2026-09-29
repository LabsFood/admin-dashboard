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
      {/* Pas de cartouche autour de la marque : sur le navy elle se suffit,
          blanchie comme sur le site. */}
      <span className="flex h-10 w-10 shrink-0 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/LogoOrange.png"
          alt="Lab's Food"
          className={cn(
            "h-full w-full object-contain",
            light && "brightness-0 invert",
          )}
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
