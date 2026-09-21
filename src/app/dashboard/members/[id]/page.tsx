import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/dashboard/Avatar";
import { ProfileTabs } from "@/components/dashboard/ProfileTabs";
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

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  role: "member" | "admin";
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
    <div className={`rounded-xl border border-border bg-white p-6 ${className ?? ""}`}>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: TalkStatus }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
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
    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
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
          className="block h-full rounded-full bg-emerald-600"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="w-8 shrink-0 text-right text-xs font-semibold text-foreground">
        {value ?? "—"}
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
          Season 1 isn&rsquo;t connected to its database yet.
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
    .select("id, name, email, role")
    .eq("id", id)
    .maybeSingle<ProfileRow>();

  if (!member) notFound();

  const { data: viewer } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: "member" | "admin" }>();

  const isSelf = user.id === member.id;
  const isAdmin = viewer?.role === "admin";
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
  const givenTitles = new Map<string, string>();

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
        .select("id, title")
        .in(
          "id",
          given.map((row) => row.talk_id),
        )
        .returns<{ id: string; title: string }[]>();

      for (const ratedTalk of ratedTalks ?? []) {
        givenTitles.set(ratedTalk.id, ratedTalk.title);
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
                  The slot is open again — claim any open slot from the schedule.
                </p>
              ) : null}
            </div>
          ) : null}

          {isSelf ? (
            <div className="mt-5">
              <Link
                href="/dashboard"
                className="inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
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
                className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-white transition hover:bg-foreground/90"
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
            <p className="mt-1 text-xs text-muted">
              Shared without rater names.
            </p>

            {!aggregate || aggregate.comments.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No notes in yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {aggregate.comments.map((comment, index) => (
                  <li
                    key={index}
                    className="flex gap-3 rounded-lg bg-surface p-3"
                  >
                    <Avatar name={`Anonymous ${index}`} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">
                        Anonymous
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted">
                        {comment}
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
        <ul className="mt-5 space-y-5">
          {given.map((row) => (
            <li
              key={row.talk_id}
              className="rounded-lg border border-border p-4"
            >
              <p className="font-semibold text-foreground">
                {givenTitles.get(row.talk_id) ?? "A talk"}
              </p>

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
          ))}
        </ul>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card className="bg-surface/60">
        <div className="flex flex-wrap items-start gap-6">
          <Avatar name={member.name} size="lg" />

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              Season 1 · {member.role === "admin" ? "Curator" : "Member"}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
              {member.name}
            </h1>
            {isSelf || isAdmin ? (
              <p className="mt-2 text-sm text-muted">{member.email}</p>
            ) : null}
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
