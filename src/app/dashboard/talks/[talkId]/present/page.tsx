import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Presentation,
} from "lucide-react";
import { AccentCard } from "@/components/dashboard/AccentCard";
import { TitleCover } from "@/components/dashboard/TalkCover";
import { DeleteTalkButton } from "@/components/dashboard/DeleteTalkButton";
import { RatingForm } from "@/components/dashboard/RatingForm";
import { RatingWindowToggle } from "@/components/dashboard/RatingWindowToggle";
import { EditTalkDialog } from "@/components/admin/EditTalkDialog";
import {
  DAY_PALETTE,
  talkLooks,
  weekKey,
} from "@/components/dashboard/seasonLayout";
import { DeckUploadPanel } from "@/components/dashboard/DeckUploadPanel";
import { SlideDeck } from "@/components/dashboard/SlideDeck";
import { SpeakerCard } from "@/components/dashboard/SpeakerCard";
import type { RatingParameterKey } from "@/lib/ratings";
import { deckIsPublic, type DeckStatus, type TalkStatus } from "@/lib/talks";
import { loadSeasonSlots } from "@/lib/slots";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";
import {
  createSupabaseServerClient,
  getSessionUser,
  getViewerProfile,
} from "@/lib/supabase/server";

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
  deck_status: DeckStatus;
  deck_feedback: string | null;
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
type RatingRow = Record<RatingParameterKey, number> & {
  comment: string | null;
};

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 text-sm leading-relaxed text-muted">
      {children}
    </div>
  );
}

const time = (t: string) =>
  new Date(`1970-01-01T${t}Z`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });

