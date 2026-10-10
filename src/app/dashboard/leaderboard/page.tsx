import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronDown, Crown, Eye, Lock, Medal, MessageSquare, Trophy } from "lucide-react";
import { LeaderboardToggle } from "@/components/admin/LeaderboardToggle";
import { Avatar } from "@/components/dashboard/Avatar";
import { LiveRefresh } from "@/components/dashboard/LiveRefresh";
import { SeasonBadges } from "@/components/dashboard/SeasonBadges";
import { talkLooks } from "@/components/dashboard/seasonLayout";
import { getActiveCohort } from "@/lib/cohort";
import { leaderboardEnabled, loadLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard";
import { pageMetadata } from "@/lib/og/metadata";
import { RATING_MAX, RATING_PARAMETERS, type RatingParameterKey } from "@/lib/ratings";
import { scoreColor } from "@/lib/scoreColors";
import { loadSeasonSlots } from "@/lib/slots";
import { getViewerProfile } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("badges", { title: "Leaderboard" });

/** Gold, silver, bronze. */
const MEDALS = [
  { ring: "ring-amber-400", text: "text-amber-500 dark:text-amber-300", bg: "from-amber-400/25", label: "1st" },
  { ring: "ring-slate-300", text: "text-slate-500 dark:text-slate-300", bg: "from-slate-300/25", label: "2nd" },
  { ring: "ring-orange-400", text: "text-orange-600 dark:text-orange-300", bg: "from-orange-400/25", label: "3rd" },
];

export default async function LeaderboardPage() {
  const [viewer, cohort] = await Promise.all([getViewerProfile(), getActiveCohort()]);
  if (!viewer || !cohort) notFound();
  const isAdmin = viewer.role === "admin";
  const [enabled, board] = await Promise.all([leaderboardEnabled(cohort.id), loadLeaderboard(cohort.id)]);
  // Members see rankings once the curator has it switched on AND every talk is
  // done; until then the page says when it unveils. The curator always sees it, live.
  const showScores = isAdmin || (enabled && board.revealed);

  // talk order, numbered exactly as the schedule numbers them (talk 01, 02…)
  const { slots } = await loadSeasonSlots(viewer.id);
  const looks = talkLooks(slots);
  const rows = [...board.entries, ...board.pending].sort(
    (x, y) => (looks.get(x.talkId)?.number ?? 999) - (looks.get(y.talkId)?.number ?? 999) || x.date.localeCompare(y.date),
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">{cohort.name}</p>
          <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-bold tracking-tight">
            <Trophy className="size-7 text-amber-500" /> Leaderboard
          </h1>
          <p className="mt-1 max-w-xl text-muted">
            Every talk this season, ranked by the room&rsquo;s overall score out of {RATING_MAX}, and the season&rsquo;s badges.
          </p>
        </div>
        {isAdmin ? <LiveRefresh /> : null}
      </header>

      {isAdmin ? <LeaderboardToggle enabled={enabled} /> : null}

      {showScores ? (
        <>
          {isAdmin && !(enabled && board.revealed) ? (
            <p className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm">
              <Eye className="size-4 shrink-0 text-amber-500" />
              Only you see the scores. Members see this table with scores hidden until
              {enabled ? " you mark the last talk done." : " you switch the leaderboard on and every talk is done."}
            </p>
          ) : null}

          {board.entries.length > 0 ? <Podium entries={board.entries.slice(0, 3)} /> : null}

          {board.categoryLeaders.length ? (
            <section>
              <h2 className="text-sm font-semibold">Best in category</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                {board.categoryLeaders.map((c) => (
                  <Link
                    key={c.key}
                    href={`/dashboard/members/${c.entry.speaker.id}`}
                    className="rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-foreground/25"
                  >
                    <p className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">{c.label}</p>
                    <div className="mt-3 flex items-center gap-2.5">
                      <Avatar name={c.entry.speaker.name} src={c.entry.speaker.avatarUrl} size="sm" />
                      <p className="min-w-0 truncate text-sm font-semibold">{c.entry.speaker.name}</p>
                    </div>
                    <p className="mt-2 text-2xl font-bold tabular-nums">
                      {c.value}
                      <span className="text-sm font-medium text-muted"> / {RATING_MAX}</span>
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <SealedBanner board={board} />
      )}

      {/* every booked talk in talk order; scores fill in as they unveil */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">All talks</h2>
          <p className="text-xs text-muted">
            {board.talksGiven}/{board.talksTotal} done · {board.scoresIn} scores in
          </p>
        </div>
        <ol className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          <HeaderRow />
          {rows.map((row) => {
            const ranked = "rank" in row;
            const look = looks.get(row.talkId);
            return (
              <Row
                key={row.talkId}
                href={`/dashboard/talks/${row.talkId}/present`}
                accent={look?.palette.label}
                speaker={row.speaker}
                you={row.speaker.id === viewer.id}
                title={row.title}
                done={row.done}
                date={row.date}
                // members: nothing until the unveil; the curator watches partial scores come in
                score={showScores && (ranked || isAdmin) ? row.overall : null}
                averages={showScores && (ranked || isAdmin) ? row.averages : null}
                muted={!ranked}
                // notes are public once the curator marks the talk done (the
                // curator sees them live); members only if the speaker shares them
                notes={isAdmin || (row.done && row.notesPublic) ? row.notes : null}
                note={
                  !showScores
                    ? "Hidden"
                    : ranked
                      ? `Rank ${row.rank} · ${row.count} scores`
                      : row.reason === "no-scores"
                        ? "No scores"
                        : row.reason === "private"
                          ? `Scores kept private${isAdmin ? ` · ${row.count}` : ""}`
                          : `${row.count} scores`
                }
              />
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-muted">
          {showScores
            ? "In talk order. A talk is ranked from its first score, and moves as more come in. Equal scores share a rank."
            : "In talk order. Every score unveils at the same moment, once all the talks are done."}
        </p>
      </section>

      <section id="badges" className="scroll-mt-24 border-t border-border pt-8">
        <SeasonBadges />
      </section>
    </div>
  );
}

/** Shared column widths, so the header lines up with every row. */
const COLS = "grid grid-cols-[0.25rem_2.5rem_minmax(0,1fr)_3.5rem] items-center gap-3 sm:gap-4 lg:grid-cols-[0.25rem_2.5rem_minmax(0,1fr)_repeat(5,5.25rem)_4rem]";

function HeaderRow() {
  return (
    <li aria-hidden className={cn(COLS, "hidden bg-surface/60 px-4 py-2 text-[10px] font-semibold tracking-[0.12em] text-muted uppercase lg:grid")}>
      <span />
      <span />
      <span>Speaker &amp; talk</span>
      {RATING_PARAMETERS.map((p) => (
        <span key={p.key} className="text-center text-[11px] font-medium tracking-normal normal-case" title={p.label}>
          {p.short}
        </span>
      ))}
      <span className="text-right">Overall</span>
    </li>
  );
}

/** One parameter's average as a small colored chip ("–" when there's none). */
function ScoreCell({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="block text-center text-sm text-muted/50">–</span>;
  const color = scoreColor(value);
  return (
    <span className="flex justify-center">
      <span
        className="min-w-11 rounded-lg px-1.5 py-1 text-center text-sm font-bold tabular-nums"
        style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
      >
        {value.toFixed(1)}
      </span>
    </span>
  );
}

function Row({
  href,
  accent,
  speaker,
  you,
  title,
  done,
  date,
  score,
  averages,
  note,
  muted,
  notes,
}: {
  href: string;
  /** text-color class of the talk's day, drawn as a thin bar (no number: it'd read as a rank) */
  accent?: string;
  speaker: { name: string; avatarUrl: string | null };
  you: boolean;
  title: string;
  done: boolean;
  date: string;
  score: number | null;
  /** null hides the breakdown (a member looking at an unranked talk) */
  averages: Record<RatingParameterKey, number | null> | null;
  note: string;
  muted?: boolean;
  /** written feedback to show under the row; null hides it */
  notes: { name: string; avatarUrl: string | null; text: string }[] | null;
}) {
  return (
    <li>
      <Link href={href} className={cn(COLS, "px-4 py-3 transition hover:bg-surface")}>
        <span aria-hidden className={cn("h-10 w-1 rounded-full bg-current", accent ?? "text-border")} />
        <Avatar name={speaker.name} src={speaker.avatarUrl} size="md" className={cn(muted && "opacity-80")} />
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate font-semibold">{speaker.name}</span>
            {you ? <span className="text-xs font-medium text-muted">(you)</span> : null}
            {done ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-semibold text-sky-600 dark:text-sky-300">
                <Check className="size-3" /> Done
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-muted">{shortDate(date)}</span>
            )}
          </span>
          <span className="block truncate text-sm text-muted">{title}</span>
          {/* phones and tablets: the five scores as a compact line */}
          {averages && score !== null ? (
            <span className="mt-1.5 flex flex-wrap gap-1 lg:hidden">
              {RATING_PARAMETERS.map((p) => {
                const v = averages[p.key];
                return (
                  <span
                    key={p.key}
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                    style={v !== null ? { background: `color-mix(in srgb, ${scoreColor(v)} 16%, transparent)`, color: scoreColor(v) } : undefined}
                  >
                    {p.short} {v !== null ? v.toFixed(1) : "–"}
                  </span>
                );
              })}
            </span>
          ) : null}
        </span>
        {RATING_PARAMETERS.map((p) => (
          <span key={p.key} className="hidden lg:block">
            <ScoreCell value={averages ? averages[p.key] : null} />
          </span>
        ))}
        <span className="text-right">
          <span className={cn("block text-xl font-bold tabular-nums", muted && "text-muted")} style={score !== null && !muted ? { color: scoreColor(score) } : undefined}>
            {score !== null ? score.toFixed(1) : "–"}
          </span>
          <span className="block truncate text-[10px] text-muted">{note}</span>
        </span>
      </Link>
      {notes && notes.length > 0 ? (
        <details className="group/notes border-t border-dashed border-border/70 px-4 py-2 pl-[4.25rem] sm:pl-[4.75rem]">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
            <MessageSquare className="size-3.5" />
            {notes.length} {notes.length === 1 ? "note" : "notes"} from the room
            <ChevronDown className="size-3.5 transition group-open/notes:rotate-180" />
          </summary>
          <ul className="mt-2.5 grid grid-cols-1 gap-2 pb-1.5 md:grid-cols-2">
            {notes.map((n, i) => (
              <li key={i} className="flex gap-2.5">
                <Avatar name={n.name} src={n.avatarUrl} size="sm" className="size-7 text-[10px]" />
                <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-surface px-3 py-2">
                  <p className="text-xs font-semibold">{n.name}</p>
                  <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-line text-muted">{n.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </li>
  );
}

const shortDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Top three, gold in the middle on wider screens. */
function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const order = entries.length === 3 ? [1, 0, 2] : entries.map((_, i) => i);
  return (
    <section className="grid gap-3 sm:grid-cols-3 sm:items-end sm:gap-4">
      {order.map((i) => {
        const entry = entries[i];
        const medal = MEDALS[Math.min(entry.rank, 3) - 1];
        const first = entry.rank === 1;
        return (
          <Link
            key={entry.talkId}
            href={`/dashboard/members/${entry.speaker.id}`}
            className={cn(
              "relative flex flex-col items-center overflow-hidden rounded-3xl border border-border bg-gradient-to-b to-card px-4 text-center transition hover:-translate-y-0.5",
              medal.bg,
              first ? "order-first pt-8 pb-7 sm:order-none" : "pt-6 pb-5",
              i === 1 && "order-2 sm:order-none",
              i === 2 && "order-3 sm:order-none",
            )}
          >
            {first ? <Crown className="absolute top-3 size-5 text-amber-500" /> : null}
            <Avatar name={entry.speaker.name} src={entry.speaker.avatarUrl} size="lg" className={cn("ring-4", medal.ring, !first && "size-20")} />
            <p className={cn("mt-3 inline-flex items-center gap-1 text-xs font-bold tracking-[0.16em] uppercase", medal.text)}>
              <Medal className="size-3.5" /> {medal.label}
            </p>
            <p className="mt-1 text-lg leading-tight font-bold">{entry.speaker.name}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{entry.title}</p>
            <p className={cn("mt-3 font-bold tabular-nums", first ? "text-4xl" : "text-3xl")}>
              {entry.overall}
              <span className="text-base font-medium text-muted"> / {RATING_MAX}</span>
            </p>
            <p className="text-xs text-muted">{entry.count} scores</p>
          </Link>
        );
      })}
    </section>
  );
}

/** Before the unveil: the table is there, the numbers aren't. */
function SealedBanner({ board }: { board: Awaited<ReturnType<typeof loadLeaderboard>> }) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-amber-400/30 bg-amber-400/[0.06] p-5 sm:flex-row sm:items-center">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-500">
        <Lock className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold tracking-tight">Scores unveil after all the talks are done</h2>
        <p className="mt-0.5 text-sm text-muted">Everyone&rsquo;s scores open together, at the same moment. Until then, nobody sees where they stand.</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <span className="rounded-2xl border border-border bg-background/60 px-4 py-2 text-center">
          <span className="block text-xl font-bold tabular-nums">
            {board.talksGiven}
            <span className="text-xs font-medium text-muted">/{board.talksTotal}</span>
          </span>
          <span className="text-[11px] text-muted">talks done</span>
        </span>
        <span className="rounded-2xl border border-border bg-background/60 px-4 py-2 text-center">
          <span className="block text-xl font-bold tabular-nums">{board.scoresIn}</span>
          <span className="text-[11px] text-muted">scores in</span>
        </span>
      </div>
    </section>
  );
}
