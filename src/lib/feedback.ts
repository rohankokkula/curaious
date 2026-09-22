import { RATING_PARAMETERS } from "@/lib/ratings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TalkFeedback = {
  talkId: string;
  title: string;
  presenter: string;
  count: number;
  overall: number | null;
  averages: Record<string, number | null>;
  comments: { rater: string; text: string }[];
};

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Per-talk feedback for one cohort. Admin-only: relies on the admin RLS view of `ratings`. */
export async function loadCohortFeedback(cohortId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: slots } = await supabase.from("session_slots").select("id").eq("season_id", cohortId);
  const slotIds = (slots ?? []).map((s) => s.id);
  if (slotIds.length === 0) return { talks: [] as TalkFeedback[], raters: new Map<string, number>(), memberCount: 0 };

  const { data: talks } = await supabase.from("talks").select("id, title, presenter_id").in("slot_id", slotIds).eq("status", "approved");
  const talkIds = (talks ?? []).map((t) => t.id);
  const { data: ratings } = talkIds.length
    ? await supabase.from("ratings").select("talk_id, rater_id, understanding, content, research_depth, delivery, usefulness, comment").in("talk_id", talkIds)
    : { data: [] };

  const { data: members } = await supabase.from("cohort_members").select("profile_id").eq("cohort_id", cohortId).eq("status", "active");
  const profileIds = [...new Set([...(talks ?? []).map((t) => t.presenter_id), ...(ratings ?? []).map((r) => r.rater_id)])];
  const { data: people } = profileIds.length ? await supabase.from("profiles").select("id, name").in("id", profileIds) : { data: [] };
  const name = new Map((people ?? []).map((p) => [p.id, p.name as string]));

  const raters = new Map<string, number>();
  const out: TalkFeedback[] = (talks ?? []).map((t) => {
    const rows = (ratings ?? []).filter((r) => r.talk_id === t.id);
    const averages: Record<string, number | null> = {};
    for (const p of RATING_PARAMETERS) {
      averages[p.key] = rows.length ? r1(rows.reduce((s, r) => s + (r[p.key] as number), 0) / rows.length) : null;
    }
    const vals = Object.values(averages).filter((v): v is number => v !== null);
    for (const r of rows) raters.set(r.rater_id, (raters.get(r.rater_id) ?? 0) + 1);
    return {
      talkId: t.id,
      title: t.title,
      presenter: name.get(t.presenter_id) ?? "Unknown",
      count: rows.length,
      overall: vals.length ? r1(vals.reduce((a, b) => a + b, 0) / vals.length) : null,
      averages,
      comments: rows.filter((r) => r.comment).map((r) => ({ rater: name.get(r.rater_id) ?? "Unknown", text: r.comment as string })),
    };
  });
  return { talks: out, raters, memberCount: members?.length ?? 0 };
}
