import { Card } from "@/components/ui/card";
import { getActiveCohort } from "@/lib/cohort";
import { loadCohortFeedback } from "@/lib/feedback";
import { RATING_PARAMETERS } from "@/lib/ratings";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  const cohort = await getActiveCohort();
  if (!cohort) return <p className="text-sm text-muted">Create a cohort first.</p>;
  const { talks } = await loadCohortFeedback(cohort.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Feedback</h1>
        <p className="mt-1 text-muted">Scores and notes per approved talk in {cohort.name}. Rater names are visible to admins only.</p>
      </header>
      {talks.length === 0 ? <Card className="p-8 text-sm text-muted">No approved talks yet.</Card> : null}
      {talks.map((t) => (
        <Card key={t.talkId} className="p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-semibold">{t.title}</h2>
              <p className="text-sm text-muted">by {t.presenter} · {t.count} {t.count === 1 ? "response" : "responses"}</p>
            </div>
            <p className="text-2xl font-bold">{t.overall ?? "—"}<span className="text-sm font-medium text-muted"> / 10</span></p>
          </div>
          <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-5">
            {RATING_PARAMETERS.map((p) => (
              <div key={p.key}><dt className="text-xs text-muted">{p.label}</dt><dd className="font-semibold">{t.averages[p.key] ?? "—"}</dd></div>
            ))}
          </dl>
          {t.comments.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {t.comments.map((c, i) => (
                <li key={i} className="rounded-lg bg-surface p-3 text-sm"><span className="font-medium">{c.rater}: </span><span className="text-muted">{c.text}</span></li>
              ))}
            </ul>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
