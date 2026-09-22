import { CohortManager } from "@/components/admin/CohortManager";
import { getActiveCohort, listCohorts, type Cohort } from "@/lib/cohort";

export const dynamic = "force-dynamic";

export default async function CohortsPage() {
  let cohorts: Cohort[] = [];
  let current: Cohort | null = null;
  let loadError: string | null = null;

  try {
    [cohorts, current] = await Promise.all([listCohorts(), getActiveCohort()]);
  } catch (error) {
    console.error("admin/cohorts: failed to load cohorts", error);
    loadError = "Couldn't load cohorts. Check the server logs and that the 0003 migration has been applied.";
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Cohorts</h1>
        <p className="mt-1 text-muted">Create cohorts, copy a schedule, and choose which one members see.</p>
      </header>
      {loadError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{loadError}</p>
      ) : (
        <CohortManager cohorts={cohorts} currentId={current?.id ?? null} />
      )}
    </div>
  );
}
