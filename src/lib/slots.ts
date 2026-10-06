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
import { cache } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { deckIsPublic, type SlotType, type SlotView } from "@/lib/talks";

type TalkRow = {
  id: string;
  presenter_id: string;
  title: string;
  status: "pending" | "approved";
  deck_path: string | null;
  deck_status: string;
  presenter: { name: string; avatar_url: string | null } | null;
};

type SlotRow = {
  id: string;
  slot_date: string;
  slot_type: SlotType;
  label: string;
  sort_order: number;
  capacity: number;
  starts_at: string | null;
  ends_at: string | null;
  recording_url: string | null;
  talks: TalkRow[];
};

type SeasonRow = {
  id: string;
  name: string;
  number: number;
  starts_on: string;
  ends_on: string;
  session_slots: SlotRow[];
};

export type SeasonSlots = {
  season: { name: string; number: number; startsOn: string; endsOn: string } | null;
  hasActiveTalk: boolean;
  slots: SlotView[];
};

// Season → its slots → each slot's talks → each talk's presenter name, in a
// single PostgREST request. This used to be four queries in a row (season,
// then slots, then talks, then names), each waiting on the one before.
// `profiles!presenter_id` picks the presenter FK, since talks.reviewed_by
// points at profiles too.
const SEASON_SELECT = `id, name, number, starts_on, ends_on,
  session_slots (id, slot_date, slot_type, label, sort_order, capacity, starts_at, ends_at, recording_url,
    talks (id, presenter_id, title, status, deck_path, deck_status, presenter:profiles!presenter_id (name, avatar_url))
  )`;

/** Cached per request: the dashboard home and the schedule both call it. */
export const loadSeasonSlots = cache(async (viewerId: string): Promise<SeasonSlots> => {
  const admin = createSupabaseAdminClient();

  const { data: season, error } = await admin
    .from("seasons")
    .select(SEASON_SELECT)
    .eq("is_active", true)
    .neq("session_slots.talks.status", "rejected")
    .order("number", { ascending: false })
    .order("sort_order", { referencedTable: "session_slots", ascending: true })
    // talks within a session: in seat order (the curator can reorder them)
    .order("submitted_at", { referencedTable: "session_slots.talks", ascending: true })
    .limit(1)
    .maybeSingle<SeasonRow>();

  if (error) console.error("loadSeasonSlots: query failed", error.message);
  if (!season) {
    return { season: null, hasActiveTalk: false, slots: [] };
  }

  const slots = season.session_slots ?? [];
  const talks = slots.flatMap((slot) => slot.talks ?? []);
  const names = new Map(talks.map((talk) => [talk.presenter_id, talk.presenter?.name ?? null]));

  const payload: SlotView[] = slots.map((slot) => {
    const slotTalks = slot.talks ?? [];

    return {
      id: slot.id,
      date: slot.slot_date,
      label: slot.label,
      type: slot.slot_type,
      capacity: slot.capacity,
      startsAt: slot.starts_at,
      endsAt: slot.ends_at,
      recordingUrl: slot.recording_url,
      isFull: slotTalks.length >= slot.capacity,
      talks: slotTalks.map((talk) => {
        const isMine = talk.presenter_id === viewerId;
        const approved = talk.status === "approved";

        return {
          talkId: talk.id,
          title: approved || isMine ? talk.title : null,
          presenterName: approved || isMine ? (names.get(talk.presenter_id) ?? null) : null,
          presenterAvatarUrl: approved || isMine ? (talk.presenter?.avatar_url ?? null) : null,
          status: talk.status,
          isMine,
          // Others see the deck once it's been reviewed; you always see your own.
          hasDeck: isMine ? Boolean(talk.deck_path) : deckIsPublic(talk),
          deckPending: approved && !deckIsPublic(talk),
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
});
