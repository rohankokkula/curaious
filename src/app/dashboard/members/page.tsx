import Link from "next/link";
import { ChevronRight, MapPin, Mic } from "lucide-react";
import { Avatar } from "@/components/dashboard/Avatar";
import { getActiveCohort } from "@/lib/cohort";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient, getSessionUser, getViewerProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  name: string;
  role: "member" | "admin";
  avatar_url: string | null;
  headline: string | null;
  location: string | null;
  tags: string[] | null;
};

export default async function MembersPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="rounded-xl border border-border bg-card p-8">
        <p className="text-sm text-muted">This app isn&rsquo;t connected to its database yet.</p>
      </div>
    );
  }

  // Viewer and cohort are cached per request (the layout already asked for
  // both), so these resolve without another round trip.
  const [supabase, user, viewer, cohort] = await Promise.all([
    createSupabaseServerClient(),
    getSessionUser(),
    getViewerProfile(),
    getActiveCohort(),
  ]);
  const viewerIsAdmin = viewer?.role === "admin";

  // One embedded query for the roster instead of memberships-then-profiles,
  // run alongside the talks lookup rather than after it.
  const [{ data: memberships }, { data: talks }] = await Promise.all([
    cohort
      ? supabase
          .from("cohort_members")
          .select("profiles!inner(id, name, role, avatar_url, headline, location, tags)")
          .eq("cohort_id", cohort.id)
          .eq("status", "active")
          .returns<{ profiles: ProfileRow }[]>()
      : Promise.resolve({ data: [] as { profiles: ProfileRow }[] }),
    supabase.from("talks").select("presenter_id").eq("status", "approved"),
  ]);
  const members = (memberships ?? [])
    .map((m) => m.profiles)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Members don't see who's an admin — only admins see the full roster.
  const roster = members.filter((m) => viewerIsAdmin || m.role !== "admin");

  const presented = new Set((talks ?? []).map((t) => t.presenter_id));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{cohort?.name}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Members</h1>
        <p className="mt-1 text-muted">Everyone in the Curaious {cohort?.name} cohort.</p>
      </header>

      {roster.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8">
          <p className="text-sm text-muted">Nobody has signed in yet. Members appear here after their first login.</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card sm:grid sm:grid-cols-2 sm:gap-4 sm:divide-y-0 sm:rounded-none sm:border-none sm:bg-transparent lg:grid-cols-3">
          {roster.map((member) => (
            <Link
              key={member.id}
              href={`/dashboard/members/${member.id}`}
              className="flex items-center gap-3 p-3 transition-all duration-150 active:bg-surface sm:block sm:rounded-xl sm:border sm:border-border sm:bg-card sm:p-4 sm:hover:-translate-y-0.5 sm:hover:border-foreground/30 sm:hover:shadow-md"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={member.name} src={member.avatar_url} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {member.name}
                    {member.id === user?.id ? <span className="ml-1 text-sm font-normal text-muted">(you)</span> : null}
                  </p>
                  {member.headline ? <p className="truncate text-sm text-muted">{member.headline}</p> : null}
                  {member.location ? (
                    <p className="mt-0.5 hidden items-center gap-1 truncate text-xs text-muted sm:flex">
                      <MapPin className="size-3 shrink-0" /> {member.location}
                    </p>
                  ) : null}
                  {presented.has(member.id) ? (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-primary sm:hidden">
                      <Mic className="size-3 shrink-0" /> Presented
                    </p>
                  ) : null}
                </div>
              </div>

              {member.tags && member.tags.length > 0 ? (
                <div className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
                  {member.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-muted">{tag}</span>
                  ))}
                  {member.tags.length > 3 ? <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-muted">+{member.tags.length - 3}</span> : null}
                </div>
              ) : null}

              {presented.has(member.id) ? (
                <p className="mt-3 hidden items-center gap-1.5 text-xs font-medium text-primary sm:flex">
                  <Mic className="size-3.5" /> Presented this season
                </p>
              ) : null}

              <ChevronRight className="size-4 shrink-0 text-muted sm:hidden" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
