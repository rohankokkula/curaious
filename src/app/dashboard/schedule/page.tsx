import { SeasonTimeline } from "@/components/dashboard/SeasonTimeline";
import { cohortMonthLabel, getActiveCohort } from "@/lib/cohort";
import { loadSeasonSlots } from "@/lib/slots";
import { getViewerProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const [cohort, viewer] = await Promise.all([getActiveCohort(), getViewerProfile()]);

  // Calls the same logic /api/slots itself wraps, rather than this Server
  // Component fetching its own API route over HTTP (see the note in
  // dashboard/page.tsx — free on `next dev`, a real extra hop on Vercel).
  const { slots: rawSlots, hasActiveTalk } = viewer
    ? await loadSeasonSlots(viewer.id)
    : { slots: [], hasActiveTalk: false };
  const slots = rawSlots.slice().sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{cohort?.name ? `${cohort.name} Schedule` : "Schedule"}</h1>
        {cohort ? <p className="mt-1 text-muted">{cohortMonthLabel(cohort)}</p> : null}
      </header>

      {slots.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-8 text-sm text-muted">The schedule hasn&rsquo;t been set up yet.</p>
      ) : (
        <SeasonTimeline slots={slots} viewerHasActiveTalk={hasActiveTalk} />
      )}
    </div>
  );
}
