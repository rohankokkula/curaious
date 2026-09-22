import Link from "next/link";
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
};

export default async function MembersPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="rounded-xl border border-border bg-card p-8">
        <p className="text-sm text-muted">
          This app isn&rsquo;t connected to its database yet.
        </p>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cohort = await getActiveCohort();
  const { data: memberships } = cohort
    ? await supabase.from("cohort_members").select("profile_id").eq("cohort_id", cohort.id).eq("status", "active")
    : { data: [] };
  const { data: members } = await supabase
    .from("profiles")
    .select("id, name, role, avatar_url")
    .in("id", (memberships ?? []).map((m) => m.profile_id))
    .order("name", { ascending: true })
    .returns<ProfileRow[]>();

  const roster = members ?? [];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
          {cohort?.name}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
          Members
        </h1>
        <p className="mt-1 text-muted">
          Everyone in the Curaious {cohort?.name} cohort.
        </p>
      </header>

      {roster.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8">
          <p className="text-sm text-muted">
            Nobody has signed in yet. Members appear here after their first login.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roster.map((member) => (
            <Link
              key={member.id}
              href={`/dashboard/members/${member.id}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:bg-surface"
            >
              <Avatar name={member.name} src={member.avatar_url} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {member.name}
                  {member.id === user?.id ? (
                    <span className="ml-1 text-sm font-normal text-muted">
                      (you)
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-muted">
                  {member.role === "admin" ? "Curator" : "Member"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