export default async function TalkPage({
  params,
}: {
  params: Promise<{ talkId: string }>;
}) {
  const { talkId } = await params;

  if (!isSupabaseConfigured) {
    return (
      <p className="text-sm text-muted">
        This app isn&rsquo;t connected to its database yet.
      </p>
    );
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
  const [{ data: talk }, { data: existingRating }, { slots: seasonSlots }] =
    await Promise.all([
      supabase
        .from("talks")
        .select(
          `id, title, description, status, presenter_id, deck_path, deck_status, deck_feedback, slot_id, submitted_at, ratings_open,
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
            .select(
              "understanding, content, research_depth, delivery, usefulness, comment",
            )
            .eq("talk_id", talkId)
            .eq("rater_id", user.id)
            .maybeSingle<RatingRow>()
        : Promise.resolve({ data: null }),
      user ? loadSeasonSlots(user.id) : Promise.resolve({ slots: [] }),
    ]);

  if (!talk) notFound();

  // The schedule's own number and day color for this talk, so its page
  // matches its slot card, its talks-page card and its speaker's profile.
  const look = talkLooks(seasonSlots).get(talk.id);
  const palette = look?.palette ?? DAY_PALETTE[0];

  const isPresenter = talk.presenter_id === user?.id;
  const slot = talk.slot;
  const presenter = talk.presenter;
  const season = slot?.season ?? null;

  // Monday-anchored weeks, the same grouping the schedule uses, so "Week 2"
  // here is "Week 2" there.
  const weekIndex =
    slot && season
      ? Math.round(
          (Date.parse(`${weekKey(slot.slot_date)}T00:00:00Z`) -
            Date.parse(`${weekKey(season.starts_on)}T00:00:00Z`)) /
            (7 * 86400000),
        ) + 1
      : null;

  // Siblings sharing the same slot, for "talk N of M" and prev/next.
  const siblings = (slot?.talks ?? [])
    .filter((s) => s.status !== "rejected")
    .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
  const position = siblings.findIndex((s) => s.id === talk.id);
  const prevId = position > 0 ? siblings[position - 1].id : null;
  const nextId =
    position >= 0 && position < siblings.length - 1
      ? siblings[position + 1].id
      : null;

  const existing =
    !isPresenter && talk.status === "approved" ? existingRating : null;

  const when = slot
    ? [
        new Date(`${slot.slot_date}T00:00:00Z`).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
        slot.starts_at
          ? [time(slot.starts_at), slot.ends_at ? time(slot.ends_at) : null]
              .filter(Boolean)
              .join(" – ")
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  const coverStatus =
    talk.status !== "approved"
      ? "requested"
      : !deckIsPublic(talk)
        ? "deck-soon"
        : null;
  const canSeeDeck = Boolean(
    talk.deck_path && (isPresenter || isAdmin || deckIsPublic(talk)),
  );
  const pillClass = cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
    palette.well,
    palette.label,
  );

  return (
    <div className="grid gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
      <div className="min-w-0 space-y-5 sm:space-y-6">
        <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
          <Link href="/dashboard/schedule" className="hover:text-foreground">
            Schedule
          </Link>
          <ChevronRight className="size-3.5" />
          {weekIndex ? (
            <>
              <span>Week {weekIndex}</span>
              <ChevronRight className="size-3.5" />
            </>
          ) : null}
          <span className="font-medium text-foreground capitalize">
            {slot?.label ?? "Talk"}
          </span>
        </nav>

        {/* the talk, in its day color: cover (which carries the title) + what it's about */}
        <AccentCard palette={palette} className="@container p-3 sm:p-4">
          <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] @3xl:gap-6">
            <div
              className={cn(
                "relative aspect-video overflow-hidden rounded-2xl border",
                palette.well,
              )}
            >
              <TitleCover
                title={talk.title}
                speaker={presenter?.name ?? null}
                speakerAvatarUrl={presenter?.avatar_url ?? null}
                status={coverStatus}
                number={look?.number ?? position + 1}
                palette={palette}
                size="lg"
                layout="center"
              />
            </div>

            <div className="flex min-w-0 flex-col px-2 pb-3 @3xl:px-0 @3xl:py-3 @3xl:pr-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {when ? (
                    <span className={pillClass}>
                      <CalendarDays className="size-3.5" /> {when}
                    </span>
                  ) : null}
                  {siblings.length > 1 ? (
                    <span className="rounded-full border border-border bg-background/40 px-3 py-1 text-xs font-medium text-muted">
                      Talk {position + 1} of {siblings.length}
                    </span>
                  ) : null}
                </div>
                {isAdmin ? (
                  <EditTalkDialog
                    talkId={talk.id}
                    title={talk.title}
                    description={talk.description}
                  />
                ) : null}
              </div>

              {/* the title is on the cover; this keeps it for screen readers and the tab */}
              <h1 className="sr-only">{talk.title}</h1>
              <p
                className={cn(
                  "mt-5 text-[11px] font-semibold tracking-[0.18em] uppercase",
                  palette.label,
                )}
              >
                About this talk
              </p>
              <p className="mt-2 leading-relaxed text-foreground/85 md:text-[15px]">
                {talk.description}
              </p>

              {siblings.length > 1 ? (
                <div className="mt-5 flex items-center gap-2 @3xl:mt-auto @3xl:pt-6">
                  <Link
                    href={prevId ? `/dashboard/talks/${prevId}/present` : "#"}
                    aria-disabled={!prevId}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      palette.well,
                      prevId
                        ? "hover:text-foreground"
                        : "pointer-events-none opacity-30",
                    )}
                  >
                    <ChevronLeft className="size-3.5" /> Previous talk
                  </Link>
                  <Link
                    href={nextId ? `/dashboard/talks/${nextId}/present` : "#"}
                    aria-disabled={!nextId}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      palette.well,
                      nextId
                        ? "hover:text-foreground"
                        : "pointer-events-none opacity-30",
                    )}
                  >
                    Next talk <ChevronRight className="size-3.5" />
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </AccentCard>

        <section className="space-y-4">
          <h2
            className={cn(
              "flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] uppercase",
              palette.label,
            )}
          >
            <Presentation className="size-4" /> The deck
          </h2>

          {isPresenter ? (
            <DeckUploadPanel
              talkId={talk.id}
              booked={talk.status === "approved"}
              deckStatus={talk.deck_status}
              feedback={talk.deck_feedback}
            />
          ) : null}

          {/* Others see the deck once the curator has reviewed it. */}
          {canSeeDeck ? (
            <SlideDeck talkId={talk.id} />
          ) : !isPresenter ? (
            <div
              className={cn(
                "relative overflow-hidden rounded-3xl border border-dashed p-10 text-center",
                palette.well,
              )}
            >
              <Presentation className={cn("mx-auto size-6", palette.label)} />
              <p className="mt-2 font-semibold">The deck isn&rsquo;t up yet</p>
              <p className="mt-1 text-sm text-muted">
                It shows here once{" "}
                {presenter?.name.split(" ")[0] ?? "the speaker"} uploads it and
                the curator has had a look.
              </p>
            </div>
          ) : null}
        </section>

        {presenter ? (
          <SpeakerCard speaker={presenter} palette={palette} />
        ) : null}

        {isPresenter ? (
          <div className="rounded-3xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Withdraw</h2>
            <p className="mt-1 text-xs text-muted">
              Removes this talk and frees the slot, so you can claim one again
              and submit fresh. Any feedback on it goes too.
            </p>
            <div className="mt-3">
              <DeleteTalkButton talkId={talk.id} />
            </div>
          </div>
        ) : null}
      </div>

      {/* scoring has a sidebar of its own, in view while you go through the deck */}
      <aside
        aria-label="Scoring"
        className="space-y-4 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)] xl:overflow-y-auto xl:pb-2"
      >
        {isAdmin ? (
          <RatingWindowToggle talkId={talk.id} open={talk.ratings_open} />
        ) : null}

        {isPresenter ? (
          <Notice>
            This is your talk. The curator opens scoring once you&rsquo;ve given
            it, and the rest of the cohort rates it then.
          </Notice>
        ) : talk.status !== "approved" ? (
          <Notice>
            This slot request hasn&rsquo;t been confirmed yet, so there&rsquo;s
            nothing to rate.
          </Notice>
        ) : !user ? (
          <Notice>Sign in to leave feedback.</Notice>
        ) : !talk.ratings_open ? (
          isAdmin ? null : (
            <Notice>
              Scoring isn&rsquo;t open for this talk yet. The curator opens it
              once the talk has been given.
            </Notice>
          )
        ) : (
          <RatingForm talkId={talk.id} initial={existing} />
        )}
      </aside>
    </div>
  );
}
