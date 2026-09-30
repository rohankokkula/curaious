/**
 * SERVER-ONLY. Imports the service-role client — Route Handlers and Server
 * Components only. Kept out of ratings.ts on purpose: that file is plain
 * schemas/types, deliberately safe to import from a Client Component, and
 * pulling the service-role client in there would break that.
 */
import { emptyAggregate, RATING_PARAMETERS, type RatingAggregate } from "@/lib/ratings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
 * Aggregated feedback for one talk — same computation GET
 * /api/talks/[id]/ratings wraps, callable directly. Access control is the
 * caller's job (same as before: the route still gates on `loadTalkAccess`
 * for any client-side caller; the member-profile page only ever calls this
 * for a talk it already knows is approved).
 */
export async function loadRatingAggregate(talkId: string): Promise<RatingAggregate> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("ratings")
    .select("rater_id, understanding, content, research_depth, delivery, usefulness, comment")
    .eq("talk_id", talkId)
    .order("id", { ascending: true })
    .returns<RatingRow[]>();

  if (error) {
    console.error("loadRatingAggregate: query failed", error.message);
    return emptyAggregate();
  }

  const rows = data ?? [];
  if (rows.length === 0) return emptyAggregate();

  const aggregate: RatingAggregate = emptyAggregate();
  aggregate.count = rows.length;

  let overallTotal = 0;
  for (const parameter of RATING_PARAMETERS) {
    const total = rows.reduce((sum, row) => sum + row[parameter.key], 0);
    aggregate.averages[parameter.key] = round(total / rows.length);
    overallTotal += total;
  }
  aggregate.averages.overall = round(overallTotal / (rows.length * RATING_PARAMETERS.length));

  const commentRows = rows.filter((row) => row.comment?.trim());
  if (commentRows.length > 0) {
    const { data: raters } = await admin
      .from("profiles")
      .select("id, name, avatar_url")
      .in(
        "id",
        commentRows.map((row) => row.rater_id),
      )
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

  return aggregate;
}
