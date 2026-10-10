import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminAuth";
import { getActiveCohort } from "@/lib/cohort";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const schema = z.object({ enabled: z.boolean() });

/** Curator switch: show or hide the season leaderboard for the current cohort. */
export async function PATCH(request: Request) {
  if (!isSupabaseConfigured || !hasServiceRoleKey) {
    return NextResponse.json({ ok: false, error: "server_not_configured", message: "the database isn't connected yet." }, { status: 503 });
  }
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error, message: guard.message }, { status: guard.status });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "bad_request", message: "bad request." }, { status: 400 });

  const cohort = await getActiveCohort();
  if (!cohort) return NextResponse.json({ ok: false, error: "no_cohort", message: "no cohort yet." }, { status: 404 });

  const { error } = await guard.admin.from("seasons").update({ leaderboard_enabled: parsed.data.enabled }).eq("id", cohort.id);
  if (error) {
    console.error("api/admin/leaderboard: update failed", error.message);
    const missing = /leaderboard_enabled/.test(error.message);
    return NextResponse.json(
      { ok: false, error: "update_failed", message: missing ? "paste migration 0015 in Supabase first." : "couldn't change that." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, enabled: parsed.data.enabled });
}
