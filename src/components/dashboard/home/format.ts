import type { SlotView } from "@/lib/talks";

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

const clock = (t: string) =>
  new Date(`1970-01-01T${t}Z`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });

/** "8:00 PM – 9:00 PM", or null when the session has no time set. */
export const timeRange = (slot: Pick<SlotView, "startsAt" | "endsAt">) =>
  slot.startsAt ? [clock(slot.startsAt), slot.endsAt ? clock(slot.endsAt) : null].filter(Boolean).join(" – ") : null;

/** Whole days from today to `date` (0 = today). */
export const daysUntil = (date: string, today = todayIso()) =>
  Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);

export function whenFromNow(date: string, today = todayIso()) {
  const d = daysUntil(date, today);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d < 0) return d === -1 ? "yesterday" : `${-d} days ago`;
  return `in ${d} days`;
}
