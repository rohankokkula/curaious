/**
 * SERVER-ONLY. Deck validation + storage (PDF or PowerPoint), shared by a slot
 * request that comes with a deck (POST /api/talks) and a deck added later
 * (PUT /api/talks/[id]/deck), by the presenter or by the curator on their behalf.
 */
import { NextResponse } from "next/server";
import { DECKS_BUCKET, type createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DECK_FORMATS, deckFormatOf, MAX_DECK_BYTES, MAX_DECK_MB, sanitizeDeckFilename } from "@/lib/talks";

/** A 400 response when the file isn't an acceptable deck, else null. */
export function validateDeck(deck: File) {
  if (!deckFormatOf(deck.name, deck.type)) {
    return NextResponse.json(
      { ok: false, error: "deck_bad_format", message: "a pdf or a powerpoint (.pptx) file, please." },
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
 * Uploads the deck and sends it for review, or, when the curator uploads on
 * the presenter's behalf (`approved: true`), marks it approved straight away,
 * since the curator is the reviewer. Returns false if the upload (or the row
 * update) failed; the talk itself is left as it was.
 */
export async function storeDeck(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  talkId: string,
  deck: File,
  { approved = false }: { approved?: boolean } = {},
) {
  const format = deckFormatOf(deck.name, deck.type) ?? "pdf";
  const deckPath = `${talkId}/${sanitizeDeckFilename(deck.name)}`;

  // A replacement in the other format would leave the old file behind.
  const { data: existing } = await admin.from("talks").select("deck_path").eq("id", talkId).maybeSingle<{ deck_path: string | null }>();
  if (existing?.deck_path && existing.deck_path !== deckPath) {
    await admin.storage.from(DECKS_BUCKET).remove([existing.deck_path]);
  }

  const { error: uploadError } = await admin.storage
    .from(DECKS_BUCKET)
    .upload(deckPath, await deck.arrayBuffer(), { contentType: DECK_FORMATS[format].mime, upsert: true });
  if (uploadError) {
    console.error("deckUpload: upload failed", uploadError.message);
    return false;
  }

  const { error: updateError } = await admin
    .from("talks")
    .update({
      deck_path: deckPath,
      deck_status: approved ? "approved" : "submitted",
      deck_feedback: null,
      deck_reviewed_at: approved ? new Date().toISOString() : null,
    })
    .eq("id", talkId);
  if (updateError) {
    console.error("deckUpload: talk update failed", updateError.message);
    return false;
  }
  return true;
}
