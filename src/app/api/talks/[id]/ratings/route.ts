import { NextResponse } from "next/server";
import {
  emptyAggregate,
  RATING_PARAMETERS,
  type RatingAggregate,
} from "@/lib/ratings";
import { loadTalkAccess } from "@/lib/talkAccess";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type RatingRow = {
  understanding: number;
  content: number;
  research_depth: number;
  delivery: number;
  usefulness: number;
  comment: string | null;
};

function round(value: number) {
  return Math.round(value * 10) / 10;
}

/**
 * Aggregated feedback for one talk. Runs with the service-role client so it can
 * read every rating, but only ever returns averages and comment text — rater
 * identity is dropped before the response is built. The base `ratings` table
 * stays locked to rater-or-admin, so this route is the only way peer feedback
 * becomes visible, and it can't leak who said what.
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
  const { admin, talk, canView, userId } = await loadTalkAccess(id);

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

  const { data, error } = await admin
    .from("ratings")
    // No rater_id, no created_at: nothing that could be correlated back to a
    // person. Ordering by id keeps it stable but non-chronological.
    .select(
      "understanding, content, research_depth, delivery, usefulness, comment",
    )
    .eq("talk_id", talk.id)
    .order("id", { ascending: true })
    .returns<RatingRow[]>();

  if (error) {
    console.error("api/talks/[id]/ratings: query failed", error.message);
    return NextResponse.json(
      { ok: false, error: "query_failed" },
      { status: 500 },
    );
  }

  const rows = data ?? [];

  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      talkId: talk.id,
      aggregate: emptyAggregate(),
    });
  }

  const aggregate: RatingAggregate = emptyAggregate();
  aggregate.count = rows.length;

  let overallTotal = 0;

  for (const parameter of RATING_PARAMETERS) {
    const total = rows.reduce((sum, row) => sum + row[parameter.key], 0);
    aggregate.averages[parameter.key] = round(total / rows.length);
    overallTotal += total;
  }

  aggregate.averages.overall = round(
    overallTotal / (rows.length * RATING_PARAMETERS.length),
  );

  aggregate.comments = rows
    .map((row) => row.comment?.trim())
    .filter((comment): comment is string => Boolean(comment));

  return NextResponse.json({ ok: true, talkId: talk.id, aggregate });
}
