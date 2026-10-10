import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Award, Check, EyeOff, Link2, Lock, Mail, MapPin, Mic, PenLine, Plus, Rocket, Sparkles } from "lucide-react";
import { BadgeArt } from "@/components/dashboard/BadgeArt";
import { DeckPageThumbnail } from "@/components/dashboard/DeckPageThumbnail";
import { DeckUploadPanel } from "@/components/dashboard/DeckUploadPanel";
import { DeleteTalkButton } from "@/components/dashboard/DeleteTalkButton";
import { Avatar } from "@/components/dashboard/Avatar";
import { EditProfileDialog } from "@/components/dashboard/EditProfileDialog";
import { ProfileTabs } from "@/components/dashboard/ProfileTabs";
import { RecordingCard } from "@/components/dashboard/RecordingCard";
import { RemoveMemberButton } from "@/components/dashboard/RemoveMemberButton";
import { ShareProfileButton } from "@/components/dashboard/ShareProfileButton";
import { GithubIcon, LinkedinIcon, XIcon } from "@/components/icons/SocialIcons";
import { DAY_PALETTE, GRAY, talkLooks } from "@/components/dashboard/seasonLayout";
import { WatchRecordingButton } from "@/components/dashboard/WatchRecordingButton";
import { Wordmark } from "@/components/shell/Wordmark";
import { revealDateLabel, scoresRevealed, scoresRevealOn } from "@/lib/scoreReveal";
import { loadSeasonSlots } from "@/lib/slots";
import { BADGES, isBadgeKey } from "@/lib/badges";
import { getActiveCohort } from "@/lib/cohort";
import { canSee, resolveVisibility } from "@/lib/profile";
import { RECORDINGS_VISIBLE_TO } from "@/lib/recording";
import { RATING_MAX, RATING_PARAMETERS, type RatingParameterKey } from "@/lib/ratings";
import { loadRatingAggregate } from "@/lib/ratingsAggregate";
import type { DeckStatus, TalkStatus } from "@/lib/talks";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient, getSessionUser, getViewerProfile } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  name: string;
  email: string;
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

type TalkRow = {
  id: string;
  title: string;
  description: string;
  status: TalkStatus;
  deck_path: string | null;
  deck_status: DeckStatus;
  deck_feedback: string | null;
  rejection_reason: string | null;
  recording_url: string | null;
  slot: { label: string; slot_date: string } | null;
};

type SentBackRow = { id: string; title: string; rejection_reason: string | null };

type GivenRatingRow = Record<RatingParameterKey, number> & {
  talk_id: string;
  comment: string | null;
  created_at: string;
  talk: { id: string; title: string; presenter: { name: string } | null } | null;
};

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-border bg-card p-5 sm:p-6", className)}>{children}</div>;
}

/** Quiet marker on a field that's only on screen because it's your own
 * profile — so you can tell at a glance what the rest of the cohort can't see.
 * An icon rather than a pill so it never pushes a line onto two. */
