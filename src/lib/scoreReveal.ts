/**
 * Scores stay sealed until the whole season has presented: nobody (the
 * speaker included) sees a talk's averages until the day after the season's
 * last talk session, so the anticipation builds toward the reveal. The
 * curator sees them all along. Written feedback isn't sealed, only numbers.
 *
 * Plain logic, no server imports: safe anywhere.
 */
type SessionLike = { date: string; type: string };

/** The day scores open (YYYY-MM-DD, UTC): the day after the last talk session. Null if there are no talks. */
export function scoresRevealOn(sessions: SessionLike[]): string | null {
  const last = sessions
    .filter((s) => s.type === "talk")
    .map((s) => s.date)
    .sort()
    .at(-1);
  if (!last) return null;
  const next = new Date(`${last}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

export function scoresRevealed(sessions: SessionLike[], today = new Date().toISOString().slice(0, 10)) {
  const on = scoresRevealOn(sessions);
  return on !== null && today >= on;
}

export const revealDateLabel = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
