import Link from "next/link";
import { CalendarDays, CheckCircle2, MessageSquare, Mic } from "lucide-react";
import { cohortMonthLabel, getActiveCohort } from "@/lib/cohort";
import { fetchInternal } from "@/lib/internalFetch";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient, getViewerProfile } from "@/lib/supabase/server";
import type { SlotView } from "@/lib/talks";

export const dynamic = "force-dynamic";

type SlotsResponse = { ok?: boolean; hasActiveTalk?: boolean; slots?: SlotView[] };

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <p className="text-sm text-muted">{children}</p>
    </div>
  );
}

function longDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export default async function DashboardPage() {
  const viewer = await getViewerProfile();
  const cohort = await getActiveCohort();
  const cohortName = cohort?.name ?? "your cohort";
  const firstName = viewer ? viewer.name.split(" ")[0] : null;

  if (!isSupabaseConfigured) {
    return <EmptyState>The app isn&rsquo;t connected to its database yet.</EmptyState>;
  }

  const body = await fetchInternal<SlotsResponse>("/api/slots");

  if (!body?.ok) {
    return <EmptyState>Couldn&rsquo;t load the season schedule. Reload the page and try again.</EmptyState>;
  }

  const slots = body.slots ?? [];

  if (slots.length === 0) {
    return <EmptyState>The season schedule hasn&rsquo;t been set up yet.</EmptyState>;
  }

  // "My talk" — whichever slot (if any) has a claim of mine.
  let myTalk: { talkId: string; title: string | null; status: string; slotLabel: string; slotDate: string } | null = null;
  for (const slot of slots) {
    const mine = slot.talks.find((t) => t.isMine);
    if (mine) {
      myTalk = { talkId: mine.talkId, title: mine.title, status: mine.status, slotLabel: slot.label, slotDate: slot.date };
      break;
    }
  }

  // "Next session" — nearest slot from today, whatever kind it is.
  const today = new Date().toISOString().slice(0, 10);
  const nextUp = slots.find((slot) => slot.date >= today) ?? slots[0];

  // "Feedback you owe" — every approved talk that isn't mine and I haven't rated yet.
  const approvedOthers = slots.flatMap((slot) =>
    slot.talks
      .filter((t) => t.status === "approved" && !t.isMine)
      .map((t) => ({ talkId: t.talkId, title: t.title ?? "Untitled talk", presenterName: t.presenterName ?? "Someone" })),
  );

  let owedFeedback = approvedOthers;
  if (viewer && approvedOthers.length > 0) {
    const supabase = await createSupabaseServerClient();
    const { data: myRatings } = await supabase
      .from("ratings")
      .select("talk_id")
      .eq("rater_id", viewer.id)
      .in("talk_id", approvedOthers.map((t) => t.talkId))
      .returns<{ talk_id: string }[]>();
    const rated = new Set((myRatings ?? []).map((r) => r.talk_id));
    owedFeedback = approvedOthers.filter((t) => !rated.has(t.talkId));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {firstName ? `Welcome back, ${firstName}` : cohortName}
        </h1>
        <p className="mt-1 text-muted">
          {cohortName}
          {cohort ? ` · ${cohortMonthLabel(cohort)}` : ""}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Mic className="size-4 text-primary" /> Your talk
          </h2>

          {myTalk ? (
            <div className="mt-4 flex items-center justify-between gap-4 rounded-lg bg-surface p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">{myTalk.title ?? "Your submission"}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {myTalk.status === "approved" ? "Approved" : "Pending review"} · {myTalk.slotLabel}, {longDate(myTalk.slotDate)}
                </p>
              </div>
              <Link
                href={`/dashboard/talks/${myTalk.talkId}/present`}
                className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                View
              </Link>
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-between gap-4 rounded-lg bg-surface p-4">
              <p className="text-sm text-muted">You haven&rsquo;t claimed a slot yet.</p>
              <Link
                href="/dashboard/schedule"
                className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Claim a slot
              </Link>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <CalendarDays className="size-4 text-primary" /> Next session
          </h2>
          <div className="mt-4 flex items-center justify-between gap-4 rounded-lg bg-surface p-4">
            <div>
              <p className="font-semibold capitalize">{nextUp.label}</p>
              <p className="mt-0.5 text-sm text-muted">{longDate(nextUp.date)}</p>
            </div>
            <Link
              href="/dashboard/schedule"
              className="shrink-0 rounded-md border border-border px-4 py-2 text-sm font-medium transition hover:bg-card"
            >
              View schedule
            </Link>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <MessageSquare className="size-4 text-primary" /> Feedback you owe
        </h2>

        {owedFeedback.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-surface p-4 text-sm text-muted">
            <CheckCircle2 className="size-4 text-success" /> You&rsquo;re all caught up. No approved talks are waiting on your feedback.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {owedFeedback.map((t) => (
              <li key={t.talkId} className="flex items-center justify-between gap-4 rounded-lg bg-surface p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.title}</p>
                  <p className="text-xs text-muted">{t.presenterName}</p>
                </div>
                <Link
                  href={`/dashboard/talks/${t.talkId}/present`}
                  className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Rate now
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
