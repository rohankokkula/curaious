"use client";

import { RATING_MAX, RATING_MIN } from "@/lib/ratings";
import { cn } from "@/lib/utils";

const VALUES = Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, i) => RATING_MIN + i);

/** A row of numbered pills, 1 to 10. Replaces the old star picker: a number
 * says exactly what it means, and ten stars don't fit a phone anyway. */
export function ScoreInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-10 gap-1">
      {VALUES.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} out of ${RATING_MAX}`}
          onClick={() => onChange(n)}
          className={cn(
            "h-8 rounded-md text-xs font-semibold tabular-nums transition",
            value === n
              ? "bg-foreground text-background"
              : n <= value
                ? "bg-foreground/15 text-foreground"
                : "bg-surface text-muted hover:bg-foreground/10 hover:text-foreground",
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
