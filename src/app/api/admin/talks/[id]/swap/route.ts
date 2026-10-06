import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminAuth";
import { isUuid } from "@/lib/talkAccess";

export const dynamic = "force-dynamic";

/** Curator drag-and-drop: this talk and another trade slots (swap_talks, 0012). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false, message: guard.message }, { status: guard.status });
  const { id } = await params;
  const body = z.object({ otherTalkId: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!isUuid(id) || !body.success) return NextResponse.json({ ok: false, message: "bad request." }, { status: 400 });

  const { error } = await guard.admin.rpc("swap_talks", { p_a: id, p_b: body.data.otherTalkId });
  if (error) {
    console.error("api/admin/talks/swap failed", error.message);
    const missing = error.message.includes("swap_talks");
    return NextResponse.json(
      { ok: false, message: missing ? "swapping needs migration 0012. paste it in supabase first." : "couldn't swap those talks." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
