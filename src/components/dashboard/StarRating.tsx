"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { RATING_MAX, RATING_MIN } from "@/lib/ratings";
import { cn } from "@/lib/utils";

const VALUES = Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, i) => RATING_MIN + i);

export function StarRating({
  value,
  onChange,
  label,
  readOnly,
  size = "size-5",
}: {
  value: number;
  onChange?: (value: number) => void;
  label: string;
  readOnly?: boolean;
  size?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  return (
    <div role={readOnly ? undefined : "radiogroup"} aria-label={label} className="flex gap-0.5">
      {VALUES.map((n) => (
        <button
          key={n}
          type="button"
          role={readOnly ? undefined : "radio"}
          aria-checked={!readOnly && value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          disabled={readOnly}
          tabIndex={readOnly ? -1 : 0}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(null)}
          className={cn("text-border transition", !readOnly && "cursor-pointer hover:scale-110", readOnly && "cursor-default")}
        >
          <Star className={cn(size, n <= shown && "fill-amber-400 text-amber-400")} />
        </button>
      ))}
    </div>
  );
}
