/**
 * SERVER-ONLY. Imports the service-role client — Server Components only.
 * Kept out of showcase.ts on purpose: that file is plain types, safe to
 * import anywhere; this one isn't.
 *
 * Runs with the service-role client on purpose: every RLS policy in this
 * schema is scoped `to authenticated`, and opening `to anon` policies on
 * profiles/talks/ratings would expose those tables to anyone holding the anon
 * key, which ships in the browser bundle. Keeping the read here means one
 * function decides what is public, and it builds every object field by field
 * from an allowlist — `email`, `role`, `deck_path` and recordings have no
 * path out.
 *
 * Per-member `visibility` is honoured as an ordinary viewer (not self, not
 * admin), and anyone with `showcase` switched off is dropped from the people
 * list; their booked seats still show on the schedule, just without a name.
 */
import { cache } from "react";
import { isBadgeKey } from "@/lib/badges";
import { canSee, resolveVisibility } from "@/lib/profile";
import { emptyAggregate, RATING_PARAMETERS, type RatingAverages } from "@/lib/ratings";
import {
  SHOWCASE_ATTRIBUTE_COMMENTS,
  type CohortPageData,
  type ShowcaseComment,
  type ShowcasePerson,
  type ShowcaseSession,
} from "@/lib/showcase";
import { loadPresentedIds } from "@/lib/presented";
import { scoresRevealed } from "@/lib/scoreReveal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SlotType } from "@/lib/talks";

type ProfileRow = {
  id: string;
  name: string;
  role: "member" | "admin";
  avatar_url: string | null;
  headline: string | null;
  location: string | null;
  bio: string | null;
  tags: string[] | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  github_url: string | null;
  visibility: unknown;
};

type TalkRow = { id: string; presenter_id: string; title: string; description: string; status: string };

type SeasonRow = {
  id: string;
  name: string;
  number: number;
  starts_on: string;
  ends_on: string;
  session_slots: {
    id: string;
    slot_date: string;
    slot_type: SlotType;
    label: string;
    sort_order: number;
    capacity: number;
    recording_url: string | null;
    talks: TalkRow[];
  }[];
};

type RatingRow = {
  talk_id: string;
  understanding: number;
  content: number;
  research_depth: number;
  delivery: number;
  usefulness: number;
  comment: string | null;
  rater: { name: string } | null;
};

const PROFILE_COLUMNS =
  "id, name, role, avatar_url, headline, location, bio, tags, linkedin_url, twitter_url, github_url, visibility";

const round = (value: number) => Math.round(value * 10) / 10;

