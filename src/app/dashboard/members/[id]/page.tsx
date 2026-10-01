import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, EyeOff, FileText, Mail, MapPin, Plus } from "lucide-react";
import { BadgeArt } from "@/components/dashboard/BadgeArt";
import { DeckPageThumbnail } from "@/components/dashboard/DeckPageThumbnail";
import { DeleteTalkButton } from "@/components/dashboard/DeleteTalkButton";
import { Avatar } from "@/components/dashboard/Avatar";
import { EditProfileDialog } from "@/components/dashboard/EditProfileDialog";
import { ProfileTabs } from "@/components/dashboard/ProfileTabs";
import { RecordingCard } from "@/components/dashboard/RecordingCard";
import { RemoveMemberButton } from "@/components/dashboard/RemoveMemberButton";
import { ShareProfileButton } from "@/components/dashboard/ShareProfileButton";
import { GithubIcon, LinkedinIcon, XIcon } from "@/components/icons/SocialIcons";
import { BADGES, isBadgeKey } from "@/lib/badges";
import { getActiveCohort } from "@/lib/cohort";
import { canSee, resolveVisibility } from "@/lib/profile";
import { RECORDINGS_VISIBLE_TO, SAMPLE_RECORDING_URL } from "@/lib/recording";
import { RATING_MAX, RATING_PARAMETERS, type RatingParameterKey } from "@/lib/ratings";
import { loadRatingAggregate } from "@/lib/ratingsAggregate";
import { formatSlotDate, type TalkStatus } from "@/lib/talks";
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{children}</p>;
}

