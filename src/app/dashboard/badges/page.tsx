import Link from "next/link";
import { Avatar } from "@/components/dashboard/Avatar";
import { BadgeArt } from "@/components/dashboard/BadgeArt";
import { AwardBadge, RevokeBadge } from "@/components/dashboard/BadgeAwardControls";
import { BADGE_LIST, type BadgeKey } from "@/lib/badges";
import { getActiveCohort } from "@/lib/cohort";
import { createSupabaseServerClient, getSessionUser, getViewerProfile } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/og/metadata";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("badges", { title: "Badges" });

type Person = { id: string; name: string; avatar_url: string | null; role: "member" | "admin" };
type AwardRow = { profile_id: string; badge_key: BadgeKey; profile: Person | null };

export default async function BadgesPage() {
  const [supabase, user, viewer, cohort] = await Promise.all([
    createSupabaseServerClient(),
    getSessionUser(),
    getViewerProfile(),
    getActiveCohort(),
  ]);
  const isCurator = viewer?.role === "admin";

  // Holders this season, and (for the curator's award picker) the roster.
  // `profiles!profile_id` picks the holder FK; awarded_by points at profiles too.
  const [{ data: awardRows }, { data: rosterRows }] = await Promise.all([
    cohort
      ? supabase
          .from("member_badges")
          .select("profile_id, badge_key, profile:profiles!profile_id (id, name, avatar_url, role)")
          .eq("season_id", cohort.id)
          .order("awarded_at", { ascending: true })
          .returns<AwardRow[]>()
      : Promise.resolve({ data: [] as AwardRow[] }),
    cohort && isCurator
      ? supabase
          .from("cohort_members")
          .select("profiles!inner (id, name, avatar_url, role)")
          .eq("cohort_id", cohort.id)
          .eq("status", "active")
          .returns<{ profiles: Person }[]>()
      : Promise.resolve({ data: [] as { profiles: Person }[] }),
  ]);

  const awards = awardRows ?? [];
  const roster = (rosterRows ?? [])
    .map((r) => r.profiles)
    .filter((p) => p.role !== "admin")
    .sort((a, b) => a.name.localeCompare(b.name));

  const holdersOf = (key: BadgeKey) =>
    awards.filter((a) => a.badge_key === key && a.profile).map((a) => a.profile as Person);
  const mine = new Set(awards.filter((a) => a.profile_id === user?.id).map((a) => a.badge_key));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{cohort?.name}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Badges</h1>
        <p className="mt-1 max-w-2xl text-muted">
          Four badges, handed out by the curator over the season. Each one goes to whoever earned it most.
        </p>
      </header>

      {!isCurator && mine.size > 0 ? (
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex -space-x-3">
            {[...mine].map((key) => (
              <BadgeArt key={key} badge={key} className="w-12" />
            ))}
          </div>
          <p className="text-sm">
            You&rsquo;ve earned <strong>{mine.size}</strong> {mine.size === 1 ? "badge" : "badges"} this season.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {BADGE_LIST.map((badge) => {
          const holders = holdersOf(badge.key);
          const earned = mine.has(badge.key);
          const candidates = roster.filter((p) => !holders.some((h) => h.id === p.id)).map((p) => ({ id: p.id, name: p.name }));

          return (
            <article
              key={badge.key}
              className={cn(
                "group flex flex-col rounded-2xl border bg-card p-5 sm:p-6",
                earned ? "border-foreground/30" : "border-border",
              )}
            >
              <div className="flex items-start gap-5">
                <BadgeArt badge={badge.key} locked={holders.length === 0} className="w-20 sm:w-24" />
                <div className="min-w-0 pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{badge.awardedFor}</p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight">{badge.name}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{badge.blurb}</p>
                </div>
              </div>

              <div className="mt-5 border-t border-border pt-4">
                {holders.length === 0 ? (
                  <p className="text-sm text-muted">Not awarded yet.</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {holders.map((person) => (
                      <li
                        key={person.id}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-surface py-1 pr-2 pl-1"
                      >
                        <Avatar name={person.name} src={person.avatar_url} size="sm" className="size-6 text-[10px]" />
                        <Link href={`/dashboard/members/${person.id}`} className="text-xs font-medium hover:underline">
                          {person.name}
                          {person.id === user?.id ? <span className="ml-1 font-normal text-muted">(you)</span> : null}
                        </Link>
                        {isCurator && cohort ? (
                          <RevokeBadge badgeKey={badge.key} seasonId={cohort.id} profileId={person.id} name={person.name} />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}

                {isCurator && cohort ? (
                  <div className="mt-3">
                    <AwardBadge badgeKey={badge.key} badgeName={badge.name} seasonId={cohort.id} candidates={candidates} />
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
