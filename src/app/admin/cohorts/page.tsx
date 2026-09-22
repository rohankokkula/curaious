import { CohortManager } from "@/components/admin/CohortManager";
import { getActiveCohort, listCohorts } from "@/lib/cohort";

export const dynamic = "force-dynamic";

export default async function CohortsPage() {
  const [cohorts, current] = await Promise.all([listCohorts(), getActiveCohort()]);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Cohorts</h1>
        <p className="mt-1 text-muted">Create cohorts, copy a schedule, and choose which one members see.</p>
      </header>
      <CohortManager cohorts={cohorts} currentId={current?.id ?? null} />
    </div>
  );
}
