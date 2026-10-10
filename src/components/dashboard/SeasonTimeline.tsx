import Link from "next/link";
import { Clock, Plus, Rocket, Trophy } from "lucide-react";
import { BookSeatDialog, type BookableMember } from "@/components/admin/BookSeatDialog";
import { DraggableTalk, DroppableSeat } from "@/components/admin/ScheduleDnd";
import { BadgeArt } from "@/components/dashboard/BadgeArt";
import { BADGE_LIST } from "@/lib/badges";
import { dayPalette, GRAY, groupWeeks, seatNumbers, type DayPalette } from "@/components/dashboard/seasonLayout";
import { TitleCover } from "@/components/dashboard/TalkCover";
import { WatchRecordingButton } from "@/components/dashboard/WatchRecordingButton";
import type { SlotView } from "@/lib/talks";
import { cn } from "@/lib/utils";



function dateParts(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  return {
    weekday: parsed.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
    weekdayLong: parsed.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
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

/** Every seat — open, booked, or with its deck up — is this one box, so a
 * day's cards line up whatever mix of seats it has. A bit taller on phones,
 * where the tiles are narrow. */
const SEAT_BOX = "relative aspect-[4/3] overflow-hidden rounded-md border sm:aspect-video";

/** The season-wide talk number, big and centered. Over a deck's first slide
 * it shrinks to a small corner tag so the slide stays readable. */
function TalkNumber({ n, onImage = false, tone }: { n: number; onImage?: boolean; tone?: string }) {
  if (onImage) {
    return (
      <span
        aria-label={`Talk ${n}`}
        className="absolute top-1.5 left-1.5 z-10 rounded bg-black/55 px-1 py-0.5 font-mono text-[10px] leading-none font-semibold text-white/85 tabular-nums"
      >
        {String(n).padStart(2, "0")}
      </span>
    );
  }
  return (
    <span
      aria-label={`Talk ${n}`}
      className={cn("font-mono text-2xl leading-none font-bold tabular-nums sm:text-3xl", tone ?? "text-muted")}
    >
      {String(n).padStart(2, "0")}
    </span>
  );
}

function OpenTile({
  slotId,
  slotLabel,
  disabled,
  mode,
  number,
  bookable,
}: {
  slotId: string;
  slotLabel: string;
  disabled: boolean;
  mode: TimelineMode;
  number: number;
  /** Admin only: members who can still be booked into a seat. */
  bookable?: BookableMember[];
}) {
  const adminBooks = mode === "admin" && bookable !== undefined;
  const inert = (disabled || mode === "admin") && !adminBooks;
  const heading = adminBooks ? "Book for a member" : inert ? "Open" : "Request this slot";
  const sub = adminBooks ? "Booked straight away" : mode === "admin" ? "Unclaimed" : disabled ? "You already have a slot" : "Title + description, deck later";

  const body = (
    // Open seats stay neutral gray; only booked talks carry the day's color.
    <div className={cn("rounded-lg border p-2 backdrop-blur-sm transition-colors", GRAY.tile)}>
      <div className={cn(SEAT_BOX, "flex flex-col items-center justify-center border-dashed", GRAY.well)}>
        <span className="-mt-3 sm:-mt-4">
          <TalkNumber n={number} tone="text-neutral-400 dark:text-neutral-500" />
        </span>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 p-1.5 sm:p-2">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold sm:text-xs">{heading}</p>
            <p className="truncate text-[9px] leading-tight text-muted max-sm:hidden sm:text-[11px]">{sub}</p>
          </div>
          <Plus className="size-3 shrink-0 text-neutral-400 opacity-70 dark:text-neutral-500" />
        </div>
      </div>
    </div>
  );
  if (adminBooks) {
    return (
      <BookSeatDialog slotId={slotId} slotLabel={slotLabel} members={bookable}>
        <button type="button" className="block w-full text-left">
          {body}
        </button>
      </BookSeatDialog>
    );
  }
  return inert ? body : <Link href={`/dashboard/slots/${slotId}/submit`}>{body}</Link>;
}

function TalkTile({
  talk,
  mode,
  number,
  palette,
}: {
  talk: SlotView["talks"][number];
  mode: TimelineMode;
  number: number;
  palette: DayPalette;
}) {
  // A booked talk (approved request) shows its title and speaker to everyone;
  // a request still waiting on the curator is only readable by its author.
  const canSeeDetail = talk.status === "approved" || talk.isMine || mode === "admin";

  const body = (
    <div className={cn(SEAT_BOX, "flex items-center justify-center", palette.well)}>
      {/* always the title cover, never the deck's first slide, so a booked
          seat looks the same on the schedule and the talks page */}
      {canSeeDetail && talk.title ? (
        <TitleCover
          title={talk.title}
          speaker={talk.presenterName}
          speakerAvatarUrl={talk.presenterAvatarUrl}
          status={talk.status !== "approved" ? "requested" : talk.deckPending ? "deck-soon" : null}
          number={number}
          palette={palette}
        />
      ) : (
        // someone else's request, not yet confirmed: no details
        <>
          <span className="-mt-3 sm:-mt-4">
            <TalkNumber n={number} tone={palette.label} />
          </span>
          <div className="absolute inset-x-0 bottom-0 p-1.5 sm:p-2">
            <p className="truncate text-[10px] font-semibold sm:text-xs">Requested</p>
            <p className="truncate text-[9px] text-muted max-sm:hidden sm:text-[11px]">Awaiting the curator</p>
          </div>
        </>
      )}
    </div>
  );

  if (canSeeDetail) {
    return (
      <Link
        href={`/dashboard/talks/${talk.talkId}/present`}
        className={cn(
          "group block rounded-lg border p-2 backdrop-blur-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg",
          palette.tile,
        )}
      >
        {body}
      </Link>
    );
  }
  return <div className={cn("rounded-lg border p-2 backdrop-blur-sm", palette.tile)}>{body}</div>;
}

/** What the non-talk sessions are, in a line, so they don't read as empty. */
const SESSION_INFO = {
  kickoff: {
    icon: Rocket,
    title: "Season kickoff",
    blurb: "Meet the cohort, walk through how the season runs, and pick your slots.",
  },
  recognition: {
    icon: Trophy,
    title: "Recognitions",
    blurb: "The closing session: celebrating the season's standout talks and speakers.",
  },
} as const;

function SessionTile({
  type,
  palette,
  recordingUrl,
  label,
}: {
  type: SlotView["type"];
  palette: DayPalette;
  recordingUrl: string | null;
  label: string;
}) {
  const info = type === "kickoff" || type === "recognition" ? SESSION_INFO[type] : null;
  return (
    <div>
      {info ? <p className="text-sm leading-relaxed text-muted">{info.blurb}</p> : null}
      {recordingUrl ? <WatchRecordingButton url={recordingUrl} title={info?.title ?? label} className="mt-3" /> : null}

      {/* recognitions: the season's badges, big and in full color, up for grabs */}
      {type === "recognition" ? (
        <Link href="/dashboard/leaderboard#badges" className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {BADGE_LIST.map((badge) => (
            <span
              key={badge.key}
              className={cn(
                "group/badge flex flex-col items-center rounded-2xl border px-2 pt-4 pb-3 text-center transition hover:-translate-y-0.5 hover:border-foreground/30",
                palette.tile,
              )}
            >
              <BadgeArt
                badge={badge.key}
                className="w-16 drop-shadow-lg transition-transform duration-300 group-hover/badge:-rotate-6 group-hover/badge:scale-110 sm:w-20"
              />
              <span className="mt-2.5 text-[13px] leading-tight font-semibold">{badge.name}</span>
              <span className="mt-0.5 text-[11px] leading-snug text-muted">{badge.awardedFor}</span>
            </span>
          ))}
        </Link>
      ) : null}
    </div>
  );
}

/** One calendar day within a week row: its date header, plus its slot(s). */
function DayColumn({
  slots,
  viewerHasActiveTalk,
  mode,
  colorIndex,
  firstNumber,
  bookable,
  single = false,
  draggable = false,
}: {
  /** The only day in its week: kept one column wide so it matches the others. */
  single?: boolean;
  /** Curator: talks can be dragged between seats (needs ScheduleDndProvider). */
  draggable?: boolean;
  slots: SlotView[];
  viewerHasActiveTalk: boolean;
  mode: TimelineMode;
  colorIndex: number;
  /** Season-wide number of each talk slot's first seat, keyed by slot id. */
  firstNumber: Map<string, number>;
  bookable?: BookableMember[];
}) {
  const { weekdayLong, day, month } = dateParts(slots[0].date);
  const palette = dayPalette(slots, colorIndex);
  const talkSlots = slots.filter((slot) => slot.type === "talk");
  const seats = talkSlots.reduce((n, slot) => n + slot.capacity, 0);
  const booked = talkSlots.reduce((n, slot) => n + slot.talks.length, 0);
  // A day that's only a cohort-wide session gets its name in the header.
  const sessionSlot = talkSlots.length === 0 && slots.length === 1 ? slots[0] : null;
  const sessionRange = sessionSlot ? timeRange(sessionSlot.startsAt ?? null, sessionSlot.endsAt ?? null) : null;
  const SessionIcon =
    sessionSlot?.type === "kickoff" ? SESSION_INFO.kickoff.icon : sessionSlot?.type === "recognition" ? SESSION_INFO.recognition.icon : null;

  return (
    <div
      className={cn(
        "relative min-w-0 flex-1 overflow-hidden rounded-2xl border p-4 shadow-sm backdrop-blur-md sm:rounded-xl",
        single && "sm:max-w-[calc(50%-0.5rem)]",
        palette.card,
      )}
    >
      {/* decoration, all in the day's own color */}
      <div aria-hidden className={cn("pointer-events-none absolute inset-0", palette.label)}>
        <span className="absolute -top-16 -right-12 size-48 rounded-full bg-current opacity-[0.12] blur-3xl" />
        <span
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse at 100% 0%, black 0%, transparent 60%)",
          }}
        />
        <span className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-40" />
      </div>

      {/* header: a little calendar chip, the weekday, and how full the day is */}
      <div className="relative flex items-center gap-3">
        <div className={cn("flex w-11 shrink-0 flex-col items-center overflow-hidden rounded-xl border bg-background/40 text-center shadow-sm", palette.well)}>
          <span className={cn("w-full bg-current/15 py-0.5 text-[8px] font-bold tracking-[0.14em]", palette.label)}>{month}</span>
          <span className="py-0.5 text-lg leading-tight font-bold tabular-nums">{day}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[11px] font-semibold tracking-[0.14em] uppercase", palette.label)}>{weekdayLong}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {seats > 0 ? (
              <>
                <span className="font-semibold text-foreground tabular-nums">{booked}</span>/{seats} seats booked
              </>
            ) : (
              "Whole cohort"
            )}
          </p>
        </div>
        {seats > 0 ? (
          <div className="flex shrink-0 gap-1" aria-hidden>
            {Array.from({ length: seats }).map((_, i) => (
              <span key={i} className={cn("size-1.5 rounded-full", i < booked ? cn("bg-current", palette.label) : "bg-foreground/15")} />
            ))}
          </div>
        ) : sessionSlot ? (
          // a cohort-wide day: its name (and time) sit top right, opposite the date
          <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
            <p className="flex items-center gap-1.5 text-base font-bold tracking-tight capitalize sm:text-lg">
              {SessionIcon ? <SessionIcon className="size-4 text-muted sm:size-5" /> : null}
              {sessionSlot.label}
            </p>
            {sessionRange ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-background/40 px-2 py-0.5 text-[11px] text-muted ring-1 ring-foreground/10">
                <Clock className="size-3" />
                {sessionRange}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="relative mt-4 space-y-4">
        {slots.map((slot) => {
          const isSession = slot.type !== "talk";
          const openCount = Math.max(0, slot.capacity - slot.talks.length);
          const range = timeRange(slot.startsAt ?? null, slot.endsAt ?? null);

          return (
            <div key={slot.id}>
              <div className={cn("flex flex-wrap items-center justify-between gap-2", sessionSlot && "hidden")}>
                <p className="text-[15px] font-bold tracking-tight capitalize">{slot.label}</p>
                {range ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-background/40 px-2 py-0.5 text-[11px] text-muted ring-1 ring-foreground/10">
                    <Clock className="size-3" />
                    {range}
                  </span>
                ) : null}
              </div>

              {isSession ? (
                <SessionTile type={slot.type} palette={palette} recordingUrl={slot.recordingUrl} label={slot.label} />
              ) : (
                <>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {slot.talks.map((talk, ti) => {
                      const number = (firstNumber.get(slot.id) ?? 1) + ti;
                      const tile = <TalkTile key={talk.talkId} talk={talk} mode={mode} palette={palette} number={number} />;
                      return draggable ? (
                        <DraggableTalk
                          key={talk.talkId}
                          talk={{
                            talkId: talk.talkId,
                            slotId: slot.id,
                            title: talk.title ?? "Untitled talk",
                            speaker: talk.presenterName,
                            speakerAvatarUrl: talk.presenterAvatarUrl,
                            number,
                            palette,
                          }}
                        >
                          {tile}
                        </DraggableTalk>
                      ) : (
                        tile
                      );
                    })}
                    {Array.from({ length: openCount }).map((_, oi) => {
                      const seat = (
                      <OpenTile
                        key={oi}
                        slotId={slot.id}
                        slotLabel={slot.label}
                        bookable={bookable}
                        disabled={viewerHasActiveTalk}
                        mode={mode}
                        number={(firstNumber.get(slot.id) ?? 1) + slot.talks.length + oi}
                      />
                      );
                      return draggable ? (
                        <DroppableSeat key={oi} slotId={slot.id} seat={oi} palette={palette}>
                          {seat}
                        </DroppableSeat>
                      ) : (
                        seat
                      );
                    })}
                  </div>
                  {/* talk days get their recording too, same side panel as the kickoff */}
                  {slot.recordingUrl ? (
                    <WatchRecordingButton url={slot.recordingUrl} title={slot.label} className="mt-2.5" />
                  ) : null}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** "10–11 Oct" (or "31 Oct – 1 Nov") for a week's days. */
function weekRange(week: ReturnType<typeof groupWeeks>[number]) {
  const dates = week.days.map((d) => d[0].date).sort();
  const fmt = (date: string, withMonth: boolean) =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", ...(withMonth ? { month: "short" } : {}), timeZone: "UTC" });
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (first === last) return fmt(first, true);
  const sameMonth = first.slice(0, 7) === last.slice(0, 7);
  return sameMonth ? `${fmt(first, false)}–${fmt(last, true)}` : `${fmt(first, true)} – ${fmt(last, true)}`;
}

export function SeasonTimeline({
  slots,
  viewerHasActiveTalk,
  mode = "member",
  bookable,
  draggable = false,
}: {
  /** Curator: drag talks between seats; wrap in ScheduleDndProvider. */
  draggable?: boolean;
  slots: SlotView[];
  viewerHasActiveTalk: boolean;
  /** "admin" renders the identical layout; open seats book for a member when `bookable` is given. */
  mode?: TimelineMode;
  bookable?: BookableMember[];
}) {
  const weeks = groupWeeks(slots);
  const firstNumber = seatNumbers(weeks);

  return (
    <div className="space-y-7 sm:space-y-6">
      {weeks.map((week, wi) => (
        <div key={week.key} className="sm:flex sm:gap-5">
          {/* desktop/tablet: the vertical week rail */}
          <div className="hidden w-16 shrink-0 flex-col items-center sm:flex">
            <div className="relative flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-border/70 bg-gradient-to-b from-card to-surface shadow-sm">
              <span className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-foreground/40 to-transparent" />
              <span className="text-[9px] font-semibold tracking-[0.18em] text-muted">WEEK</span>
              <span className="text-2xl leading-none font-bold tabular-nums">{wi + 1}</span>
            </div>
            <span className="mt-2 text-center text-[10px] leading-tight text-muted">{weekRange(week)}</span>
            {wi < weeks.length - 1 ? <span className="mt-2 w-px flex-1 bg-gradient-to-b from-border via-border to-transparent" /> : null}
          </div>

          {/* phone: a section header instead of a rail — the rail cost a
              third of the screen width for one number */}
          <div className="mb-3 flex items-center gap-3 sm:hidden">
            <span className="rounded-full bg-foreground px-3 py-1 text-xs font-bold tracking-wide text-background">
              Week {wi + 1}
            </span>
            <span className="text-xs text-muted">{weekRange(week)}</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* phone: one day per row, full width — wider screens lay them out side by side */}
          <div className="flex flex-col gap-4 sm:mb-1 sm:min-w-0 sm:flex-1 sm:flex-row">
            {week.days.map((daySlots, di) => (
              <DayColumn
                single={week.days.length === 1}
                draggable={draggable}
                key={daySlots[0].date}
                slots={daySlots}
                viewerHasActiveTalk={viewerHasActiveTalk}
                mode={mode}
                colorIndex={wi * 2 + di}
                firstNumber={firstNumber}
                bookable={bookable}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
