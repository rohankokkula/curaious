import { NextResponse } from "next/server";
import { storeDeck, validateDeck } from "@/lib/deckUpload";
import { talkSubmissionSchema } from "@/lib/talks";
import { createSupabaseAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
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

  // The deck is optional: a member can request a slot with just a title and
  // description, and upload the PDF later (PUT /api/talks/[id]/deck).
  const deckEntry = form.get("deck");
  const deck = deckEntry instanceof File && deckEntry.size > 0 ? deckEntry : null;

  if (deck) {
    const deckError = validateDeck(deck);
    if (deckError) return deckError;
  }

  const admin = createSupabaseAdminClient();

  const { data: slot } = await admin
    .from("session_slots")
    .select("id, slot_type, capacity")
    .eq("id", slotId)
    .maybeSingle<{ id: string; slot_type: string; capacity: number }>();

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

  // Authoritative re-check. The unique index on (presenter_id) below is the
  // real guard under concurrency for "one talk per person"; a slot filling up
  // concurrently can still race past this count, so the insert can still 409.
  const { count: slotCount } = await admin
    .from("talks")
    .select("id", { count: "exact", head: true })
    .eq("slot_id", slot.id)
    .neq("status", "rejected");

  if ((slotCount ?? 0) >= slot.capacity) {
    return conflict("that slot is full. pick another one.");
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
      deck_status: "none",
    })
    .select("id")
    .single<{ id: string }>();

  if (insertError || !inserted) {
    // the talks_capacity_guard trigger: someone took the last seat first
    if (insertError?.message.includes("slot full")) {
      return conflict("that slot just got taken. pick another one.");
    }
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

  if (deck) {
    const uploaded = await storeDeck(admin, inserted.id, deck);
    if (!uploaded) {
      // Keep the request: the slot is theirs to keep; the deck can be retried.
      return NextResponse.json({
        ok: true,
        talkId: inserted.id,
        warning: "your slot request is in, but the deck didn't upload. add it again from your talk.",
      });
    }
  }

  return NextResponse.json({ ok: true, talkId: inserted.id });
}
