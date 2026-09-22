import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MapPin, Star } from "lucide-react";
import { DeleteTalkButton } from "@/components/dashboard/DeleteTalkButton";
import { Avatar } from "@/components/dashboard/Avatar";
import { EditProfileDialog } from "@/components/dashboard/EditProfileDialog";
import { ProfileTabs } from "@/components/dashboard/ProfileTabs";
import { ShareProfileButton } from "@/components/dashboard/ShareProfileButton";
import { getActiveCohort } from "@/lib/cohort";
import { fetchInternal } from "@/lib/internalFetch";
import {
  emptyAggregate,
  RATING_MAX,
  RATING_PARAMETERS,
  type RatingAggregate,
  type RatingParameterKey,
} from "@/lib/ratings";
import { formatSlotDate, type TalkStatus } from "@/lib/talks";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Matches the deck-thumbnail palette on the schedule page, for visual consistency. */
const GIVEN_TILE_GRADIENT = [
  "from-orange-200 to-rose-200 dark:from-orange-900/40 dark:to-rose-900/40",
  "from-emerald-800 to-neutral-900",
  "from-violet-950 to-neutral-900",
  "from-amber-200 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/30",
  "from-sky-300 to-neutral-400 dark:from-sky-900/40 dark:to-neutral-800",
  "from-fuchsia-950 to-neutral-900",
];

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
};

type TalkRow = {
  id: string;
  slot_id: string;
  title: string;
  description: string;
  status: TalkStatus;
  deck_path: string | null;
  rejection_reason: string | null;
};

type GivenRatingRow = Record<RatingParameterKey, number> & {
  talk_id: string;
  comment: string | null;
  created_at: string;
};

/**
 * Feedback received comes from the aggregation route, not a direct query:
 * `ratings` is locked to rater-or-admin under RLS, and that route is the only
 * thing that strips rater identity before returning scores and notes.
 */
