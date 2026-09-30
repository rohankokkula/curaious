import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminAuth";
import { isUuid } from "@/lib/talkAccess";

export const dynamic = "force-dynamic";

const schema = z.object({ action: z.enum(["activate", "archive"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false, message: guard.message }, { status: guard.status });
  const { id } = await params;
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!isUuid(id) || !body.success) return NextResponse.json({ ok: false, message: "bad request." }, { status: 400 });

  if (body.data.action === "activate") {
    // only one active cohort: members see it as "the" season.
    await guard.admin.from("seasons").update({ is_active: false, status: "archived" }).eq("is_active", true).neq("id", id);
    await guard.admin.from("seasons").update({ is_active: true, status: "active" }).eq("id", id);
  } else {
    await guard.admin.from("seasons").update({ is_active: false, status: "archived" }).eq("id", id);
  }
  return NextResponse.json({ ok: true });
}
