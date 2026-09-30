import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminAuth";
import { isUuid } from "@/lib/talkAccess";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const schema = z.object({ open: z.boolean() });

/**
 * Opens or closes the scoring window for one talk.
 *
 * Scoring is moderated: a talk being approved only puts it on the schedule,
 * it doesn't make it rateable. The curator opens the window once the talk has
 * actually been given, and closes it by hand when the room is done. The same
 * condition is enforced in the `ratings` RLS policies, so closing the window
 * really does stop writes rather than just hiding the form.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured || !hasServiceRoleKey) {
    return NextResponse.json(
      { ok: false, error: "server_not_configured", message: "the database isn't connected yet." },
      { status: 503 },
    );
  }

  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, error: guard.error, message: guard.message },
      { status: guard.status },
    );
  }

  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!isUuid(id) || !parsed.success) {
    return NextResponse.json({ ok: false, error: "bad_request", message: "bad request." }, { status: 400 });
  }

  const { data: talk } = await guard.admin
    .from("talks")
    .select("id, status")
    .eq("id", id)
    .maybeSingle<{ id: string; status: string }>();

  if (!talk) {
    return NextResponse.json({ ok: false, error: "not_found", message: "no such talk." }, { status: 404 });
  }

  if (parsed.data.open && talk.status !== "approved") {
    return NextResponse.json(
      { ok: false, error: "not_rateable", message: "approve the talk first." },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const { error } = await guard.admin
    .from("talks")
    .update(
      parsed.data.open
        ? { ratings_open: true, ratings_opened_at: now, ratings_closed_at: null }
        : { ratings_open: false, ratings_closed_at: now },
    )
    .eq("id", talk.id);

  if (error) {
    console.error("api/admin/talks/[id]/ratings-window: update failed", error.message);
    return NextResponse.json(
      { ok: false, error: "update_failed", message: "couldn't change that." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, open: parsed.data.open });
}
