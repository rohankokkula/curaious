import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  FileText,
  Inbox,
  Lock,
  MessageSquareWarning,
  PenLine,
  Presentation,
  Timer,
  Users,
  Video,
} from "lucide-react";
import { LeaderboardToggle } from "@/components/admin/LeaderboardToggle";
import { MarkDoneButton } from "@/components/admin/MarkDoneButton";
import { AccentCard } from "@/components/dashboard/AccentCard";
import { Avatar } from "@/components/dashboard/Avatar";
import {
  groupWeeks,
  slotLooks,
  talkLooks,
  weekKey,
  type DayPalette,
} from "@/components/dashboard/seasonLayout";
import { TitleCover } from "@/components/dashboard/TalkCover";
import { WatchRecordingButton } from "@/components/dashboard/WatchRecordingButton";
import type { Cohort } from "@/lib/cohort";
import type { CuratorHomeData, HomePerson } from "@/lib/homeData";
import type { DeckStatus, SlotView } from "@/lib/talks";
import { cn } from "@/lib/utils";
import { dayLabel, timeRange, todayIso, whenFromNow } from "./format";
import { ScoringSwitch } from "./ScoringSwitch";
import { SeasonStrip } from "./SeasonStrip";

const DECK_CHIP: Record<DeckStatus, { label: string; className: string }> = {
  approved: {
    label: "Deck approved",
    className: "bg-success-soft text-success",
  },
  submitted: {
    label: "Deck to review",
    className: "bg-amber-400/15 text-amber-600 dark:text-amber-300",
  },
  changes_requested: {
    label: "Deck sent back",
    className: "bg-destructive/10 text-destructive",
  },
  none: { label: "No deck yet", className: "bg-surface text-muted" },
};

/**
 * Home, for the curator: run tonight's session (scoring switches right on
 * the talk tiles), see what's waiting on you, chase missing feedback, and
 * keep an eye on the season.
 */
