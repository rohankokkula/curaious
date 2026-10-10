/**
 * How the season schedule is laid out and colored, shared by the schedule
 * (SeasonTimeline) and anything else that shows a talk's cover (the talks
 * list), so a talk looks the same everywhere: same day color, same number.
 */
import type { SlotView } from "@/lib/talks";

/** One color per day card: a tint, a matching border and the date label
 * in the same hue. Dark mode uses each
 * hue's deepest shade rather than a faint wash of the bright one — a 16%
 * wash over pure black came out muddy (amber read as brown). Amber and
 * orange are left out for the same reason. Paired light/dark per color
 * since this page follows the theme toggle. */
export const DAY_PALETTE = [
  {
    card: "border-violet-300/70 bg-violet-100/90 dark:border-violet-400/30 dark:bg-violet-950/70",
    label: "text-violet-700 dark:text-violet-300",
    tile: "border-violet-300/60 bg-white/70 hover:border-violet-400 dark:border-violet-400/20 dark:bg-violet-900/30 dark:hover:border-violet-400/50",
    well: "border-violet-400/50 bg-violet-50 dark:border-violet-400/30 dark:bg-violet-950/60",
  },
  {
    card: "border-cyan-300/70 bg-cyan-100/90 dark:border-cyan-400/30 dark:bg-cyan-950/70",
    label: "text-cyan-700 dark:text-cyan-300",
    tile: "border-cyan-300/60 bg-white/70 hover:border-cyan-400 dark:border-cyan-400/20 dark:bg-cyan-900/30 dark:hover:border-cyan-400/50",
    well: "border-cyan-400/50 bg-cyan-50 dark:border-cyan-400/30 dark:bg-cyan-950/60",
  },
  {
    card: "border-rose-300/70 bg-rose-100/90 dark:border-rose-400/30 dark:bg-rose-950/70",
    label: "text-rose-700 dark:text-rose-300",
    tile: "border-rose-300/60 bg-white/70 hover:border-rose-400 dark:border-rose-400/20 dark:bg-rose-900/30 dark:hover:border-rose-400/50",
    well: "border-rose-400/50 bg-rose-50 dark:border-rose-400/30 dark:bg-rose-950/60",
  },
  {
    card: "border-emerald-300/70 bg-emerald-100/90 dark:border-emerald-400/30 dark:bg-emerald-950/70",
    label: "text-emerald-700 dark:text-emerald-300",
    tile: "border-emerald-300/60 bg-white/70 hover:border-emerald-400 dark:border-emerald-400/20 dark:bg-emerald-900/30 dark:hover:border-emerald-400/50",
    well: "border-emerald-400/50 bg-emerald-50 dark:border-emerald-400/30 dark:bg-emerald-950/60",
  },
  {
    card: "border-indigo-300/70 bg-indigo-100/90 dark:border-indigo-400/30 dark:bg-indigo-950/70",
    label: "text-indigo-700 dark:text-indigo-300",
    tile: "border-indigo-300/60 bg-white/70 hover:border-indigo-400 dark:border-indigo-400/20 dark:bg-indigo-900/30 dark:hover:border-indigo-400/50",
    well: "border-indigo-400/50 bg-indigo-50 dark:border-indigo-400/30 dark:bg-indigo-950/60",
  },
  {
    card: "border-fuchsia-300/70 bg-fuchsia-100/90 dark:border-fuchsia-400/30 dark:bg-fuchsia-950/70",
    label: "text-fuchsia-700 dark:text-fuchsia-300",
    tile: "border-fuchsia-300/60 bg-white/70 hover:border-fuchsia-400 dark:border-fuchsia-400/20 dark:bg-fuchsia-900/30 dark:hover:border-fuchsia-400/50",
    well: "border-fuchsia-400/50 bg-fuchsia-50 dark:border-fuchsia-400/30 dark:bg-fuchsia-950/60",
  },
];

export type DayPalette = (typeof DAY_PALETTE)[number];

/** Yellow sits outside the rotation and is handed out on purpose, to the
 * dates pinned below.
 * Its dark tint is kept low and the border and label carry the color; a
 * stronger yellow wash over black turns olive. */
