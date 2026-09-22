import { AppShell } from "@/components/shell/AppShell";
import type { NavItem } from "@/components/shell/SidebarNav";
import { getActiveCohort } from "@/lib/cohort";
import { getViewerProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "home", exact: true },
  { href: "/admin/cohorts", label: "Cohorts", icon: "layers" },
  { href: "/admin/talks", label: "Talks", icon: "file" },
  { href: "/admin/members", label: "Members", icon: "users" },
  { href: "/admin/invites", label: "Invites", icon: "mail" },
  { href: "/admin/schedule", label: "Schedule", icon: "calendar" },
  { href: "/admin/feedback", label: "Feedback", icon: "message" },
  { href: "/admin/analytics", label: "Analytics", icon: "chart" },
  { href: "/dashboard", label: "Member View", icon: "eye" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [viewer, cohort] = await Promise.all([getViewerProfile(), getActiveCohort()]);
  return (
    <AppShell variant="admin" items={ITEMS} viewer={viewer} cohort={cohort}>
      {children}
    </AppShell>
  );
}
