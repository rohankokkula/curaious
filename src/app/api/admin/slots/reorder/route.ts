import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { reorderSchema } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false, message: guard.message }, { status: guard.status });

  const parsed = reorderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "invalid order." }, { status: 400 });

  const results = await Promise.all(
    parsed.data.items.map((item) =>
      guard.admin
        .from("session_slots")
        .update({ slot_date: item.date, sort_order: item.sort_order })
        .eq("id", item.id),
    ),
  );
  if (results.some((r) => r.error)) {
    return NextResponse.json({ ok: false, message: "couldn't save the new order." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
