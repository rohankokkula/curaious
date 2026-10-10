/**
 * SERVER-ONLY. Imports the service-role client.
 *
 * The season leaderboard: every approved talk ranked by its overall average.
 * Raw ratings are only readable by their rater and the curator (RLS), so the
 * ranking is computed here and only handed out once scores are revealed, or
 * to the curator. Speakers who keep their scores private (visibility.scores)
 * aren't ranked, and a talk needs MIN_RATINGS scores to place.
 */
import { canSee, resolveVisibility } from "@/lib/profile";
import { RATING_PARAMETERS, type RatingParameterKey } from "@/lib/ratings";
import { scoresRevealed, scoresRevealOn } from "@/lib/scoreReveal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const MIN_RATINGS = 3;

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
};

export type Leaderboard = {
  revealed: boolean;
  revealOn: string | null;
  entries: LeaderboardEntry[];
  /** Best talk on each parameter. */
  categoryLeaders: { key: RatingParameterKey; label: string; entry: LeaderboardEntry; value: number }[];
  talksGiven: number;
  talksTotal: number;
  scoresIn: number;
  /** Rated talks left out: too few scores, or the speaker keeps scores private. */
  unranked: number;
};

type SlotRow = {
  slot_date: string;
  slot_type: string;
  talks: { id: string; title: string; status: string; presenter: { id: string; name: string; avatar_url: string | null; visibility: unknown } | null }[];
};
type RatingRow = { talk_id: string } & Record<RatingParameterKey, number>;

const r1 = (n: number) => Math.round(n * 10) / 10;

export async function loadLeaderboard(seasonId: string): Promise<Leaderboard> {
  const admin = createSupabaseAdminClient();
  const { data: slots } = await admin
    .from("session_slots")
    .select("slot_date, slot_type, talks (id, title, status, presenter:profiles!presenter_id (id, name, avatar_url, visibility))")
    .eq("season_id", seasonId)
    .eq("talks.status", "approved")
    .returns<SlotRow[]>();

  const sessions = (slots ?? []).map((s) => ({ date: s.slot_date, type: s.slot_type }));
  const today = new Date().toISOString().slice(0, 10);
  const talks = (slots ?? []).flatMap((s) => s.talks.map((t) => ({ ...t, date: s.slot_date })));
  const talkIds = talks.map((t) => t.id);

  const { data: ratings } = talkIds.length
    ? await admin
        .from("ratings")
        .select(`talk_id, ${RATING_PARAMETERS.map((p) => p.key).join(", ")}`)
        .in("talk_id", talkIds)
        .returns<RatingRow[]>()
    : { data: [] as RatingRow[] };

  const byTalk = new Map<string, RatingRow[]>();
  for (const row of ratings ?? []) byTalk.set(row.talk_id, [...(byTalk.get(row.talk_id) ?? []), row]);

  let unranked = 0;
  const scored: Omit<LeaderboardEntry, "rank">[] = [];
  for (const talk of talks) {
    const rows = byTalk.get(talk.id) ?? [];
    if (!rows.length || !talk.presenter) continue;
    const showsScores = canSee(resolveVisibility(talk.presenter.visibility), "scores", { isSelf: false, isAdmin: false });
    if (rows.length < MIN_RATINGS || !showsScores) {
      unranked += 1;
      continue;
    }
    const averages = Object.fromEntries(
      RATING_PARAMETERS.map((p) => [p.key, r1(rows.reduce((sum, row) => sum + row[p.key], 0) / rows.length)]),
    ) as Record<RatingParameterKey, number>;
    const overall = r1(RATING_PARAMETERS.reduce((sum, p) => sum + rows.reduce((s, row) => s + row[p.key], 0), 0) / (rows.length * RATING_PARAMETERS.length));
    scored.push({
      talkId: talk.id,
      title: talk.title,
      date: talk.date,
      speaker: { id: talk.presenter.id, name: talk.presenter.name, avatarUrl: talk.presenter.avatar_url },
      overall,
      count: rows.length,
      averages,
    });
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

  return {
    revealed: scoresRevealed(sessions, today),
    revealOn: scoresRevealOn(sessions),
    entries,
    categoryLeaders,
    talksGiven: talks.filter((t) => t.date < today).length,
    talksTotal: talks.length,
    scoresIn: (ratings ?? []).length,
    unranked,
  };
}
