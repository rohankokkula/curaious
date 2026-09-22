import { NextResponse } from "next/server";
import { loadTalkAccess } from "@/lib/talkAccess";
import { DECKS_BUCKET, hasServiceRoleKey } from "@/lib/supabase/admin";
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

/**
 * A presenter can withdraw their own talk — approved, pending or rejected —
 * and submit fresh once the slot is free again. Ratings cascade-delete with
 * the row; the deck file is removed from storage separately.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured || !hasServiceRoleKey) {
    return NextResponse.json(
      { ok: false, error: "server_not_configured", message: "not available yet." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const { admin, talk, isPresenter, isAdmin, userId } = await loadTalkAccess(id);

  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized", message: "sign in first." }, { status: 401 });
  }

  if (!talk || !(isPresenter || isAdmin)) {
    return NextResponse.json({ ok: false, error: "not_found", message: "no talk here." }, { status: 404 });
  }

  const { error } = await admin.from("talks").delete().eq("id", talk.id);
  if (error) {
    console.error("api/talks/[id]: delete failed", error.message);
    return NextResponse.json(
      { ok: false, error: "delete_failed", message: "couldn't delete that. try again in a moment." },
      { status: 500 },
    );
  }

  if (talk.deck_path) {
    const { error: storageError } = await admin.storage.from(DECKS_BUCKET).remove([talk.deck_path]);
    if (storageError) {
      console.error("api/talks/[id]: deck cleanup failed", storageError.message);
    }
  }

  return NextResponse.json({ ok: true });
}
