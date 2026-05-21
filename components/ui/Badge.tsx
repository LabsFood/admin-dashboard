import { cn } from "@/lib/utils";

export type BadgeTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "navy"
  | "terra"
  | "teal"
  | "neutral";

const TONES: Record<BadgeTone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-[#9A6E15]",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  navy: "bg-navy/10 text-navy",
  terra: "bg-terra/12 text-terra-deep",
  teal: "bg-teal-pale text-teal",
  neutral: "bg-cream-deep text-ink-mid",
};

export default function Badge({
  children,
  tone = "neutral",
  className,
  dot = false,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em]",
        TONES[tone],
        className,
      )}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      )}
      {children}
    </span>
  );
}