function OnlyYou({ when }: { when: boolean }) {
  if (!when) return null;
  return (
    <span title="Only you can see this" className="ml-1.5 inline-flex align-middle text-muted/70">
      <EyeOff className="size-3.5" />
      <span className="sr-only">(only you can see this)</span>
    </span>
  );
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const pct = value === null ? 0 : (value / RATING_MAX) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-semibold text-foreground tabular-nums">{value ?? "–"}</span>
      </div>
      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

const shortDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const average = (row: Record<RatingParameterKey, number>) =>
  Math.round((RATING_PARAMETERS.reduce((sum, p) => sum + row[p.key], 0) / RATING_PARAMETERS.length) * 10) / 10;

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSupabaseConfigured) {
    return (
      <Card>
        <p className="text-sm text-muted">This app isn&rsquo;t connected to its database yet.</p>
      </Card>
    );
  }

  const [supabase, user, viewer, cohort] = await Promise.all([
    createSupabaseServerClient(),
    getSessionUser(),
    getViewerProfile(),
    getActiveCohort(),
  ]);

  if (!user) {
    return (
      <Card>
        <p className="text-sm text-muted">Sign in to see member profiles.</p>
      </Card>
    );
  }

  // Everything about this member in one parallel round instead of ten queries
  // in a row. The sent-back talk and ratings given are fetched regardless and
  // gated below; RLS already limits both to the member themselves and admins.
  const [{ data: member }, { data: talk }, { data: sentBackRow }, { data: givenRows }, { data: badgeRows }, { data: articleRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, email, role, avatar_url, headline, location, bio, tags, linkedin_url, twitter_url, github_url, visibility")
      .eq("id", id)
      .maybeSingle<ProfileRow>(),
    // RLS shows approved talks to everyone; a pending one only to its
    // presenter and admins.
    supabase
      .from("talks")
      .select("id, title, description, status, deck_path, deck_status, deck_feedback, rejection_reason, recording_url, slot:session_slots (label, slot_date)")
      .eq("presenter_id", id)
      .neq("status", "rejected")
      .maybeSingle<TalkRow>(),
    supabase
      .from("talks")
      .select("id, title, rejection_reason")
      .eq("presenter_id", id)
      .eq("status", "rejected")
      .order("reviewed_at", { ascending: false })
      .limit(1)
      .maybeSingle<SentBackRow>(),
    supabase
      .from("ratings")
      .select(
        "talk_id, understanding, content, research_depth, delivery, usefulness, comment, created_at, talk:talks (id, title, presenter:profiles!presenter_id (name))",
      )
      .eq("rater_id", id)
      .order("created_at", { ascending: false })
      .returns<GivenRatingRow[]>(),
    supabase
      .from("member_badges")
      .select("badge_key")
      .eq("profile_id", id)
      .order("awarded_at", { ascending: true })
      .returns<{ badge_key: string }[]>(),
    // their published writing ("Your thoughts"), newest first
    supabase
      .from("resource_links")
      .select("slug, title, note, read_minutes, created_at")
      .eq("added_by", id)
      .eq("kind", "article")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(2)
      .returns<{ slug: string; title: string; note: string | null; read_minutes: number | null; created_at: string }[]>(),
  ]);

  if (!member) notFound();

  const isSelf = user.id === member.id;
  const isAdmin = viewer?.role === "admin";
  // The curator can take anyone else out of the cohort from here.
  const canRemove = isAdmin && !isSelf;
  const badges = (badgeRows ?? []).map((row) => row.badge_key).filter(isBadgeKey).map((key) => BADGES[key]);

  // The admin account is the season's curator: shown to everyone as
  // "Curator", with the sessions they host and what they've written in place
  // of a talk.
  const isCurator = member.role === "admin";
  const articles = articleRows ?? [];

  // What this member chose to show. You and admins always see the lot; the
  // toggles govern what everyone else gets.
  const visibility = resolveVisibility(member.visibility);
  const show = (key: Parameters<typeof canSee>[1]) => canSee(visibility, key, { isSelf, isAdmin });
  /** Marks a field that's only on screen because it's you looking. */
  const hiddenFromOthers = (key: Parameters<typeof canSee>[1]) => isSelf && !visibility[key];
  const canSeeRecording = RECORDINGS_VISIBLE_TO === "admin" ? isAdmin : show("recording");

  // Feedback *given* is private to its author and to admins — gated here, and
  // backed by the `ratings` select policy so a direct query can't get round it.
  const canSeeGiven = isSelf || isAdmin;
  const given = canSeeGiven ? (givenRows ?? []) : [];

  // Rejected talks are hidden from the calendar, but the presenter (and the
  // curator) should still be able to read why it came back.
  const sentBack = !talk && canSeeGiven ? sentBackRow : null;

  const [aggregate, { slots: seasonSlots }] = await Promise.all([
    talk && talk.status === "approved" ? loadRatingAggregate(talk.id) : Promise.resolve(null),
    loadSeasonSlots(user.id),
  ]);
  // Scores are sealed for everyone but the curator until the last talk is done.
  const revealOn = scoresRevealOn(seasonSlots);
  const scoresOpen = isAdmin || scoresRevealed(seasonSlots);

  const today = new Date().toISOString().slice(0, 10);
  const talkVisible = Boolean(talk && show("talk"));
  const talkDone = Boolean(talk?.slot && talk.status === "approved" && talk.slot.slot_date < today);

  const links = [
    { href: member.linkedin_url, key: "linkedin" as const, icon: LinkedinIcon, label: "LinkedIn" },
    { href: member.twitter_url, key: "twitter" as const, icon: XIcon, label: "X" },
    { href: member.github_url, key: "github" as const, icon: GithubIcon, label: "GitHub" },
  ].filter((link) => link.href && show(link.key));

  const scoresVisible = Boolean(aggregate && show("scores") && aggregate.count > 0 && scoresOpen);
  const scoresSealed = Boolean(aggregate && show("scores") && aggregate.count > 0 && !scoresOpen);

  /* ── your own profile: what's still missing ── */
  const checklist = [
    { label: "Photo", done: Boolean(member.avatar_url) },
    { label: "Headline", done: Boolean(member.headline) },
    { label: "Location", done: Boolean(member.location) },
    { label: "About", done: Boolean(member.bio) },
    { label: "Interests", done: Boolean(member.tags?.length) },
    { label: "A link", done: Boolean(member.linkedin_url || member.twitter_url || member.github_url) },
  ];
  const doneCount = checklist.filter((item) => item.done).length;
  const completePct = Math.round((doneCount / checklist.length) * 100);

  const hasAbout = Boolean(member.bio && show("bio"));
  const hasTags = Boolean(member.tags && member.tags.length > 0 && show("tags"));

  /* ── header: a profile card in their talk's color ── */
  // Their talk's day color from the schedule, so a profile and the talk cover
  // match; members without a talk get a steady color from their name.
  const kickoff = isCurator ? (seasonSlots.find((slot) => slot.type === "kickoff") ?? null) : null;
  const look = talk ? talkLooks(seasonSlots).get(talk.id) : undefined;
  const accent = look?.palette ?? DAY_PALETTE[[...member.name].reduce((n, c) => n + c.charCodeAt(0), 0) % DAY_PALETTE.length];
  const talkStatus = !talk ? null : talk.status !== "approved" ? "Requested" : talkDone ? "Presented" : talk.deck_status === "approved" ? null : "Deck soon";

  const header = (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-8">
      {/* decoration in the accent color: a glow and a faint grid from the top right */}
      <div aria-hidden className={cn("pointer-events-none absolute inset-0", accent.label)}>
        <span className="absolute -top-24 -right-24 size-96 rounded-full bg-current opacity-[0.14] blur-3xl" />
        <span
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse at 90% 0%, black 0%, transparent 65%)",
          }}
        />
      </div>

      <div className="relative">
        {/* top bar: wordmark + cohort, actions */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="leading-none max-md:hidden">
            <Wordmark className="block text-lg font-bold tracking-tight" />
            <span className="mt-1.5 block text-[10px] font-semibold tracking-[0.24em] text-muted uppercase">
              {cohort?.name ?? "Cohort"}
              {isCurator ? " · curator" : ""}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 [&_button]:h-9">
            {isSelf ? (
              <EditProfileDialog
                profile={{
                  name: member.name,
                  headline: member.headline,
                  location: member.location,
                  bio: member.bio,
                  tags: member.tags ?? [],
                  avatar_url: member.avatar_url,
                  linkedin_url: member.linkedin_url,
                  twitter_url: member.twitter_url,
                  github_url: member.github_url,
                  visibility: member.visibility,
                }}
              />
            ) : null}
            <ShareProfileButton />
            {canRemove && cohort ? <RemoveMemberButton cohortId={cohort.id} profileId={member.id} name={member.name} /> : null}
          </div>
        </div>

        {/* who they are + photo */}
        <div className="mt-5 grid gap-5 md:mt-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-10">
          <div className="min-w-0 md:pt-2">
            {isCurator ? (
              <span className={cn("mb-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase", accent.well, accent.label)}>
                <Sparkles className="size-3.5" /> Curator
              </span>
            ) : null}
            <h1 className="text-4xl leading-[0.95] font-bold tracking-tight text-balance md:text-6xl">{member.name}</h1>
            {member.headline && show("headline") ? (
              <p className="mt-3 text-lg text-muted md:text-2xl">
                {member.headline}
                <OnlyYou when={hiddenFromOthers("headline")} />
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
              {member.location && show("location") ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 shrink-0" />
                  {member.location}
                  <OnlyYou when={hiddenFromOthers("location")} />
                </span>
              ) : null}
              {show("email") ? (
                <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                  <Mail className="size-4 shrink-0" />
                  <span className="truncate">{member.email}</span>
                  <OnlyYou when={hiddenFromOthers("email")} />
                </span>
              ) : null}
            </div>

            {hasAbout ? (
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed whitespace-pre-line text-muted">
                {member.bio}
                <OnlyYou when={hiddenFromOthers("bio")} />
              </p>
            ) : null}
          </div>

          <div className="order-first">
            {member.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.avatar_url}
                alt={member.name}
                className={cn("aspect-square w-28 rounded-2xl border-2 object-cover shadow-xl sm:w-36 md:w-60 lg:w-72", accent.well)}
              />
            ) : (
              <div
                className={cn(
                  "relative flex aspect-square w-28 items-center justify-center overflow-hidden rounded-2xl border-2 sm:w-36 md:w-60 lg:w-72",
                  accent.well,
                  accent.label,
                )}
              >
                <span aria-hidden className="absolute -top-10 -right-10 size-40 rounded-full bg-current opacity-25 blur-3xl" />
                <span className="relative text-4xl font-bold tracking-tight md:text-7xl">{initialsFor(member.name)}</span>
              </div>
            )}
          </div>
        </div>

        {/* their talk + links */}
        <div className={cn("mt-6 grid gap-4", links.length > 0 && "md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]")}>
          {isCurator ? (
            <div className={cn("grid gap-3", articles.length > 0 && kickoff && "sm:grid-cols-2")}>
              {kickoff ? (
                <div className={cn("relative overflow-hidden rounded-2xl border p-5", GRAY.card)}>
                  <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
                    <Rocket className="size-4" /> Hosted the kickoff
                  </p>
                  <p className="mt-3 text-lg leading-tight font-bold tracking-tight capitalize">{kickoff.label}</p>
                  <p className="mt-1 text-sm text-muted">{shortDate(kickoff.date)} · the whole cohort, for the first time</p>
                  {kickoff.recordingUrl ? <WatchRecordingButton url={kickoff.recordingUrl} title="Season kickoff" className="mt-4" /> : null}
                </div>
              ) : null}
              {articles.map((article) => {
                const tone = DAY_PALETTE[[...article.slug].reduce((n, c) => n + c.charCodeAt(0), 0) % DAY_PALETTE.length];
                return (
                  <Link
                    key={article.slug}
                    href={`/hearticles/${article.slug}`}
                    className={cn("group relative block overflow-hidden rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-lg", tone.card)}
                  >
                    <p className={cn("flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] uppercase", tone.label)}>
                      <PenLine className="size-4" /> Wrote
                      {article.read_minutes ? <span className="text-muted">· {article.read_minutes} min read</span> : null}
                    </p>
                    <p className="mt-3 text-lg leading-tight font-bold tracking-tight">{article.title}</p>
                    {article.note ? <p className="mt-1 line-clamp-2 text-sm text-muted">{article.note}</p> : null}
                    <p className={cn("mt-4 inline-flex items-center gap-1 text-xs font-semibold", tone.label)}>
                      Read it <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : talk && talkVisible ? (
            <Link
              href={`/dashboard/talks/${talk.id}/present`}
              className={cn("group relative block overflow-hidden rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-lg", accent.card)}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={cn("flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] uppercase", accent.label)}>
                  <Mic className="size-4" /> {talkDone ? "Spoke at curaious" : "Speaking at curaious"}
                </p>
                <div className="flex items-center gap-1.5">
                  {talkStatus ? (
                    <span className="rounded-full bg-background/50 px-2 py-0.5 text-[10px] font-semibold text-muted">{talkStatus}</span>
                  ) : null}
                  {talk.slot ? (
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase", accent.well, accent.label)}>
                      {shortDate(talk.slot.slot_date)}
                    </span>
                  ) : null}
                </div>
              </div>
              <h2 className="mt-3 text-xl leading-tight font-bold tracking-tight text-balance md:text-2xl">{talk.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{talk.description}</p>
              {scoresVisible ? (
                <p className="mt-3 text-sm">
                  <span className="text-lg font-bold tabular-nums">{aggregate!.averages.overall}</span>
                  <span className="text-muted"> / {RATING_MAX} from {aggregate!.count} {aggregate!.count === 1 ? "rating" : "ratings"}</span>
                </p>
              ) : scoresSealed ? (
                <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted">
                  <Lock className="size-3.5" /> {aggregate!.count} {aggregate!.count === 1 ? "score" : "scores"} in · sealed
                  {revealOn ? ` until ${revealDateLabel(revealOn)}` : ""}
                </p>
              ) : null}
            </Link>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border p-5">
              <p className="text-sm text-muted">{isSelf ? "You're not on the schedule yet." : "Not on the schedule yet."}</p>
              {isSelf ? (
                <Link href="/dashboard/schedule" className="shrink-0 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background">
                  Claim a slot
                </Link>
              ) : null}
            </div>
          )}

          {links.length > 0 ? (
            <div>
              <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
                <Link2 className="size-4" /> Links
              </p>
              <ul className="mt-3 space-y-2">
                {links.map(({ href, icon: Icon, label, key }) => (
                  <li key={label}>
                    <a
                      href={href!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-border bg-background/40 px-4 py-3 text-sm font-medium transition hover:border-foreground/30"
                    >
                      <Icon className="size-5" />
                      <span className="flex-1">
                        {label}
                        <OnlyYou when={hiddenFromOthers(key)} />
                      </span>
                      <ArrowUpRight className="size-4 text-muted" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* interests, badges, numbers */}
        {hasTags || badges.length > 0 ? (
          <div className="mt-6 grid gap-5 border-t border-border pt-5 md:mt-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {hasTags ? (
              <div>
                <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
                  <Sparkles className="size-4" /> Interests
                  <OnlyYou when={hiddenFromOthers("tags")} />
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {member.tags!.map((tag) => (
                    <span key={tag} className="rounded-full border border-border bg-background/40 px-3 py-1.5 text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {badges.length > 0 ? (
              <div>
                <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
                  <Award className="size-4" /> Badges
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {badges.map((badge) => (
                    <li key={badge.key}>
                      <Link
                        href="/dashboard/leaderboard#badges"
                        title={`${badge.name}: ${badge.awardedFor}`}
                        className="flex items-center gap-2 rounded-full border border-border bg-background/40 py-1 pr-3 pl-1.5 transition hover:border-foreground/30"
                      >
                        <BadgeArt badge={badge.key} className="w-6" />
                        <span className="text-xs font-semibold">{badge.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );

  /* ── side panel: profile completeness, yours only ── */
  const sidePanel =
    isSelf && completePct < 100 ? (
      <div className="space-y-4">
        {isSelf && completePct < 100 ? (
          <Card className="p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold">Complete your profile</p>
              <p className="text-xs font-semibold text-muted tabular-nums">{completePct}%</p>
            </div>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${completePct}%` }} />
            </span>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {checklist.map((item) => (
                <li
                  key={item.label}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs",
                    item.done ? "bg-success-soft text-success" : "bg-surface text-muted ring-1 ring-border",
                  )}
                >
                  {item.done ? <Check className="size-3" /> : <Plus className="size-3" />}
                  {item.label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Add the rest from Edit profile. A full profile helps the cohort know who&rsquo;s presenting.</p>
          </Card>
        ) : null}

      </div>
    ) : null;

  /* ── presentation tab ── */
  const presentationTab = (
    <div className="space-y-4 sm:space-y-6">
      {/* The talk itself lives in the profile card above. What's left here:
          why a request came back, and (for you / the curator) deck tools. */}
      {sentBack ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">
            Sent back · {sentBack.title}
          </p>
          <p className="mt-2 text-sm text-foreground">{sentBack.rejection_reason || "No reason given. Ask the curator."}</p>
          {isSelf ? <p className="mt-2 text-sm text-muted">The slot is open again. Claim any open slot from the schedule.</p> : null}
        </div>
      ) : null}

      {talk && (isSelf || (isAdmin && talk.deck_path)) ? (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold">{isSelf ? "Manage your talk" : "Deck"}</h3>
            {talk.deck_path ? (
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/talks/${talk.id}/present`}
                  className="rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-background transition hover:bg-foreground/90"
                >
                  View deck
                </Link>
                <a
                  href={`/api/talks/${talk.id}/deck/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-border px-4 py-1.5 text-sm font-medium transition hover:bg-surface"
                >
                  Open PDF
                </a>
              </div>
            ) : null}
          </div>
          {talk.deck_path ? (
            <div className="relative aspect-video max-w-md overflow-hidden rounded-xl border border-border bg-surface">
              <DeckPageThumbnail talkId={talk.id} className="absolute inset-0" />
            </div>
          ) : null}
          {isSelf ? (
            <>
              <DeckUploadPanel talkId={talk.id} booked={talk.status === "approved"} deckStatus={talk.deck_status} feedback={talk.deck_feedback} />
              <div className="border-t border-border pt-4">
                <DeleteTalkButton talkId={talk.id} />
              </div>
            </>
          ) : null}
        </Card>
      ) : null}

      {!talk || !talkVisible || talk.status !== "approved" ? (
        !sentBack && !(talk && isSelf) ? (
          <Card>
            <p className="py-2 text-center text-sm text-muted">
              {talk && !show("talk") ? "This member keeps their talk private." : "Scores and feedback show up here after the talk."}
            </p>
          </Card>
        ) : null
      ) : null}

      {/* A recording attached to this talk, once one exists (and the speaker
          shows it). Session recordings live on the schedule. */}
      {talk && talk.status === "approved" && canSeeRecording && talk.recording_url ? (
        <RecordingCard url={talk.recording_url} title={talk.title} isSample={false} />
      ) : null}

      {talk && talk.status === "approved" && show("scores") ? (
        <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
          <Card>
            <h3 className="text-base font-bold">
              Scores from the cohort
              <OnlyYou when={hiddenFromOthers("scores")} />
            </h3>

            {!aggregate || aggregate.count === 0 ? (
              <p className="mt-4 text-sm text-muted">No scores in yet.</p>
            ) : !scoresOpen ? (
              <div className="relative mt-4 overflow-hidden rounded-xl bg-surface p-5">
                {/* the shape of a score, blurred: something's there, not what */}
                <div aria-hidden className="pointer-events-none blur-md select-none">
                  <p className="text-4xl font-bold tracking-tight">?.? <span className="text-lg font-medium">/ {RATING_MAX}</span></p>
                  <div className="mt-4 space-y-3">
                    {RATING_PARAMETERS.map((parameter, i) => (
                      <span key={parameter.key} className="block h-2 rounded-full bg-foreground/25" style={{ width: `${55 + ((i * 17) % 40)}%` }} />
                    ))}
                  </div>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-surface/40 px-4 text-center">
                  <span className="flex size-10 items-center justify-center rounded-full bg-background">
                    <Lock className="size-4" />
                  </span>
                  <p className="text-sm font-semibold">
                    {aggregate.count} {aggregate.count === 1 ? "score is" : "scores are"} in, sealed
                  </p>
                  <p className="max-w-xs text-xs text-muted">
                    Everyone&rsquo;s scores open together once the last talk is done
                    {revealOn ? `: ${revealDateLabel(revealOn)}` : ""}.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-4 rounded-xl bg-surface p-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-4xl font-bold tracking-tight tabular-nums">
                      {aggregate.averages.overall}
                      <span className="text-lg font-medium text-muted"> / {RATING_MAX}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {aggregate.count} {aggregate.count === 1 ? "response" : "responses"}
                    </p>
                  </div>
                  <span className="mt-3 block h-2 overflow-hidden rounded-full bg-background">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${((aggregate.averages.overall ?? 0) / RATING_MAX) * 100}%` }}
                    />
                  </span>
                </div>
                <div className="mt-5 space-y-3.5">
                  {RATING_PARAMETERS.map((parameter) => (
                    <ScoreBar key={parameter.key} label={parameter.label} value={aggregate.averages[parameter.key]} />
                  ))}
                </div>
              </>
            )}
          </Card>

          <Card>
            <h3 className="text-base font-bold">
              Feedback from the cohort
              <OnlyYou when={hiddenFromOthers("feedback")} />
            </h3>

            {!show("feedback") ? (
              <p className="mt-4 text-sm text-muted">This member keeps their written feedback private.</p>
            ) : !aggregate || aggregate.comments.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No notes in yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {aggregate.comments.map((comment, index) => (
                  <li key={index} className="flex gap-3">
                    <Avatar name={comment.raterName} src={comment.raterAvatarUrl} size="sm" />
                    <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-surface px-3.5 py-2.5">
                      <p className="text-xs font-semibold">{comment.raterName}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted">{comment.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );

  /* ── feedback given tab ── */
  const givenTab = (
    <div className="space-y-3">
      <p className="text-xs text-muted">Only visible to {isSelf ? "you" : "this member"} and the curator.</p>

      {given.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Nothing rated yet.</p>
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {given.map((row) => (
            <li key={row.talk_id}>
              <Link
                href={`/dashboard/talks/${row.talk_id}/present`}
                className="block h-full rounded-2xl border border-border bg-card p-4 transition hover:border-foreground/30"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-surface">
                    <span className="text-sm leading-none font-bold tabular-nums">{average(row)}</span>
                    <span className="mt-0.5 text-[9px] leading-none text-muted">/ {RATING_MAX}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{row.talk?.title ?? "A talk"}</p>
                    <p className="truncate text-xs text-muted">{row.talk?.presenter?.name ?? "Unknown"}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {RATING_PARAMETERS.map((parameter) => (
                    <span key={parameter.key} className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted">
                      {parameter.label} <strong className="font-semibold text-foreground">{row[parameter.key]}</strong>
                    </span>
                  ))}
                </div>

                {row.comment ? (
                  <p className="mt-3 border-l-2 border-border pl-3 text-sm leading-relaxed text-muted">{row.comment}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {header}

      {/* desktop: tabs left, completeness card right; phone: completeness first, then tabs */}
      <div className="space-y-4 sm:space-y-6 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-6 lg:space-y-0">
        {sidePanel ? <aside className="lg:sticky lg:top-24 lg:order-2">{sidePanel}</aside> : null}

        <div className={cn("min-w-0 lg:order-1", !sidePanel && "lg:col-span-2", isCurator && "hidden")}>
          <ProfileTabs
            tabs={[
              {
                id: "presentation",
                label: isSelf ? "My talk" : "Scores & feedback",
                content: presentationTab,
              },
              ...(canSeeGiven
                ? [{ id: "feedback", label: isSelf ? "Feedback I gave" : "Feedback given", content: givenTab }]
                : []),
            ]}
          />
        </div>
      </div>
    </div>
  );
}
