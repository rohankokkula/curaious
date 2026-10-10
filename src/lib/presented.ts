/**
 * SERVER-ONLY. Which talks the curator has marked as done (talks.presented_at,
 * from 0016_talk_presented.sql).
 *
 * Read in its own query on purpose: if the column isn't there yet (migration
 * not pasted), this returns nothing instead of breaking the schedule query.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function loadPresentedIds(talkIds: string[]): Promise<Set<string>> {
  if (!talkIds.length) return new Set();
  const { data, error } = await createSupabaseAdminClient()
    .from("talks")
    .select("id")
    .in("id", talkIds)
    .not("presented_at", "is", null)
    .returns<{ id: string }[]>();
  if (error) return new Set();
  return new Set((data ?? []).map((t) => t.id));
}
