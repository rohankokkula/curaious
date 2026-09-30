import { AppShell } from "@/components/shell/AppShell";
import type { NavItem } from "@/components/shell/SidebarNav";
import { getActiveCohort } from "@/lib/cohort";
import { getViewerProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [viewer, cohort] = await Promise.all([getViewerProfile(), getActiveCohort()]);

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: "home", exact: true },
    { href: "/dashboard/schedule", label: "Schedule", icon: "calendar" },
    { href: "/dashboard/talks", label: "Talks", icon: "talks" },
    { href: "/dashboard/members", label: "Members", icon: "users" },
    { href: "/dashboard/resources", label: "Resources", icon: "resources" },
    ...(viewer?.role === "admin" ? [{ href: "/admin", label: "Admin", icon: "shield" as const }] : []),
  ];

  return (
    <AppShell variant="member" items={items} viewer={viewer} cohort={cohort}>
      {children}
    </AppShell>
  );
}
