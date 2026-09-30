import { NextResponse } from "next/server";
import { loadTalkAccess } from "@/lib/talkAccess";
import { DECKS_BUCKET, hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/** Signed URLs last long enough to present with, not long enough to share. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured || !hasServiceRoleKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "server_not_configured",
        message: "decks aren't available yet.",
      },
      { status: 503 },
    );
  }

  const { id } = await params;
  const { admin, talk, canView, userId } = await loadTalkAccess(id);

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "unauthorized", message: "sign in first." },
      { status: 401 },
    );
  }

  // The bucket is private: a member can only reach a deck once the talk is
  // approved, and the presenter/admins can always reach their own.
  if (!talk || !canView) {
    return NextResponse.json(
      { ok: false, error: "not_found", message: "no deck here." },
      { status: 404 },
    );
  }

  if (!talk.deck_path) {
    return NextResponse.json(
      {
        ok: false,
        error: "no_deck",
        message: "this talk doesn't have a deck attached.",
      },
      { status: 404 },
    );
  }

  // Signing is verified here but the URL itself is never returned to the
  // browser: clients load the deck through /deck/view, which redirects.
  const { error } = await admin.storage
    .from(DECKS_BUCKET)
    .createSignedUrl(talk.deck_path, SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.error("api/talks/[id]/deck: sign failed", error.message);
    return NextResponse.json(
      {
        ok: false,
        error: "sign_failed",
        message: "couldn't open the deck. try again in a moment.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, title: talk.title });
}
