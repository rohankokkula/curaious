import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { MobileNav } from "@/components/shell/MobileNav";
import { PageTransition } from "@/components/shell/PageTransition";
import { SidebarNav, type NavItem } from "@/components/shell/SidebarNav";
import { UserMenu } from "@/components/shell/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Wordmark } from "@/components/shell/Wordmark";
import type { Cohort } from "@/lib/cohort";
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
  const home = variant === "admin" ? "/admin" : "/dashboard";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="flex items-center justify-between gap-2 px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-1">
            <MobileNav items={items} variant={variant} />
            <Link href={home} className="focus-ring min-w-0 leading-none">
              <Wordmark className="block truncate text-xl font-bold tracking-tight" />
              <span className="mt-1 block truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                {variant === "admin" ? "Admin" : cohort?.name ?? ""}
              </span>
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            {viewer ? (
              <UserMenu name={viewer.name} avatarUrl={viewer.avatar_url} role={viewer.role} profileHref={`/dashboard/members/${viewer.id}`} />
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:block">
          <div className="sticky top-[65px] flex h-[calc(100vh-65px)] flex-col justify-between overflow-y-auto px-3 py-5">
            <SidebarNav items={items} />

            {variant === "admin" ? (
              <Link
                href="/dashboard"
                className="mx-3 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface"
              >
                <ExternalLink className="size-4" /> View site
              </Link>
            ) : null}
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:py-8 md:px-8">
          <div className={`mx-auto ${maxWidth}`}>
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
