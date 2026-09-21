import { NextResponse } from "next/server";
import type { SlotType, SlotView } from "@/lib/talks";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SlotRow = {
  id: string;
  slot_date: string;
  slot_type: SlotType;
  label: string;
  sort_order: number;
};

type TalkRow = {
  id: string;
  slot_id: string;
  presenter_id: string;
  title: string;
  status: "pending" | "approved";
};

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { ok: false, error: "server_not_configured", slots: [] },
      { status: 503 },
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  // Service-role, because a member's own RLS view can't see other members'
  // pending claims — and it shouldn't. We compute the sanitized shape here
  // instead: a pending slot is reported as taken, with no name attached.
  const admin = createSupabaseAdminClient();

  const { data: season } = await admin
    .from("seasons")
    .select("id, name, number, starts_on, ends_on")
    .eq("is_active", true)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      name: string;
      number: number;
      starts_on: string;
      ends_on: string;
    }>();

  if (!season) {
    return NextResponse.json({ ok: true, season: null, slots: [] });
  }

  const { data: slotRows, error: slotError } = await admin
    .from("session_slots")
    .select("id, slot_date, slot_type, label, sort_order")
    .eq("season_id", season.id)
    .order("sort_order", { ascending: true })
    .returns<SlotRow[]>();

  if (slotError) {
    console.error("api/slots: slot query failed", slotError.message);
    return NextResponse.json(
      { ok: false, error: "query_failed" },
      { status: 500 },
    );
  }

  const slots = slotRows ?? [];

  const { data: talkRows } = await admin
    .from("talks")
    .select("id, slot_id, presenter_id, title, status")
    .in(
      "slot_id",
      slots.map((slot) => slot.id),
    )
    .neq("status", "rejected")
    .returns<TalkRow[]>();

  const talks = talkRows ?? [];

  const presenterIds = [...new Set(talks.map((talk) => talk.presenter_id))];
  const names = new Map<string, string>();

  if (presenterIds.length > 0) {
    const { data: profileRows } = await admin
      .from("profiles")
      .select("id, name")
      .in("id", presenterIds)
      .returns<{ id: string; name: string }[]>();

    for (const profile of profileRows ?? []) {
      names.set(profile.id, profile.name);
    }
  }

  const bySlot = new Map(talks.map((talk) => [talk.slot_id, talk]));

  const payload: SlotView[] = slots.map((slot) => {
    const talk = bySlot.get(slot.id);

    if (!talk) {
      return {
        id: slot.id,
        date: slot.slot_date,
        label: slot.label,
        type: slot.slot_type,
        status: "open",
        presenterName: null,
        title: null,
        isMine: false,
        talkId: null,
      };
    }

    const isMine = talk.presenter_id === user.id;
    const approved = talk.status === "approved";

    return {
      id: slot.id,
      date: slot.slot_date,
      label: slot.label,
      type: slot.slot_type,
      status: approved ? "approved" : "pending",
      // Identity only leaves the server once an admin has approved the talk —
      // or if you're looking at your own claim.
      presenterName:
        approved || isMine ? (names.get(talk.presenter_id) ?? null) : null,
      title: approved || isMine ? talk.title : null,
      isMine,
      talkId: approved || isMine ? talk.id : null,
    };
  });

  const mySlotTaken = payload.some((slot) => slot.isMine);

  return NextResponse.json({
    ok: true,
    season: {
      name: season.name,
      number: season.number,
      startsOn: season.starts_on,
      endsOn: season.ends_on,
    },
    hasActiveTalk: mySlotTaken,
    slots: payload,
  });
}
