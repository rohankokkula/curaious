import Link from "next/link";
import { Avatar } from "@/components/dashboard/Avatar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { getViewerProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewerProfile();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-white">
        <div className="flex items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="focus-ring flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-foreground">
              curaious
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">
              · Season 1
            </span>
          </Link>

          {viewer ? (
            <Link
              href={`/dashboard/members/${viewer.id}`}
              className="focus-ring flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition hover:bg-surface"
            >
              <Avatar name={viewer.name} size="sm" />
              <span className="text-sm font-medium text-foreground">
                {viewer.name.split(" ")[0]}
              </span>
            </Link>
          ) : null}
        </div>
      </header>

      <div className="flex">
        <DashboardSidebar
          profileHref={viewer ? `/dashboard/members/${viewer.id}` : null}
          isAdmin={viewer?.role === "admin"}
        />
        <main className="min-w-0 flex-1 px-6 py-8 md:px-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
