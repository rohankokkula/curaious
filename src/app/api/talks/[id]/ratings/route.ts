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
  rater_id: string;
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
 * Aggregated feedback for one talk. Runs with the service-role client so it
 * can read every rating — the base `ratings` table stays locked to
 * rater-or-admin, so this route is the only way peer feedback becomes
 * visible. Comments carry the rater's name; feedback here is attributed, not
 * anonymous.
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
    .select(
      "rater_id, understanding, content, research_depth, delivery, usefulness, comment",
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

  const commentRows = rows.filter((row) => row.comment?.trim());

  if (commentRows.length > 0) {
    const { data: raters } = await admin
      .from("profiles")
      .select("id, name, avatar_url")
      .in("id", commentRows.map((row) => row.rater_id))
      .returns<{ id: string; name: string; avatar_url: string | null }[]>();

    const raterById = new Map((raters ?? []).map((r) => [r.id, r]));

    aggregate.comments = commentRows.map((row) => {
      const rater = raterById.get(row.rater_id);
      return {
        raterName: rater?.name ?? "A member",
        raterAvatarUrl: rater?.avatar_url ?? null,
        text: row.comment!.trim(),
      };
    });
  }

  return NextResponse.json({ ok: true, talkId: talk.id, aggregate });
}
