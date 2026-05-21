import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  Icon,
  title,
  text,
}: {
  Icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-deep text-ink-soft">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-4 font-display text-lg font-bold text-navy">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-soft">{text}</p>
    </div>
  );
}
