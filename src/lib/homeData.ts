/**
 * SERVER-ONLY. What the dashboard home needs beyond the season layout
 * (loadSeasonSlots): scoring windows, deck states and who has rated what.
 *
 * The curator's read uses the service role on purpose: it counts everyone's
 * ratings, which RLS only shows a rater (and the admin's own session would
 * also allow, but this keeps one code path for the counts). Only names,
 * avatars and counts leave this file; no scores.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DeckStatus } from "@/lib/talks";

export type HomePerson = { id: string; name: string; avatarUrl: string | null };

export type CuratorTalkState = {
  status: "pending" | "approved" | "rejected";
  deckStatus: DeckStatus;
  ratingsOpen: boolean;
  presenterId: string;
  /** who has scored it */
  raterIds: Set<string>;
};

export type CuratorHomeData = {
  talks: Map<string, CuratorTalkState>;
  members: HomePerson[];
  pendingArticles: number;
  publishedArticles: number;
};

export async function loadCuratorHome(cohortId: string, talkIds: string[]): Promise<CuratorHomeData> {
  const admin = createSupabaseAdminClient();
  const [{ data: talkRows }, { data: ratingRows }, { data: memberRows }, pending, published] = await Promise.all([
    talkIds.length
      ? admin
          .from("talks")
          .select("id, status, deck_status, ratings_open, presenter_id")
          .in("id", talkIds)
          .returns<{ id: string; status: CuratorTalkState["status"]; deck_status: DeckStatus; ratings_open: boolean; presenter_id: string }[]>()
      : Promise.resolve({ data: [] }),
    talkIds.length
      ? admin.from("ratings").select("talk_id, rater_id").in("talk_id", talkIds).returns<{ talk_id: string; rater_id: string }[]>()
      : Promise.resolve({ data: [] }),
    admin
      .from("cohort_members")
      .select("profile:profiles!inner (id, name, avatar_url, role)")
      .eq("cohort_id", cohortId)
      .eq("status", "active")
      .returns<{ profile: { id: string; name: string; avatar_url: string | null; role: string } }[]>(),
    admin.from("resource_links").select("id", { count: "exact", head: true }).eq("kind", "article").eq("status", "pending"),
    admin.from("resource_links").select("id", { count: "exact", head: true }).eq("kind", "article").eq("status", "approved").eq("cohort_id", cohortId),
  ]);

  const raters = new Map<string, Set<string>>();
  for (const r of ratingRows ?? []) raters.set(r.talk_id, (raters.get(r.talk_id) ?? new Set()).add(r.rater_id));

  return {
    talks: new Map(
      (talkRows ?? []).map((t) => [
        t.id,
        { status: t.status, deckStatus: t.deck_status, ratingsOpen: t.ratings_open, presenterId: t.presenter_id, raterIds: raters.get(t.id) ?? new Set() },
      ]),
    ),
    members: (memberRows ?? [])
      .map((m) => m.profile)
      .filter((p) => p.role !== "admin")
      .map((p) => ({ id: p.id, name: p.name, avatarUrl: p.avatar_url }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    pendingArticles: pending.count ?? 0,
    publishedArticles: published.count ?? 0,
  };
}

export type MemberHomeData = {
  /** talks whose scoring window is open right now */
  openForScoring: Set<string>;
  /** talks you've already scored */
  rated: Set<string>;
  myDeck: { description: string; deckPath: string | null; deckStatus: DeckStatus; deckFeedback: string | null } | null;
};

export async function loadMemberHome(viewerId: string, talkIds: string[], myTalkId: string | null): Promise<MemberHomeData> {
  const supabase = await createSupabaseServerClient();
  const [{ data: open }, { data: mine }, { data: myTalk }] = await Promise.all([
    talkIds.length
      ? supabase.from("talks").select("id").in("id", talkIds).eq("ratings_open", true).returns<{ id: string }[]>()
      : Promise.resolve({ data: [] }),
    talkIds.length
      ? supabase.from("ratings").select("talk_id").eq("rater_id", viewerId).in("talk_id", talkIds).returns<{ talk_id: string }[]>()
      : Promise.resolve({ data: [] }),
    myTalkId
      ? supabase
          .from("talks")
          .select("description, deck_path, deck_status, deck_feedback")
          .eq("id", myTalkId)
          .maybeSingle<{ description: string; deck_path: string | null; deck_status: DeckStatus; deck_feedback: string | null }>()
      : Promise.resolve({ data: null }),
  ]);
  return {
    openForScoring: new Set((open ?? []).map((t) => t.id)),
    rated: new Set((mine ?? []).map((r) => r.talk_id)),
    myDeck: myTalk
      ? { description: myTalk.description, deckPath: myTalk.deck_path, deckStatus: myTalk.deck_status, deckFeedback: myTalk.deck_feedback }
      : null,
  };
}
