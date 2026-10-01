import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, Mic } from "lucide-react";
import { Avatar } from "@/components/dashboard/Avatar";
import { DeckPageThumbnail } from "@/components/dashboard/DeckPageThumbnail";
import { getActiveCohort } from "@/lib/cohort";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type TalkRow = {
  id: string;
  title: string;
  description: string;
  presenter_id: string;
  status: string;
  deck_path: string | null;
  slot: { label: string; slot_date: string; season_id: string } | null;
  presenter: { name: string; avatar_url: string | null } | null;
};

type TalkView = TalkRow & {
  date: string;
  week: number | null;
  isMine: boolean;
  inReview: boolean;
  hasThumb: boolean;
};

const shortDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

function Thumb({ talk, className }: { talk: TalkView; className?: string }) {
  return (
    <div className={cn("relative flex aspect-video items-center justify-center overflow-hidden bg-surface", className)}>
      {talk.hasThumb ? (
        <DeckPageThumbnail talkId={talk.id} className="absolute inset-0" />
      ) : (
        <FileText className="size-6 text-muted/50" />
      )}
      <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
        {talk.week ? `Week ${talk.week} · ` : ""}
        {shortDate(talk.date)}
      </span>
      {talk.inReview ? (
        <span className="absolute top-2 right-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-semibold text-black">
          In review
        </span>
      ) : null}
    </div>
  );
}

function Speaker({ talk, size = "sm" }: { talk: TalkView; size?: "sm" | "md" }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar name={talk.presenter?.name ?? "?"} src={talk.presenter?.avatar_url} size={size} />
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">
          {talk.presenter?.name ?? "Unknown"}
          {talk.isMine ? <span className="ml-1 font-normal text-muted">(you)</span> : null}
        </p>
        <p className="truncate text-[11px] text-muted capitalize">{talk.slot?.label}</p>
      </div>
    </div>
  );
}

/** The next talk on the calendar, big: stacked on a phone, side by side on a laptop. */
function FeaturedTalk({ talk }: { talk: TalkView }) {
  return (
    <Link
      href={`/dashboard/talks/${talk.id}/present`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition hover:border-foreground/30 md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
    >
      <Thumb talk={talk} className="md:aspect-auto md:min-h-64" />
      <div className="flex flex-col p-5 md:p-7">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary">
          <Mic className="size-3.5" /> Next up
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-balance md:text-2xl">{talk.title}</h2>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{talk.description}</p>
        <div className="mt-5 flex items-center justify-between gap-3 md:mt-auto md:pt-6">
          <Speaker talk={talk} size="md" />
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold transition group-hover:translate-x-0.5">
            Open <ArrowRight className="size-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function TalkCard({ talk }: { talk: TalkView }) {
  return (
    <Link
      href={`/dashboard/talks/${talk.id}/present`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-150 hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md"
    >
      <Thumb talk={talk} />
      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-2 font-semibold leading-snug">{talk.title}</p>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{talk.description}</p>
        <div className="mt-auto pt-4">
          <Speaker talk={talk} />
        </div>
      </div>
    </Link>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted tabular-nums">{count}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      {children}
    </section>
  );
}

export default async function TalksPage() {
  const [cohort, supabase, user] = await Promise.all([
    getActiveCohort(),
    createSupabaseServerClient(),
    getSessionUser(),
  ]);

  // One request: each talk with its slot (inner-joined so only this season's
  // slots match) and its presenter.
  // RLS returns approved talks plus anything of your own, so a pending talk
  // comes back here only for the person who submitted it. Filtered explicitly
  // as well, since an admin's RLS view is wider than that.
  const { data: talkRows } = cohort
    ? await supabase
        .from("talks")
        .select(
          "id, title, description, presenter_id, status, deck_path, slot:session_slots!inner(label, slot_date, season_id), presenter:profiles!presenter_id(name, avatar_url)",
        )
        .eq("slot.season_id", cohort.id)
        .neq("status", "rejected")
        .returns<TalkRow[]>()
    : { data: [] as TalkRow[] };

  const today = new Date().toISOString().slice(0, 10);
  const seasonStart = cohort ? Date.parse(`${cohort.starts_on}T00:00:00Z`) : null;

  const talks: TalkView[] = (talkRows ?? [])
    .filter((talk) => talk.status === "approved" || talk.presenter_id === user?.id)
    .map((talk) => {
      const date = talk.slot?.slot_date ?? today;
      return {
        ...talk,
        date,
        week: seasonStart === null ? null : Math.floor((Date.parse(`${date}T00:00:00Z`) - seasonStart) / (7 * 86400000)) + 1,
        isMine: talk.presenter_id === user?.id,
        inReview: talk.status !== "approved",
        hasThumb: talk.status === "approved" && Boolean(talk.deck_path),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const upcoming = talks.filter((t) => t.date >= today);
  // Most recent first: what you'd most likely want to go back and rate.
  const presented = talks.filter((t) => t.date < today).reverse();
  const next = upcoming.find((t) => !t.inReview) ?? null;
  const comingUp = upcoming.filter((t) => t !== next);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Talks</h1>
          <p className="mt-1 text-muted">
            Every approved talk in {cohort?.name ?? "the cohort"}, plus your own while it&rsquo;s in review.
          </p>
        </div>
        {talks.length > 0 ? (
          <div className="flex gap-2 text-xs">
            <span className="rounded-full border border-border px-3 py-1.5 text-muted">
              <strong className="font-semibold text-foreground">{upcoming.length}</strong> upcoming
            </span>
            <span className="rounded-full border border-border px-3 py-1.5 text-muted">
              <strong className="font-semibold text-foreground">{presented.length}</strong> presented
            </span>
          </div>
        ) : null}
      </header>

      {talks.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-surface">
            <CalendarDays className="size-5 text-muted" />
          </span>
          <p className="mt-3 font-semibold">No talks yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted">Approved talks show up here as the season fills in.</p>
          <Link
            href="/dashboard/schedule"
            className="mt-5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            See the schedule
          </Link>
        </div>
      ) : (
        <>
          {next ? <FeaturedTalk talk={next} /> : null}

          {comingUp.length > 0 ? (
            <Section title="Coming up" count={comingUp.length}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {comingUp.map((talk) => (
                  <TalkCard key={talk.id} talk={talk} />
                ))}
              </div>
            </Section>
          ) : null}

          {presented.length > 0 ? (
            <Section title="Presented" count={presented.length}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {presented.map((talk) => (
                  <TalkCard key={talk.id} talk={talk} />
                ))}
              </div>
            </Section>
          ) : null}
        </>
      )}
    </div>
  );
}
