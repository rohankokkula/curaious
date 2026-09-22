import { ScheduleTimeline } from "@/components/dashboard/ScheduleTimeline";
import { getActiveCohort } from "@/lib/cohort";
import { fetchInternal } from "@/lib/internalFetch";
import type { SlotView } from "@/lib/talks";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const cohort = await getActiveCohort();
  const body = await fetchInternal<{ ok?: boolean; hasActiveTalk?: boolean; slots?: SlotView[] }>("/api/slots");
  const slots = body?.ok ? (body.slots ?? []) : [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
        <p className="mt-1 text-muted">Every session in {cohort?.name ?? "the cohort"}. Claim one talk slot.</p>
      </header>
      {slots.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-8 text-sm text-muted">The schedule hasn&rsquo;t been set up yet.</p>
      ) : (
        <ScheduleTimeline slots={slots} viewerHasActiveTalk={Boolean(body?.hasActiveTalk)} />
      )}
    </div>
  );
}
