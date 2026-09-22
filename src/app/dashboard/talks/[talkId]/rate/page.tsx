import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Eye } from "lucide-react";
import { DeckPane } from "@/components/dashboard/DeckPane";
import { RatingForm } from "@/components/dashboard/RatingForm";
import type { RatingParameterKey } from "@/lib/ratings";
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
  deck_path: string | null;
  slot_id: string;
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
    <div className="max-w-2xl bg-card border border-border rounded-lg p-8 space-y-4">
      <h1 className="text-xl font-semibold text-foreground">{heading}</h1>
      <p className="text-sm text-muted">{children}</p>
      <Link
        href="/dashboard"
        className="inline-block px-4 py-2 bg-foreground text-primary-foreground text-sm font-medium rounded hover:bg-foreground/90 transition"
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
    .select("id, title, description, status, presenter_id, deck_path, slot_id")
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

  const { data: slot } = await supabase
    .from("session_slots")
    .select("label, slot_date, starts_at, ends_at")
    .eq("id", talk.slot_id)
    .maybeSingle<{ label: string; slot_date: string; starts_at: string | null; ends_at: string | null }>();

  const date = slot
    ? new Date(`${slot.slot_date}T00:00:00Z`).toLocaleDateString("en-GB", {
        weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
      })
    : "";
  const time = (t: string | null) =>
    t
      ? new Date(`1970-01-01T${t}Z`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })
      : null;
  const when = [date, slot?.starts_at ? [time(slot.starts_at), time(slot.ends_at)].filter(Boolean).join(" – ") : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-5">
      <Link href="/dashboard/schedule" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
        ← Back to schedule
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-surface text-muted">
              <CalendarDays className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold capitalize">{slot?.label ?? "Talk"}</p>
              <p className="text-sm text-muted">{when}</p>
            </div>
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">{talk.title}</h1>
          <p className="mt-1 text-lg text-muted">by {presenter?.name ?? "the presenter"}</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-primary-soft px-4 py-3">
          <Eye className="size-6 text-primary" />
          <div>
            <p className="text-sm font-semibold">{existing ? "Your feedback" : "Review this talk"}</p>
            <p className="text-xs text-muted">Your input helps the speaker grow</p>
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <DeckPane talkId={talk.id} hasDeck={Boolean(talk.deck_path)} />
        <RatingForm talkId={talk.id} initial={existing} />
      </div>
    </div>
  );
}