export const YELLOW: DayPalette = {
  card: "border-yellow-300/80 bg-yellow-100/90 dark:border-yellow-400/40 dark:bg-yellow-400/[0.10]",
  label: "text-yellow-700 dark:text-yellow-300",
  tile: "border-yellow-300/70 bg-white/70 hover:border-yellow-400 dark:border-yellow-400/25 dark:bg-yellow-400/[0.06] dark:hover:border-yellow-400/50",
  well: "border-yellow-400/60 bg-yellow-50 dark:border-yellow-400/35 dark:bg-yellow-400/[0.07]",
};

/** Neutral gray for the cohort-wide sessions (kickoff, recognitions), so the
 * colored cards stay about talks. */
export const GRAY: DayPalette = {
  card: "border-neutral-300/80 bg-neutral-100/90 dark:border-neutral-500/30 dark:bg-neutral-800/50",
  label: "text-neutral-600 dark:text-neutral-300",
  tile: "border-neutral-300/70 bg-white/70 hover:border-neutral-400 dark:border-neutral-500/25 dark:bg-neutral-800/40 dark:hover:border-neutral-400/50",
  well: "border-neutral-400/50 bg-neutral-50 dark:border-neutral-500/30 dark:bg-neutral-900/60",
};

/** Days that always get yellow, regardless of the rotation. */
export const YELLOW_DATES = new Set(["2026-10-24"]);

/** Monday-anchored ISO week key, used to group slots into one "Week N" row. */
export function weekKey(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() - ((parsed.getUTCDay() + 6) % 7));
  return parsed.toISOString().slice(0, 10);
}

/** The color for one calendar day's card: gray for cohort-wide sessions,
 * yellow for pinned dates, else the rotation by position in the season. */
export function dayPalette(daySlots: SlotView[], colorIndex: number): DayPalette {
  const isSessionDay = daySlots.some((slot) => slot.type === "kickoff" || slot.type === "recognition");
  if (isSessionDay) return GRAY;
  if (YELLOW_DATES.has(daySlots[0].date)) return YELLOW;
  return DAY_PALETTE[colorIndex % DAY_PALETTE.length];
}

/** Weeks → days → slots, in date order. */
export function groupWeeks(slots: SlotView[]) {
  const weekKeys = [...new Set(slots.map((s) => weekKey(s.date)))].sort();
  return weekKeys.map((wk) => {
    const weekSlots = slots.filter((s) => weekKey(s.date) === wk);
    const dates = [...new Set(weekSlots.map((s) => s.date))].sort();
    const days = dates.map((date) => weekSlots.filter((s) => s.date === date));
    return { key: wk, days };
  });
}

/**
 * Number every talk seat across the season in the order it's shown (talk 1,
 * 2, 3...), keyed by slot id → the first seat's number. Sessions (kickoff,
 * recognitions) take no numbers.
 */
export function seatNumbers(weeks: ReturnType<typeof groupWeeks>) {
  const firstNumber = new Map<string, number>();
  let next = 1;
  for (const week of weeks) {
    for (const day of week.days) {
      for (const slot of day) {
        if (slot.type !== "talk") continue;
        firstNumber.set(slot.id, next);
        next += Math.max(slot.capacity, slot.talks.length);
      }
    }
  }
  return firstNumber;
}

/** Each talk's season number and day color, exactly as the schedule shows it. */
export function talkLooks(slots: SlotView[]) {
  const weeks = groupWeeks(slots);
  const firstNumber = seatNumbers(weeks);
  const looks = new Map<string, { number: number; palette: DayPalette }>();
  weeks.forEach((week, wi) =>
    week.days.forEach((daySlots, di) => {
      const palette = dayPalette(daySlots, wi * 2 + di);
      for (const slot of daySlots) {
        slot.talks.forEach((talk, ti) => looks.set(talk.talkId, { number: (firstNumber.get(slot.id) ?? 1) + ti, palette }));
      }
    }),
  );
  return looks;
}

/** Each session's day color and week number, as the schedule shows them. */
export function slotLooks(slots: SlotView[]) {
  const looks = new Map<string, { palette: DayPalette; week: number }>();
  groupWeeks(slots).forEach((week, wi) =>
    week.days.forEach((daySlots, di) => {
      const palette = dayPalette(daySlots, wi * 2 + di);
      for (const slot of daySlots) looks.set(slot.id, { palette, week: wi + 1 });
    }),
  );
  return looks;
}