export function CuratorHome({
  name,
  cohort,
  slots,
  data,
  leaderboardOn,
}: {
  name: string;
  cohort: Cohort | null;
  slots: SlotView[];
  data: CuratorHomeData;
  leaderboardOn: boolean;
}) {
  const today = todayIso();
  const looks = talkLooks(slots);
  const sessionLooks = slotLooks(slots);
  const weeks = groupWeeks(slots);
  const nextSession = slots.find((s) => s.date >= today) ?? null;
  const weekNow = currentWeek(weeks, today);

  const allTalks = slots.flatMap((slot) =>
    slot.talks.map((talk) => ({
      talk,
      slot,
      state: data.talks.get(talk.talkId),
    })),
  );
  const booked = allTalks.filter((t) => t.state?.status === "approved");
  const possibleRaters = (presenterId: string) =>
    data.members.filter((m) => m.id !== presenterId);

  // what's waiting on the curator
  const pendingRequests = allTalks.filter(
    (t) => t.state?.status === "pending",
  ).length;
  const decksToReview = booked.filter(
    (t) => t.state?.deckStatus === "submitted",
  ).length;
  const openOnPast = booked.filter(
    (t) => t.slot.date < today && t.state?.ratingsOpen,
  );
  const neverOpened = booked.filter(
    (t) =>
      (t.talk.done || t.slot.date < today) &&
      !t.state?.ratingsOpen &&
      (t.state?.raterIds.size ?? 0) === 0,
  );
  const noRecording = slots.filter((s) => s.date < today && !s.recordingUrl);
  const needs = [
    {
      n: pendingRequests,
      label: "slot requests to approve",
      href: "/admin/talks",
      icon: Inbox,
    },
    {
      n: decksToReview,
      label: "decks to review",
      href: "/admin/talks",
      icon: FileCheck2,
    },
    {
      n: data.pendingArticles,
      label: "hearticles to review",
      href: "/admin/resources",
      icon: PenLine,
    },
    {
      n: openOnPast.length,
      label: "past talks still open for scoring",
      href: openOnPast[0]
        ? `/dashboard/talks/${openOnPast[0].talk.talkId}/present`
        : "/admin/talks",
      icon: Timer,
    },
    {
      n: neverOpened.length,
      label: "given talks never opened for scoring",
      href: neverOpened[0]
        ? `/dashboard/talks/${neverOpened[0].talk.talkId}/present`
        : "/admin/talks",
      icon: Lock,
    },
    {
      n: noRecording.length,
      label: "past sessions without a recording",
      href: "/admin/schedule",
      icon: Video,
    },
  ].filter((x) => x.n > 0);

  // feedback chase: talks that have been given (or are being scored now)
  const chase = booked
    .filter((t) => (t.talk.done || t.slot.date < today) || t.state?.ratingsOpen)
    .map((t) => {
      const raters = possibleRaters(t.state!.presenterId);
      const missing = raters.filter((m) => !t.state!.raterIds.has(m.id));
      return { ...t, total: raters.length, missing };
    })
    .sort((a, b) => b.missing.length - a.missing.length);

  const scoresIn = booked.reduce(
    (n, t) => n + (t.state?.raterIds.size ?? 0),
    0,
  );
  const pulse = [
    {
      icon: Presentation,
      value: `${booked.filter((t) => t.talk.done || t.slot.date < today).length}/${booked.length}`,
      label: "talks given",
    },
    {
      icon: FileText,
      value: `${booked.filter((t) => t.state && ["approved", "submitted"].includes(t.state.deckStatus)).length}/${booked.length}`,
      label: "decks in",
    },
    { icon: BookOpenCheck, value: String(scoresIn), label: "scores collected" },
    {
      icon: PenLine,
      value: String(data.publishedArticles),
      label: "hearticles published",
    },
    {
      icon: Users,
      value: String(data.members.length),
      label: "members active",
    },
  ];

  const sessionTime = nextSession ? timeRange(nextSession) : null;
  const statusChip = !nextSession
    ? "Season wrapped"
    : nextSession.date === today
      ? `Session today${sessionTime ? ` · ${sessionTime.split(" – ")[0]}` : ""}`
      : `Next session ${whenFromNow(nextSession.date, today)}`;

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
            Curator · {cohort?.name ?? "Season"} · Week {weekNow} of{" "}
            {weeks.length}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Welcome back, {name}
          </h1>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold">
          <CalendarClock className="size-3.5" /> {statusChip}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5 sm:space-y-6">
          {/* the session to run */}
          {nextSession ? (
            <NextSession
              slot={nextSession}
              palette={sessionLooks.get(nextSession.id)!.palette}
              today={today}
              looks={looks}
              data={data}
              possibleRaters={possibleRaters}
              siblings={slots.filter((s) => s.date === nextSession.date)}
            />
          ) : (
            <div className="rounded-3xl border border-border bg-card p-8 text-sm text-muted">
              The season is over. Every session has run.
            </div>
          )}
          {/* who still owes feedback */}
          <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquareWarning className="size-4 text-muted" /> Feedback
                chase
              </h2>
              <p className="text-xs text-muted">
                Who hasn&rsquo;t scored the talks given so far
              </p>
            </div>
            {chase.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                No talks have been given yet. This fills up from the first
                session.
              </p>
            ) : (
              <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {chase.map(({ talk, total, missing, state }) => {
                  const look = looks.get(talk.talkId);
                  const done = total - missing.length;
                  return (
                    <li key={talk.talkId}>
                      <Link
                        href={`/dashboard/talks/${talk.talkId}/present`}
                        className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-background/40 p-3.5 transition hover:border-foreground/30"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              className={cn(
                                "font-mono text-[10px] font-semibold tracking-[0.16em] uppercase",
                                look?.palette.label,
                              )}
                            >
                              Talk {String(look?.number ?? 0).padStart(2, "0")}
                              {state?.ratingsOpen ? " · scoring open" : ""}
                            </p>
                            <p className="mt-0.5 truncate text-sm font-semibold">
                              {talk.title}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {talk.presenterName}
                            </p>
                          </div>
                          <span className="shrink-0 text-right">
                            <span className="block text-lg font-bold tabular-nums">
                              {done}/{total}
                            </span>
                            <span className="text-[10px] text-muted">
                              scored
                            </span>
                          </span>
                        </div>
                        <span className="block h-1.5 overflow-hidden rounded-full bg-surface">
                          <span
                            className="block h-full rounded-full bg-success"
                            style={{
                              width: `${total ? (done / total) * 100 : 0}%`,
                            }}
                          />
                        </span>
                        {missing.length ? (
                          <Faces people={missing} label="still to score" />
                        ) : (
                          <p className="text-xs font-medium text-success">
                            Everyone has scored it.
                          </p>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* waiting on you */}
        <section className="h-fit rounded-3xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Needs you</h2>
          {needs.length === 0 ? (
            <p className="mt-3 flex items-center gap-2 rounded-2xl bg-success-soft px-3.5 py-3 text-sm text-success">
              <CheckCircle2 className="size-4 shrink-0" /> All clear. Nothing is
              waiting on you.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {needs.map(({ n, label, href, icon: Icon }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="group flex items-center gap-3 rounded-2xl border border-border bg-background/40 px-3.5 py-2.5 transition hover:border-foreground/30"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-600 dark:text-amber-300">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="mr-1 text-lg font-bold tabular-nums">
                        {n}
                      </span>
                      {label}
                    </span>
                    <ArrowRight className="size-4 text-muted transition group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 border-t border-border pt-4">
            <h3 className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">
              Season pulse
            </h3>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              {pulse.map(({ icon: Icon, value, label }) => (
                <div key={label} className="rounded-2xl bg-surface px-3 py-2.5">
                  <dt className="flex items-center gap-1.5 text-[11px] text-muted">
                    <Icon className="size-3.5" /> {label}
                  </dt>
                  <dd className="mt-0.5 text-xl font-bold tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
              <div className="rounded-2xl bg-surface px-3 py-2.5">
                <dt className="flex items-center gap-1.5 text-[11px] text-muted">
                  <Lock className="size-3.5" /> scores unveil
                </dt>
                <dd className="mt-0.5 text-sm font-bold">
                  {booked.length && booked.every((t) => t.talk.done)
                    ? "Unveiled"
                    : `after ${booked.filter((t) => !t.talk.done).length} more talks`}
                </dd>
              </div>
            </dl>
            <LeaderboardToggle
              enabled={leaderboardOn}
              className="mt-3 rounded-2xl bg-background/40 p-3"
            />
          </div>
        </section>
      </div>

      <SeasonStrip slots={slots} />
    </div>
  );
}

/** 1-based week of the season we're in (or about to be in). */
export function currentWeek(weeks: { key: string }[], today: string) {
  const i = weeks.findIndex((w) => w.key >= weekKey(today));
  return i === -1 ? weeks.length : i + 1;
}

function Faces({ people, label }: { people: HomePerson[]; label: string }) {
  const shown = people.slice(0, 8);
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {shown.map((p) => (
          <Avatar
            key={p.id}
            name={p.name}
            src={p.avatarUrl}
            size="sm"
            className="size-7 text-[10px] ring-2 ring-card"
          />
        ))}
      </div>
      <p className="min-w-0 truncate text-xs text-muted">
        {people.length > shown.length
          ? `+${people.length - shown.length} · `
          : ""}
        {people.length} {label}
      </p>
    </div>
  );
}

function NextSession({
  slot,
  palette,
  today,
  looks,
  data,
  possibleRaters,
  siblings,
}: {
  slot: SlotView;
  palette: DayPalette;
  today: string;
  looks: ReturnType<typeof talkLooks>;
  data: CuratorHomeData;
  possibleRaters: (presenterId: string) => HomePerson[];
  siblings: SlotView[];
}) {
  const time = timeRange(slot);
  // a talk day can hold more than one session; run them all from here
  const talks = siblings
    .flatMap((s) =>
      s.talks.map((talk) => ({ talk, state: data.talks.get(talk.talkId) })),
    )
    .filter((t) => t.state?.status === "approved");
  const isToday = slot.date === today;

  return (
    <AccentCard palette={palette} className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className={cn(
              "text-[11px] font-semibold tracking-[0.18em] uppercase",
              palette.label,
            )}
          >
            {isToday ? "Tonight" : `Next up · ${whenFromNow(slot.date, today)}`}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight capitalize">
            {slot.label}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {dayLabel(slot.date)}
            {time ? ` · ${time}` : ""}
          </p>
        </div>
        <Link
          href="/dashboard/schedule"
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold",
            palette.well,
            palette.label,
          )}
        >
          Schedule <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {slot.type !== "talk" ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-background/40 p-4">
          <Video className="size-5 text-muted" />
          <p className="min-w-0 flex-1 text-sm text-muted">
            {slot.recordingUrl
              ? "The recording is up for the cohort."
              : "Whole-cohort session. Add the recording once it's done."}
          </p>
          {slot.recordingUrl ? (
            <WatchRecordingButton url={slot.recordingUrl} title={slot.label} />
          ) : (
            <Link
              href="/admin/schedule"
              className="rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
            >
              Add recording
            </Link>
          )}
        </div>
      ) : talks.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          No talks booked into this session yet.
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {talks.map(({ talk, state }) => {
            const look = looks.get(talk.talkId);
            const raters = state ? possibleRaters(state.presenterId) : [];
            const done = state
              ? raters.filter((m) => state.raterIds.has(m.id)).length
              : 0;
            const chip = DECK_CHIP[state?.deckStatus ?? "none"];
            return (
              <li key={talk.talkId} className="flex flex-col gap-3">
                <Link
                  href={`/dashboard/talks/${talk.talkId}/present`}
                  className={cn(
                    "group relative block aspect-video overflow-hidden rounded-2xl border transition hover:-translate-y-0.5",
                    palette.well,
                  )}
                >
                  <TitleCover
                    title={talk.title ?? "Untitled"}
                    speaker={talk.presenterName}
                    speakerAvatarUrl={talk.presenterAvatarUrl}
                    status={talk.done ? "done" : null}
                    number={look?.number ?? 0}
                    palette={look?.palette ?? palette}
                    layout="center"
                  />
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  {state ? (
                    <ScoringSwitch
                      talkId={talk.talkId}
                      open={state.ratingsOpen}
                    />
                  ) : null}
                  <MarkDoneButton talkId={talk.talkId} done={talk.done} />
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      chip.className,
                    )}
                  >
                    {chip.label}
                  </span>
                  <span className="ml-auto text-xs text-muted tabular-nums">
                    {done}/{raters.length} scored
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AccentCard>
  );
}
