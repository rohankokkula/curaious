import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminAuth";
import { isUuid } from "@/lib/talkAccess";

export const dynamic = "force-dynamic";

const schema = z.object({
  cohortId: z.uuid(),
  status: z.enum(["active", "removed"]).optional(),
  role: z.enum(["member", "admin"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false, message: guard.message }, { status: guard.status });
  const { id } = await params;
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!isUuid(id) || !body.success) return NextResponse.json({ ok: false, message: "bad request." }, { status: 400 });
  if (id === guard.userId && (body.data.status === "removed" || body.data.role === "member")) {
    return NextResponse.json({ ok: false, message: "you can't demote or remove yourself." }, { status: 400 });
  }

  const { cohortId, status, role } = body.data;
  if (status) {
    const { error } = await guard.admin.from("cohort_members").update({ status }).eq("cohort_id", cohortId).eq("profile_id", id);
    if (error) return NextResponse.json({ ok: false, message: "couldn't update that member." }, { status: 500 });
  }
  if (role) {
    const { error } = await guard.admin.from("profiles").update({ role }).eq("id", id);
    if (error) return NextResponse.json({ ok: false, message: "couldn't change that role." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
