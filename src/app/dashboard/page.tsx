import Link from "next/link";
import { CalendarDays, CheckCircle2, MessageSquare, Mic } from "lucide-react";
import { DeckUploadPanel } from "@/components/dashboard/DeckUploadPanel";
import { SlideDeck } from "@/components/dashboard/SlideDeck";
import type { DeckStatus } from "@/lib/talks";
import { cohortMonthLabel, getActiveCohort } from "@/lib/cohort";
import { loadSeasonSlots } from "@/lib/slots";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient, getViewerProfile } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/og/metadata";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("dashboard", { title: "Home" });

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

  if (!viewer) {
    return <EmptyState>Sign in to see your dashboard.</EmptyState>;
  }

  // Calls straight into the same logic /api/slots itself calls, instead of
  // this Server Component making an HTTP round trip to its own API route —
  // free on `next dev`, a real extra hop plus a second function cold start
  // on Vercel, for no reason on a page that's the whole point of being fast.
  const { slots } = await loadSeasonSlots(viewer.id);

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

  const supabase = await createSupabaseServerClient();

  // /api/slots only carries what the calendar needs. This card now shows the
  // description and the deck itself, so the full row is read separately —
  // it's your own talk, so RLS allows it whatever the status.
  const { data: myTalkDetail } = myTalk
    ? await supabase
        .from("talks")
        .select("description, deck_path, deck_status, deck_feedback")
        .eq("id", myTalk.talkId)
        .maybeSingle<{ description: string; deck_path: string | null; deck_status: DeckStatus; deck_feedback: string | null }>()
    : { data: null };

  // "Feedback you owe" — every approved talk that isn't mine and I haven't rated yet.
  const approvedOthers = slots.flatMap((slot) =>
    slot.talks
      .filter((t) => t.status === "approved" && !t.isMine)
      .map((t) => ({ talkId: t.talkId, title: t.title ?? "Untitled talk", presenterName: t.presenterName ?? "Someone" })),
  );

  let owedFeedback = approvedOthers;
  if (viewer && approvedOthers.length > 0) {
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

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Mic className="size-4 text-primary" /> Your talk
            </h2>
            {myTalk ? (
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  myTalk.status === "approved"
                    ? "bg-success-soft text-success"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                )}
              >
                {myTalk.status === "approved" ? "Booked" : "Requested"}
              </span>
            ) : null}
          </div>

          {myTalk ? (
            <div className="mt-4">
              <h3 className="text-xl font-bold tracking-tight text-balance">
                {myTalk.title ?? "Your submission"}
              </h3>
              <p className="mt-1 text-sm text-muted capitalize">
                {myTalk.slotLabel}, {longDate(myTalk.slotDate)}
              </p>

              {myTalkDetail?.description ? (
                <p className="mt-4 leading-relaxed whitespace-pre-wrap text-muted">
                  {myTalkDetail.description}
                </p>
              ) : null}

              <div className="mt-5 space-y-4">
                <DeckUploadPanel
                  talkId={myTalk.talkId}
                  booked={myTalk.status === "approved"}
                  deckStatus={myTalkDetail?.deck_status ?? "none"}
                  feedback={myTalkDetail?.deck_feedback ?? null}
                />
                {myTalkDetail?.deck_path ? <SlideDeck talkId={myTalk.talkId} /> : null}
              </div>

              <Link
                href={`/dashboard/talks/${myTalk.talkId}/present`}
                className="mt-5 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Open talk page
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

        <section className="h-fit rounded-xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <CalendarDays className="size-4 text-primary" /> Next session
          </h2>
          <div className="mt-4 rounded-lg bg-surface p-4">
            <p className="font-semibold capitalize">{nextUp.label}</p>
            <p className="mt-0.5 text-sm text-muted">{longDate(nextUp.date)}</p>
            <Link
              href="/dashboard/schedule"
              className="mt-4 inline-block rounded-md border border-border px-4 py-2 text-sm font-medium transition hover:bg-card"
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
