import Link from "next/link";
import { ScheduleEditor } from "@/components/admin/ScheduleEditor";
import { SeasonTimeline } from "@/components/dashboard/SeasonTimeline";
import { getActiveCohort } from "@/lib/cohort";
import type { EditorSlot } from "@/lib/schedule";
import { deckIsPublic, type SlotView } from "@/lib/talks";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminSchedulePage() {
  const cohort = await getActiveCohort();
  if (!cohort) {
    return (
      <p className="text-sm text-muted">
        No cohort yet. <Link className="text-primary underline" href="/admin/cohorts">Create one</Link>.
      </p>
    );
  }

  // Admins see every talk under RLS, so this can use the user client.
  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase
    .from("session_slots")
    .select("id, slot_date, slot_type, label, sort_order, starts_at, ends_at, capacity, recording_url")
    .eq("season_id", cohort.id)
    .order("slot_date")
    .order("sort_order");
  const ids = (rows ?? []).map((r) => r.id);
  const { data: talks } = ids.length
    ? await supabase
        .from("talks")
        .select("id, slot_id, title, status, presenter_id, deck_path, deck_status")
        .in("slot_id", ids)
        .neq("status", "rejected")
    : { data: [] };
  const presenterIds = [...new Set((talks ?? []).map((t) => t.presenter_id))];
  const { data: people } = presenterIds.length
    ? await supabase.from("profiles").select("id, name").in("id", presenterIds)
    : { data: [] };
  const names = new Map((people ?? []).map((p) => [p.id, p.name as string]));
  const talksBySlot = new Map<string, typeof talks>();
  for (const t of talks ?? []) talksBySlot.set(t.slot_id, [...(talksBySlot.get(t.slot_id) ?? []), t]);

  const slots: EditorSlot[] = (rows ?? []).map((r) => ({
    id: r.id,
    date: r.slot_date,
    label: r.label,
    type: r.slot_type,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    sortOrder: r.sort_order,
    capacity: r.capacity,
    recordingUrl: r.recording_url,
    talks: (talksBySlot.get(r.id) ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      presenter: names.get(t.presenter_id) ?? "Unknown",
      status: t.status,
    })),
  }));

  // The same week-by-week view the cohort sees, built from the rows already
  // loaded above. Admins read every talk under RLS, so nothing is withheld
  // here the way it is for members in /api/slots.
  const timeline: SlotView[] = slots
    .map((slot) => ({
      id: slot.id,
      date: slot.date,
      label: slot.label,
      type: slot.type,
      capacity: slot.capacity,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      recordingUrl: slot.recordingUrl,
      isFull: slot.talks.length >= slot.capacity,
      // Built from the raw `talks` rows (via talksBySlot), not slot.talks —
      // EditorSlot's shape doesn't carry deck_path, and the drag/drop editor
      // has no reason to grow one just for this.
      talks: (talksBySlot.get(slot.id) ?? []).map((talk) => ({
        talkId: talk.id,
        title: talk.title,
        presenterName: names.get(talk.presenter_id) ?? "Unknown",
        status: talk.status as "pending" | "approved",
        isMine: false,
        hasDeck: Boolean(talk.deck_path),
        deckPending: talk.status === "approved" && !deckIsPublic(talk),
      })),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Who can be booked into an open seat: active members (not you) who don't
  // already hold a talk this season.
  const { data: roster } = await supabase
    .from("cohort_members")
    .select("profile:profiles!inner (id, name, role)")
    .eq("cohort_id", cohort.id)
    .eq("status", "active")
    .returns<{ profile: { id: string; name: string; role: string } }[]>();
  const holding = new Set((talks ?? []).map((t) => t.presenter_id));
  const bookable = (roster ?? [])
    .map((r) => r.profile)
    .filter((p) => p.role !== "admin" && !holding.has(p.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
        <p className="mt-1 text-muted">{cohort.name}: tap an open seat to book it for a member, or edit sessions, slots and talk assignments below.</p>
      </header>

      <SeasonTimeline slots={timeline} viewerHasActiveTalk={false} mode="admin" bookable={bookable} />

      <section className="space-y-4 border-t border-border pt-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Edit</h2>
          <p className="mt-1 text-sm text-muted">Add, reorder and reassign slots.</p>
        </div>
        {/* key remounts the editor with fresh server data after each refresh */}
        <ScheduleEditor key={JSON.stringify(slots)} cohortId={cohort.id} initial={slots} />
      </section>
    </div>
  );
}
