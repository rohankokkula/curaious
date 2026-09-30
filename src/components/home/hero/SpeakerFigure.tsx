"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

/**
 * Both builds share the same shoulder anchors (41,52) and (79,52) so every
 * gesture below works on either one — only the hair, torso taper and leg
 * width change.
 */
const BUILDS = {
  m: {
    hair: "M 47 21 Q 48 8 60 8 Q 72 8 73 21 Q 67 14 60 14 Q 53 14 47 21 Z",
    body: "M 39 50 Q 60 40 81 50 L 77 112 L 75 200 L 63 200 L 61.5 126 L 58.5 126 L 57 200 L 45 200 L 43 112 Z",
    headR: 12,
  },
  f: {
    hair: "M 46 22 Q 46 6 60 6 Q 74 6 74 22 L 74 52 Q 70.5 45 70 28 Q 66.5 14 60 14 Q 53.5 14 50 28 Q 49.5 45 46 52 Z",
    body: "M 42 50 Q 60 41 78 50 L 73 90 L 76 114 L 73 200 L 62.5 200 L 61 126 L 59 126 L 57.5 200 L 47 200 L 44 114 L 47 90 Z",
    headR: 11.4,
  },
} as const;

/** A mix of poses so ten talks don't all look like the same person holding
 * the same arm up. Left arm reads as the unlit side, right catches the key
 * light, which is why only the right one carries a rim highlight. */
const GESTURES = [
  // open palm, raised — "here's the idea"
  { left: "M 41 52 Q 35 74 38 98", right: "M 79 52 Q 97 62 104 46" },
  // both hands out at waist — mid-explanation
  { left: "M 41 52 Q 27 68 33 87", right: "M 79 52 Q 93 68 87 87" },
  // one hand in to the chest — "what I kept getting wrong"
  { left: "M 41 52 Q 35 74 38 98", right: "M 79 52 Q 86 70 67 75" },
  // pointing up at the slide behind them
  { left: "M 41 52 Q 33 70 41 88", right: "M 79 52 Q 96 45 104 29" },
];

/**
 * The person under the spotlight, squared up to the room so they read as
 * facing the audience rather than the screen behind them. Deliberately an
 * illustrated silhouette rather than a photo: there's no real photo of any
 * cohort member to use, and a stock headshot labelled with a fictional name
 * would read as fabricated. The realism comes from where it does in real
 * stage photography — clean silhouette, single-source rim light, grounded
 * contact shadow — not from photographic detail.
 */
export function SpeakerFigure({
  className,
  presents = "m",
  gesture = 0,
  toneClass = "text-accent",
}: {
  className?: string;
  presents?: "f" | "m";
  gesture?: number;
  toneClass?: string;
}) {
  const rootRef = useRef<SVGSVGElement>(null);
  const bodyRef = useRef<SVGGElement>(null);
  const armRef = useRef<SVGGElement>(null);

  const build = BUILDS[presents];
  const pose = GESTURES[gesture % GESTURES.length];

  useGSAP(
    () => {
      if (!bodyRef.current || !armRef.current) return;
      gsap.set(bodyRef.current, { transformOrigin: "50% 100%" });
      // pivot at the right shoulder (79,52 within a 120x210 box)
      gsap.set(armRef.current, { transformOrigin: "65.8% 24.8%" });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      // breathing plus a slow gesture, on different durations so the two
      // never settle into a visible lockstep
      gsap.to(bodyRef.current, {
        scaleY: 1.014,
        duration: 2.3,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
      gsap.to(armRef.current, {
        rotation: -8,
        duration: 3.1,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    },
    { scope: rootRef, dependencies: [presents, gesture] },
  );

  return (
    <svg
      ref={rootRef}
      aria-hidden
      viewBox="0 0 120 210"
      className={cn("overflow-visible", className)}
    >
      <ellipse cx={60} cy={202} rx={30} ry={5.5} fill="#000" opacity={0.6} className="blur-[2px]" />

      <g ref={bodyRef} className={toneClass}>
        {/* far arm — flat black, the side the key light misses */}
        <path d={pose.left} fill="none" stroke="#0a0a0c" strokeWidth={9} strokeLinecap="round" />

        <path d={build.body} fill="#131317" />
        <rect x={56} y={32} width={8} height={10} fill="#0e0e12" />
        <circle cx={60} cy={24} r={build.headR} fill="#111115" />
        <path d={build.hair} fill="#0b0b0e" />

        {/* near arm, the one that moves */}
        <g ref={armRef}>
          <path d={pose.right} fill="none" stroke="#17171c" strokeWidth={9} strokeLinecap="round" />
          <path
            d={pose.right}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            opacity={0.75}
            transform="translate(1.5, -3)"
          />
        </g>

        {/* rim light: the single edge the spotlight actually catches */}
        <path
          d={`M ${60 + build.headR * 0.62} ${24 - build.headR * 0.78} A ${build.headR} ${build.headR} 0 0 1 ${60 + build.headR * 0.55} ${24 + build.headR * 0.83}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.8}
        />
        <path
          d={presents === "f" ? "M 72 46 L 73 90 L 76 114 L 73 200" : "M 74 46 L 77 112 L 75 200"}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.65}
        />
      </g>
    </svg>
  );
}
