import Link from "next/link";
import { Avatar } from "@/components/dashboard/Avatar";
import { getActiveCohort } from "@/lib/cohort";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TILE_GRADIENT = [
  "from-orange-200 to-rose-200 dark:from-orange-900/40 dark:to-rose-900/40",
  "from-emerald-800 to-neutral-900",
  "from-violet-950 to-neutral-900",
  "from-amber-200 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/30",
  "from-sky-300 to-neutral-400 dark:from-sky-900/40 dark:to-neutral-800",
  "from-fuchsia-950 to-neutral-900",
];

export default async function TalksPage() {
  const cohort = await getActiveCohort();
  const supabase = await createSupabaseServerClient();

  const { data: slots } = cohort
    ? await supabase.from("session_slots").select("id, slot_date, label").eq("season_id", cohort.id)
    : { data: [] };
  const slotIds = (slots ?? []).map((s) => s.id);
  const { data: talks } = slotIds.length
    ? await supabase
        .from("talks")
        .select("id, title, description, presenter_id, slot_id")
        .in("slot_id", slotIds)
        .eq("status", "approved")
        .order("submitted_at", { ascending: true })
    : { data: [] };

  const presenterIds = [...new Set((talks ?? []).map((t) => t.presenter_id))];
  const { data: people } = presenterIds.length
    ? await supabase.from("profiles").select("id, name, avatar_url").in("id", presenterIds)
    : { data: [] };
  const person = new Map((people ?? []).map((p) => [p.id, p]));
  const slotById = new Map((slots ?? []).map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Talks</h1>
        <p className="mt-1 text-muted">Every approved talk in {cohort?.name ?? "the cohort"}.</p>
      </header>

      {!talks || talks.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-8 text-sm text-muted">No approved talks yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {talks.map((talk, i) => {
            const speaker = person.get(talk.presenter_id);
            const slot = slotById.get(talk.slot_id);
            return (
              <Link key={talk.id} href={`/dashboard/talks/${talk.id}/present`} className="block overflow-hidden rounded-xl border border-border bg-card transition-all duration-150 hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md">
                <div className={`h-28 bg-gradient-to-br ${TILE_GRADIENT[i % TILE_GRADIENT.length]}`} />
                <div className="p-4">
                  <p className="truncate font-semibold">{talk.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{talk.description}</p>
                  <div className="mt-3 flex items-center gap-2">
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
