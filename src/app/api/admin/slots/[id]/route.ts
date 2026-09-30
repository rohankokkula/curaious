import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { slotInputSchema } from "@/lib/schedule";
import { isUuid } from "@/lib/talkAccess";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false, message: guard.message }, { status: guard.status });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, message: "bad id." }, { status: 400 });

  const parsed = slotInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "invalid slot." }, { status: 400 });
  }
  const { date, type, label, capacity, startsAt, endsAt } = parsed.data;

  const { error } = await guard.admin
    .from("session_slots")
    .update({ slot_date: date, slot_type: type, label, capacity, starts_at: startsAt || null, ends_at: endsAt || null })
    .eq("id", id);
  if (error) return NextResponse.json({ ok: false, message: "couldn't save that slot." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false, message: guard.message }, { status: guard.status });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, message: "bad id." }, { status: 400 });

  const { count } = await guard.admin
    .from("talks")
    .select("id", { count: "exact", head: true })
    .eq("slot_id", id)
    .neq("status", "rejected");
  if (count && count > 0) {
    return NextResponse.json(
      { ok: false, message: "this slot has a talk. move the talk first." },
      { status: 409 },
    );
  }

  const { error } = await guard.admin.from("session_slots").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, message: "couldn't delete that slot." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
