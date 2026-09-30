import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { cohortCreateSchema } from "@/lib/schedule";

export const dynamic = "force-dynamic";

const DAY = 24 * 3600 * 1000;

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false, message: guard.message }, { status: guard.status });

  const parsed = cohortCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "check the name and dates." }, { status: 400 });
  }
  const { name, startsOn, endsOn, capacity, cloneFrom } = parsed.data;
  if (endsOn < startsOn) return NextResponse.json({ ok: false, message: "end date is before the start." }, { status: 400 });

  const { data: last } = await guard.admin
    .from("seasons")
    .select("number")
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle<{ number: number }>();
  const number = (last?.number ?? 0) + 1;
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${number}`;

  const { data: cohort, error } = await guard.admin
    .from("seasons")
    .insert({ number, name, slug, starts_on: startsOn, ends_on: endsOn, capacity, status: "draft", is_active: false })
    .select("id")
    .single();
  if (error || !cohort) {
    console.error("api/admin/cohorts: insert failed", error?.message);
    return NextResponse.json({ ok: false, message: "couldn't create the cohort." }, { status: 500 });
  }

  if (cloneFrom) {
    const { data: source } = await guard.admin.from("seasons").select("starts_on").eq("id", cloneFrom).maybeSingle<{ starts_on: string }>();
    const { data: slots } = await guard.admin
      .from("session_slots")
      .select("slot_date, slot_type, label, sort_order, starts_at, ends_at")
      .eq("season_id", cloneFrom);
    if (source && slots?.length) {
      const shift = Date.parse(`${startsOn}T00:00:00Z`) - Date.parse(`${source.starts_on}T00:00:00Z`);
      await guard.admin.from("session_slots").insert(
        slots.map((s) => ({
          ...s,
          season_id: cohort.id,
          slot_date: new Date(Date.parse(`${s.slot_date}T00:00:00Z`) + Math.round(shift / DAY) * DAY).toISOString().slice(0, 10),
        })),
      );
    }
  }
  return NextResponse.json({ ok: true, id: cohort.id });
}
