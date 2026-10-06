import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { isUuid } from "@/lib/talkAccess";
import { talkSubmissionSchema } from "@/lib/talks";

export const dynamic = "force-dynamic";

/**
 * The curator edits a talk's title and description, e.g. to tidy a typo or
 * a too-long title before it goes on the schedule. Admin only; the review
 * state (booking, deck) is untouched.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false, message: guard.message }, { status: guard.status });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, message: "bad id." }, { status: 400 });

  const parsed = talkSubmissionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "check the fields." }, { status: 400 });
  }

  const { data, error } = await guard.admin
    .from("talks")
    .update({ title: parsed.data.title, description: parsed.data.description })
    .eq("id", id)
    .select("id");
  if (error) {
    console.error("api/admin/talks/[id]/details: update failed", error.message);
    return NextResponse.json({ ok: false, message: "couldn't save that." }, { status: 500 });
  }
  if (!data || data.length === 0) return NextResponse.json({ ok: false, message: "no such talk." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
