import { SeasonTimeline } from "@/components/dashboard/SeasonTimeline";
import { cohortMonthLabel, getActiveCohort } from "@/lib/cohort";
import { fetchInternal } from "@/lib/internalFetch";
import type { SlotView } from "@/lib/talks";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const cohort = await getActiveCohort();
  const body = await fetchInternal<{ ok?: boolean; hasActiveTalk?: boolean; slots?: SlotView[] }>("/api/slots");
  const slots = (body?.ok ? (body.slots ?? []) : []).slice().sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{cohort?.name ? `${cohort.name} Schedule` : "Schedule"}</h1>
        {cohort ? <p className="mt-1 text-muted">{cohortMonthLabel(cohort)}</p> : null}
      </header>

      {slots.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-8 text-sm text-muted">The schedule hasn&rsquo;t been set up yet.</p>
      ) : (
        <SeasonTimeline slots={slots} viewerHasActiveTalk={Boolean(body?.hasActiveTalk)} />
      )}
    </div>
  );
}
