import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { resourceReviewSchema } from "@/lib/resources";
import { isUuid } from "@/lib/talkAccess";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/** Approves or sends back a member-written article. Same shape as
 * src/app/api/admin/talks/[id]/route.ts — deliberately, so review feels
 * identical whether it's a talk or an article. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured || !hasServiceRoleKey) {
    return NextResponse.json(
      { ok: false, error: "server_not_configured", message: "the database isn't connected yet." },
      { status: 503 },
    );
  }

  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error, message: guard.message }, { status: guard.status });
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ ok: false, error: "not_found", message: "no such resource." }, { status: 404 });
  }

  const parsed = resourceReviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "validation_failed", message: "approve or reject, nothing else." },
      { status: 400 },
    );
  }

  const { data: resource } = await guard.admin
    .from("resource_links")
    .select("id, kind, status")
    .eq("id", id)
    .maybeSingle<{ id: string; kind: string; status: string }>();

  if (!resource || resource.kind !== "article") {
    return NextResponse.json({ ok: false, error: "not_found", message: "no such article." }, { status: 404 });
  }

  const approving = parsed.data.action === "approve";

  const { error } = await guard.admin
    .from("resource_links")
    .update({
      status: approving ? "approved" : "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: guard.userId,
      rejection_reason: approving ? null : (parsed.data.rejectionReason ?? null),
    })
    .eq("id", resource.id);

  if (error) {
    console.error("api/admin/resources/[id]: update failed", error.message);
    return NextResponse.json(
      { ok: false, error: "update_failed", message: "couldn't save that. try again in a moment." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, status: approving ? "approved" : "rejected" });
}
