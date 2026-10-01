import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { BottomNav } from "@/components/shell/BottomNav";
import { PageTransition } from "@/components/shell/PageTransition";
import { SidebarNav, type NavItem } from "@/components/shell/SidebarNav";
import { UserMenu } from "@/components/shell/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Wordmark } from "@/components/shell/Wordmark";
import type { Cohort } from "@/lib/cohort";
import type { ViewerProfile } from "@/lib/supabase/server";

/**
 * One layout for member and admin areas so both stay visually consistent.
 *
 * Two shapes: on desktop a header, a left sidebar and a content column; on a
 * phone an app bar, full-bleed content, and a bottom tab bar (BottomNav)
 * with a More sheet — so it behaves like an installed app instead of a
 * website that happens to shrink.
 */
export function AppShell({
  variant,
  items,
  secondaryItems,
  viewer,
  cohort,
  children,
  maxWidth = "max-w-6xl",
}: {
  variant: "member" | "admin";
  items: NavItem[];
  /** Rendered as its own group, pinned to the bottom of the sidebar —
   * reference surfaces like Articles/Bookmarks/Resources, kept visually
   * separate from the weekend-to-weekend items above them. On a phone they
   * join everything else in the More sheet. */
  secondaryItems?: NavItem[];
  viewer: ViewerProfile | null;
  cohort: Cohort | null;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const home = variant === "admin" ? "/admin" : "/dashboard";
  const allItems = [...items, ...(secondaryItems ?? [])];

  return (
    <div className="app-shell min-h-dvh bg-background">
      <header className="pt-safe sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl md:bg-background md:backdrop-blur-none">
        <div className="relative flex min-h-14 items-center justify-between gap-2 px-4 py-3 sm:px-6 md:min-h-0 md:py-3.5">
          {/* phone: centered in the app bar, app-style; desktop: left, above the sidebar */}
          <Link
            href={home}
            className="focus-ring min-w-0 leading-none max-md:absolute max-md:top-1/2 max-md:left-1/2 max-md:max-w-[60%] max-md:-translate-x-1/2 max-md:-translate-y-1/2 max-md:text-center"
          >
            <Wordmark className="block truncate text-lg font-bold tracking-tight md:text-xl" />
            <span className="mt-1 block truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-muted md:text-[11px]">
              {variant === "admin" ? "Admin" : cohort?.name ?? ""}
            </span>
          </Link>

          {/* desktop: theme switcher + hover menu */}
          <div className="hidden shrink-0 items-center gap-1 md:flex">
            <ThemeToggle />
            {viewer ? (
              <UserMenu name={viewer.name} avatarUrl={viewer.avatar_url} role={viewer.role} profileHref={`/dashboard/members/${viewer.id}`} />
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-background md:block">
          <div className="sticky top-[65px] flex h-[calc(100vh-65px)] flex-col justify-between overflow-y-auto px-3 py-5">
            <SidebarNav items={items} />

            <div className="space-y-4">
              {secondaryItems?.length ? (
                <div className="border-t border-border pt-4">
                  <SidebarNav items={secondaryItems} />
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
            </div>
          </div>
        </aside>

        {/* bottom padding on phones clears the tab bar and the home indicator */}
        <main className="app-main min-w-0 flex-1 px-4 pt-5 pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:px-6 md:px-8 md:py-8">
          <div className={`mx-auto ${maxWidth}`}>
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>

      <BottomNav
        items={allItems}
        variant={variant}
        viewer={viewer ? { id: viewer.id, name: viewer.name, avatarUrl: viewer.avatar_url } : null}
      />
    </div>
  );
}
