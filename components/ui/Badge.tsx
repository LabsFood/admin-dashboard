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

/*
 * Un statut se lit, il ne se peint pas. Le texte porte la couleur du ton et le
 * point la rappelle : lisible sur le papier comme sur la creme, sans pastille
 * remplie qui fasse « badge de framework ».
 */
const TONES: Record<BadgeTone, { text: string; dot: string }> = {
  success: { text: "text-success", dot: "bg-success" },
  warning: { text: "text-[#8A6212]", dot: "bg-warning" },
  danger: { text: "text-danger", dot: "bg-danger" },
  info: { text: "text-info", dot: "bg-info" },
  navy: { text: "text-navy", dot: "bg-navy" },
  terra: { text: "text-terra-deep", dot: "bg-terra" },
  teal: { text: "text-teal", dot: "bg-teal" },
  neutral: { text: "text-ink-soft", dot: "bg-ink-soft" },
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
  /** false retire le point : utile dans une colonne deja dense. */
  dot?: boolean;
}) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.06em]",
        t.text,
        className,
      )}
    >
      {dot !== false && <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", t.dot)} />}
      {children}
    </span>
  );
}
