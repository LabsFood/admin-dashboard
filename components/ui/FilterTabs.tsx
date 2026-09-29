"use client";

import { cn } from "@/lib/utils";

export interface FilterOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

export default function FilterTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: FilterOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3.5 py-2 text-xs font-semibold transition-colors",
              active
                ? "bg-navy text-white"
                : "border border-[rgba(0,35,75,0.1)] bg-paper text-ink-mid hover:border-terra",
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 font-mono text-[10px]",
                  active ? "bg-white/20 text-white" : "bg-cream-deep text-ink-mid",
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
