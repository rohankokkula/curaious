import Link from "next/link";
import { FileText, Plus, Rocket, Trophy, Users } from "lucide-react";
import { BookSeatDialog, type BookableMember } from "@/components/admin/BookSeatDialog";
import { DeckPageThumbnail } from "@/components/dashboard/DeckPageThumbnail";
import { WatchRecordingButton } from "@/components/dashboard/WatchRecordingButton";
import type { SlotView } from "@/lib/talks";
import { cn } from "@/lib/utils";

/** One color per day card: a tint, a matching border and the date label
 * in the same hue. Dark mode uses each
 * hue's deepest shade rather than a faint wash of the bright one — a 16%
 * wash over pure black came out muddy (amber read as brown). Amber and
 * orange are left out for the same reason. Paired light/dark per color
 * since this page follows the theme toggle. */
const DAY_PALETTE = [
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

type DayPalette = (typeof DAY_PALETTE)[number];

/** Yellow sits outside the rotation and is handed out on purpose, to the
 * dates pinned below.
 * Its dark tint is kept low and the border and label carry the color; a
 * stronger yellow wash over black turns olive. */
const YELLOW: DayPalette = {
  card: "border-yellow-300/80 bg-yellow-100/90 dark:border-yellow-400/40 dark:bg-yellow-400/[0.10]",
  label: "text-yellow-700 dark:text-yellow-300",
  tile: "border-yellow-300/70 bg-white/70 hover:border-yellow-400 dark:border-yellow-400/25 dark:bg-yellow-400/[0.06] dark:hover:border-yellow-400/50",
  well: "border-yellow-400/60 bg-yellow-50 dark:border-yellow-400/35 dark:bg-yellow-400/[0.07]",
};

/** Neutral gray for the cohort-wide sessions (kickoff, recognitions), so the
 * colored cards stay about talks. */
const GRAY: DayPalette = {
  card: "border-neutral-300/80 bg-neutral-100/90 dark:border-neutral-500/30 dark:bg-neutral-800/50",
  label: "text-neutral-600 dark:text-neutral-300",
  tile: "border-neutral-300/70 bg-white/70 hover:border-neutral-400 dark:border-neutral-500/25 dark:bg-neutral-800/40 dark:hover:border-neutral-400/50",
  well: "border-neutral-400/50 bg-neutral-50 dark:border-neutral-500/30 dark:bg-neutral-900/60",
};

/** Days that always get yellow, regardless of the rotation. */
const YELLOW_DATES = new Set(["2026-10-24"]);

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

/** Faint season-wide talk number in a tile's top-left corner. */
/** The season-wide talk number, big and centered in the tile. Over a deck's
 * first slide it shrinks to a small corner tag so the slide stays readable. */
function TalkNumber({ n, onImage = false, tone }: { n: number; onImage?: boolean; tone?: string }) {
  if (onImage) {
    return (
      <span
        aria-label={`Talk ${n}`}
        className="absolute top-1.5 left-1.5 rounded bg-black/55 px-1 py-0.5 font-mono text-[10px] leading-none font-semibold text-white/85 tabular-nums"
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
  palette,
  bookable,
}: {
  slotId: string;
  slotLabel: string;
  disabled: boolean;
  mode: TimelineMode;
  number: number;
  palette: DayPalette;
  /** Admin only: members who can still be booked into a seat. */
  bookable?: BookableMember[];
}) {
  const adminBooks = mode === "admin" && bookable !== undefined;
  const inert = (disabled || mode === "admin") && !adminBooks;
  const body = (
    <div className={cn("rounded-lg border p-2 backdrop-blur-sm transition-colors", palette.tile)}>
      <div className={cn("relative flex aspect-video items-center justify-center rounded-md border border-dashed", palette.well)}>
        <TalkNumber n={number} tone={palette.label} />
        <Plus className={cn("absolute right-1.5 bottom-1.5 size-3 opacity-70", palette.label)} />
      </div>
      <p className="mt-1.5 truncate text-xs font-semibold">{adminBooks ? "Book for a member" : inert ? "Open" : "Request this slot"}</p>
      <p className="mt-0.5 truncate text-[11px] leading-tight text-muted">
        {adminBooks ? "Booked straight away" : mode === "admin" ? "Unclaimed" : disabled ? "You already have a slot" : "Title + description, deck later"}
      </p>
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
  // The deck's first slide once it's been reviewed (hasDeck already folds in
  // who may see it) — otherwise the numbered tile stands in, and stays the
  // fallback if the deck fails to render, e.g. a corrupt PDF.
  const showDeckPage = canSeeDetail && talk.hasDeck && (talk.status === "approved" || talk.isMine);
  const body = (
    <>
      <div className={cn("relative flex aspect-video items-center justify-center overflow-hidden rounded-md border", palette.well)}>
        {showDeckPage ? (
          <DeckPageThumbnail talkId={talk.talkId} className="absolute inset-0" />
        ) : (
          <>
            <TalkNumber n={number} tone={palette.label} />
            <FileText className={cn("absolute right-1.5 bottom-1.5 size-3 opacity-70", palette.label)} />
          </>
        )}
        {showDeckPage ? <TalkNumber n={number} onImage /> : null}
      </div>
      <p className="mt-1.5 truncate text-xs font-semibold">
        {canSeeDetail ? talk.title : "Requested"}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted">
        {canSeeDetail ? (talk.presenterName ?? "") : "Awaiting the curator"}
        {canSeeDetail && talk.status !== "approved" ? (
          <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
            Requested
          </span>
        ) : canSeeDetail && talk.deckPending ? (
          <span className="shrink-0 rounded-full bg-foreground/10 px-1.5 text-[10px] font-semibold">Deck soon</span>
        ) : null}
      </p>
    </>
  );

  if (canSeeDetail) {
    return (
      <Link href={`/dashboard/talks/${talk.talkId}/present`} className={cn("block rounded-lg border p-2 backdrop-blur-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm", palette.tile)}>
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
  const Icon = info?.icon ?? Users;
  return (
    <div className={cn("mt-2 flex items-start gap-3 rounded-lg border p-3 backdrop-blur-sm", palette.tile)}>
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md border", palette.well)}>
        <Icon className={cn("size-5", palette.label)} />
      </span>
      <div className="min-w-0">
        {info ? <p className="text-xs font-semibold">{info.title}</p> : null}
        {info ? <p className="mt-0.5 text-[11px] leading-snug text-muted">{info.blurb}</p> : null}
        {recordingUrl ? (
          <WatchRecordingButton url={recordingUrl} title={info?.title ?? label} className="mt-2.5" />
        ) : null}
      </div>
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
}: {
  slots: SlotView[];
  viewerHasActiveTalk: boolean;
  mode: TimelineMode;
  colorIndex: number;
  /** Season-wide number of each talk slot's first seat, keyed by slot id. */
  firstNumber: Map<string, number>;
  bookable?: BookableMember[];
}) {
  const { weekday, day, month } = dateParts(slots[0].date);
  const isSessionDay = slots.some((slot) => slot.type === "kickoff" || slot.type === "recognition");
  const palette = isSessionDay
    ? GRAY
    : YELLOW_DATES.has(slots[0].date)
      ? YELLOW
      : DAY_PALETTE[colorIndex % DAY_PALETTE.length];

  return (
    <div
      className={cn(
        "relative min-w-0 flex-1 overflow-hidden rounded-2xl border p-4 shadow-sm backdrop-blur-md sm:rounded-xl",
        palette.card,
      )}
    >
      <p className={cn("text-[11px] font-semibold tracking-wide", palette.label)}>
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
                <SessionTile type={slot.type} palette={palette} recordingUrl={slot.recordingUrl} label={slot.label} />
              ) : (
                <>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {slot.talks.map((talk, ti) => (
                      <TalkTile key={talk.talkId} talk={talk} mode={mode} palette={palette} number={(firstNumber.get(slot.id) ?? 1) + ti} />
                    ))}
                    {Array.from({ length: openCount }).map((_, oi) => (
                      <OpenTile
                        key={oi}
                        slotId={slot.id}
                        slotLabel={slot.label}
                        bookable={bookable}
                        disabled={viewerHasActiveTalk}
                        mode={mode}
                        palette={palette}
                        number={(firstNumber.get(slot.id) ?? 1) + slot.talks.length + oi}
                      />
                    ))}
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

export function SeasonTimeline({
  slots,
  viewerHasActiveTalk,
  mode = "member",
  bookable,
}: {
  slots: SlotView[];
  viewerHasActiveTalk: boolean;
  /** "admin" renders the identical layout; open seats book for a member when `bookable` is given. */
  mode?: TimelineMode;
  bookable?: BookableMember[];
}) {
  const weekKeys = [...new Set(slots.map((s) => weekKey(s.date)))].sort();

  // Group into weeks, then within each week group by calendar date (Sat, Sun, …).
  const weeks = weekKeys.map((wk) => {
    const weekSlots = slots.filter((s) => weekKey(s.date) === wk);
    const dates = [...new Set(weekSlots.map((s) => s.date))].sort();
    const days = dates.map((date) => weekSlots.filter((s) => s.date === date));
    return { key: wk, days };
  });

  // Number every talk seat across the season in the order it's shown
  // (talk 1, 2, 3...), so a tile can say which talk of the season it is.
  // Sessions (kickoff, recognitions) take no numbers.
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
          </div>

          {/* phone: one day per row, full width — wider screens lay them out side by side */}
          <div className="flex flex-col gap-4 sm:mb-1 sm:min-w-0 sm:flex-1 sm:flex-row">
            {week.days.map((daySlots, di) => (
              <DayColumn
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
