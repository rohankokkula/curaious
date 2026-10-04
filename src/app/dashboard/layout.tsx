import { AppShell } from "@/components/shell/AppShell";
import type { NavItem } from "@/components/shell/SidebarNav";
import { getActiveCohort } from "@/lib/cohort";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, getViewerProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [viewer, cohort] = await Promise.all([getViewerProfile(), getActiveCohort()]);

  // Removed by the curator: out, even with a session that's still valid.
  if (viewer && viewer.role !== "admin" && cohort) {
    const supabase = await createSupabaseServerClient();
    const { data: membership } = await supabase
      .from("cohort_members")
      .select("status")
      .eq("cohort_id", cohort.id)
      .eq("profile_id", viewer.id)
      .maybeSingle<{ status: string }>();
    if (membership?.status === "removed") redirect("/auth/removed");
  }

  const items: NavItem[] = [
    { href: "/dashboard", label: "Home", icon: "home", exact: true, tab: true },
    { href: "/dashboard/schedule", label: "Schedule", icon: "calendar", tab: true },
    { href: "/dashboard/talks", label: "Talks", icon: "talks", tab: true },
    { href: "/dashboard/members", label: "Members", icon: "users", tab: true },
    { href: "/dashboard/badges", label: "Badges", icon: "award" },
    ...(viewer?.role === "admin" ? [{ href: "/admin", label: "Admin", icon: "shield" as const }] : []),
  ];

  // Rendered as their own group, pinned to the bottom of the sidebar —
  // reference surfaces, not weekend-to-weekend items.
  const secondaryItems: NavItem[] = [
    { href: "/dashboard/resources/write", label: "Your thoughts", icon: "articles" },
    { href: "/dashboard/bookmarks", label: "Bookmarks", icon: "bookmark" },
    { href: "/dashboard/resources", label: "Resources", icon: "resources" },
  ];

  return (
    <AppShell variant="member" items={items} secondaryItems={secondaryItems} viewer={viewer} cohort={cohort}>
      {children}
    </AppShell>
  );
}
