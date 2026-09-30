import { NextResponse } from "next/server";
import { canSee, resolveVisibility } from "@/lib/profile";
import { emptyAggregate, RATING_PARAMETERS, type RatingAverages } from "@/lib/ratings";
import {
  SHOWCASE_ATTRIBUTE_COMMENTS,
  type ShowcaseComment,
  type ShowcaseSpeaker,
} from "@/lib/showcase";
import { createSupabaseAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated read for /showcase.
 *
 * Runs with the service-role client on purpose: every RLS policy in this
 * schema is scoped `to authenticated`, and opening `to anon` policies on
 * profiles/talks/ratings would expose those tables to anyone holding the anon
 * key, which ships in the browser bundle. Keeping the read here means one
 * function decides what is public, and it builds every object field by field
 * from an allowlist — `email`, `role` and `deck_path` have no path out.
 *
 * Per-member `visibility` is honoured as an ordinary viewer (not self, not
 * admin), and anyone with `showcase` switched off is dropped entirely.
 */

type ProfileRow = {
  id: string;
  name: string;
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

type TalkRow = {
  id: string;
  presenter_id: string;
  title: string;
  description: string;
  recording_url: string | null;
  slot_id: string;
};

type RatingRow = {
  talk_id: string;
  rater_id: string;
  understanding: number;
  content: number;
  research_depth: number;
  delivery: number;
  usefulness: number;
  comment: string | null;
};

function round(value: number) {
  return Math.round(value * 10) / 10;
}

export async function GET() {
  if (!isSupabaseConfigured || !hasServiceRoleKey) {
    return NextResponse.json({ ok: false, error: "server_not_configured" }, { status: 503 });
  }

  const admin = createSupabaseAdminClient();

  const { data: cohort } = await admin
    .from("seasons")
    .select("id, name, number, starts_on, ends_on")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle<{ id: string; name: string; number: number; starts_on: string; ends_on: string }>();

  if (!cohort) {
    return NextResponse.json({ ok: true, cohort: null, speakers: [] });
  }

  const { data: memberships, error: membersError } = await admin
    .from("cohort_members")
    .select("profile_id")
    .eq("cohort_id", cohort.id)
    .eq("status", "active")
    .returns<{ profile_id: string }[]>();

  if (membersError) {
    console.error("api/showcase: membership query failed", membersError.message);
    return NextResponse.json({ ok: false, error: "query_failed" }, { status: 500 });
  }

  const memberIds = (memberships ?? []).map((row) => row.profile_id);
  if (memberIds.length === 0) {
    return NextResponse.json({ ok: true, cohort: null, speakers: [] });
  }

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select(
      "id, name, avatar_url, headline, location, bio, tags, linkedin_url, twitter_url, github_url, visibility",
    )
    .in("id", memberIds)
    .order("name", { ascending: true })
    .returns<ProfileRow[]>();

  if (profilesError) {
    console.error("api/showcase: profile query failed", profilesError.message);
    return NextResponse.json({ ok: false, error: "query_failed" }, { status: 500 });
  }

  // Opted out entirely — never leaves the server.
  const visible = (profiles ?? []).filter(
    (profile) => resolveVisibility(profile.visibility).showcase,
  );
  if (visible.length === 0) {
    return NextResponse.json({ ok: true, cohort: null, speakers: [] });
  }

  const { data: talks } = await admin
    .from("talks")
    .select("id, presenter_id, title, description, recording_url, slot_id")
    .eq("status", "approved")
    .in(
      "presenter_id",
      visible.map((profile) => profile.id),
    )
    .returns<TalkRow[]>();

  const talkRows = talks ?? [];
  const talkByPresenter = new Map(talkRows.map((talk) => [talk.presenter_id, talk]));

  const slotIds = [...new Set(talkRows.map((talk) => talk.slot_id))];
  const { data: slots } = slotIds.length
    ? await admin
        .from("session_slots")
        .select("id, label, slot_date")
        .in("id", slotIds)
        .returns<{ id: string; label: string; slot_date: string }[]>()
    : { data: [] };
  const slotById = new Map((slots ?? []).map((slot) => [slot.id, slot]));

  const talkIds = talkRows.map((talk) => talk.id);
  const { data: ratings } = talkIds.length
    ? await admin
        .from("ratings")
        .select(
          "talk_id, rater_id, understanding, content, research_depth, delivery, usefulness, comment",
        )
        .in("talk_id", talkIds)
        .order("id", { ascending: true })
        .returns<RatingRow[]>()
    : { data: [] };

  const ratingsByTalk = new Map<string, RatingRow[]>();
  for (const row of ratings ?? []) {
    const list = ratingsByTalk.get(row.talk_id) ?? [];
    list.push(row);
    ratingsByTalk.set(row.talk_id, list);
  }

  // Rater names, only if comments are being attributed.
  const raterIds = SHOWCASE_ATTRIBUTE_COMMENTS
    ? [...new Set((ratings ?? []).filter((r) => r.comment?.trim()).map((r) => r.rater_id))]
    : [];
  const { data: raters } = raterIds.length
    ? await admin
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", raterIds)
        .returns<{ id: string; name: string; avatar_url: string | null }[]>()
    : { data: [] };
  const raterById = new Map((raters ?? []).map((r) => [r.id, r]));

  const speakers: ShowcaseSpeaker[] = visible.map((profile) => {
    const visibility = resolveVisibility(profile.visibility);
    const viewer = { isSelf: false, isAdmin: false };
    const show = (key: Parameters<typeof canSee>[1]) => canSee(visibility, key, viewer);

    const talk = talkByPresenter.get(profile.id) ?? null;
    const rows = talk ? (ratingsByTalk.get(talk.id) ?? []) : [];

    let scores: (RatingAverages & { count: number }) | null = null;
    if (talk && show("scores") && rows.length > 0) {
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

    let comments: ShowcaseComment[] = [];
    if (talk && show("feedback")) {
      comments = rows
        .filter((row) => row.comment?.trim())
        .map((row) => {
          const rater = SHOWCASE_ATTRIBUTE_COMMENTS ? raterById.get(row.rater_id) : undefined;
          return {
            raterName: SHOWCASE_ATTRIBUTE_COMMENTS ? (rater?.name ?? "A member") : null,
            raterAvatarUrl: SHOWCASE_ATTRIBUTE_COMMENTS ? (rater?.avatar_url ?? null) : null,
            text: row.comment!.trim(),
          };
        });
    }

    const slot = talk ? (slotById.get(talk.slot_id) ?? null) : null;

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
      talk:
        talk && show("talk")
          ? {
              title: talk.title,
              description: talk.description,
              recordingUrl: show("recording") ? talk.recording_url : null,
              slotLabel: slot?.label ?? null,
              slotDate: slot?.slot_date ?? null,
              scores,
              comments,
            }
          : null,
    };
  });

  return NextResponse.json({
    ok: true,
    cohort: {
      name: cohort.name,
      number: cohort.number,
      startsOn: cohort.starts_on,
      endsOn: cohort.ends_on,
    },
    speakers,
  });
}
