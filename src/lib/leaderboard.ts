/**
 * SERVER-ONLY. Imports the service-role client.
 *
 * The season leaderboard: every approved talk ranked by its overall average.
 * Raw ratings are only readable by their rater and the curator (RLS), so the
 * ranking is computed here and only handed out once scores are revealed, or
 * to the curator. Speakers who keep their scores private (visibility.scores)
 * aren't ranked; everyone else ranks from their first score.
 */
import { canSee, resolveVisibility } from "@/lib/profile";
import { RATING_PARAMETERS, type RatingParameterKey } from "@/lib/ratings";
import { loadPresentedIds } from "@/lib/presented";
import { scoresRevealed, scoresRevealOn } from "@/lib/scoreReveal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** A talk ranks from its first score: no waiting for a minimum. */
export const MIN_RATINGS = 1;

/** False when the curator switched it off, or the column isn't there yet (0015 not pasted). */
export async function leaderboardEnabled(seasonId: string): Promise<boolean> {
  const { data, error } = await createSupabaseAdminClient()
    .from("seasons")
    .select("leaderboard_enabled")
    .eq("id", seasonId)
    .maybeSingle<{ leaderboard_enabled: boolean }>();
  if (error || !data) return false;
  return data.leaderboard_enabled;
}

export type LeaderboardEntry = {
  rank: number;
  talkId: string;
  title: string;
  date: string;
  speaker: { id: string; name: string; avatarUrl: string | null };
  overall: number;
  count: number;
  averages: Record<RatingParameterKey, number>;
  /** marked done by the curator */
  done: boolean;
  /** written feedback, newest first */
  notes: { name: string; avatarUrl: string | null; text: string }[];
  /** the speaker lets others read their feedback (visibility.feedback) */
  notesPublic: boolean;
};

/** A booked talk that isn't ranked (yet): no scores, too few, or private. */
export type PendingEntry = Omit<LeaderboardEntry, "rank" | "overall" | "averages"> & {
  /** live averages so far; only ever shown to the curator */
  overall: number | null;
  averages: Record<RatingParameterKey, number | null>;
  reason: "no-scores" | "too-few" | "private";
};

export type Leaderboard = {
  revealed: boolean;
  revealOn: string | null;
  allDone: boolean;
  entries: LeaderboardEntry[];
  /** every other booked talk, in schedule order, so the board is never empty */
  pending: PendingEntry[];
  /** Best talk on each parameter. */
  categoryLeaders: { key: RatingParameterKey; label: string; entry: LeaderboardEntry; value: number }[];
  talksGiven: number;
  talksTotal: number;
  scoresIn: number;
};

type SlotRow = {
  slot_date: string;
  slot_type: string;
  sort_order: number;
  talks: {
    id: string;
    title: string;
    status: string;
    submitted_at: string;
    presenter: { id: string; name: string; avatar_url: string | null; visibility: unknown } | null;
  }[];
};
type RatingRow = { talk_id: string; comment: string | null; created_at: string; rater: { name: string; avatar_url: string | null } | null } & Record<
  RatingParameterKey,
  number
>;

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Every booked talk in the season with its live scores. Talks with a score
 * (and a speaker who shows scores) are ranked; the rest are listed as
 * pending so the board always shows the whole season.
 */
