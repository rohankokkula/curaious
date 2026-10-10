import { NextResponse } from "next/server";
import { emptyAggregate } from "@/lib/ratings";
import { loadRatingAggregate } from "@/lib/ratingsAggregate";
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

  const aggregate = await loadRatingAggregate(talk.id);

  // Sealed until the season's last talk is done (curator excepted): the
  // count and written notes come through, the numbers don't.
  if (!isAdmin) {
    const { data: slot } = await admin.from("session_slots").select("season_id").eq("id", talk.slot_id).maybeSingle<{ season_id: string }>();
    const { data: sessions } = slot
      ? await admin.from("session_slots").select("slot_date, slot_type").eq("season_id", slot.season_id).returns<{ slot_date: string; slot_type: string }[]>()
      : { data: [] };
    const seasonSessions = (sessions ?? []).map((s) => ({ date: s.slot_date, type: s.slot_type }));
    if (!scoresRevealed(seasonSessions)) {
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
