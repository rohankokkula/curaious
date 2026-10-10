"use client";

import { Dialog as D } from "radix-ui";
import { ChevronRight, ExternalLink, LayoutGrid, LogOut, Monitor, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useState } from "react";
import { Avatar } from "@/components/dashboard/Avatar";
import { NAV_ICONS, useActiveHref, type NavItem } from "@/components/shell/SidebarNav";
import { cn } from "@/lib/utils";

type Viewer = { id: string; name: string; avatarUrl: string | null };

/**
 * Phone navigation: a fixed tab bar for the handful of places people go
 * every weekend, plus a "More" sheet laid out like a home-screen app grid for
 * everything else. Replaces the old hamburger drawer, which hid every
 * destination behind an extra tap and read like a website squeezed onto a
 * phone rather than an app.
 *
 * Which items become tabs is decided by the layout (`tab: true`), capped at
 * four so there's always room for More.
 */
export function BottomNav({
  items,
  variant,
  viewer,
}: {
  items: NavItem[];
  variant: "member" | "admin";
  viewer: Viewer | null;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const activeHref = useActiveHref(items);
  const tabs = items.filter((item) => item.tab).slice(0, 4);
  const rest = items.filter((item) => !tabs.includes(item));
  const moreActive = rest.some((item) => item.href === activeHref);

  return (
    <>
      <nav
        aria-label="Primary"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 px-1">
          {tabs.map((item) => (
            <TabButton key={item.href} item={item} active={item.href === activeHref} />
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="group flex flex-col items-center gap-1 pt-2 pb-1.5 outline-none"
          >
            <TabIcon active={moreActive || moreOpen}>
              <LayoutGrid className="size-[20px]" />
            </TabIcon>
            <span className={cn("text-[11px] leading-none", moreActive || moreOpen ? "font-semibold text-foreground" : "text-muted")}>
              More
            </span>
          </button>
        </div>
      </nav>

      <MoreSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        items={rest}
        activeHref={activeHref}
        variant={variant}
        viewer={viewer}
      />
    </>
  );
}

function TabIcon({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "flex h-8 w-14 items-center justify-center rounded-full transition-all duration-200",
        active ? "bg-foreground text-background" : "text-muted group-active:scale-90",
      )}
    >
      {children}
    </span>
  );
}

function TabButton({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = NAV_ICONS[item.icon];
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className="group flex flex-col items-center gap-1 pt-2 pb-1.5 outline-none"
    >
      <TabIcon active={active}>
        <Icon className="size-[20px]" />
      </TabIcon>
      <span className={cn("max-w-full truncate px-0.5 text-[11px] leading-none", active ? "font-semibold text-foreground" : "text-muted")}>
        {item.label}
      </span>
    </Link>
  );
}

const THEMES = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "Auto", icon: Monitor },
] as const;

function MoreSheet({
  open,
  onOpenChange,
  items,
  activeHref,
  variant,
  viewer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: NavItem[];
  activeHref: string | undefined;
  variant: "member" | "admin";
  viewer: Viewer | null;
}) {
  const { theme, setTheme } = useTheme();
  const close = () => onOpenChange(false);

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" }).catch(() => {});
    // Hard navigation so every client component remounts with no stale
    // signed-in state, same as the desktop menu.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  }

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-overlay-hide data-[state=open]:animate-overlay-show md:hidden" />
        <D.Content className="pb-safe fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-3xl border-t border-border bg-card outline-none data-[state=closed]:animate-bottom-sheet-hide data-[state=open]:animate-bottom-sheet-show md:hidden">
          <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-border" />
          <D.Title className="sr-only">More</D.Title>
          <D.Description className="sr-only">Everything else in the app</D.Description>

          <div className="space-y-5 px-5 pt-4 pb-5">
            {viewer ? (
              <Link
                href={`/dashboard/members/${viewer.id}`}
                onClick={close}
                className="flex items-center gap-3 rounded-2xl bg-surface p-3 active:scale-[0.99]"
              >
                <Avatar name={viewer.name} src={viewer.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{viewer.name}</p>
                  <p className="text-xs text-muted">View your profile</p>
                </div>
                <ChevronRight className="size-4 text-muted" />
              </Link>
            ) : null}

            {items.length > 0 ? (
              <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                {items.map((item) => {
                  const Icon = NAV_ICONS[item.icon];
                  const active = item.href === activeHref;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      className="flex flex-col items-center gap-1.5 active:scale-95"
                    >
                      <span
                        className={cn(
                          "flex size-14 items-center justify-center rounded-2xl border transition",
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-surface text-foreground",
                        )}
                      >
                        <Icon className="size-[22px]" />
                      </span>
                      <span className="max-w-full truncate text-center text-[11px] font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted">Appearance</p>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1">
                {THEMES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTheme(id)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm transition",
                      theme === id ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted",
                    )}
                  >
                    <Icon className="size-4" /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {variant === "admin" && !items.some((item) => item.href === "/dashboard") ? (
                <Link
                  href="/dashboard"
                  onClick={close}
                  className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-medium active:bg-surface"
                >
                  <ExternalLink className="size-4 text-muted" /> View member site
                </Link>
              ) : null}
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-medium text-destructive active:bg-surface"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
