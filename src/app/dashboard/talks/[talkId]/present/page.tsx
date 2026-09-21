import Link from "next/link";
import { notFound } from "next/navigation";
import { DeckViewer } from "@/components/dashboard/DeckViewer";
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
};

export default async function PresentPage({
  params,
}: {
  params: Promise<{ talkId: string }>;
}) {
  const { talkId } = await params;

  if (!isSupabaseConfigured) {
    return (
      <p className="prose-quiet">
        season 1 isn&rsquo;t connected to its database yet.
      </p>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS does the gatekeeping: approved talks, plus your own, plus everything
  // if you're an admin.
  const { data: talk } = await supabase
    .from("talks")
    .select("id, title, description, status, presenter_id, deck_path")
    .eq("id", talkId)
    .maybeSingle<TalkRow>();

  if (!talk) notFound();

  const isPresenter = talk.presenter_id === user?.id;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="story-whisper">
          {talk.status === "approved" ? "approved" : talk.status} ·{" "}
          {isPresenter ? "your talk" : "talk"}
        </p>
        <h1 className="heading-display text-2xl leading-tight md:text-3xl">
          {talk.title}
        </h1>
        <p className="prose-quiet max-w-2xl">{talk.description}</p>
      </header>

      {talk.deck_path ? (
        <DeckViewer talkId={talk.id} />
      ) : (
        <p className="prose-quiet">no deck attached to this talk.</p>
      )}

      <div className="flex flex-wrap items-center gap-5 border-t border-border/40 pt-6">
        <Link
          href="/dashboard"
          className="focus-ring text-sm text-muted transition hover:text-foreground"
        >
          back to the calendar
        </Link>
        {!isPresenter && talk.status === "approved" ? (
          <Link
            href={`/dashboard/talks/${talk.id}/rate`}
            className="focus-ring border-b border-foreground pb-0.5 text-sm text-foreground transition hover:border-accent hover:text-accent"
          >
            rate this talk
          </Link>
        ) : null}
      </div>
    </div>
  );
}
