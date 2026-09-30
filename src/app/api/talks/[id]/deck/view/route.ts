import { NextResponse } from "next/server";
import { loadTalkAccess } from "@/lib/talkAccess";
import { DECKS_BUCKET, hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Serves the deck to an <iframe> (or a new tab) by redirecting to a
 * short-lived signed URL. The signed URL is minted per request and never lands
 * in the page's DOM or in any JSON the browser can read back — the client only
 * ever points at this same-origin path.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured || !hasServiceRoleKey) {
    return new NextResponse("decks aren't available yet.", { status: 503 });
  }

  const { id } = await params;
  const { admin, talk, canView, userId } = await loadTalkAccess(id);

  if (!userId) {
    return new NextResponse("sign in first.", { status: 401 });
  }

  // Private bucket: approved talks are open to the cohort, unapproved ones
  // only to their presenter and to admins.
  if (!talk || !canView || !talk.deck_path) {
    return new NextResponse("no deck here.", { status: 404 });
  }

  const { data, error } = await admin.storage
    .from(DECKS_BUCKET)
    .createSignedUrl(talk.deck_path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("api/talks/[id]/deck/view: sign failed", error?.message);
    return new NextResponse("couldn't open the deck.", { status: 502 });
  }

  return NextResponse.redirect(data.signedUrl, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
