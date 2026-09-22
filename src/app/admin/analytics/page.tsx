import { Card } from "@/components/ui/card";
import { getActiveCohort } from "@/lib/cohort";
import { loadCohortFeedback } from "@/lib/feedback";
import { RATING_PARAMETERS } from "@/lib/ratings";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const cohort = await getActiveCohort();
  if (!cohort) return <p className="text-sm text-muted">Create a cohort first.</p>;
  const { talks, raters, memberCount } = await loadCohortFeedback(cohort.id);

  const rated = talks.filter((t) => t.count > 0);
  const avg = (key: string) => {
    const vals = rated.map((t) => t.averages[key]).filter((v): v is number => v !== null);
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  };
  const totalResponses = talks.reduce((s, t) => s + t.count, 0);
  // Each member can rate every approved talk except their own.
  const possible = Math.max(0, memberCount * talks.length - talks.length);
  const completion = possible ? Math.round((totalResponses / possible) * 100) : 0;

  const stats = [
    { label: "Approved talks", value: talks.length },
    { label: "Responses", value: totalResponses },
    { label: "Feedback completion", value: `${completion}%` },
    { label: "Active raters", value: `${raters.size} / ${memberCount}` },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-muted">How {cohort.name} is going.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5"><p className="text-3xl font-bold">{s.value}</p><p className="mt-1 text-sm text-muted">{s.label}</p></Card>
        ))}
      </div>
      <Card className="p-5">
        <h2 className="font-semibold">Average score by category</h2>
        <div className="mt-4 space-y-3">
          {RATING_PARAMETERS.map((p) => {
            const v = avg(p.key);
            return (
              <div key={p.key} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm text-muted">{p.label}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface"><span className="block h-full rounded-full bg-primary" style={{ width: `${((v ?? 0) / 10) * 100}%` }} /></span>
                <span className="w-8 text-right text-sm font-semibold">{v ?? "—"}</span>
              </div>
            );
          })}
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold">Top rated talks</h2>
        <ol className="mt-3 divide-y divide-border">
          {[...rated].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0)).slice(0, 5).map((t) => (
            <li key={t.talkId} className="flex justify-between py-2 text-sm"><span>{t.title} <span className="text-muted">· {t.presenter}</span></span><span className="font-semibold">{t.overall}</span></li>
          ))}
          {rated.length === 0 ? <li className="py-2 text-sm text-muted">No ratings yet.</li> : null}
        </ol>
      </Card>
    </div>
  );
}
