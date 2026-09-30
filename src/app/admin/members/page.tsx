import Link from "next/link";
import { Avatar } from "@/components/dashboard/Avatar";
import { MemberRowActions } from "@/components/admin/MemberRowActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getActiveCohort } from "@/lib/cohort";
import { createSupabaseServerClient, getViewerProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const [cohort, viewer] = await Promise.all([getActiveCohort(), getViewerProfile()]);
  if (!cohort) return <p className="text-sm text-muted">Create a cohort first.</p>;

  const supabase = await createSupabaseServerClient();
  const { data: memberships } = await supabase
    .from("cohort_members")
    .select("profile_id, status, role")
    .eq("cohort_id", cohort.id);
  const ids = (memberships ?? []).map((m) => m.profile_id);
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, name, email, avatar_url").in("id", ids)
    : { data: [] };
  const { data: talks } = ids.length
    ? await supabase.from("talks").select("presenter_id, status").in("presenter_id", ids).neq("status", "rejected")
    : { data: [] };
  const talkCount = new Map<string, number>();
  for (const t of talks ?? []) talkCount.set(t.presenter_id, (talkCount.get(t.presenter_id) ?? 0) + 1);
  const status = new Map((memberships ?? []).map((m) => [m.profile_id, m.status as string]));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="mt-1 text-muted">{cohort.name} · {ids.length} of {cohort.capacity} seats</p>
        </div>
        <Button asChild><Link href="/admin/invites">Invite people</Link></Button>
      </header>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Status</th><th className="p-4">Talks</th><th className="p-4" /></tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="p-4">
                  <Link href={`/dashboard/members/${p.id}`} className="flex items-center gap-3 font-medium hover:underline">
                    <Avatar name={p.name} src={p.avatar_url} size="sm" /> {p.name}
                  </Link>
                </td>
                <td className="p-4 text-muted">{p.email}</td>
                <td className="p-4"><Badge variant={status.get(p.id) === "removed" ? "danger" : "success"}>{status.get(p.id) ?? "active"}</Badge></td>
                <td className="p-4">{talkCount.get(p.id) ?? 0}</td>
                <td className="p-4 text-right">
                  <MemberRowActions cohortId={cohort.id} profileId={p.id} status={status.get(p.id) ?? "active"} isSelf={p.id === viewer?.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ids.length === 0 ? <p className="p-6 text-sm text-muted">Nobody has joined this cohort yet.</p> : null}
      </Card>
    </div>
  );
}