async function loadAggregate(talkId: string): Promise<RatingAggregate | null> {
  const body = await fetchInternal<{
    ok?: boolean;
    aggregate?: RatingAggregate;
  }>(`/api/talks/${talkId}/ratings`);

  if (!body?.ok) return null;

  return body.aggregate ?? emptyAggregate();
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-6 ${className ?? ""}`}>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: TalkStatus }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
        Approved
      </span>
    );
  }

  return (
    <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
      Pending review
    </span>
  );
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const pct = value === null ? 0 : (value / RATING_MAX) * 100;

  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-muted">{label}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
        <span
          className="block h-full rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="w-8 shrink-0 text-right text-xs font-semibold text-foreground">
        {value ?? "–"}
      </span>
    </div>
  );
}

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured) {
    return (
      <Card>
        <p className="text-sm text-muted">
          This app isn&rsquo;t connected to its database yet.
        </p>
      </Card>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Card>
        <p className="text-sm text-muted">Sign in to see member profiles.</p>
      </Card>
    );
  }

  const { data: member } = await supabase
    .from("profiles")
    .select("id, name, email, role, avatar_url, headline, location, bio, tags, linkedin_url, twitter_url, github_url")
    .eq("id", id)
    .maybeSingle<ProfileRow>();

  if (!member) notFound();

  const { data: viewer } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: "member" | "admin" }>();

  const cohort = await getActiveCohort();
  const isSelf = user.id === member.id;
  const isAdmin = viewer?.role === "admin";

  // Members don't see who's an admin — mirrors the filter on the roster page.
  if (member.role === "admin" && !isSelf && !isAdmin) notFound();

  // Feedback *given* is private to its author and to admins — gated here, and
  // backed by the `ratings` select policy so a direct query can't get round it.
  const canSeeGiven = isSelf || isAdmin;

  // RLS shows approved talks to everyone; a pending/rejected one only to its
  // presenter and admins.
  const { data: talk } = await supabase
    .from("talks")
    .select("id, slot_id, title, description, status, deck_path, rejection_reason")
    .eq("presenter_id", member.id)
    .neq("status", "rejected")
    .maybeSingle<TalkRow>();

  const { data: slot } = talk
    ? await supabase
        .from("session_slots")
        .select("label, slot_date")
        .eq("id", talk.slot_id)
        .maybeSingle<{ label: string; slot_date: string }>()
    : { data: null };

  const aggregate =
    talk && talk.status === "approved" ? await loadAggregate(talk.id) : null;

  // Rejected talks are hidden from the calendar, but the presenter (and the
  // curator) should still be able to read why it came back.
  const { data: sentBack } =
    !talk && (isSelf || isAdmin)
      ? await supabase
          .from("talks")
          .select("id, title, rejection_reason, reviewed_at")
          .eq("presenter_id", member.id)
          .eq("status", "rejected")
          .order("reviewed_at", { ascending: false })
          .limit(1)
          .maybeSingle<{
            id: string;
            title: string;
            rejection_reason: string | null;
            reviewed_at: string | null;
          }>()
      : { data: null };

  let given: GivenRatingRow[] = [];
  const givenTalks = new Map<string, { title: string; presenterName: string }>();

  if (canSeeGiven) {
    const { data: givenRows } = await supabase
      .from("ratings")
      .select(
        "talk_id, understanding, content, research_depth, delivery, usefulness, comment, created_at",
      )
      .eq("rater_id", member.id)
      .order("created_at", { ascending: false })
      .returns<GivenRatingRow[]>();

    given = givenRows ?? [];

    if (given.length > 0) {
      const { data: ratedTalks } = await supabase
        .from("talks")
        .select("id, title, presenter_id")
        .in(
          "id",
          given.map((row) => row.talk_id),
        )
        .returns<{ id: string; title: string; presenter_id: string }[]>();

      const presenterIds = [...new Set((ratedTalks ?? []).map((t) => t.presenter_id))];
      const { data: presenters } = presenterIds.length
        ? await supabase.from("profiles").select("id, name").in("id", presenterIds).returns<{ id: string; name: string }[]>()
        : { data: [] };
      const presenterNames = new Map((presenters ?? []).map((p) => [p.id, p.name]));

      for (const ratedTalk of ratedTalks ?? []) {
        givenTalks.set(ratedTalk.id, {
          title: ratedTalk.title,
          presenterName: presenterNames.get(ratedTalk.presenter_id) ?? "Unknown",
        });
      }
    }
  }

  const presentationTab = (
    <div className="space-y-6">
      {!talk ? (
        <Card>
          <p className="text-sm text-muted">
            {isSelf
              ? "You haven't claimed a slot yet."
              : "No talk on the calendar yet."}
          </p>

          {sentBack ? (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-800">
                Sent back · {sentBack.title}
              </p>
              <p className="mt-2 text-sm text-amber-900">
                {sentBack.rejection_reason || "No reason given. Ask the curator."}
              </p>
              {isSelf ? (
                <p className="mt-2 text-sm text-amber-800">
                  The slot is open again. Claim any open slot from the schedule.
                </p>
              ) : null}
            </div>
          ) : null}

          {isSelf ? (
            <div className="mt-5">
              <Link
                href="/dashboard"
                className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Browse sessions
              </Link>
            </div>
          ) : null}
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {slot?.label ?? "Slot"}
              </p>
              <p className="text-sm text-muted">
                {slot ? formatSlotDate(slot.slot_date) : ""}
              </p>
            </div>
            <StatusBadge status={talk.status} />
          </div>

          <h2 className="mt-5 text-xl font-bold tracking-tight text-foreground">
            {talk.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {talk.description}
          </p>

          {talk.status === "approved" && talk.deck_path ? (
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/dashboard/talks/${talk.id}/present`}
                className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-foreground/90"
              >
                View presentation deck
              </Link>
              <a
                href={`/api/talks/${talk.id}/deck/view`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface"
              >
                Open PDF
              </a>
            </div>
          ) : null}

          {talk.status === "pending" && isSelf ? (
            <p className="mt-5 rounded-lg bg-surface p-3 text-sm text-muted">
              Waiting on review. Nobody else sees your name on the schedule until
              it&rsquo;s approved.
            </p>
          ) : null}

          {isSelf ? (
            <div className="mt-5 border-t border-border pt-4">
              <DeleteTalkButton talkId={talk.id} />
            </div>
          ) : null}
        </Card>
      )}

      {talk && talk.status === "approved" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="text-base font-bold text-foreground">
              Scores from cohort
            </h3>

            {!aggregate || aggregate.count === 0 ? (
              <p className="mt-4 text-sm text-muted">No scores in yet.</p>
            ) : (
              <>
                <div className="mt-4 rounded-lg bg-surface p-4">
                  <p className="text-xs text-muted">Average score</p>
                  <p className="mt-1 text-3xl font-bold text-foreground">
                    {aggregate.averages.overall}
                    <span className="text-lg font-medium text-muted">
                      {" "}
                      / {RATING_MAX}
                    </span>
                  </p>
                  <div className="mt-1.5 flex gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className="size-5"
                        fill={(aggregate.averages.overall ?? 0) >= n - 0.25 ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {aggregate.count}{" "}
                    {aggregate.count === 1 ? "response" : "responses"}
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {RATING_PARAMETERS.map((parameter) => (
                    <ScoreBar
                      key={parameter.key}
                      label={parameter.label}
                      value={aggregate.averages[parameter.key]}
                    />
                  ))}
                </div>
              </>
            )}
          </Card>

          <Card>
            <h3 className="text-base font-bold text-foreground">
              Feedback from cohort
            </h3>

            {!aggregate || aggregate.comments.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No notes in yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {aggregate.comments.map((comment, index) => (
                  <li
                    key={index}
                    className="flex gap-3 rounded-lg bg-surface p-3"
                  >
                    <Avatar name={comment.raterName} src={comment.raterAvatarUrl} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">
                        {comment.raterName}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted">
                        {comment.text}
                      </p>
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

  const givenTab = (
    <Card>
      <h3 className="text-base font-bold text-foreground">
        Feedback {isSelf ? "you gave" : "given"}
      </h3>
      <p className="mt-1 text-xs text-muted">
        Only visible to {isSelf ? "you" : "this member"} and the curator.
      </p>

      {given.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Nothing rated yet.</p>
      ) : (
        <ul className="mt-5 grid gap-5 sm:grid-cols-2">
          {given.map((row, index) => {
            const info = givenTalks.get(row.talk_id);
            return (
              <li key={row.talk_id} className="rounded-lg border border-border p-4">
                <div className={`aspect-video rounded-md bg-gradient-to-br ${GIVEN_TILE_GRADIENT[index % GIVEN_TILE_GRADIENT.length]}`} />

                <p className="mt-3 font-semibold text-foreground">{info?.title ?? "A talk"}</p>
                <p className="text-sm text-muted">{info?.presenterName ?? "Unknown"}</p>

                <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                  {RATING_PARAMETERS.map((parameter) => (
                    <div key={parameter.key} className="flex items-baseline gap-1.5">
                      <dt className="text-xs text-muted">{parameter.label}</dt>
                      <dd className="text-sm font-semibold text-foreground">
                        {row[parameter.key]}
                      </dd>
                    </div>
                  ))}
                </dl>

                {row.comment ? (
                  <p className="mt-3 rounded bg-surface p-3 text-sm leading-relaxed text-muted">
                    {row.comment}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card className="bg-surface/60 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-6">
            <Avatar name={member.name} src={member.avatar_url} size="xl" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                {cohort?.name ?? "Cohort"}
              </p>
              <h1 className="mt-1 text-4xl font-bold tracking-tight">{member.name}</h1>
              {member.headline ? <p className="mt-1 text-lg text-muted">{member.headline}</p> : null}
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
                {member.location ? (
                  <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{member.location}</span>
                ) : null}
                {isSelf || isAdmin ? (
                  <span className="inline-flex items-center gap-1.5"><Mail className="size-4" />{member.email}</span>
                ) : null}
              </div>
              {member.bio ? <p className="mt-4 max-w-2xl leading-relaxed text-muted">{member.bio}</p> : null}
              {member.tags && member.tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {member.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-card px-3 py-1 text-sm text-muted ring-1 ring-border">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2">
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
                }}
              />
            ) : null}
            <ShareProfileButton />
          </div>
        </div>
      </Card>

      <ProfileTabs
        tabs={[
          {
            id: "presentation",
            label: isSelf ? "My presentation" : "Their presentation",
            content: presentationTab,
          },
          ...(canSeeGiven
            ? [
                {
                  id: "feedback",
                  label: isSelf ? "Feedback I gave" : "Feedback given",
                  content: givenTab,
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
