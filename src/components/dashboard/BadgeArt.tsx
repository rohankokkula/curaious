import { Eye, Library, Mic, Microscope } from "lucide-react";
import type { BadgeKey } from "@/lib/badges";
import { cn } from "@/lib/utils";

/**
 * Medal artwork, one per badge: a distinct silhouette (sunburst, hexagon,
 * scalloped seal, shield), a metal rim in the badge's own color, a dark
 * enamel center with the emblem, and two ribbon tails. Pure SVG + one
 * lucide glyph, so it scales from a 28px chip to a 160px hero without
 * any image assets.
 */

type Art = {
  /** rim gradient: light → dark */
  rim: [string, string];
  /** enamel center */
  core: string;
  /** thin inner ring and glyph tint */
  accent: string;
  ribbon: [string, string];
  shape: string;
  Glyph: typeof Mic;
};

const CX = 50;
const CY = 46;

function polygon(points: [number, number][]) {
  return `M${points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join("L")}Z`;
}

/** n-point star/burst: alternating outer and inner radius. */
function burst(n: number, outer: number, inner: number) {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / n - Math.PI / 2;
    pts.push([CX + r * Math.cos(a), CY + r * Math.sin(a)]);
  }
  return polygon(pts);
}

function hexagon(r: number) {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push([CX + r * Math.cos(a), CY + r * Math.sin(a)]);
  }
  return polygon(pts);
}

/** Wax-seal edge: many shallow lobes. */
function seal(lobes: number, r: number, depth: number) {
  const pts: [number, number][] = [];
  const steps = lobes * 6;
  for (let i = 0; i < steps; i += 1) {
    const a = (2 * Math.PI * i) / steps - Math.PI / 2;
    const rr = r - depth * (1 - Math.cos(((2 * Math.PI * lobes) / steps) * i)) * 0.5;
    pts.push([CX + rr * Math.cos(a), CY + rr * Math.sin(a)]);
  }
  return polygon(pts);
}

const SHIELD = "M50,8 L84,18 L84,46 C84,66 70,80 50,88 C30,80 16,66 16,46 L16,18 Z";

const ART: Record<BadgeKey, Art> = {
  showstopper: {
    rim: ["#fde68a", "#b45309"],
    core: "#2a1a05",
    accent: "#fbbf24",
    ribbon: ["#dc2626", "#7f1d1d"],
    shape: burst(14, 40, 34),
    Glyph: Mic,
  },
  sharp_eye: {
    rim: ["#a5f3fc", "#0e7490"],
    core: "#04232b",
    accent: "#22d3ee",
    ribbon: ["#0891b2", "#164e63"],
    shape: hexagon(40),
    Glyph: Eye,
  },
  deep_diver: {
    rim: ["#c7d2fe", "#4338ca"],
    core: "#0f0b33",
    accent: "#818cf8",
    ribbon: ["#4f46e5", "#1e1b4b"],
    shape: seal(16, 40, 3),
    Glyph: Microscope,
  },
  librarian: {
    rim: ["#a7f3d0", "#047857"],
    core: "#03231a",
    accent: "#34d399",
    ribbon: ["#059669", "#064e3b"],
    shape: SHIELD,
    Glyph: Library,
  },
};

export function BadgeArt({
  badge,
  className,
  locked = false,
}: {
  badge: BadgeKey;
  className?: string;
  /** Not earned (yet): drawn in grayscale and dimmed. */
  locked?: boolean;
}) {
  const art = ART[badge];
  // Same ids for every copy of the same badge: the definitions are
  // identical, so a duplicate on the page resolves to the same paint.
  const id = `badge-${badge}`;
  const Glyph = art.Glyph;

  return (
    <div
      className={cn(
        "relative aspect-[100/112] shrink-0 transition duration-300",
        // Not earned yet: gray and dimmed, but it comes to life in full color
        // on hover (of itself, or of a `group` card around it).
        locked && "opacity-40 grayscale hover:opacity-100 hover:grayscale-0 group-hover:opacity-100 group-hover:grayscale-0",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 100 112" className="absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={art.rim[0]} />
            <stop offset="0.55" stopColor={art.rim[1]} />
            <stop offset="1" stopColor={art.rim[0]} />
          </linearGradient>
          <linearGradient id={`${id}-ribbon`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={art.ribbon[1]} />
            <stop offset="1" stopColor={art.ribbon[0]} />
          </linearGradient>
          <radialGradient id={`${id}-core`} cx="0.35" cy="0.3" r="0.9">
            <stop offset="0" stopColor={art.accent} stopOpacity="0.28" />
            <stop offset="0.6" stopColor={art.core} />
          </radialGradient>
        </defs>

        {/* ribbon tails, behind the medal */}
        <path d="M34,66 L26,108 L36,101 L44,110 L50,72 Z" fill={`url(#${id}-ribbon)`} />
        <path d="M66,66 L74,108 L64,101 L56,110 L50,72 Z" fill={`url(#${id}-ribbon)`} />

        {/* medal body */}
        <path d={art.shape} fill={`url(#${id}-rim)`} stroke="rgba(0,0,0,0.25)" strokeWidth="0.75" />
        {/* enamel center */}
        <circle cx={CX} cy={CY} r="26" fill={`url(#${id}-core)`} />
        <circle cx={CX} cy={CY} r="26" fill="none" stroke={art.accent} strokeOpacity="0.55" strokeWidth="1.2" />
        <circle cx={CX} cy={CY} r="22.5" fill="none" stroke={art.accent} strokeOpacity="0.2" strokeWidth="0.75" strokeDasharray="1.5 2" />
      </svg>

      {/* emblem, centered on the enamel (46/112 of the height) */}
      <div className="absolute inset-x-0 top-[41.07%] flex -translate-y-1/2 justify-center">
        <Glyph className="h-auto w-[26%]" style={{ color: art.accent }} strokeWidth={1.75} />
      </div>
    </div>
  );
}
