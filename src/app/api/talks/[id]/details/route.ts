import { NextResponse } from "next/server";
import { isUuid, loadTalkAccess } from "@/lib/talkAccess";
import { talkSubmissionSchema } from "@/lib/talks";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/**
 * A presenter edits their own talk's title and description, before or after
 * it's booked. The booking and the deck review are untouched. (The curator's
 * version of this, for any talk, is /api/admin/talks/[id]/details.)
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured || !hasServiceRoleKey) {
    return NextResponse.json({ ok: false, message: "edits aren't switched on yet." }, { status: 503 });
  }

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, message: "bad id." }, { status: 400 });

  const { admin, talk, userId, isPresenter } = await loadTalkAccess(id);
  if (!userId) return NextResponse.json({ ok: false, message: "sign in first." }, { status: 401 });
  if (!talk || !isPresenter) return NextResponse.json({ ok: false, message: "that isn't your talk." }, { status: 403 });
  if (talk.status === "rejected") {
    return NextResponse.json({ ok: false, message: "this request was declined. request another slot first." }, { status: 409 });
  }

  const parsed = talkSubmissionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "check the fields." }, { status: 400 });
  }

  const { error } = await admin.from("talks").update({ title: parsed.data.title, description: parsed.data.description }).eq("id", talk.id);
  if (error) {
    console.error("api/talks/[id]/details: update failed", error.message);
    return NextResponse.json({ ok: false, message: "couldn't save that." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
