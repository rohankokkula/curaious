/**
 * Score colors, shared by the score slider (client) and the leaderboard and
 * profiles (server). Plain functions on purpose: anything exported from a
 * "use client" file can't be called while rendering on the server.
 */

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
