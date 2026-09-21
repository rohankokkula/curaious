import { NextResponse } from "next/server";
import { loadTalkAccess } from "@/lib/talkAccess";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/** Single talk, visible to the presenter, any admin, or anyone once approved. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured || !hasServiceRoleKey) {
    return NextResponse.json(
      { ok: false, error: "server_not_configured" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const { talk, canView, isPresenter, isAdmin, userId } =
    await loadTalkAccess(id);

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  if (!talk || !canView) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    talk: {
      id: talk.id,
      slotId: talk.slot_id,
      title: talk.title,
      description: talk.description,
      status: talk.status,
      submittedAt: talk.submitted_at,
      // Only the presenter and admins need to see why something came back.
      rejectionReason:
        isPresenter || isAdmin ? talk.rejection_reason : undefined,
      isPresenter,
    },
  });
}
