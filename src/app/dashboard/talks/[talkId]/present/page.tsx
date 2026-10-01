import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DeleteTalkButton } from "@/components/dashboard/DeleteTalkButton";
import { RatingForm } from "@/components/dashboard/RatingForm";
import { RatingWindowToggle } from "@/components/dashboard/RatingWindowToggle";
import { SlideDeck } from "@/components/dashboard/SlideDeck";
import { SpeakerCard } from "@/components/dashboard/SpeakerCard";
import { Badge } from "@/components/ui/badge";
import type { RatingParameterKey } from "@/lib/ratings";
import type { TalkStatus } from "@/lib/talks";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient, getSessionUser, getViewerProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SlotRow = {
  label: string;
  slot_date: string;
  starts_at: string | null;
  ends_at: string | null;
  season_id: string;
  season: { starts_on: string } | null;
  talks: { id: string; status: TalkStatus; submitted_at: string }[];
};

type TalkRow = {
  id: string;
  title: string;
  description: string;
  status: TalkStatus;
  presenter_id: string;
  deck_path: string | null;
  slot_id: string;
  submitted_at: string;
  ratings_open: boolean;
  slot: SlotRow | null;
  presenter: {
    id: string;
    name: string;
    headline: string | null;
    bio: string | null;
    avatar_url: string | null;
    linkedin_url: string | null;
    twitter_url: string | null;
    github_url: string | null;
  } | null;
};
type RatingRow = Record<RatingParameterKey, number> & { comment: string | null };

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted">{children}</div>;
}

const time = (t: string) =>
  new Date(`1970-01-01T${t}Z`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });

export default async function TalkPage({ params }: { params: Promise<{ talkId: string }> }) {
  const { talkId } = await params;

  if (!isSupabaseConfigured) {
    return <p className="text-sm text-muted">This app isn&rsquo;t connected to its database yet.</p>;
  }

  const [supabase, user, viewer] = await Promise.all([
    createSupabaseServerClient(),
    getSessionUser(),
    getViewerProfile(),
  ]);
  const isAdmin = viewer?.role === "admin";

  // The talk, its slot, the slot's season start and sibling talks, and the
  // presenter, in one request; your own rating alongside it. This used to be
  // six queries in a row.
  // RLS does the gatekeeping: approved talks, plus your own, plus everything
  // if you're an admin. The embedded siblings get the same RLS.
  const [{ data: talk }, { data: existingRating }] = await Promise.all([
    supabase
      .from("talks")
      .select(
        `id, title, description, status, presenter_id, deck_path, slot_id, submitted_at, ratings_open,
        slot:session_slots (label, slot_date, starts_at, ends_at, season_id,
          season:seasons (starts_on),
          talks (id, status, submitted_at)
        ),
        presenter:profiles!presenter_id (id, name, headline, bio, avatar_url, linkedin_url, twitter_url, github_url)`,
      )
      .eq("id", talkId)
      .maybeSingle<TalkRow>(),
    user
      ? supabase
          .from("ratings")
          .select("understanding, content, research_depth, delivery, usefulness, comment")
          .eq("talk_id", talkId)
          .eq("rater_id", user.id)
          .maybeSingle<RatingRow>()
      : Promise.resolve({ data: null }),
  ]);

  if (!talk) notFound();

  const isPresenter = talk.presenter_id === user?.id;
  const slot = talk.slot;
  const presenter = talk.presenter;
  const season = slot?.season ?? null;

  const weekIndex = slot && season
    ? Math.floor((Date.parse(`${slot.slot_date}T00:00:00Z`) - Date.parse(`${season.starts_on}T00:00:00Z`)) / (7 * 86400000)) + 1
    : null;

  // Siblings sharing the same slot, for "talk N of M" and prev/next.
  const siblings = (slot?.talks ?? [])
    .filter((s) => s.status !== "rejected")
    .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
  const position = siblings.findIndex((s) => s.id === talk.id);
  const prevId = position > 0 ? siblings[position - 1].id : null;
  const nextId = position >= 0 && position < siblings.length - 1 ? siblings[position + 1].id : null;

  const existing = !isPresenter && talk.status === "approved" ? existingRating : null;

  const when = slot
    ? [
        new Date(`${slot.slot_date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }),
        slot.starts_at ? [time(slot.starts_at), slot.ends_at ? time(slot.ends_at) : null].filter(Boolean).join(" – ") : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
        <Link href="/dashboard/schedule" className="hover:text-foreground">Schedule</Link>
        <ChevronRight className="size-3.5" />
        {weekIndex ? (
          <>
            <span>Week {weekIndex}</span>
            <ChevronRight className="size-3.5" />
          </>
        ) : null}
        <span className="font-medium text-foreground capitalize">{slot?.label ?? "Talk"}</span>
      </nav>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <div className="rounded-xl border border-border bg-card p-5">
            {when ? <Badge>{when}</Badge> : null}
            <h1 className="mt-3 text-2xl font-bold tracking-tight">{talk.title}</h1>
            <p className="mt-2 leading-relaxed text-muted">{talk.description}</p>
          </div>

          <div>
            {siblings.length > 1 ? (
              <div className="mb-2 flex items-center justify-between">
                <Badge>Talk {position + 1} of {siblings.length}</Badge>
                <div className="flex gap-1">
                  <Link
                    href={prevId ? `/dashboard/talks/${prevId}/present` : "#"}
                    aria-disabled={!prevId}
                    className={`rounded-md border border-border p-1.5 ${prevId ? "hover:bg-surface" : "pointer-events-none opacity-30"}`}
                  >
                    <ChevronLeft className="size-4" />
                  </Link>
                  <Link
                    href={nextId ? `/dashboard/talks/${nextId}/present` : "#"}
                    aria-disabled={!nextId}
                    className={`rounded-md border border-border p-1.5 ${nextId ? "hover:bg-surface" : "pointer-events-none opacity-30"}`}
                  >
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              </div>
            ) : null}

            {talk.deck_path ? (
              <SlideDeck talkId={talk.id} />
            ) : (
              <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">No deck attached to this talk.</p>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {presenter ? <SpeakerCard speaker={presenter} /> : null}

          {isAdmin ? <RatingWindowToggle talkId={talk.id} open={talk.ratings_open} /> : null}

          {isPresenter ? (
            <Notice>
              This is your talk. The curator opens scoring once you&rsquo;ve given it, and the
              rest of the cohort rates it then.
            </Notice>
          ) : talk.status !== "approved" ? (
            <Notice>This talk hasn&rsquo;t been approved yet, so there&rsquo;s nothing to rate.</Notice>
          ) : !user ? (
            <Notice>Sign in to leave feedback.</Notice>
          ) : !talk.ratings_open ? (
            <Notice>
              Scoring isn&rsquo;t open for this talk yet. The curator opens it once the talk
              has been given.
            </Notice>
          ) : (
            <RatingForm talkId={talk.id} initial={existing} />
          )}

          {isPresenter ? (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold">Withdraw</h2>
              <p className="mt-1 text-xs text-muted">
                Removes this talk and frees the slot, so you can claim one again and submit
                fresh. Any feedback on it goes too.
              </p>
              <div className="mt-3">
                <DeleteTalkButton talkId={talk.id} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