function StatusBadge({ status }: { status: TalkStatus }) {
  return status === "approved" ? (
    <span className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success">Approved</span>
  ) : (
    <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
      Pending review
    </span>
  );
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

/** Number over label, side by side with the avatar like a profile header in an app. */
function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="min-w-0 text-center">
      <p className="truncate text-lg leading-tight font-bold tracking-tight tabular-nums sm:text-xl">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-muted sm:text-xs">{label}</p>
    </div>
  );
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
  const [{ data: member }, { data: talk }, { data: sentBackRow }, { data: givenRows }, { data: badgeRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, email, role, avatar_url, headline, location, bio, tags, linkedin_url, twitter_url, github_url, visibility")
      .eq("id", id)
      .maybeSingle<ProfileRow>(),
    // RLS shows approved talks to everyone; a pending one only to its
    // presenter and admins.
    supabase
      .from("talks")
      .select("id, title, description, status, deck_path, rejection_reason, recording_url, slot:session_slots (label, slot_date)")
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
  ]);

  if (!member) notFound();

  const isSelf = user.id === member.id;
  const isAdmin = viewer?.role === "admin";
  // The curator can take anyone else out of the cohort from here.
  const canRemove = isAdmin && !isSelf;
  const badges = (badgeRows ?? []).map((row) => row.badge_key).filter(isBadgeKey).map((key) => BADGES[key]);

  // Members don't see who's an admin — mirrors the filter on the roster page.
  if (member.role === "admin" && !isSelf && !isAdmin) notFound();

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

  const aggregate = talk && talk.status === "approved" ? await loadRatingAggregate(talk.id) : null;

  const today = new Date().toISOString().slice(0, 10);
  const talkVisible = Boolean(talk && show("talk"));
  const talkDone = Boolean(talk?.slot && talk.status === "approved" && talk.slot.slot_date < today);

  const links = [
    { href: member.linkedin_url, key: "linkedin" as const, icon: LinkedinIcon, label: "LinkedIn" },
    { href: member.twitter_url, key: "twitter" as const, icon: XIcon, label: "X" },
    { href: member.github_url, key: "github" as const, icon: GithubIcon, label: "GitHub" },
  ].filter((link) => link.href && show(link.key));

  /* ── at-a-glance numbers ── */
  const scoresVisible = Boolean(aggregate && show("scores") && aggregate.count > 0);
  const statItems = [
    {
      label: "Talk",
      value: !talk || !talkVisible ? "–" : talkDone ? "Done" : talk.slot ? shortDate(talk.slot.slot_date) : "Booked",
    },
    { label: `Score / ${RATING_MAX}`, value: scoresVisible ? aggregate!.averages.overall : "–" },
    canSeeGiven
      ? { label: "Rated", value: given.length }
      : { label: "Responses", value: scoresVisible ? aggregate!.count : "–" },
  ];

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

  /* ── header: avatar + stats, who they are, about and interests, then actions ── */
  const header = (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-5 sm:gap-6">
        <Avatar
          name={member.name}
          src={member.avatar_url}
          size="xl"
          className="size-20 text-xl ring-4 ring-surface sm:size-24 sm:text-2xl"
        />
        <div className="hidden min-w-0 flex-1 md:block">
          <h1 className="truncate text-2xl font-bold tracking-tight">{member.name}</h1>
          {member.headline && show("headline") ? (
            <p className="mt-0.5 text-sm text-muted">
              {member.headline}
              <OnlyYou when={hiddenFromOthers("headline")} />
            </p>
          ) : null}
        </div>
        <div className="grid flex-1 grid-cols-3 gap-2 md:max-w-xs md:flex-none md:gap-6 md:border-l md:border-border md:pl-6">
          {statItems.map((stat) => (
            <Stat key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>
      </div>

      {/* phone: name sits under the avatar row, like an app profile */}
      <div className="mt-4 md:hidden">
        <h1 className="text-xl font-bold tracking-tight">{member.name}</h1>
        {member.headline && show("headline") ? (
          <p className="mt-0.5 text-sm text-muted">
            {member.headline}
            <OnlyYou when={hiddenFromOthers("headline")} />
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted">
        {member.location && show("location") ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" />
            {member.location}
            <OnlyYou when={hiddenFromOthers("location")} />
          </span>
        ) : null}
        {show("email") ? (
          <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
            <Mail className="size-3.5 shrink-0" />
            <span className="truncate">{member.email}</span>
            <OnlyYou when={hiddenFromOthers("email")} />
          </span>
        ) : null}
        {links.length > 0 ? (
          <span className="flex items-center gap-1.5">
            {links.map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href!}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex size-7 items-center justify-center rounded-full border border-border text-muted transition hover:border-foreground/30 hover:text-foreground"
              >
                <Icon className="size-3.5" />
              </a>
            ))}
          </span>
        ) : null}
      </div>

      {hasAbout || hasTags ? (
        <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:gap-8">
          {hasAbout ? (
            <div>
              <SectionLabel>
                About
                <OnlyYou when={hiddenFromOthers("bio")} />
              </SectionLabel>
              <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-muted">{member.bio}</p>
            </div>
          ) : null}
          {hasTags ? (
            <div>
              <SectionLabel>
                Interests
                <OnlyYou when={hiddenFromOthers("tags")} />
              </SectionLabel>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {member.tags!.map((tag) => (
                  <span key={tag} className="rounded-full bg-surface px-2.5 py-1 text-xs text-muted ring-1 ring-border">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {badges.length > 0 ? (
        <div className="mt-4 border-t border-border pt-4">
          <SectionLabel>Badges</SectionLabel>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <li key={badge.key}>
                <Link
                  href="/dashboard/badges"
                  title={`${badge.name}: ${badge.awardedFor}`}
                  className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pr-3 pl-1.5 transition hover:border-foreground/30"
                >
                  <BadgeArt badge={badge.key} className="w-6" />
                  <span className="text-xs font-semibold">{badge.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div
        className={cn(
          "mt-4 grid gap-2 [&_button]:h-9 [&_button]:w-full",
          isSelf || canRemove ? "grid-cols-2 md:max-w-sm" : "grid-cols-1 md:max-w-[12rem]",
        )}
      >
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
    </Card>
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
      {!talk || !talkVisible ? (
        <Card>
          <div className="flex flex-col items-center py-4 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-surface">
              <FileText className="size-5 text-muted" />
            </span>
            <p className="mt-3 text-sm text-muted">
              {talk && !show("talk")
                ? "This member keeps their talk private."
                : isSelf
                  ? "You haven't claimed a slot yet."
                  : "No talk on the calendar yet."}
            </p>
            {isSelf && !talk ? (
              <Link
                href="/dashboard/schedule"
                className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Claim a slot
              </Link>
            ) : null}
          </div>

          {sentBack ? (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                Sent back · {sentBack.title}
              </p>
              <p className="mt-2 text-sm text-foreground">
                {sentBack.rejection_reason || "No reason given. Ask the curator."}
              </p>
              {isSelf ? (
                <p className="mt-2 text-sm text-muted">The slot is open again. Claim any open slot from the schedule.</p>
              ) : null}
            </div>
          ) : null}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 sm:p-0">
          <div className="sm:flex">
            {talk.status === "approved" && talk.deck_path ? (
              <div className="relative aspect-video bg-surface sm:w-64 sm:shrink-0 md:w-72">
                <DeckPageThumbnail talkId={talk.id} className="absolute inset-0" />
              </div>
            ) : null}

            <div className="min-w-0 flex-1 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted capitalize">
                  {talk.slot ? `${talk.slot.label} · ${formatSlotDate(talk.slot.slot_date)}` : "Slot"}
                </p>
                <StatusBadge status={talk.status} />
              </div>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-balance">{talk.title}</h2>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted">{talk.description}</p>

              {/* The deck itself is only for the presenter (or an admin) to open
                  from their own profile — everyone else's route to it is the
                  actual review page (/present), where viewing the deck is part
                  of rating the talk, not a standalone download. */}
              {talk.status === "approved" && talk.deck_path && (isSelf || isAdmin) ? (
                <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Link
                    href={`/dashboard/talks/${talk.id}/present`}
                    className="rounded-full bg-foreground px-4 py-2 text-center text-sm font-semibold text-background transition hover:bg-foreground/90"
                  >
                    View deck
                  </Link>
                  <a
                    href={`/api/talks/${talk.id}/deck/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-border px-4 py-2 text-center text-sm font-medium transition hover:bg-surface"
                  >
                    Open PDF
                  </a>
                </div>
              ) : null}

              {talk.status === "pending" && isSelf ? (
                <p className="mt-5 rounded-lg bg-surface p-3 text-sm text-muted">
                  Waiting on review. Nobody else sees your name on the schedule until it&rsquo;s approved.
                </p>
              ) : null}

              {isSelf ? (
                <div className="mt-5 border-t border-border pt-4">
                  <DeleteTalkButton talkId={talk.id} />
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      )}

      {/* Recordings stay admin-only until RECORDINGS_VISIBLE_TO is widened.
          With no recording saved yet, an admin still gets the card rendered
          against a sample link so the layout can be checked. */}
      {talk && talk.status === "approved" && canSeeRecording ? (
        <RecordingCard url={talk.recording_url ?? SAMPLE_RECORDING_URL} title={talk.title} isSample={!talk.recording_url} />
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

        <div className={cn("min-w-0 lg:order-1", !sidePanel && "lg:col-span-2")}>
          <ProfileTabs
            tabs={[
              {
                id: "presentation",
                label: isSelf ? "My presentation" : "Presentation",
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
