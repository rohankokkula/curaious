import Link from "next/link";
import { notFound } from "next/navigation";
import { RatingForm } from "@/components/dashboard/RatingForm";
import { RATING_PARAMETERS, type RatingParameterKey } from "@/lib/ratings";
import type { TalkStatus } from "@/lib/talks";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TalkRow = {
  id: string;
  title: string;
  description: string;
  status: TalkStatus;
  presenter_id: string;
};

type RatingRow = Record<RatingParameterKey, number> & {
  comment: string | null;
  created_at: string;
};

function Notice({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-2xl bg-white border border-border rounded-lg p-8 space-y-4">
      <h1 className="text-xl font-semibold text-foreground">{heading}</h1>
      <p className="text-sm text-muted">{children}</p>
      <Link
        href="/dashboard"
        className="inline-block px-4 py-2 bg-foreground text-white text-sm font-medium rounded hover:bg-foreground/90 transition"
      >
        Back to calendar
      </Link>
    </div>
  );
}

export default async function RateTalkPage({
  params,
}: {
  params: Promise<{ talkId: string }>;
}) {
  const { talkId } = await params;

  if (!isSupabaseConfigured) {
    return (
      <Notice heading="not set up yet">
        season 1 isn&rsquo;t connected to its database yet.
      </Notice>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Notice heading="sign in first">
        your session expired. sign in again and come back.
      </Notice>
    );
  }

  const { data: talk } = await supabase
    .from("talks")
    .select("id, title, description, status, presenter_id")
    .eq("id", talkId)
    .maybeSingle<TalkRow>();

  if (!talk) notFound();

  if (talk.status !== "approved") {
    return (
      <Notice heading="not yet">
        this talk hasn&rsquo;t been approved, so there&rsquo;s nothing to rate.
      </Notice>
    );
  }

  if (talk.presenter_id === user.id) {
    return (
      <Notice heading="that one's yours">
        you can&rsquo;t rate your own talk. the other nine will do that.
      </Notice>
    );
  }

  const { data: presenter } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", talk.presenter_id)
    .maybeSingle<{ name: string }>();

  // Own ratings are readable under RLS, so this is a straight lookup.
  const { data: existing } = await supabase
    .from("ratings")
    .select(
      "understanding, content, research_depth, delivery, usefulness, comment, created_at",
    )
    .eq("talk_id", talk.id)
    .eq("rater_id", user.id)
    .maybeSingle<RatingRow>();

  return (
    <div className="max-w-2xl space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          Feedback · {presenter?.name ?? "presenter"}
        </p>
        <h1 className="text-3xl font-bold text-foreground">{talk.title}</h1>
        <p className="text-sm text-muted">{talk.description}</p>
      </header>

      {existing ? (
        <section className="bg-white border border-border rounded-lg p-8 space-y-6">
          <h2 className="text-lg font-semibold text-foreground">
            You&rsquo;ve already rated this talk
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            {RATING_PARAMETERS.map((parameter) => (
              <div
                key={parameter.key}
                className="flex items-center justify-between gap-4 py-2 border-b border-border"
              >
                <dt className="text-sm font-medium text-foreground">{parameter.label}</dt>
                <dd className="text-lg font-semibold text-accent">
                  {existing[parameter.key]}
                </dd>
              </div>
            ))}
          </dl>
          {existing.comment ? (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-sm font-medium text-foreground">Your note</p>
              <p className="text-sm text-muted">{existing.comment}</p>
            </div>
          ) : null}
          <div className="pt-4 border-t border-border">
            <Link
              href="/dashboard"
              className="inline-block px-4 py-2 bg-foreground text-white text-sm font-medium rounded hover:bg-foreground/90 transition"
            >
              Back to calendar
            </Link>
          </div>
        </section>
      ) : (
        <RatingForm talkId={talk.id} />
      )}
    </div>
  );
}
