import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Crown, Eye, Lock, Medal, Trophy } from "lucide-react";
import { LeaderboardToggle } from "@/components/admin/LeaderboardToggle";
import { Avatar } from "@/components/dashboard/Avatar";
import { SeasonBadges } from "@/components/dashboard/SeasonBadges";
import { getActiveCohort } from "@/lib/cohort";
import { leaderboardEnabled, loadLeaderboard, MIN_RATINGS, type LeaderboardEntry } from "@/lib/leaderboard";
import { pageMetadata } from "@/lib/og/metadata";
import { RATING_MAX } from "@/lib/ratings";
import { revealDateLabel } from "@/lib/scoreReveal";
import { getViewerProfile } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("badges", { title: "Leaderboard & badges" });

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
  const enabled = await leaderboardEnabled(cohort.id);
  // Switched off: members get the badges only, no rankings at all.
  const rankingsShown = enabled || isAdmin;

  const board = rankingsShown ? await loadLeaderboard(cohort.id) : null;
  const showRanking = Boolean(board && (board.revealed || isAdmin));
  const revealLabel = board?.revealOn ? revealDateLabel(board.revealOn) : null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">{cohort.name}</p>
          <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-bold tracking-tight">
            {rankingsShown ? <Trophy className="size-7 text-amber-500" /> : <Award className="size-7 text-amber-500" />}
            {rankingsShown ? "Leaderboard" : "Badges"}
          </h1>
          <p className="mt-1 max-w-xl text-muted">
            {rankingsShown
              ? `Every talk this season, ranked by the room’s overall score out of ${RATING_MAX}, and the season’s badges.`
              : "Four badges, handed out by the curator over the season. Each one goes to whoever earned it most."}
          </p>
        </div>
      </header>

      {isAdmin ? <LeaderboardToggle enabled={enabled} /> : null}

      {!board ? null : !showRanking ? (
        <Sealed revealLabel={revealLabel} board={board} />
      ) : (
        <>
          {isAdmin && !board.revealed ? (
            <p className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm">
              <Eye className="size-4 shrink-0 text-amber-500" />
              Curator preview. Members see a sealed board until {revealLabel ?? "the last talk is done"}.
            </p>
          ) : null}

          {board.entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
              <Trophy className="mx-auto size-6 text-muted" />
              <p className="mt-3 font-semibold">Nobody on the board yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">A talk places once it has {MIN_RATINGS} or more scores from the room.</p>
            </div>
          ) : (
            <>
              <Podium entries={board.entries.slice(0, 3)} />

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

              <section>
                <h2 className="text-sm font-semibold">Full ranking</h2>
                <ol className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                  {board.entries.map((entry) => (
                    <li key={entry.talkId}>
                      <Link href={`/dashboard/members/${entry.speaker.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface sm:gap-4">
                        <span
                          className={cn(
                            "w-7 shrink-0 text-center text-lg font-bold tabular-nums",
                            entry.rank <= 3 ? MEDALS[entry.rank - 1].text : "text-muted",
                          )}
                        >
                          {entry.rank}
                        </span>
                        <Avatar name={entry.speaker.name} src={entry.speaker.avatarUrl} size="md" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">
                            {entry.speaker.name}
                            {entry.speaker.id === viewer.id ? <span className="ml-1.5 text-xs font-medium text-muted">(you)</span> : null}
                          </span>
                          <span className="block truncate text-sm text-muted">{entry.title}</span>
                        </span>
                        <span className="hidden w-32 shrink-0 sm:block">
                          <span className="block h-2 overflow-hidden rounded-full bg-surface">
                            <span className="block h-full rounded-full bg-primary" style={{ width: `${(entry.overall / RATING_MAX) * 100}%` }} />
                          </span>
                          <span className="mt-1 block text-[11px] text-muted">{entry.count} scores</span>
                        </span>
                        <span className="w-12 shrink-0 text-right text-xl font-bold tabular-nums">{entry.overall}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-xs text-muted">
                  A talk needs {MIN_RATINGS}+ scores to place. Equal scores share a rank.
                  {board.unranked > 0
                    ? ` ${board.unranked} rated ${board.unranked === 1 ? "talk isn't" : "talks aren't"} ranked (too few scores, or the speaker keeps scores private).`
                    : ""}
                </p>
              </section>
            </>
          )}
        </>
      )}

      <section id="badges" className={cn("scroll-mt-24", board && "border-t border-border pt-8")}>
        <SeasonBadges heading={Boolean(board)} />
      </section>
    </div>
  );
}

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

/** Before the reveal: something's coming, nothing given away. */
function Sealed({ revealLabel, board }: { revealLabel: string | null; board: Awaited<ReturnType<typeof loadLeaderboard>> }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-12 text-center sm:py-16">
      {/* a blurred podium, the shape without the names */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center gap-3 opacity-40 blur-sm">
        <span className="h-20 w-20 rounded-t-2xl bg-slate-300/40 sm:w-28" />
        <span className="h-32 w-20 rounded-t-2xl bg-amber-400/40 sm:w-28" />
        <span className="h-14 w-20 rounded-t-2xl bg-orange-400/40 sm:w-28" />
      </div>
      <div className="relative">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-500">
          <Lock className="size-6" />
        </span>
        <h2 className="mt-4 text-2xl font-bold tracking-tight">The board is sealed</h2>
        <p className="mx-auto mt-2 max-w-md text-muted">
          Rankings open together once every talk is done{revealLabel ? `, on ${revealLabel}` : ""}. Until then, nobody sees where they stand.
        </p>
        <div className="mx-auto mt-6 flex max-w-sm justify-center gap-3 pb-16 sm:pb-20">
          <span className="flex-1 rounded-2xl border border-border bg-background/70 px-4 py-3">
            <span className="block text-2xl font-bold tabular-nums">
              {board.talksGiven}
              <span className="text-sm font-medium text-muted">/{board.talksTotal}</span>
            </span>
            <span className="text-xs text-muted">talks given</span>
          </span>
          <span className="flex-1 rounded-2xl border border-border bg-background/70 px-4 py-3">
            <span className="block text-2xl font-bold tabular-nums">{board.scoresIn}</span>
            <span className="text-xs text-muted">scores in</span>
          </span>
        </div>
      </div>
    </section>
  );
}
