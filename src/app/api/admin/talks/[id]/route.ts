import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { isUuid } from "@/lib/talkAccess";
import { talkReviewSchema } from "@/lib/talks";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const UNIQUE_VIOLATION = "23505";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured || !hasServiceRoleKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "server_not_configured",
        message: "the database isn't connected yet.",
      },
      { status: 503 },
    );
  }

  // Role is re-verified here against the database, not inferred from the
  // middleware having let the page through.
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, error: guard.error, message: guard.message },
      { status: guard.status },
    );
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json(
      { ok: false, error: "not_found", message: "no such talk." },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "bad_request", message: "couldn't read that." },
      { status: 400 },
    );
  }

  const parsed = talkReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "validation_failed",
        details: parsed.error.flatten().fieldErrors,
        message: "that isn't a review action.",
      },
      { status: 400 },
    );
  }

  const { data: talk } = await guard.admin
    .from("talks")
    .select("id, status, deck_path")
    .eq("id", id)
    .maybeSingle<{ id: string; status: string; deck_path: string | null }>();

  if (!talk) {
    return NextResponse.json(
      { ok: false, error: "not_found", message: "no such talk." },
      { status: 404 },
    );
  }

  // Deck review: separate from the booking, only once a PDF is attached.
  if (parsed.data.action === "approve_deck" || parsed.data.action === "request_deck_changes") {
    if (talk.status !== "approved" || !talk.deck_path) {
      return NextResponse.json(
        { ok: false, error: "no_deck", message: "approve the booking first, and there needs to be a deck to review." },
        { status: 409 },
      );
    }
    const approvingDeck = parsed.data.action === "approve_deck";
    const { error: deckError } = await guard.admin
      .from("talks")
      .update({
        deck_status: approvingDeck ? "approved" : "changes_requested",
        deck_feedback: approvingDeck ? null : (parsed.data.rejectionReason ?? null),
        deck_reviewed_at: new Date().toISOString(),
      })
      .eq("id", talk.id);
    if (deckError) {
      console.error("api/admin/talks/[id]: deck review failed", deckError.message);
      return NextResponse.json({ ok: false, error: "update_failed", message: "couldn't save that." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, deckStatus: approvingDeck ? "approved" : "changes_requested" });
  }

  const approving = parsed.data.action === "approve";

  const { error } = await guard.admin
    .from("talks")
    .update({
      status: approving ? "approved" : "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: guard.userId,
      // Rejecting frees the slot back up (the partial unique indexes ignore
      // rejected rows), so the reason is the only thing the presenter gets.
      rejection_reason: approving
        ? null
        : (parsed.data.rejectionReason ?? null),
    })
    .eq("id", talk.id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return NextResponse.json(
        {
          ok: false,
          error: "conflict",
          message:
            "that slot or presenter already has an active talk. reject the other one first.",
        },
        { status: 409 },
      );
    }

    console.error("api/admin/talks/[id]: update failed", error.message);
    return NextResponse.json(
      {
        ok: false,
        error: "update_failed",
        message: "couldn't save that. try again in a moment.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: approving ? "approved" : "rejected",
  });
}
