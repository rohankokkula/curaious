import Link from "next/link";
import { MapPin, Mic } from "lucide-react";
import { Avatar } from "@/components/dashboard/Avatar";
import { getActiveCohort } from "@/lib/cohort";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: viewer } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: "member" | "admin" }>()
    : { data: null };
  const viewerIsAdmin = viewer?.role === "admin";

  const cohort = await getActiveCohort();
  const { data: memberships } = cohort
    ? await supabase.from("cohort_members").select("profile_id").eq("cohort_id", cohort.id).eq("status", "active")
    : { data: [] };
  const { data: members } = await supabase
    .from("profiles")
    .select("id, name, role, avatar_url, headline, location, tags")
    .in("id", (memberships ?? []).map((m) => m.profile_id))
    .order("name", { ascending: true })
    .returns<ProfileRow[]>();

  // Members don't see who's an admin — only admins see the full roster.
  const roster = (members ?? []).filter((m) => viewerIsAdmin || m.role !== "admin");

  const { data: talks } = roster.length
    ? await supabase.from("talks").select("presenter_id").in("presenter_id", roster.map((m) => m.id)).eq("status", "approved")
    : { data: [] };
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roster.map((member) => (
            <Link
              key={member.id}
              href={`/dashboard/members/${member.id}`}
              className="rounded-xl border border-border bg-card p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <Avatar name={member.name} src={member.avatar_url} size="lg" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {member.name}
                    {member.id === user?.id ? <span className="ml-1 text-sm font-normal text-muted">(you)</span> : null}
                  </p>
                  {member.headline ? <p className="truncate text-sm text-muted">{member.headline}</p> : null}
                  {member.location ? (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
                      <MapPin className="size-3 shrink-0" /> {member.location}
                    </p>
                  ) : null}
                </div>
              </div>

              {member.tags && member.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {member.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-muted">{tag}</span>
                  ))}
                  {member.tags.length > 3 ? <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-muted">+{member.tags.length - 3}</span> : null}
                </div>
              ) : null}

              {presented.has(member.id) ? (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Mic className="size-3.5" /> Presented this season
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
