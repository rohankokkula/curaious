/**
 * SERVER-ONLY. Imports the service-role client — Route Handlers and Server
 * Components only, never a Client Component.
 *
 * The season's slots, sanitized for one viewer: a pending claim's name and
 * deck stay hidden unless it's the viewer's own or it's been approved.
 * Shared by GET /api/slots (for any client-side caller) and the dashboard's
 * own Server Components, which call this directly instead of going back out
 * over HTTP to their own API route — that round trip is free on `next dev`
 * but a real extra network hop plus a second serverless invocation on
 * Vercel, on two of the most-visited pages in the app.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SlotType, SlotView } from "@/lib/talks";

type SlotRow = {
  id: string;
  slot_date: string;
  slot_type: SlotType;
  label: string;
  sort_order: number;
  capacity: number;
  starts_at: string | null;
  ends_at: string | null;
};

type TalkRow = {
  id: string;
  slot_id: string;
  presenter_id: string;
  title: string;
  status: "pending" | "approved";
  deck_path: string | null;
};

export type SeasonSlots = {
  season: { name: string; number: number; startsOn: string; endsOn: string } | null;
  hasActiveTalk: boolean;
  slots: SlotView[];
};

export async function loadSeasonSlots(viewerId: string): Promise<SeasonSlots> {
  const admin = createSupabaseAdminClient();

  const { data: season } = await admin
    .from("seasons")
    .select("id, name, number, starts_on, ends_on")
    .eq("is_active", true)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; name: string; number: number; starts_on: string; ends_on: string }>();

  if (!season) {
    return { season: null, hasActiveTalk: false, slots: [] };
  }

  const { data: slotRows, error: slotError } = await admin
    .from("session_slots")
    .select("id, slot_date, slot_type, label, sort_order, capacity, starts_at, ends_at")
    .eq("season_id", season.id)
    .order("sort_order", { ascending: true })
    .returns<SlotRow[]>();

  if (slotError) {
    console.error("loadSeasonSlots: slot query failed", slotError.message);
    return { season: null, hasActiveTalk: false, slots: [] };
  }

  const slots = slotRows ?? [];

  const { data: talkRows } = await admin
    .from("talks")
    .select("id, slot_id, presenter_id, title, status, deck_path")
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

  const talksBySlot = new Map<string, TalkRow[]>();
  for (const talk of talks) {
    talksBySlot.set(talk.slot_id, [...(talksBySlot.get(talk.slot_id) ?? []), talk]);
  }

  const payload: SlotView[] = slots.map((slot) => {
    const slotTalks = talksBySlot.get(slot.id) ?? [];

    return {
      id: slot.id,
      date: slot.slot_date,
      label: slot.label,
      type: slot.slot_type,
      capacity: slot.capacity,
      startsAt: slot.starts_at,
      endsAt: slot.ends_at,
      isFull: slotTalks.length >= slot.capacity,
      talks: slotTalks.map((talk) => {
        const isMine = talk.presenter_id === viewerId;
        const approved = talk.status === "approved";

        return {
          talkId: talk.id,
          title: approved || isMine ? talk.title : null,
          presenterName: approved || isMine ? (names.get(talk.presenter_id) ?? null) : null,
          status: talk.status,
          isMine,
          hasDeck: (approved || isMine) && Boolean(talk.deck_path),
        };
      }),
    };
  });

  const hasActiveTalk = talks.some((talk) => talk.presenter_id === viewerId);

  return {
    season: { name: season.name, number: season.number, startsOn: season.starts_on, endsOn: season.ends_on },
    hasActiveTalk,
    slots: payload,
  };
}
