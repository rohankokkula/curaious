"use client";

import { Room } from "@/components/home/hero/Room";
import { SlideDeck } from "@/components/home/hero/SlideDeck";
import { cn } from "@/lib/utils";

function RingLight() {
  return (
    <svg aria-hidden viewBox="0 0 320 70" className="h-11 w-52 text-white md:h-14 md:w-80">
      <ellipse
        cx={160}
        cy={35}
        rx={148}
        ry={22}
        fill="none"
        stroke="currentColor"
        strokeWidth={12}
        opacity={0.1}
        className="blur-[6px]"
      />
      <ellipse cx={160} cy={35} rx={148} ry={22} fill="none" stroke="currentColor" strokeWidth={1.4} opacity={0.9} />
      <circle cx={12} cy={35} r={3.5} fill="currentColor" />
      <circle cx={308} cy={35} r={3.5} fill="currentColor" />
      <circle cx={12} cy={35} r={9} fill="currentColor" opacity={0.25} className="blur-[5px]" />
      <circle cx={308} cy={35} r={9} fill="currentColor" opacity={0.25} className="blur-[5px]" />
    </svg>
  );
}

/** Two soft shafts of light from the ring down onto the stage. Blurred and
 * screen-blended so they read as light in air rather than gray geometry. */
function Beams() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 800 560"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ mixBlendMode: "screen" }}
    >
      <defs>
        <linearGradient id="hero-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.20" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.055" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id="hero-beam-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="13" />
        </filter>
      </defs>
      <g filter="url(#hero-beam-blur)">
        <path d="M 316 38 L 344 38 L 338 468 L 104 468 Z" fill="url(#hero-beam)" />
        <path d="M 456 38 L 484 38 L 696 468 L 462 468 Z" fill="url(#hero-beam)" />
      </g>
    </svg>
  );
}

/**
 * The room: a wall of screens showing the season's talks, and below it the
 * stage and all ten seats. `activeIndex` is owned by Hero — everything
 * here is presentational.
 */
export function StageScene({ activeIndex, className }: { activeIndex: number; className?: string }) {
  return (
    <div className={cn("relative mx-auto w-full max-w-3xl", className)}>
      <Beams />

      <div className="relative flex justify-center">
        <RingLight />
      </div>

      <p className="relative mt-3 text-center font-mono text-[9px] uppercase tracking-[0.3em] text-white/45 md:mt-5 md:text-[11px]">
        a small group · bigger conversations
      </p>

      <SlideDeck activeIndex={activeIndex} className="relative z-10 mt-7 md:mt-10" />

      <Room activeIndex={activeIndex} />
    </div>
  );
}
