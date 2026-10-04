/**
 * SERVER-ONLY. Deck PDF validation + storage, shared by a slot request that
 * comes with a deck (POST /api/talks) and a deck added later
 * (PUT /api/talks/[id]/deck).
 */
import { NextResponse } from "next/server";
import { DECKS_BUCKET, type createSupabaseAdminClient } from "@/lib/supabase/admin";
import { MAX_DECK_BYTES, MAX_DECK_MB, sanitizeDeckFilename } from "@/lib/talks";

/** A 400 response when the file isn't an acceptable deck, else null. */
export function validateDeck(deck: File) {
  const looksLikePdf = deck.type === "application/pdf" || /\.pdf$/i.test(deck.name);
  if (!looksLikePdf) {
    return NextResponse.json(
      { ok: false, error: "deck_not_pdf", message: "pdf only, please, it's what the fullscreen viewer expects." },
      { status: 400 },
    );
  }
  if (deck.size > MAX_DECK_BYTES) {
    return NextResponse.json(
      { ok: false, error: "deck_too_large", message: `that deck is over ${MAX_DECK_MB}mb. trim it and try again.` },
      { status: 400 },
    );
  }
  return null;
}

/**
 * Uploads the PDF and marks it for review. Returns false if the upload (or
 * the row update) failed; the talk itself is left as it was.
 */
export async function storeDeck(admin: ReturnType<typeof createSupabaseAdminClient>, talkId: string, deck: File) {
  const deckPath = `${talkId}/${sanitizeDeckFilename(deck.name)}`;

  const { error: uploadError } = await admin.storage
    .from(DECKS_BUCKET)
    .upload(deckPath, await deck.arrayBuffer(), { contentType: "application/pdf", upsert: true });
  if (uploadError) {
    console.error("deckUpload: upload failed", uploadError.message);
    return false;
  }

  const { error: updateError } = await admin
    .from("talks")
    .update({ deck_path: deckPath, deck_status: "submitted", deck_feedback: null, deck_reviewed_at: null })
    .eq("id", talkId);
  if (updateError) {
    console.error("deckUpload: talk update failed", updateError.message);
    return false;
  }
  return true;
}
