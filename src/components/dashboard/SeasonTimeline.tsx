import Link from "next/link";
import { FileText, Plus, Users } from "lucide-react";
import { DeckPageThumbnail } from "@/components/dashboard/DeckPageThumbnail";
import type { SlotView } from "@/lib/talks";
import { cn } from "@/lib/utils";

/** Same six-color story as the avatar palette elsewhere, as a faint wash
 * rather than a solid fill — a day card should still read as "card", just
 * not every one the same neutral gray. Paired light/dark per color since
 * this page follows the theme toggle, unlike the pinned-dark landing page. */
const DAY_PALETTE = [
  "bg-emerald-100/90 dark:bg-emerald-500/[0.16]",
  "bg-sky-100/90 dark:bg-sky-500/[0.16]",
  "bg-amber-100/90 dark:bg-amber-500/[0.16]",
  "bg-violet-100/90 dark:bg-violet-500/[0.16]",
  "bg-rose-100/90 dark:bg-rose-500/[0.16]",
  "bg-teal-100/90 dark:bg-teal-500/[0.16]",
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

/** Members can claim an open slot; an admin is only looking at the shape of
 * the season, so the same tile is inert for them. */
type TimelineMode = "member" | "admin";

function OpenTile({
  slotId,
  disabled,
  mode,
}: {
  slotId: string;
  disabled: boolean;
  mode: TimelineMode;
}) {
  const inert = disabled || mode === "admin";
  const body = (
    <div className="rounded-lg border border-border/60 bg-card/70 p-2 backdrop-blur-sm">
      <div className="flex aspect-video items-center justify-center rounded-md border border-dashed border-border bg-surface/60">
        <Plus className="size-4 text-muted" />
      </div>
      <p className="mt-1.5 truncate text-xs font-semibold">{inert ? "Open" : "Choose this slot"}</p>
      <p className="mt-0.5 truncate text-[11px] leading-tight text-muted">
        {mode === "admin" ? "Unclaimed" : disabled ? "Not open to you" : "Pick this slot to present"}
      </p>
    </div>
  );
  return inert ? body : <Link href={`/dashboard/slots/${slotId}/submit`}>{body}</Link>;
}

function TalkTile({
  talk,
  mode,
}: {
  talk: SlotView["talks"][number];
  mode: TimelineMode;
}) {
  // Your own talk stays readable (and openable) while it's still in review —
  // it's only hidden from everyone *else* until approved.
  const canSeeDetail = talk.status === "approved" || talk.isMine || mode === "admin";
  // The deck's first slide once it's actually a real, visible talk —
  // otherwise a plain neutral tile stands in (and stays the fallback if the
  // deck fails to render, e.g. a corrupt PDF).
  const showDeckPage = canSeeDetail && talk.status === "approved" && talk.hasDeck;
  const body = (
    <>
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-md bg-surface">
        {showDeckPage ? (
          <DeckPageThumbnail talkId={talk.talkId} className="absolute inset-0" />
        ) : (
          <FileText className="size-5 text-muted/60" />
        )}
      </div>
      <p className="mt-1.5 truncate text-xs font-semibold">
        {canSeeDetail ? talk.title : "Pending review"}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted">
        {canSeeDetail ? (talk.presenterName ?? "") : "Awaiting approval"}
        {canSeeDetail && talk.status !== "approved" ? (
          <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
            In review
          </span>
        ) : null}
      </p>
    </>
  );

  if (canSeeDetail) {
    return (
      <Link href={`/dashboard/talks/${talk.talkId}/present`} className="block rounded-lg border border-border/60 bg-card/70 p-2 backdrop-blur-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-sm">
        {body}
      </Link>
    );
  }
  return <div className="rounded-lg border border-border/60 bg-card/70 p-2 backdrop-blur-sm">{body}</div>;
}

/** One calendar day within a week row: its date header, plus its slot(s). */
function DayColumn({
  slots,
  viewerHasActiveTalk,
  mode,
  colorIndex,
  swipeable = false,
}: {
  slots: SlotView[];
  viewerHasActiveTalk: boolean;
  mode: TimelineMode;
  colorIndex: number;
  /** In a sideways-scrolling week on a phone: fixed card width + snap point. */
  swipeable?: boolean;
}) {
  const { weekday, day, month } = dateParts(slots[0].date);

  return (
    <div
      className={cn(
        "min-w-0 flex-1 rounded-2xl border border-border/60 p-4 shadow-sm backdrop-blur-md sm:rounded-xl",
        swipeable && "w-[86%] shrink-0 snap-start sm:w-auto sm:shrink",
        DAY_PALETTE[colorIndex % DAY_PALETTE.length],
      )}
    >
      <p className="text-[11px] font-semibold text-muted">
        {weekday} {day} {month}
      </p>

      <div className="mt-3 space-y-4">
        {slots.map((slot) => {
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
                  {slot.talks.map((talk) => (
                    <TalkTile key={talk.talkId} talk={talk} mode={mode} />
                  ))}
                  {Array.from({ length: openCount }).map((_, oi) => (
                    <OpenTile key={oi} slotId={slot.id} disabled={viewerHasActiveTalk} mode={mode} />
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

export function SeasonTimeline({
  slots,
  viewerHasActiveTalk,
  mode = "member",
}: {
  slots: SlotView[];
  viewerHasActiveTalk: boolean;
  /** "admin" renders the identical layout without the claim-a-slot affordance. */
  mode?: TimelineMode;
}) {
  const weekKeys = [...new Set(slots.map((s) => weekKey(s.date)))].sort();

  // Group into weeks, then within each week group by calendar date (Sat, Sun, …).
  const weeks = weekKeys.map((wk) => {
    const weekSlots = slots.filter((s) => weekKey(s.date) === wk);
    const dates = [...new Set(weekSlots.map((s) => s.date))].sort();
    const days = dates.map((date) => weekSlots.filter((s) => s.date === date));
    return { key: wk, days };
  });

  return (
    <div className="space-y-7 sm:space-y-6">
      {weeks.map((week, wi) => (
        <div key={week.key} className="sm:flex sm:gap-5">
          {/* desktop/tablet: the vertical week rail */}
          <div className="hidden w-16 shrink-0 flex-col items-center sm:flex">
            <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-full border-2 border-border/60 bg-card/70 shadow-sm backdrop-blur-md">
              <span className="text-[10px] font-semibold text-muted">WEEK</span>
              <span className="text-xl leading-tight font-bold">{wi + 1}</span>
            </div>
            {wi < weeks.length - 1 ? <span className="mt-1 w-0.5 flex-1 bg-border" /> : null}
          </div>

          {/* phone: a section header instead of a rail — the rail cost a
              third of the screen width for one number */}
          <div className="mb-3 flex items-center gap-3 sm:hidden">
            <span className="rounded-full bg-foreground px-3 py-1 text-xs font-bold tracking-wide text-background">
              Week {wi + 1}
            </span>
            <span className="h-px flex-1 bg-border" />
            {week.days.length > 1 ? (
              <span className="text-[11px] text-muted">swipe for {week.days.length} days</span>
            ) : null}
          </div>

          {/* phone: days swipe sideways like cards in an app; wider screens lay them out side by side */}
          <div
            className={
              week.days.length > 1
                ? "scroll-row -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:mb-1 sm:min-w-0 sm:flex-1 sm:snap-none sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0"
                : "sm:mb-1 sm:flex sm:min-w-0 sm:flex-1"
            }
          >
            {week.days.map((daySlots, di) => (
              <DayColumn
                key={daySlots[0].date}
                slots={daySlots}
                viewerHasActiveTalk={viewerHasActiveTalk}
                mode={mode}
                colorIndex={wi * 2 + di}
                swipeable={week.days.length > 1}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
