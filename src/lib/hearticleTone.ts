import type { DayPalette } from "@/components/dashboard/seasonLayout";

/**
 * A hearticle's color, picked from its slug so it never changes: the same
 * pick on the article page, the Hearticles index, the share card and the
 * author's profile. Hex values for the share card and CSS accents; Tailwind
 * classes (dark shades, stated outright) for the always-dark public pages.
 */
export const HEARTICLE_TONES = [
  { name: "violet", accent: "#c4b5fd", bg: "#1e1236", palette: { card: "", tile: "border-violet-400/20 bg-violet-950/40", label: "text-violet-300", well: "border-violet-400/30 bg-violet-950/80" } },
  { name: "cyan", accent: "#67e8f9", bg: "#082a33", palette: { card: "", tile: "border-cyan-400/20 bg-cyan-950/40", label: "text-cyan-300", well: "border-cyan-400/30 bg-cyan-950/80" } },
  { name: "rose", accent: "#fda4af", bg: "#350815", palette: { card: "", tile: "border-rose-400/20 bg-rose-950/40", label: "text-rose-300", well: "border-rose-400/30 bg-rose-950/80" } },
  { name: "emerald", accent: "#6ee7b7", bg: "#04261d", palette: { card: "", tile: "border-emerald-400/20 bg-emerald-950/40", label: "text-emerald-300", well: "border-emerald-400/30 bg-emerald-950/80" } },
  { name: "indigo", accent: "#a5b4fc", bg: "#1a1840", palette: { card: "", tile: "border-indigo-400/20 bg-indigo-950/40", label: "text-indigo-300", well: "border-indigo-400/30 bg-indigo-950/80" } },
  { name: "fuchsia", accent: "#f0abfc", bg: "#33093a", palette: { card: "", tile: "border-fuchsia-400/20 bg-fuchsia-950/40", label: "text-fuchsia-300", well: "border-fuchsia-400/30 bg-fuchsia-950/80" } },
] as const satisfies readonly { name: string; accent: string; bg: string; palette: DayPalette }[];

export function hearticleTone(slug: string) {
  return HEARTICLE_TONES[[...slug].reduce((n, c) => n + c.charCodeAt(0), 0) % HEARTICLE_TONES.length];
}
