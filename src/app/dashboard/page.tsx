import { CuratorHome } from "@/components/dashboard/home/CuratorHome";
import { MemberHome } from "@/components/dashboard/home/MemberHome";
import { getActiveCohort } from "@/lib/cohort";
import { loadCuratorHome, loadMemberHome } from "@/lib/homeData";
import { leaderboardEnabled } from "@/lib/leaderboard";
import { pageMetadata } from "@/lib/og/metadata";
import { loadSeasonSlots } from "@/lib/slots";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getViewerProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("dashboard", { title: "Home" });

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-8">
      <p className="text-sm text-muted">{children}</p>
    </div>
  );
}

/** Home: the curator's console for the admin, the member home for everyone else. */
export default async function DashboardPage() {
  if (!isSupabaseConfigured) return <EmptyState>The app isn&rsquo;t connected to its database yet.</EmptyState>;

  const [viewer, cohort] = await Promise.all([getViewerProfile(), getActiveCohort()]);
  if (!viewer) return <EmptyState>Sign in to see your dashboard.</EmptyState>;

  const { slots } = await loadSeasonSlots(viewer.id);
  if (slots.length === 0) return <EmptyState>The season schedule hasn&rsquo;t been set up yet.</EmptyState>;

  const firstName = viewer.name.split(" ")[0];
  const talkIds = slots.flatMap((s) => s.talks.map((t) => t.talkId));

  if (viewer.role === "admin" && cohort) {
    const [data, leaderboardOn] = await Promise.all([loadCuratorHome(cohort.id, talkIds), leaderboardEnabled(cohort.id)]);
    return <CuratorHome name={firstName} cohort={cohort} slots={slots} data={data} leaderboardOn={leaderboardOn} />;
  }

  const myTalkId = slots.flatMap((s) => s.talks).find((t) => t.isMine)?.talkId ?? null;
  const data = await loadMemberHome(viewer.id, talkIds, myTalkId);
  return <MemberHome name={firstName} cohort={cohort} slots={slots} data={data} />;
}
