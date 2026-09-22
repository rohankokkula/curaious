import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { slotCreateSchema } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false, message: guard.message }, { status: guard.status });

  const parsed = slotCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "invalid slot." }, { status: 400 });
  }
  const { cohortId, date, type, label, startsAt, endsAt } = parsed.data;

  const { data: last } = await guard.admin
    .from("session_slots")
    .select("sort_order")
    .eq("season_id", cohortId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  const { data, error } = await guard.admin
    .from("session_slots")
    .insert({
      season_id: cohortId,
      slot_date: date,
      slot_type: type,
      label,
      starts_at: startsAt || null,
      ends_at: endsAt || null,
      sort_order: (last?.sort_order ?? 0) + 1,
    })
    .select("id")
    .single();

  if (error) {
    console.error("api/admin/slots: insert failed", error.message);
    return NextResponse.json({ ok: false, message: "couldn't add that slot." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
