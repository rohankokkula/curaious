import { NextResponse } from "next/server";
import { ratingSubmissionSchema } from "@/lib/ratings";
import { loadTalkAccess } from "@/lib/talkAccess";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const UNIQUE_VIOLATION = "23505";

async function save(request: Request, mode: "create" | "update") {
  if (!isSupabaseConfigured || !hasServiceRoleKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "server_not_configured",
        message: "feedback isn't switched on yet.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "bad_request", message: "couldn't read that." },
      { status: 400 },
    );
  }

  const parsed = ratingSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "validation_failed",
        details: parsed.error.flatten().fieldErrors,
        message: "every parameter needs a score from 1 to 10.",
      },
      { status: 400 },
    );
  }

  const { talkId, comment, ...scores } = parsed.data;
  const { admin, talk, userId } = await loadTalkAccess(talkId);

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "unauthorized", message: "sign in first." },
      { status: 401 },
    );
  }

  // Same eligibility test as the `ratings` insert RLS policy, re-checked here
  // because this route runs with the service-role client and bypasses it.
  if (!talk || talk.status !== "approved") {
    return NextResponse.json(
      {
        ok: false,
        error: "not_rateable",
        message: "you can only rate an approved talk.",
      },
      { status: 403 },
    );
  }

  if (talk.presenter_id === userId) {
    return NextResponse.json(
      {
        ok: false,
        error: "self_rating",
        message: "you can't rate your own talk.",
      },
      { status: 403 },
    );
  }

  const payload = {
    ...scores,
    comment: comment && comment.length > 0 ? comment : null,
  };
  const { error } =
    mode === "create"
      ? await admin.from("ratings").insert({ talk_id: talk.id, rater_id: userId, ...payload })
      : await admin
          .from("ratings")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("talk_id", talk.id)
          .eq("rater_id", userId);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return NextResponse.json(
        {
          ok: false,
          error: "already_rated",
          message: "you've already rated this talk.",
        },
        { status: 409 },
      );
    }

    console.error("api/ratings: insert failed", error.message);
    return NextResponse.json(
      {
        ok: false,
        error: "insert_failed",
        message: "couldn't save that. try again in a moment.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export const POST = (request: Request) => save(request, "create");
export const PUT = (request: Request) => save(request, "update");
