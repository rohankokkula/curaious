import Link from "next/link";
import { groupWeeks, slotLooks } from "@/components/dashboard/seasonLayout";
import type { SlotView } from "@/lib/talks";
import { cn } from "@/lib/utils";
import { todayIso } from "./format";

/**
 * The whole season on one line: each session as a chip in its day color,
 * past ones faded, today ringed. Taps through to the schedule.
 */
export function SeasonStrip({ slots }: { slots: SlotView[] }) {
  const today = todayIso();
  const looks = slotLooks(slots);
  const weeks = groupWeeks(slots);

  return (
    <section className="rounded-3xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">The season</h2>
        <Link href="/dashboard/schedule" className="text-xs font-medium text-muted hover:text-foreground">
          Full schedule →
        </Link>
      </div>
      <div className="scroll-row -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5">
        {weeks.map((week, wi) => (
          <div key={week.key} className="shrink-0">
            <p className="mb-1.5 text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">Week {wi + 1}</p>
            <div className="flex gap-1.5">
              {week.days.map((daySlots) => {
                const slot = daySlots[0];
                const palette = looks.get(slot.id)!.palette;
                const past = slot.date < today;
                const isToday = slot.date === today;
                const booked = daySlots.reduce((n, s) => n + s.talks.filter((t) => t.status === "approved").length, 0);
                return (
                  <Link
                    key={slot.date}
                    href="/dashboard/schedule"
                    title={daySlots.map((s) => s.label).join(" · ")}
                    className={cn(
                      "flex w-24 flex-col rounded-xl border px-2.5 py-2 transition hover:-translate-y-0.5",
                      palette.card,
                      past && "opacity-45",
                      isToday && "ring-2 ring-foreground/70 ring-offset-2 ring-offset-card",
                    )}
                  >
                    <span className={cn("text-[10px] font-semibold uppercase", palette.label)}>
                      {isToday ? "Today" : new Date(`${slot.date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}
                    </span>
                    <span className="text-lg leading-tight font-bold tabular-nums">
                      {new Date(`${slot.date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                    </span>
                    <span className="truncate text-[10px] text-muted capitalize">{slot.type === "talk" ? `${booked} talks` : slot.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
