import Link from "next/link";
import { CalendarDays, FileText, Mail, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cohortMonthLabel, getActiveCohort } from "@/lib/cohort";
import { fetchInternal } from "@/lib/internalFetch";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type InvitesResponse = { ok?: boolean; invites?: { acceptedAt: string | null }[] };

function Stat({ value, label, hint, href, icon: Icon }: { value: string | number; label: string; hint: string; href: string; icon: typeof Users }) {
  return (
    <Link href={href} className="block transition hover:-translate-y-0.5">
      <Card>
        <CardContent>
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon className="size-5" /></span>
          <p className="mt-3 text-3xl font-bold">{value}</p>
          <p className="mt-1 text-sm">{label}</p>
          <p className="text-xs text-muted">{hint}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  if (!isSupabaseConfigured) return <p className="text-sm text-muted">The app isn&rsquo;t connected to its database yet.</p>;

  const cohort = await getActiveCohort();
  if (!cohort) {
    return (
      <Card className="p-8">
        <p className="text-sm text-muted">No cohort yet.</p>
        <Button asChild className="mt-4"><Link href="/admin/cohorts">Create a cohort</Link></Button>
      </Card>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: slots } = await supabase.from("session_slots").select("id, slot_date, slot_type, label, capacity").eq("season_id", cohort.id).order("slot_date").order("sort_order");
  const slotIds = (slots ?? []).map((s) => s.id);
  const [{ data: talks }, { count: memberCount }, invites] = await Promise.all([
    slotIds.length ? supabase.from("talks").select("slot_id, status").in("slot_id", slotIds).neq("status", "rejected") : Promise.resolve({ data: [] as { slot_id: string; status: string }[] }),
    supabase.from("cohort_members").select("profile_id", { count: "exact", head: true }).eq("cohort_id", cohort.id).eq("status", "active"),
    fetchInternal<InvitesResponse>("/api/admin/invites"),
  ]);

  const pending = (talks ?? []).filter((t) => t.status === "pending").length;
  const talkSlots = (slots ?? []).filter((s) => s.slot_type === "talk");
  const totalCapacity = talkSlots.reduce((sum, s) => sum + s.capacity, 0);
  const filled = (talks ?? []).length;
  const inviteRows = invites?.ok ? (invites.invites ?? []) : [];
  const unaccepted = inviteRows.filter((i) => !i.acceptedAt).length;

  const byDate = new Map<string, typeof slots>();
  for (const s of slots ?? []) byDate.set(s.slot_date, [...(byDate.get(s.slot_date) ?? []), s]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">{cohortMonthLabel(cohort)}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{cohort.name}, from the other side of the table</h1>
          <p className="mt-2 max-w-2xl text-muted">Review submissions, manage the schedule, and keep the invite list honest.</p>
        </div>
        <Badge variant={cohort.status === "active" ? "success" : "default"} className="px-3 py-1.5 text-sm">{cohort.status}</Badge>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat value={pending} label="Talks awaiting review" hint="Review and approve" href="/admin/talks" icon={FileText} />
        <Stat value={`${filled} / ${totalCapacity}`} label="Talk spots filled" hint={`Across ${byDate.size} days`} href="/admin/schedule" icon={CalendarDays} />
        <Stat value={memberCount ?? 0} label="Members" hint={`of ${cohort.capacity} seats`} href="/admin/members" icon={Users} />
        <Stat value={unaccepted} label="Invites not signed in" hint={`${inviteRows.length} invited`} href="/admin/invites" icon={Mail} />
      </div>

      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Schedule</h2>
            <Button asChild variant="outline" size="sm"><Link href="/admin/schedule">Manage schedule</Link></Button>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto">
            {[...byDate.entries()].map(([date, list]) => (
              <div key={date} className="min-w-40 shrink-0 rounded-lg border border-border bg-surface p-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                  {new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                </p>
                {(list ?? []).map((s) => (
                  <p key={s.id} className="mt-1 text-sm capitalize">{s.label}</p>
                ))}
              </div>
            ))}
            {byDate.size === 0 ? <p className="text-sm text-muted">No slots scheduled.</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