/** Everything the public page for season `number` shows, in three rounds of queries. */
export const loadCohortPage = cache(async (number: number): Promise<CohortPageData> => {
  const admin = createSupabaseAdminClient();

  const { data: season } = await admin
    .from("seasons")
    .select(
      `id, name, number, starts_on, ends_on,
      session_slots (id, slot_date, slot_type, label, sort_order, capacity, recording_url,
        talks (id, presenter_id, title, description, status, submitted_at)
      )`,
    )
    .eq("number", number)
    .eq("session_slots.talks.status", "approved")
    .order("sort_order", { referencedTable: "session_slots", ascending: true })
    .order("submitted_at", { referencedTable: "session_slots.talks", ascending: true })
    .limit(1)
    .maybeSingle<SeasonRow>();

  if (!season) return { season: null, sessions: [], people: [] };

  const talks = season.session_slots.flatMap((slot) => slot.talks.map((talk) => ({ ...talk, slot })));
  const talkIds = talks.map((t) => t.id);

  const [{ data: memberships }, { data: ratings }, { data: badges }] = await Promise.all([
    admin
      .from("cohort_members")
      .select(`profile:profiles!inner (${PROFILE_COLUMNS})`)
      .eq("cohort_id", season.id)
      .eq("status", "active")
      .returns<{ profile: ProfileRow }[]>(),
    talkIds.length
      ? admin
          .from("ratings")
          .select("talk_id, understanding, content, research_depth, delivery, usefulness, comment, rater:profiles!rater_id (name)")
          .in("talk_id", talkIds)
          .returns<RatingRow[]>()
      : Promise.resolve({ data: [] as RatingRow[] }),
    admin.from("member_badges").select("profile_id, badge_key").eq("season_id", season.id).returns<{ profile_id: string; badge_key: string }[]>(),
  ]);

  // The curator isn't on the public roster.
  const profiles = (memberships ?? []).map((m) => m.profile).filter((p) => p.role !== "admin");
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const viewer = { isSelf: false, isAdmin: false };
  const visibilityOf = (p: ProfileRow) => resolveVisibility(p.visibility);
  const shows = (p: ProfileRow | undefined, key: Parameters<typeof canSee>[1]) =>
    Boolean(p && visibilityOf(p).showcase && canSee(visibilityOf(p), key, viewer));

  const today = new Date().toISOString().slice(0, 10);
  // Public page: scores stay sealed until the season's last talk is done.
  const presented = await loadPresentedIds(talks.map((t) => t.id));
  const allDone = talks.length > 0 && talks.every((t) => presented.has(t.id));
  const scoresOpen = scoresRevealed(season.session_slots.map((slot) => ({ date: slot.slot_date, type: slot.slot_type })), today, allDone);

  const sessions: ShowcaseSession[] = season.session_slots.map((slot) => ({
    id: slot.id,
    date: slot.slot_date,
    label: slot.label,
    type: slot.slot_type,
    capacity: slot.capacity,
    recorded: Boolean(slot.recording_url),
    seats: slot.talks.map((talk) => {
      const speaker = byId.get(talk.presenter_id);
      const public_ = Boolean(speaker && visibilityOf(speaker).showcase);
      return {
        title: shows(speaker, "talk") ? talk.title : null,
        speakerName: public_ ? speaker!.name : null,
        speakerAvatarUrl: public_ ? speaker!.avatar_url : null,
        presented: slot.slot_date < today,
      };
    }),
  }));

  const ratingsByTalk = new Map<string, RatingRow[]>();
  for (const row of ratings ?? []) ratingsByTalk.set(row.talk_id, [...(ratingsByTalk.get(row.talk_id) ?? []), row]);
  const badgesBy = new Map<string, string[]>();
  for (const b of badges ?? []) badgesBy.set(b.profile_id, [...(badgesBy.get(b.profile_id) ?? []), b.badge_key]);
  const talkBy = new Map(talks.map((t) => [t.presenter_id, t]));

  const people: ShowcasePerson[] = profiles
    .filter((p) => visibilityOf(p).showcase)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((profile) => {
      const show = (key: Parameters<typeof canSee>[1]) => shows(profile, key);
      const talk = talkBy.get(profile.id) ?? null;
      const rows = talk ? (ratingsByTalk.get(talk.id) ?? []) : [];

      let scores: (RatingAverages & { count: number }) | null = null;
      if (talk && scoresOpen && show("scores") && rows.length > 0) {
        const averages = emptyAggregate().averages;
        let overallTotal = 0;
        for (const parameter of RATING_PARAMETERS) {
          const total = rows.reduce((sum, row) => sum + row[parameter.key], 0);
          averages[parameter.key] = round(total / rows.length);
          overallTotal += total;
        }
        averages.overall = round(overallTotal / (rows.length * RATING_PARAMETERS.length));
        scores = { ...averages, count: rows.length };
      }

      const comments: ShowcaseComment[] =
        talk && show("feedback")
          ? rows
              .filter((row) => row.comment?.trim())
              .map((row) => ({
                raterName: SHOWCASE_ATTRIBUTE_COMMENTS ? (row.rater?.name ?? "A member") : null,
                text: row.comment!.trim(),
              }))
          : [];

      return {
        id: profile.id,
        name: profile.name,
        avatarUrl: profile.avatar_url,
        headline: show("headline") ? profile.headline : null,
        location: show("location") ? profile.location : null,
        bio: show("bio") ? profile.bio : null,
        tags: show("tags") ? (profile.tags ?? []) : [],
        linkedinUrl: show("linkedin") ? profile.linkedin_url : null,
        twitterUrl: show("twitter") ? profile.twitter_url : null,
        githubUrl: show("github") ? profile.github_url : null,
        badges: (badgesBy.get(profile.id) ?? []).filter(isBadgeKey),
        talk:
          talk && show("talk")
            ? {
                title: talk.title,
                description: talk.description,
                slotLabel: talk.slot.label,
                slotDate: talk.slot.slot_date,
                scores,
                comments,
              }
            : null,
      };
    });

  return {
    season: { name: season.name, number: season.number, startsOn: season.starts_on, endsOn: season.ends_on },
    sessions,
    people,
  };
});
