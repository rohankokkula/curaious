"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const SIZE = 240;
const CENTER = SIZE / 2;
const RADIUS = 92;
const NODE_COUNT = 10;

/** Same six-color story as Avatar.tsx / WhosInTheRoom.tsx, extended with the
 * dark-mode fills those were missing, since raw SVG needs an explicit fill
 * for every state (no `currentColor` inheritance trick for two different
 * colors on one shape). */
const PALETTE = [
  { bg: "fill-emerald-100 dark:fill-emerald-500/20", fg: "fill-emerald-700 dark:fill-emerald-300" },
  { bg: "fill-sky-100 dark:fill-sky-500/20", fg: "fill-sky-700 dark:fill-sky-300" },
  { bg: "fill-amber-100 dark:fill-amber-500/20", fg: "fill-amber-700 dark:fill-amber-300" },
  { bg: "fill-violet-100 dark:fill-violet-500/20", fg: "fill-violet-700 dark:fill-violet-300" },
  { bg: "fill-rose-100 dark:fill-rose-500/20", fg: "fill-rose-700 dark:fill-rose-300" },
  { bg: "fill-teal-100 dark:fill-teal-500/20", fg: "fill-teal-700 dark:fill-teal-300" },
];

const INITIALS = ["AI", "PM", "UX", "ML", "OS", "QA", "DS", "VC", "NLP", "SR"];

const NODES = Array.from({ length: NODE_COUNT }, (_, i) => {
  const angle = (i / NODE_COUNT) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * RADIUS,
    y: CENTER + Math.sin(angle) * RADIUS,
    palette: PALETTE[i % PALETTE.length],
    initials: INITIALS[i],
  };
});

/**
 * Ten fixed avatars on a ring. One at a time is "on": nine lines radiate to
 * the rest (the room scoring them), then it hands off to the next — the same
 * sense of "rotate" the rest of the landing copy uses (the floor rotates
 * each session), not a spinning wheel of avatars.
 */
export function MeshOrbit({ className }: { className?: string }) {
  const rootRef = useRef<SVGSVGElement>(null);
  const groupRefs = useRef<(SVGGElement | null)[]>([]);

  useGSAP(
    () => {
      const groups = groupRefs.current.filter((g): g is SVGGElement => Boolean(g));
      if (groups.length === 0) return;

      gsap.set(groups, { opacity: 0 });
      gsap.set(groups[0], { opacity: 1 });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const tl = gsap.timeline({ repeat: -1 });
      groups.forEach((g) => {
        tl.to(g, { opacity: 1, duration: 0.5, ease: "power2.out" }).to(
          g,
          { opacity: 0, duration: 0.5, ease: "power2.in" },
          "+=1.3",
        );
      });
    },
    { scope: rootRef },
  );

  return (
    <svg ref={rootRef} aria-hidden viewBox={`0 0 ${SIZE} ${SIZE}`} className={className}>
      <circle cx={CENTER} cy={CENTER} r={RADIUS} className="fill-none stroke-border" strokeWidth={1} />

      {/* One crossfading group per "who's on" state: its 9 lines to the rest of
          the ring, a small pulse at each line's midpoint, and a highlight ring
          around the active node. Only one is visible at a time. */}
      {NODES.map((active, i) => (
        <g key={i} ref={(el) => { groupRefs.current[i] = el; }} className="text-accent">
          {NODES.map((other, j) =>
            j === i ? null : (
              <g key={j}>
                <line x1={active.x} y1={active.y} x2={other.x} y2={other.y} stroke="currentColor" strokeWidth={1} opacity={0.35} />
                <circle cx={(active.x + other.x) / 2} cy={(active.y + other.y) / 2} r={1.6} fill="currentColor" opacity={0.6} />
              </g>
            ),
          )}
          <circle cx={active.x} cy={active.y} r={20} className="fill-none stroke-accent" strokeWidth={1.5} />
        </g>
      ))}

      {NODES.map((node, i) => (
        <g key={i}>
          <circle cx={node.x} cy={node.y} r={15} className={node.palette.bg} />
          <text
            x={node.x}
            y={node.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={9}
            fontWeight={600}
            className={node.palette.fg}
          >
            {node.initials}
          </text>
        </g>
      ))}
    </svg>
  );
}
