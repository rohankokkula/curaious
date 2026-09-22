import { AppShell } from "@/components/shell/AppShell";
import type { NavItem } from "@/components/shell/SidebarNav";
import { getActiveCohort } from "@/lib/cohort";
import { getViewerProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [viewer, cohort] = await Promise.all([getViewerProfile(), getActiveCohort()]);

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: "home", exact: true },
    ...(viewer
      ? [{ href: `/dashboard/members/${viewer.id}`, label: "My Profile", icon: "user" as const }]
      : []),
    { href: "/dashboard/schedule", label: "Schedule", icon: "calendar" },
    { href: "/dashboard/members", label: "Members", icon: "users" },
    ...(viewer?.role === "admin" ? [{ href: "/admin", label: "Admin", icon: "shield" as const }] : []),
  ];

  return (
    <AppShell variant="member" items={items} viewer={viewer} cohort={cohort}>
      {children}
    </AppShell>
  );
}
