import { NextResponse } from "next/server";
import { emptyAggregate } from "@/lib/ratings";
import { loadRatingAggregate } from "@/lib/ratingsAggregate";
import { loadPresentedIds } from "@/lib/presented";
import { scoresRevealed, scoresRevealOn } from "@/lib/scoreReveal";
import { loadTalkAccess } from "@/lib/talkAccess";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/**
 * Aggregated feedback for one talk. Access-gated here for any client-side
 * caller; the actual aggregation lives in ratingsAggregate.ts so Server
 * Components (the member profile page) can call it directly instead of
 * making an HTTP round trip back to this route.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured || !hasServiceRoleKey) {
    return NextResponse.json(
      { ok: false, error: "server_not_configured" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const { talk, canView, userId, isAdmin, admin } = await loadTalkAccess(id);

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  if (!talk || !canView) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const loaded = await loadRatingAggregate(talk.id);
  // Written notes open once the curator marks this talk done.
  const notesOpen = isAdmin || (await loadPresentedIds([talk.id])).has(talk.id);
  const aggregate = notesOpen ? loaded : { ...loaded, comments: [] };

  // Scores are sealed until every talk is done (curator excepted): the
  // count comes through, the numbers don't.
  if (!isAdmin) {
    const { data: slot } = await admin.from("session_slots").select("season_id").eq("id", talk.slot_id).maybeSingle<{ season_id: string }>();
    const { data: sessions } = slot
      ? await admin
          .from("session_slots")
          .select("slot_date, slot_type, talks (id, status)")
          .eq("season_id", slot.season_id)
          .returns<{ slot_date: string; slot_type: string; talks: { id: string; status: string }[] }[]>()
      : { data: [] };
    const seasonSessions = (sessions ?? []).map((s) => ({ date: s.slot_date, type: s.slot_type }));
    const booked = (sessions ?? []).flatMap((s) => s.talks.filter((t) => t.status === "approved").map((t) => t.id));
    const presented = await loadPresentedIds(booked);
    const allDone = booked.length > 0 && booked.every((id) => presented.has(id));
    if (!scoresRevealed(seasonSessions, undefined, allDone)) {
      return NextResponse.json({
        ok: true,
        talkId: talk.id,
        aggregate: { ...aggregate, averages: emptyAggregate().averages },
        sealed: true,
        revealOn: scoresRevealOn(seasonSessions),
      });
    }
  }

  return NextResponse.json({ ok: true, talkId: talk.id, aggregate, sealed: false });
}
