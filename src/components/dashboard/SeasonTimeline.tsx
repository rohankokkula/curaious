import Link from "next/link";
import { Plus, Users } from "lucide-react";
import type { SlotView } from "@/lib/talks";
import { cn } from "@/lib/utils";

const TILE_GRADIENT = [
  "from-orange-200 to-rose-200 dark:from-orange-900/40 dark:to-rose-900/40",
  "from-emerald-800 to-neutral-900",
  "from-violet-950 to-neutral-900",
  "from-amber-200 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/30",
  "from-sky-300 to-neutral-400 dark:from-sky-900/40 dark:to-neutral-800",
  "from-fuchsia-950 to-neutral-900",
];

/** Monday-anchored ISO week key, used to group slots into one "Week N" row. */
function weekKey(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() - ((parsed.getUTCDay() + 6) % 7));
  return parsed.toISOString().slice(0, 10);
}

function dateParts(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  return {
    weekday: parsed.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
    day: parsed.getUTCDate(),
    month: parsed.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase(),
  };
}

function timeRange(startsAt: string | null, endsAt: string | null) {
  if (!startsAt) return null;
  const fmt = (t: string) =>
    new Date(`1970-01-01T${t}Z`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
  return endsAt ? `${fmt(startsAt)} – ${fmt(endsAt)}` : fmt(startsAt);
}

function OpenTile({ slotId, disabled }: { slotId: string; disabled: boolean }) {
  const body = (
    <div className="rounded-lg border border-border bg-card p-2">
      <div className="flex aspect-video items-center justify-center rounded-md border border-dashed border-border bg-surface">
        <Plus className="size-4 text-muted" />
      </div>
      <p className="mt-1.5 truncate text-xs font-semibold">{disabled ? "Open" : "Choose this slot"}</p>
      <p className="mt-0.5 truncate text-[11px] leading-tight text-muted">{disabled ? "Not open to you" : "Pick this slot to present"}</p>
    </div>
  );
  return disabled ? body : <Link href={`/dashboard/slots/${slotId}/submit`}>{body}</Link>;
}

function TalkTile({ talk, colorIndex }: { talk: SlotView["talks"][number]; colorIndex: number }) {
  const body = (
    <>
      <div className={cn("aspect-video rounded-md bg-gradient-to-br", TILE_GRADIENT[colorIndex % TILE_GRADIENT.length])} />
      <p className="mt-1.5 truncate text-xs font-semibold">
        {talk.status === "approved" || talk.isMine ? talk.title : "Pending review"}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-muted">
        {talk.status === "approved" || talk.isMine ? (talk.presenterName ?? "") : "Awaiting approval"}
      </p>
    </>
  );

  if (talk.status === "approved") {
    return (
      <Link href={`/dashboard/talks/${talk.talkId}/present`} className="block rounded-lg border border-border bg-card p-2 transition-all duration-150 hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-sm">
        {body}
      </Link>
    );
  }
  return <div className={cn("rounded-lg border border-border bg-card p-2", talk.isMine && "border-foreground/30")}>{body}</div>;
}

/** One calendar day within a week row: its date header, plus its slot(s). */
function DayColumn({ slots, colorSeed, viewerHasActiveTalk }: { slots: SlotView[]; colorSeed: number; viewerHasActiveTalk: boolean }) {
  const { weekday, day, month } = dateParts(slots[0].date);

  return (
    <div className="min-w-0 flex-1 rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold text-muted">
        {weekday} {day} {month}
      </p>

      <div className="mt-3 space-y-4">
        {slots.map((slot, si) => {
          const isSession = slot.type !== "talk";
          const openCount = Math.max(0, slot.capacity - slot.talks.length);
          const range = timeRange(slot.startsAt ?? null, slot.endsAt ?? null);

          return (
            <div key={slot.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold capitalize">{slot.label}</p>
                {range ? <p className="text-xs text-muted">{range}</p> : null}
              </div>

              {isSession ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <Users className="size-3.5" /> Whole cohort attends
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {slot.talks.map((talk, ti) => (
                    <TalkTile key={talk.talkId} talk={talk} colorIndex={colorSeed + si * 2 + ti} />
                  ))}
                  {Array.from({ length: openCount }).map((_, oi) => (
                    <OpenTile key={oi} slotId={slot.id} disabled={viewerHasActiveTalk} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SeasonTimeline({ slots, viewerHasActiveTalk }: { slots: SlotView[]; viewerHasActiveTalk: boolean }) {
  const weekKeys = [...new Set(slots.map((s) => weekKey(s.date)))].sort();

  // Group into weeks, then within each week group by calendar date (Sat, Sun, …).
  const weeks = weekKeys.map((wk) => {
    const weekSlots = slots.filter((s) => weekKey(s.date) === wk);
    const dates = [...new Set(weekSlots.map((s) => s.date))].sort();
    const days = dates.map((date) => weekSlots.filter((s) => s.date === date));
    return { key: wk, days };
  });

  return (
    <div className="space-y-6">
      {weeks.map((week, wi) => (
        <div key={week.key} className="flex gap-3 sm:gap-5">
          <div className="flex w-11 shrink-0 flex-col items-center sm:w-16">
            <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-full border-2 border-border bg-card sm:size-16">
              <span className="hidden text-[10px] font-semibold text-muted sm:block">WEEK</span>
              <span className="text-sm leading-tight font-bold sm:text-xl">{wi + 1}</span>
            </div>
            {wi < weeks.length - 1 ? <span className="mt-1 w-0.5 flex-1 bg-border" /> : null}
          </div>

          <div className="mb-1 flex min-w-0 flex-1 flex-col gap-4 sm:flex-row">
            {week.days.map((daySlots, di) => (
              <DayColumn key={daySlots[0].date} slots={daySlots} colorSeed={wi * 4 + di * 2} viewerHasActiveTalk={viewerHasActiveTalk} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
