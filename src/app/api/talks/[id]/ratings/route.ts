import { NextResponse } from "next/server";
import { loadRatingAggregate } from "@/lib/ratingsAggregate";
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
  const { talk, canView, userId } = await loadTalkAccess(id);

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
  return NextResponse.json({ ok: true, talkId: talk.id, aggregate });
}