export async function loadLeaderboard(seasonId: string): Promise<Leaderboard> {
  const admin = createSupabaseAdminClient();
  const { data: slots } = await admin
    .from("session_slots")
    .select("slot_date, slot_type, sort_order, talks (id, title, status, submitted_at, presenter:profiles!presenter_id (id, name, avatar_url, visibility))")
    .eq("season_id", seasonId)
    .eq("talks.status", "approved")
    .returns<SlotRow[]>();

  const sessions = (slots ?? []).map((s) => ({ date: s.slot_date, type: s.slot_type }));
  const today = new Date().toISOString().slice(0, 10);
  // schedule order: date, session, then seat
  const talks = [...(slots ?? [])]
    .sort((a, b) => a.slot_date.localeCompare(b.slot_date) || a.sort_order - b.sort_order)
    .flatMap((s) => [...s.talks].sort((a, b) => a.submitted_at.localeCompare(b.submitted_at)).map((t) => ({ ...t, date: s.slot_date })));
  const talkIds = talks.map((t) => t.id);

  const [{ data: ratings }, presented] = await Promise.all([
    talkIds.length
      ? admin
          .from("ratings")
          .select(`talk_id, comment, created_at, rater:profiles!rater_id (name, avatar_url), ${RATING_PARAMETERS.map((p) => p.key).join(", ")}`)
          .in("talk_id", talkIds)
          .returns<RatingRow[]>()
      : Promise.resolve({ data: [] as RatingRow[] }),
    loadPresentedIds(talkIds),
  ]);

  const byTalk = new Map<string, RatingRow[]>();
  for (const row of ratings ?? []) byTalk.set(row.talk_id, [...(byTalk.get(row.talk_id) ?? []), row]);

  const scored: Omit<LeaderboardEntry, "rank">[] = [];
  const pending: PendingEntry[] = [];
  for (const talk of talks) {
    if (!talk.presenter) continue;
    const rows = byTalk.get(talk.id) ?? [];
    const base = {
      talkId: talk.id,
      title: talk.title,
      date: talk.date,
      speaker: { id: talk.presenter.id, name: talk.presenter.name, avatarUrl: talk.presenter.avatar_url },
      count: rows.length,
      done: presented.has(talk.id),
      notes: rows
        .filter((r) => r.comment?.trim())
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((r) => ({ name: r.rater?.name ?? "A member", avatarUrl: r.rater?.avatar_url ?? null, text: r.comment!.trim() })),
      notesPublic: canSee(resolveVisibility(talk.presenter.visibility), "feedback", { isSelf: false, isAdmin: false }),
    };
    const overall = rows.length
      ? r1(RATING_PARAMETERS.reduce((sum, p) => sum + rows.reduce((acc, row) => acc + row[p.key], 0), 0) / (rows.length * RATING_PARAMETERS.length))
      : null;
    const showsScores = canSee(resolveVisibility(talk.presenter.visibility), "scores", { isSelf: false, isAdmin: false });
    const averages = Object.fromEntries(
      RATING_PARAMETERS.map((p) => [p.key, rows.length ? r1(rows.reduce((sum, row) => sum + row[p.key], 0) / rows.length) : null]),
    ) as Record<RatingParameterKey, number | null>;

    if (overall === null || rows.length < MIN_RATINGS || !showsScores) {
      pending.push({ ...base, overall, averages, reason: !showsScores && rows.length ? "private" : rows.length ? "too-few" : "no-scores" });
      continue;
    }
    scored.push({ ...base, overall, averages: averages as Record<RatingParameterKey, number> });
  }

  // Highest overall first; more scores breaks a tie. Equal scores share a rank.
  scored.sort((a, b) => b.overall - a.overall || b.count - a.count);
  const entries: LeaderboardEntry[] = [];
  scored.forEach((entry, i) => {
    const rank = i > 0 && entry.overall === scored[i - 1].overall ? entries[i - 1].rank : i + 1;
    entries.push({ ...entry, rank });
  });

  const categoryLeaders = entries.length
    ? RATING_PARAMETERS.map((p) => {
        const entry = [...entries].sort((a, b) => b.averages[p.key] - a.averages[p.key] || b.count - a.count)[0];
        return { key: p.key, label: p.label, entry, value: entry.averages[p.key] };
      })
    : [];

  const allDone = talks.length > 0 && talks.every((t) => presented.has(t.id));
  return {
    revealed: scoresRevealed(sessions, today, allDone),
    revealOn: scoresRevealOn(sessions),
    allDone,
    entries,
    pending,
    categoryLeaders,
    talksGiven: talks.filter((t) => presented.has(t.id) || t.date < today).length,
    talksTotal: talks.length,
    scoresIn: (ratings ?? []).length,
  };
}
