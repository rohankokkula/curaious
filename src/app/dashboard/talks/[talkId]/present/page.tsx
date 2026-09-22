import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DeleteTalkButton } from "@/components/dashboard/DeleteTalkButton";
import { RatingForm } from "@/components/dashboard/RatingForm";
import { SlideDeck } from "@/components/dashboard/SlideDeck";
import { SpeakerCard } from "@/components/dashboard/SpeakerCard";
import { Badge } from "@/components/ui/badge";
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
  submitted_at: string;
};

type SlotRow = { label: string; slot_date: string; starts_at: string | null; ends_at: string | null; season_id: string };
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS does the gatekeeping: approved talks, plus your own, plus everything if you're an admin.
  const { data: talk } = await supabase
    .from("talks")
    .select("id, title, description, status, presenter_id, deck_path, slot_id, submitted_at")
    .eq("id", talkId)
    .maybeSingle<TalkRow>();

  if (!talk) notFound();

  const isPresenter = talk.presenter_id === user?.id;

  const [{ data: slot }, { data: presenter }] = await Promise.all([
    supabase.from("session_slots").select("label, slot_date, starts_at, ends_at, season_id").eq("id", talk.slot_id).maybeSingle<SlotRow>(),
    supabase
      .from("profiles")
      .select("id, name, headline, bio, avatar_url, linkedin_url, twitter_url, github_url")
      .eq("id", talk.presenter_id)
      .maybeSingle<{
        id: string;
        name: string;
        headline: string | null;
        bio: string | null;
        avatar_url: string | null;
        linkedin_url: string | null;
        twitter_url: string | null;
        github_url: string | null;
      }>(),
  ]);

  const { data: season } = slot
    ? await supabase.from("seasons").select("starts_on").eq("id", slot.season_id).maybeSingle<{ starts_on: string }>()
    : { data: null };

  const weekIndex = slot && season
    ? Math.floor((Date.parse(`${slot.slot_date}T00:00:00Z`) - Date.parse(`${season.starts_on}T00:00:00Z`)) / (7 * 86400000)) + 1
    : null;

  // Siblings sharing the same slot, for "talk N of M" and prev/next — same
  // visibility RLS grants for the current talk covers each of these.
  const { data: siblingRows } = await supabase
    .from("talks")
    .select("id")
    .eq("slot_id", talk.slot_id)
    .neq("status", "rejected")
    .order("submitted_at", { ascending: true })
    .returns<{ id: string }[]>();

  const siblings = siblingRows ?? [];
  const position = siblings.findIndex((s) => s.id === talk.id);
  const prevId = position > 0 ? siblings[position - 1].id : null;
  const nextId = position >= 0 && position < siblings.length - 1 ? siblings[position + 1].id : null;

  const existing =
    !isPresenter && talk.status === "approved" && user
      ? (
          await supabase
            .from("ratings")
            .select("understanding, content, research_depth, delivery, usefulness, comment")
            .eq("talk_id", talk.id)
            .eq("rater_id", user.id)
            .maybeSingle<RatingRow>()
        ).data
      : null;

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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                {when ? <Badge>{when}</Badge> : null}
                <h1 className="mt-3 text-2xl font-bold tracking-tight">{talk.title}</h1>
                <p className="mt-2 leading-relaxed text-muted">{talk.description}</p>
              </div>
              {isPresenter ? <DeleteTalkButton talkId={talk.id} /> : null}
            </div>
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

          {isPresenter ? (
            <Notice>This is your talk. The rest of the cohort rates it once it&rsquo;s approved.</Notice>
          ) : talk.status !== "approved" ? (
            <Notice>This talk hasn&rsquo;t been approved yet, so there&rsquo;s nothing to rate.</Notice>
          ) : !user ? (
            <Notice>Sign in to leave feedback.</Notice>
          ) : (
            <RatingForm talkId={talk.id} initial={existing} />
          )}
        </div>
      </div>
    </div>
  );
}
