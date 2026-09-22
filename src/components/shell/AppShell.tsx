import Link from "next/link";
import { ChevronDown, ExternalLink, LogOut } from "lucide-react";
import { Avatar } from "@/components/dashboard/Avatar";
import { SidebarNav, type NavItem } from "@/components/shell/SidebarNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cohortMonthLabel, cohortProgress, type Cohort } from "@/lib/cohort";
import type { ViewerProfile } from "@/lib/supabase/server";

/** One layout for member and admin areas so both stay visually consistent. */
export function AppShell({
  variant,
  items,
  viewer,
  cohort,
  children,
  maxWidth = "max-w-6xl",
}: {
  variant: "member" | "admin";
  items: NavItem[];
  viewer: ViewerProfile | null;
  cohort: Cohort | null;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const progress = cohort ? cohortProgress(cohort) : null;
  const home = variant === "admin" ? "/admin" : "/dashboard";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-3.5">
          <Link href={home} className="focus-ring leading-none">
            <span className="block text-xl font-bold tracking-tight">curaious</span>
            <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
              {variant === "admin" ? "Admin" : cohort?.name ?? ""}
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            {viewer ? (
              <Link
                href={`/dashboard/members/${viewer.id}`}
                className="focus-ring flex items-center gap-2.5 rounded-full py-1 pr-3 pl-2 transition hover:bg-surface"
              >
                <Avatar name={viewer.name} src={viewer.avatar_url} size="sm" />
                <span className="text-sm leading-tight font-medium">
                  {viewer.name.split(" ")[0]}
                  {variant === "admin" ? (
                    <span className="block text-[11px] font-normal text-muted">Admin</span>
                  ) : null}
                </span>
                <ChevronDown className="size-4 text-muted" />
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:block">
          <div className="sticky top-[65px] flex h-[calc(100vh-65px)] flex-col justify-between overflow-y-auto px-3 py-5">
            <SidebarNav items={items} />

            <div className="space-y-4">
              {cohort && progress ? (
                <div className="px-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                    {cohort.name}
                  </p>
                  <p className="mt-1 text-base font-semibold">{cohortMonthLabel(cohort)}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${progress.pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-muted">
                    {progress.elapsed} / {progress.total} weekends
                  </p>
                </div>
              ) : null}

              {variant === "admin" ? (
                <Link
                  href="/dashboard"
                  className="mx-3 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface"
                >
                  <ExternalLink className="size-4" /> View site
                </Link>
              ) : null}

              <form action="/api/auth/sign-out" method="post">
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted transition hover:bg-surface hover:text-foreground"
                >
                  <LogOut className="size-[18px]" /> Sign out
                </button>
              </form>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 md:px-8">
          <div className={`mx-auto ${maxWidth}`}>{children}</div>
        </main>
      </div>
    </div>
  );
}
