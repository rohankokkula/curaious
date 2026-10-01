import { MembersDirectory, type DirectoryMember } from "@/components/dashboard/MembersDirectory";
import { getActiveCohort } from "@/lib/cohort";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient, getSessionUser, getViewerProfile } from "@/lib/supabase/server";
import { pageMetadata } from "@/lib/og/metadata";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("members", { title: "Members" });

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
    // Approved talks only, with their date, so a talk that's merely booked
    // reads "Speaking Oct 24" rather than "Presented".
    cohort
      ? supabase
          .from("talks")
          .select("presenter_id, title, slot:session_slots!inner(slot_date, season_id)")
          .eq("status", "approved")
          .eq("slot.season_id", cohort.id)
          .returns<{ presenter_id: string; title: string; slot: { slot_date: string } }[]>()
      : Promise.resolve({ data: [] as { presenter_id: string; title: string; slot: { slot_date: string } }[] }),
  ]);

  // Members don't see who's an admin — only admins see the full roster.
  const roster = (memberships ?? [])
    .map((m) => m.profiles)
    .filter((m) => viewerIsAdmin || m.role !== "admin");

  const today = new Date().toISOString().slice(0, 10);
  const talkBy = new Map((talks ?? []).map((t) => [t.presenter_id, t]));

  // You first, then alphabetical.
  const members: DirectoryMember[] = roster
    .map((m) => {
      const talk = talkBy.get(m.id);
      return {
        id: m.id,
        name: m.name,
        avatarUrl: m.avatar_url,
        headline: m.headline,
        location: m.location,
        tags: m.tags ?? [],
        isYou: m.id === user?.id,
        talk: talk ? { title: talk.title, date: talk.slot.slot_date, done: talk.slot.slot_date < today } : null,
      };
    })
    .sort((a, b) => Number(b.isYou) - Number(a.isYou) || a.name.localeCompare(b.name));

  const presentedCount = members.filter((m) => m.talk?.done).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{cohort?.name}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Members</h1>
          <p className="mt-1 text-muted">Everyone in the Curaious {cohort?.name} cohort.</p>
        </div>
        {members.length > 0 ? (
          <div className="flex gap-2 text-xs">
            <span className="rounded-full border border-border px-3 py-1.5 text-muted">
              <strong className="font-semibold text-foreground">{members.length}</strong> members
            </span>
            <span className="rounded-full border border-border px-3 py-1.5 text-muted">
              <strong className="font-semibold text-foreground">{presentedCount}</strong> presented
            </span>
          </div>
        ) : null}
      </header>

      {members.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8">
          <p className="text-sm text-muted">Nobody has signed in yet. Members appear here after their first login.</p>
        </div>
      ) : (
        <MembersDirectory members={members} />
      )}
    </div>
  );
}
