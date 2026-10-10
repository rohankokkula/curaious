import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, MessageSquare, Mic, Star, Video } from "lucide-react";
import { AccentCard } from "@/components/dashboard/AccentCard";
import { DeckUploadPanel } from "@/components/dashboard/DeckUploadPanel";
import { groupWeeks, slotLooks, talkLooks } from "@/components/dashboard/seasonLayout";
import { TitleCover } from "@/components/dashboard/TalkCover";
import { WatchRecordingButton } from "@/components/dashboard/WatchRecordingButton";
import type { Cohort } from "@/lib/cohort";
import type { MemberHomeData } from "@/lib/homeData";
import type { SlotView } from "@/lib/talks";
import { cn } from "@/lib/utils";
import { currentWeek } from "./CuratorHome";
import { dayLabel, timeRange, todayIso, whenFromNow } from "./format";
import { SeasonStrip } from "./SeasonStrip";

/**
 * Home, for a member: your talk (and what it still needs), the next
 * session, and the talks waiting on your scores. Only talks that can
 * actually be scored now count as owed, never ones still to come.
 */
export function MemberHome({ name, cohort, slots, data }: { name: string; cohort: Cohort | null; slots: SlotView[]; data: MemberHomeData }) {
  const today = todayIso();
  const looks = talkLooks(slots);
  const sessionLooks = slotLooks(slots);
  const weeks = groupWeeks(slots);

  const mineSlot = slots.find((s) => s.talks.some((t) => t.isMine)) ?? null;
  const myTalk = mineSlot?.talks.find((t) => t.isMine) ?? null;
  const myLook = myTalk ? looks.get(myTalk.talkId) : undefined;

  const nextSession = slots.find((s) => s.date >= today) ?? null;
  const nextDay = nextSession ? slots.filter((s) => s.date === nextSession.date) : [];

  const owed = slots.flatMap((slot) =>
    slot.talks
      .filter((t) => t.status === "approved" && !t.isMine && !data.rated.has(t.talkId) && data.openForScoring.has(t.talkId))
      .map((talk) => ({ talk, slot })),
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <p className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
          {cohort?.name ?? "Season"} · Week {currentWeek(weeks, today)} of {weeks.length}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Welcome back, {name}</h1>
        {owed.length > 0 ? (
          <p className="mt-1 text-muted">
            {owed.length} {owed.length === 1 ? "talk is" : "talks are"} waiting on your scores.
          </p>
        ) : null}
      </header>

      <div className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* your talk */}
        {myTalk && mineSlot && myLook ? (
          <AccentCard palette={myLook.palette} className="p-4 sm:p-5">
            <div className="grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <Link
                href={`/dashboard/talks/${myTalk.talkId}/present`}
                className={cn("relative block aspect-video overflow-hidden rounded-2xl border transition hover:-translate-y-0.5", myLook.palette.well)}
              >
                <TitleCover
                  title={myTalk.title ?? "Your talk"}
                  speaker={myTalk.presenterName}
                  speakerAvatarUrl={myTalk.presenterAvatarUrl}
                  status={myTalk.status !== "approved" ? "requested" : myTalk.done ? "done" : myTalk.deckPending ? "deck-soon" : null}
                  number={myLook.number}
                  palette={myLook.palette}
                  layout="center"
                />
              </Link>
              <div className="flex min-w-0 flex-col">
                <p className={cn("flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase", myLook.palette.label)}>
                  <Mic className="size-3.5" /> Your talk · {myTalk.status === "approved" ? "booked" : "requested"}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight capitalize">{whenFromNow(mineSlot.date, today)}</p>
                <p className="text-sm text-muted">
                  {dayLabel(mineSlot.date)}
                  {timeRange(mineSlot) ? ` · ${timeRange(mineSlot)}` : ""} · <span className="capitalize">{mineSlot.label}</span>
                </p>
                {data.myDeck?.description ? <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{data.myDeck.description}</p> : null}
                <Link
                  href={`/dashboard/talks/${myTalk.talkId}/present`}
                  className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background md:mt-auto"
                >
                  Open your talk page <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
            {data.myDeck && data.myDeck.deckStatus !== "approved" ? (
              <div className="mt-4">
                <DeckUploadPanel
                  talkId={myTalk.talkId}
                  booked={myTalk.status === "approved"}
                  deckStatus={data.myDeck.deckStatus}
                  feedback={data.myDeck.deckFeedback}
                />
              </div>
            ) : null}
          </AccentCard>
        ) : (
          <section className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-dashed border-border bg-card p-6 sm:flex-row sm:items-center">
            <div>
              <p className="flex items-center gap-2 font-semibold">
                <Mic className="size-4" /> Your talk
              </p>
              <p className="mt-1 text-sm text-muted">You&rsquo;re not on the schedule yet. Pick an open seat and send a request.</p>
            </div>
            <Link href="/dashboard/schedule" className="shrink-0 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background">
              Claim a slot
            </Link>
          </section>
        )}

        {/* next session */}
        {nextSession ? (
          <AccentCard palette={sessionLooks.get(nextSession.id)!.palette} className="h-fit p-5">
            <p className={cn("flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase", sessionLooks.get(nextSession.id)!.palette.label)}>
              <CalendarDays className="size-3.5" /> Next session · {whenFromNow(nextSession.date, today)}
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight capitalize">{nextSession.label}</h2>
            <p className="text-sm text-muted">
              {dayLabel(nextSession.date)}
              {timeRange(nextSession) ? ` · ${timeRange(nextSession)}` : ""}
            </p>
            {nextSession.type === "talk" ? (
              <ul className="mt-4 grid grid-cols-2 gap-2.5">
                {nextDay
                  .flatMap((s) => s.talks.filter((t) => t.status === "approved"))
                  .map((talk) => {
                    const look = looks.get(talk.talkId);
                    return (
                      <li key={talk.talkId}>
                        <Link
                          href={`/dashboard/talks/${talk.talkId}/present`}
                          className={cn("relative block aspect-[4/3] overflow-hidden rounded-xl border transition hover:-translate-y-0.5", look?.palette.well)}
                        >
                          <TitleCover
                            title={talk.title ?? "Untitled"}
                            speaker={talk.presenterName}
                            speakerAvatarUrl={talk.presenterAvatarUrl}
                            status={null}
                            number={look?.number ?? 0}
                            palette={look?.palette ?? sessionLooks.get(nextSession.id)!.palette}
                          />
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            ) : nextSession.recordingUrl ? (
              <WatchRecordingButton url={nextSession.recordingUrl} title={nextSession.label} className="mt-4" />
            ) : (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted">
                <Video className="size-4" /> The whole cohort, together.
              </p>
            )}
          </AccentCard>
        ) : null}
      </div>

      {/* feedback you owe */}
      <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="size-4 text-muted" /> Feedback you owe
        </h2>
        {owed.length === 0 ? (
          <p className="mt-3 flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 text-sm text-muted">
            <CheckCircle2 className="size-4 shrink-0 text-success" /> You&rsquo;re all caught up. Talks show up here when the curator opens scoring.
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {owed.map(({ talk }) => {
              const look = looks.get(talk.talkId);
              return (
                <li key={talk.talkId}>
                  <Link
                    href={`/dashboard/talks/${talk.talkId}/present`}
                    className="group block overflow-hidden rounded-2xl border border-border bg-background/40 transition hover:-translate-y-0.5 hover:border-foreground/30"
                  >
                    <div className={cn("relative aspect-video overflow-hidden", look?.palette.well)}>
                      {look ? (
                        <TitleCover
                          title={talk.title ?? "Untitled"}
                          speaker={talk.presenterName}
                          speakerAvatarUrl={talk.presenterAvatarUrl}
                          status={null}
                          number={look.number}
                          palette={look.palette}
                          layout="center"
                        />
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
                        <span className="size-1.5 rounded-full bg-success" /> Scoring open
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background">
                        <Star className="size-3.5" /> Rate now
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <SeasonStrip slots={slots} />
    </div>
  );
}
