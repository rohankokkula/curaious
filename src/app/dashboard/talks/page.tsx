import Link from "next/link";
import { FileText } from "lucide-react";
import { Avatar } from "@/components/dashboard/Avatar";
import { DeckPageThumbnail } from "@/components/dashboard/DeckPageThumbnail";
import { getActiveCohort } from "@/lib/cohort";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TalkRow = {
  id: string;
  title: string;
  description: string;
  presenter_id: string;
  status: string;
  deck_path: string | null;
  slot: { label: string; season_id: string } | null;
  presenter: { name: string; avatar_url: string | null } | null;
};

export default async function TalksPage() {
  const [cohort, supabase, user] = await Promise.all([
    getActiveCohort(),
    createSupabaseServerClient(),
    getSessionUser(),
  ]);

  // One request: each talk with its slot (inner-joined so only this season's
  // slots match) and its presenter. Was slots, then talks, then profiles,
  // each waiting on the last.
  // RLS returns approved talks plus anything of your own, so a pending talk
  // comes back here only for the person who submitted it. Filtered explicitly
  // as well, since an admin's RLS view is wider than that.
  const { data: talkRows } = cohort
    ? await supabase
        .from("talks")
        .select(
          "id, title, description, presenter_id, status, deck_path, slot:session_slots!inner(label, season_id), presenter:profiles!presenter_id(name, avatar_url)",
        )
        .eq("slot.season_id", cohort.id)
        .neq("status", "rejected")
        .order("submitted_at", { ascending: true })
        .returns<TalkRow[]>()
    : { data: [] as TalkRow[] };

  const talks = (talkRows ?? []).filter(
    (talk) => talk.status === "approved" || talk.presenter_id === user?.id,
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Talks</h1>
        <p className="mt-1 text-muted">
          Every approved talk in {cohort?.name ?? "the cohort"}, plus your own while it&rsquo;s in review.
        </p>
      </header>

      {talks.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-8 text-sm text-muted">No approved talks yet.</p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card sm:grid sm:grid-cols-2 sm:gap-4 sm:divide-y-0 sm:rounded-none sm:border-none sm:bg-transparent lg:grid-cols-3">
          {talks.map((talk) => {
            const speaker = talk.presenter;
            const slot = talk.slot;
            return (
              <Link
                key={talk.id}
                href={`/dashboard/talks/${talk.id}/present`}
                className="flex items-center gap-3 p-3 transition-all duration-150 active:bg-surface sm:block sm:overflow-hidden sm:rounded-xl sm:border sm:border-border sm:bg-card sm:p-0 sm:hover:-translate-y-0.5 sm:hover:border-foreground/30 sm:hover:shadow-md"
              >
                <div className="relative flex aspect-video w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface sm:w-auto sm:rounded-none">
                  {talk.status === "approved" && talk.deck_path ? (
                    <DeckPageThumbnail talkId={talk.id} className="absolute inset-0" />
                  ) : (
                    <FileText className="size-5 text-muted/60" />
                  )}
                </div>
                <div className="min-w-0 flex-1 sm:p-4">
                  <div className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 truncate font-semibold">{talk.title}</p>
                    {talk.status !== "approved" ? (
                      <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                        In review
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 hidden text-sm text-muted sm:block">{talk.description}</p>
                  <div className="mt-1 flex items-center gap-2 sm:mt-3">
                    <Avatar name={speaker?.name ?? "?"} src={speaker?.avatar_url} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{speaker?.name ?? "Unknown"}</p>
                      <p className="truncate text-[11px] text-muted capitalize">{slot?.label}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
