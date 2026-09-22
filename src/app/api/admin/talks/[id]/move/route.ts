import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminAuth";
import { isUuid } from "@/lib/talkAccess";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false, message: guard.message }, { status: guard.status });
  const { id } = await params;
  const body = z.object({ slotId: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!isUuid(id) || !body.success) return NextResponse.json({ ok: false, message: "bad request." }, { status: 400 });

  const { data: slot } = await guard.admin
    .from("session_slots")
    .select("slot_type")
    .eq("id", body.data.slotId)
    .maybeSingle<{ slot_type: string }>();
  if (slot?.slot_type !== "talk") {
    return NextResponse.json({ ok: false, message: "talks can only go in talk slots." }, { status: 400 });
  }

  const { error } = await guard.admin.rpc("move_talk", { p_talk: id, p_slot: body.data.slotId });
  if (error) {
    console.error("api/admin/talks/move failed", error.message);
    return NextResponse.json({ ok: false, message: "couldn't move that talk." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
