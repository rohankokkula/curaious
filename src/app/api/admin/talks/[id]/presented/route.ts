import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminAuth";
import { isUuid } from "@/lib/talkAccess";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const schema = z.object({ done: z.boolean() });

/** Curator: mark a booked talk as given (or undo it). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured || !hasServiceRoleKey) {
    return NextResponse.json({ ok: false, error: "server_not_configured", message: "the database isn't connected yet." }, { status: 503 });
  }
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error, message: guard.message }, { status: guard.status });

  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!isUuid(id) || !parsed.success) return NextResponse.json({ ok: false, error: "bad_request", message: "bad request." }, { status: 400 });

  const { data: talk } = await guard.admin.from("talks").select("id, status").eq("id", id).maybeSingle<{ id: string; status: string }>();
  if (!talk) return NextResponse.json({ ok: false, error: "not_found", message: "no such talk." }, { status: 404 });
  if (parsed.data.done && talk.status !== "approved") {
    return NextResponse.json({ ok: false, error: "not_booked", message: "only a booked talk can be marked done." }, { status: 409 });
  }

  const { error } = await guard.admin
    .from("talks")
    .update({ presented_at: parsed.data.done ? new Date().toISOString() : null })
    .eq("id", talk.id);
  if (error) {
    console.error("api/admin/talks/[id]/presented: update failed", error.message);
    const missing = /presented_at/.test(error.message);
    return NextResponse.json(
      { ok: false, error: "update_failed", message: missing ? "paste migration 0016 in Supabase first." : "couldn't change that." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, done: parsed.data.done });
}
