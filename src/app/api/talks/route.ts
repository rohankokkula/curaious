import { NextResponse } from "next/server";
import {
  MAX_DECK_BYTES,
  MAX_DECK_MB,
  sanitizeDeckFilename,
  talkSubmissionSchema,
} from "@/lib/talks";
import {
  createSupabaseAdminClient,
  DECKS_BUCKET,
  hasServiceRoleKey,
} from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UNIQUE_VIOLATION = "23505";

function conflict(message: string) {
  return NextResponse.json({ ok: false, error: "conflict", message }, {
    status: 409,
  });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !hasServiceRoleKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "server_not_configured",
        message: "submissions aren't switched on yet.",
      },
      { status: 503 },
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized", message: "sign in first." },
      { status: 401 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "bad_request",
        message: "that upload didn't come through. try again.",
      },
      { status: 400 },
    );
  }

  const slotId = String(form.get("slotId") ?? "");
  const parsed = talkSubmissionSchema.safeParse({
    title: String(form.get("title") ?? ""),
    description: String(form.get("description") ?? ""),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "validation_failed",
        details: parsed.error.flatten().fieldErrors,
        message: "a couple of fields need another look.",
      },
      { status: 400 },
    );
  }

  const deck = form.get("deck");
  if (!(deck instanceof File) || deck.size === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "deck_required",
        message: "attach your deck as a pdf.",
      },
      { status: 400 },
    );
  }

  const looksLikePdf =
    deck.type === "application/pdf" || /\.pdf$/i.test(deck.name);

  if (!looksLikePdf) {
    return NextResponse.json(
      {
        ok: false,
        error: "deck_not_pdf",
        message: "pdf only, please — it's what the fullscreen viewer expects.",
      },
      { status: 400 },
    );
  }

  if (deck.size > MAX_DECK_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: "deck_too_large",
        message: `that deck is over ${MAX_DECK_MB}mb. trim it and try again.`,
      },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();

  const { data: slot } = await admin
    .from("session_slots")
    .select("id, slot_type")
    .eq("id", slotId)
    .maybeSingle<{ id: string; slot_type: string }>();

  if (!slot || slot.slot_type !== "talk") {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_slot",
        message: "that isn't a talk slot.",
      },
      { status: 400 },
    );
  }

  // Authoritative re-checks. The partial unique indexes below are the real
  // guard under concurrency; these two only exist to produce a kinder message.
  const { data: slotTaken } = await admin
    .from("talks")
    .select("id")
    .eq("slot_id", slot.id)
    .neq("status", "rejected")
    .maybeSingle();

  if (slotTaken) {
    return conflict("that slot just got taken. pick another one.");
  }

  const { data: mine } = await admin
    .from("talks")
    .select("id")
    .eq("presenter_id", user.id)
    .neq("status", "rejected")
    .maybeSingle();

  if (mine) {
    return conflict(
      "you already have a talk in play this season. one at a time.",
    );
  }

  const { data: inserted, error: insertError } = await admin
    .from("talks")
    .insert({
      slot_id: slot.id,
      presenter_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      status: "pending",
    })
    .select("id")
    .single<{ id: string }>();

  if (insertError || !inserted) {
    if (insertError?.code === UNIQUE_VIOLATION) {
      const onPresenter = insertError.message.includes("presenter");
      return conflict(
        onPresenter
          ? "you already have a talk in play this season. one at a time."
          : "that slot just got taken. pick another one.",
      );
    }

    console.error("api/talks: insert failed", insertError?.message);
    return NextResponse.json(
      {
        ok: false,
        error: "insert_failed",
        message: "couldn't save that. try again in a moment.",
      },
      { status: 500 },
    );
  }

  const deckPath = `${inserted.id}/${sanitizeDeckFilename(deck.name)}`;
  const bytes = await deck.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from(DECKS_BUCKET)
    .upload(deckPath, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    // Don't leave a claimed slot behind a failed upload.
    await admin.from("talks").delete().eq("id", inserted.id);
    console.error("api/talks: deck upload failed", uploadError.message);
    return NextResponse.json(
      {
        ok: false,
        error: "upload_failed",
        message: "the deck didn't upload. try again in a moment.",
      },
      { status: 502 },
    );
  }

  const { error: updateError } = await admin
    .from("talks")
    .update({ deck_path: deckPath })
    .eq("id", inserted.id);

  if (updateError) {
    console.error("api/talks: deck_path update failed", updateError.message);
  }

  return NextResponse.json({ ok: true, talkId: inserted.id });
}
