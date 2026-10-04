import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminAuth";
import { talkSubmissionSchema } from "@/lib/talks";

export const dynamic = "force-dynamic";

const UNIQUE_VIOLATION = "23505";

const bookSchema = talkSubmissionSchema.extend({
  slotId: z.uuid(),
  presenterId: z.uuid(),
});

/**
 * The curator books a seat on a member's behalf. Skips the request step:
 * it's booked straight away (the deck still gets its own review once they
 * upload it). The same no-overlap rules apply as for a member's own request:
 * the capacity trigger and the one-active-talk-per-member index.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false, message: guard.message }, { status: guard.status });

  const parsed = bookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "a couple of fields need another look." }, { status: 400 });
  }
  const { slotId, presenterId, title, description } = parsed.data;

  const { data: slot } = await guard.admin
    .from("session_slots")
    .select("slot_type")
    .eq("id", slotId)
    .maybeSingle<{ slot_type: string }>();
  if (slot?.slot_type !== "talk") {
    return NextResponse.json({ ok: false, message: "that isn't a talk slot." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await guard.admin
    .from("talks")
    .insert({
      slot_id: slotId,
      presenter_id: presenterId,
      title,
      description,
      status: "approved",
      deck_status: "none",
      reviewed_at: now,
      reviewed_by: guard.userId,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    if (error?.message.includes("slot full")) {
      return NextResponse.json({ ok: false, message: "that slot is already full." }, { status: 409 });
    }
    if (error?.code === UNIQUE_VIOLATION) {
      return NextResponse.json({ ok: false, message: "they already have a talk this season." }, { status: 409 });
    }
    console.error("api/admin/talks: book failed", error?.message);
    return NextResponse.json({ ok: false, message: "couldn't book that. try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, talkId: data.id });
}
