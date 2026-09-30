import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const COHORT_COOKIE = "curaious_cohort";

export type Cohort = {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "active" | "archived";
  capacity: number;
  starts_on: string;
  ends_on: string;
};

const COLUMNS = "id, name, slug, status, capacity, starts_on, ends_on";

/** Cohort selected via cookie (admin switcher), else the active one, else the newest. */
export async function getActiveCohort(): Promise<Cohort | null> {
  const supabase = await createSupabaseServerClient();
  const selected = (await cookies()).get(COHORT_COOKIE)?.value;

  if (selected) {
    const { data } = await supabase.from("seasons").select(COLUMNS).eq("id", selected).maybeSingle();
    if (data) return data as Cohort;
  }
  const { data: active } = await supabase
    .from("seasons")
    .select(COLUMNS)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (active) return active as Cohort;

  const { data: latest } = await supabase
    .from("seasons")
    .select(COLUMNS)
    .order("starts_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (latest as Cohort | null) ?? null;
}

export async function listCohorts(): Promise<Cohort[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("seasons").select(COLUMNS).order("starts_on", { ascending: false });
  return (data as Cohort[] | null) ?? [];
}

/** "October 2026" style label. */
export function cohortMonthLabel(c: Cohort) {
  return new Date(`${c.starts_on}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Weekends elapsed vs total, for the sidebar progress bar. */
export function cohortProgress(c: Cohort, now = new Date()) {
  const start = new Date(`${c.starts_on}T00:00:00Z`).getTime();
  const end = new Date(`${c.ends_on}T00:00:00Z`).getTime();
  const week = 7 * 24 * 3600 * 1000;
  const total = Math.max(1, Math.ceil((end - start + 1) / week));
  const elapsed = Math.min(total, Math.max(0, Math.ceil((now.getTime() - start) / week)));
  return { total, elapsed, pct: Math.round((elapsed / total) * 100) };
}
