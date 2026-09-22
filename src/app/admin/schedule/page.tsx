import Link from "next/link";
import { ScheduleEditor } from "@/components/admin/ScheduleEditor";
import { getActiveCohort } from "@/lib/cohort";
import type { EditorSlot } from "@/lib/schedule";
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
    .select("id, slot_date, slot_type, label, sort_order, starts_at, ends_at")
    .eq("season_id", cohort.id)
    .order("slot_date")
    .order("sort_order");
  const ids = (rows ?? []).map((r) => r.id);
  const { data: talks } = ids.length
    ? await supabase.from("talks").select("id, slot_id, title, status, presenter_id").in("slot_id", ids).neq("status", "rejected")
    : { data: [] };
  const presenterIds = [...new Set((talks ?? []).map((t) => t.presenter_id))];
  const { data: people } = presenterIds.length
    ? await supabase.from("profiles").select("id, name").in("id", presenterIds)
    : { data: [] };
  const names = new Map((people ?? []).map((p) => [p.id, p.name as string]));
  const bySlot = new Map((talks ?? []).map((t) => [t.slot_id, t]));

  const slots: EditorSlot[] = (rows ?? []).map((r) => {
    const t = bySlot.get(r.id);
    return {
      id: r.id,
      date: r.slot_date,
      label: r.label,
      type: r.slot_type,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      sortOrder: r.sort_order,
      talk: t ? { id: t.id, title: t.title, presenter: names.get(t.presenter_id) ?? "Unknown", status: t.status } : null,
    };
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
        <p className="mt-1 text-muted">{cohort.name} — edit sessions, slots and talk assignments.</p>
      </header>
      {/* key remounts the editor with fresh server data after each refresh */}
      <ScheduleEditor key={JSON.stringify(slots)} cohortId={cohort.id} initial={slots} />
    </div>
  );
}
