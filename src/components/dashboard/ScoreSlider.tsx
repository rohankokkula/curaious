"use client";

import { useState } from "react";
import { RATING_MAX, RATING_MIN } from "@/lib/ratings";
import { cn } from "@/lib/utils";

/**
 * One hue per score, warm to cool: rose, red, orange, amber, yellow, lime,
 * green, emerald, cyan, violet. Each step is its own hue family, so 8, 9 and
 * 10 read as three different things rather than three greens; violet tops
 * the scale as the stand-out color.
 */
const COLORS = ["#e11d48", "#ef4444", "#f97316", "#f59e0b", "#facc15", "#a3e635", "#4ade80", "#10b981", "#22d3ee", "#a78bfa"];

export const scoreColor = (v: number) => COLORS[Math.min(Math.max(Math.round(v), 1), 10) - 1];

/** WCAG relative luminance of a #rrggbb color. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const INK = "#0b0b0f";
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** Near-black or white, whichever reads better on `hex` (higher WCAG contrast).
 * On this scale that's near-black for 2-10 (5:1 to 13:1; white is under 4:1)
 * and white only on the deep rose of a 1 (4.7:1). */
export function textOn(hex: string) {
  const l = luminance(hex);
  return contrast(l, luminance(INK)) >= contrast(l, 1) ? INK : "#ffffff";
}

/**
 * A 1-10 slider with a line for every point. It starts unset (no thumb, no
 * default) so nobody is nudged toward a number; the first tap, drag or arrow
 * key sets it. A bubble rides above the thumb with that score's anchor line
 * and pops on every change. Underneath it's a native range input, so
 * keyboard, screen readers and touch all behave as usual.
 */
export function ScoreSlider({
  value,
  onChange,
  label,
  anchors,
}: {
  /** 0 = not scored yet */
  value: number;
  onChange: (value: number) => void;
  label: string;
  anchors: readonly string[];
}) {
  const [dragging, setDragging] = useState(false);
  const set = value > 0;
  const shown = set ? value : 5;
  const pct = ((shown - RATING_MIN) / (RATING_MAX - RATING_MIN)) * 100;
  const color = scoreColor(shown);

  const commit = (next: number) => {
    if (next === value) return;
    onChange(next);
    try {
      navigator.vibrate?.(6);
    } catch {
      // no haptics here; fine
    }
  };

  return (
    <div className="relative pt-11 select-none">
      {/* The anchor bubble. Shifted left by as much of its own width as the
          thumb is along the track, so it never spills out of a narrow column. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10">
        {set ? (
          <div key={value} className="absolute bottom-1.5 w-max max-w-full" style={{ left: `${pct}%`, transform: `translateX(-${pct}%)` }}>
            <div
              className="animate-bubble-pop rounded-xl px-2.5 py-1.5 text-xs leading-tight font-semibold shadow-lg"
              style={{ background: color, color: textOn(color) }}
            >
              <span className="text-pretty">{anchors[value - 1]}</span>
            </div>
            <span aria-hidden className="absolute -bottom-1 size-2 -translate-x-1/2 rotate-45" style={{ left: `${pct}%`, background: color }} />
          </div>
        ) : (
          <p className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap text-muted">Drag or tap to score</p>
        )}
      </div>

      {/* keyboard focus lands on the invisible input: ring the whole slider */}
      <div className="relative h-8 rounded-full ring-offset-4 ring-offset-card has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-foreground/40">
        <div className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 overflow-hidden rounded-full bg-surface">
          {set ? <div className="h-full rounded-full transition-[width] duration-150" style={{ width: `${pct}%`, background: color }} /> : null}
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2">
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className={cn("absolute size-1 -translate-x-1/2 -translate-y-1/2 rounded-full", set && i + 1 <= value ? "bg-black/35" : "bg-foreground/25")}
              style={{ left: `${(i / 9) * 100}%` }}
            />
          ))}
        </div>
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-card text-[11px] font-bold tabular-nums shadow-md transition-[left,scale] duration-150",
            set ? "border-white" : "border-dashed border-foreground/30 text-muted",
            dragging && "scale-110",
          )}
          style={{ left: `${pct}%`, ...(set ? { boxShadow: `0 0 0 4px ${color}55`, color } : {}) }}
        >
          {set ? value : "?"}
        </span>
        <input
          type="range"
          min={RATING_MIN}
          max={RATING_MAX}
          step={1}
          value={shown}
          aria-label={label}
          aria-valuetext={set ? `${value} out of ${RATING_MAX}: ${anchors[value - 1]}` : "not scored yet"}
          onChange={(e) => commit(Number(e.target.value))}
          onPointerDown={() => setDragging(true)}
          // A tap on the middle of an unset slider doesn't move the input (it
          // already sits at 5), so no change event fires; take it here.
          onPointerUp={(e) => {
            setDragging(false);
            if (!set) commit(Number(e.currentTarget.value));
          }}
          onPointerCancel={() => setDragging(false)}
          onKeyDown={(e) => {
            if (!set && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              commit(5);
            }
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>

      <div aria-hidden className="relative mt-1.5 h-3 text-[10px] text-muted tabular-nums">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={cn("absolute -translate-x-1/2", set && i + 1 === value && "font-bold text-foreground")}
            style={{ left: `${(i / 9) * 100}%` }}
          >
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
