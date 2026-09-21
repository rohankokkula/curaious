import Link from "next/link";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { ScheduleTimeline } from "@/components/dashboard/ScheduleTimeline";
import { fetchInternal } from "@/lib/internalFetch";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getViewerProfile } from "@/lib/supabase/server";
import type { SlotView } from "@/lib/talks";

export const dynamic = "force-dynamic";

type SlotsResponse = {
  ok?: boolean;
  season: { name: string; number: number } | null;
  hasActiveTalk?: boolean;
  slots?: SlotView[];
};

/** Monday of the slot's week — used to count distinct weekends in the season. */
function weekKey(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() - ((parsed.getUTCDay() + 6) % 7));
  return parsed.toISOString().slice(0, 10);
}

function monthLabel(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function longDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white p-8">
      <p className="text-sm text-muted">{children}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const viewer = await getViewerProfile();

  if (!isSupabaseConfigured) {
    return (
      <EmptyState>Season 1 isn&rsquo;t connected to its database yet.</EmptyState>
    );
  }

  const body = await fetchInternal<SlotsResponse>("/api/slots");

  if (!body?.ok) {
    return (
      <EmptyState>
        Couldn&rsquo;t load the season schedule. Reload the page and try again.
      </EmptyState>
    );
  }

  const slots = body.slots ?? [];
  const hasActiveTalk = Boolean(body.hasActiveTalk);
  const firstName = viewer ? viewer.name.split(" ")[0] : null;

  if (slots.length === 0) {
    return (
      <EmptyState>The season schedule hasn&rsquo;t been set up yet.</EmptyState>
    );
  }

  const talkSlots = slots.filter((slot) => slot.type === "talk");
  const claimedCount = talkSlots.filter((slot) => slot.status !== "open").length;
  const weekends = new Set(slots.map((slot) => weekKey(slot.date))).size;
  const today = new Date().toISOString().slice(0, 10);
  const nextUp = slots.find((slot) => slot.date >= today) ?? slots[0];
  const mySlot = slots.find((slot) => slot.isMine);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {firstName ? `Welcome back, ${firstName}` : "Season 1"}
          </h1>
          <p className="mt-1 text-muted">
            Here&rsquo;s your season schedule for {monthLabel(slots[0].date)}.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            Season 1
          </p>
          <p className="mt-1 text-xl font-bold text-foreground">
            {monthLabel(slots[0].date)}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {weekends} weekends · {talkSlots.length} talks · 1 cohort
          </p>
        </div>
      </div>

      <ScheduleTimeline slots={slots} viewerHasActiveTalk={hasActiveTalk} />

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-xl border border-border bg-white p-6 lg:col-span-3">
          <h2 className="text-lg font-bold text-foreground">Next up</h2>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-surface p-4">
            <div>
              <p className="font-semibold text-foreground">{nextUp.label}</p>
              <p className="mt-0.5 text-sm text-muted">{longDate(nextUp.date)}</p>
              <p className="mt-0.5 text-sm text-muted">
                {nextUp.type === "talk" ? "1 talk" : "Whole cohort"}
              </p>
            </div>

            {nextUp.type === "talk" &&
            nextUp.status === "open" &&
            !hasActiveTalk ? (
              <Link
                href={`/dashboard/slots/${nextUp.id}/submit`}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Claim slot
              </Link>
            ) : nextUp.status === "approved" && nextUp.talkId ? (
              <Link
                href={`/dashboard/talks/${nextUp.talkId}/present`}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                View details
              </Link>
            ) : (
              <Link
                href="#schedule"
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface"
              >
                View schedule
              </Link>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-white p-6 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-foreground">Your progress</h2>
            <span className="text-sm text-muted">Season 1</span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-6">
            <ProgressRing
              value={claimedCount}
              total={talkSlots.length}
              caption="Talk slots claimed"
            />

            <div className="min-w-[150px] flex-1 space-y-4">
              <p className="text-sm text-muted">
                {mySlot
                  ? `You have ${mySlot.label} this season.`
                  : "Claim a slot to present your talk for one of the upcoming sessions."}
              </p>
              {mySlot && viewer ? (
                <Link
                  href={`/dashboard/members/${viewer.id}`}
                  className="inline-block rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface"
                >
                  View your talk
                </Link>
              ) : (
                <Link
                  href="#schedule"
                  className="inline-block rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface"
                >
                  Browse sessions
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>

      <Link
        href="/dashboard/members"
        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-white p-6 transition hover:bg-surface"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface text-muted">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="8" r="3.2" />
              <path d="M2.5 20c0-3.1 2.9-5.2 6.5-5.2s6.5 2.1 6.5 5.2" />
              <path d="M16.5 5.2a3.2 3.2 0 0 1 0 6.1M18 14.2c2.1.6 3.5 2 3.5 4" />
            </svg>
          </span>
          <div>
            <p className="font-semibold text-foreground">Explore the cohort</p>
            <p className="text-sm text-muted">
              See who&rsquo;s part of Curaious Season 1.
            </p>
          </div>
        </div>
        <span className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground">
          View members →
        </span>
      </Link>
    </div>
  );
}
