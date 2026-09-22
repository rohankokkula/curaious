"use client";

import { Dialog as D } from "radix-ui";
import { ExternalLink, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { NavLink, useActiveHref, type NavItem } from "@/components/shell/SidebarNav";
import { Wordmark } from "@/components/shell/Wordmark";

/** Slide-in drawer for the sidebar nav on screens below `md`, where the
 * permanent sidebar is hidden. Without this, mobile visitors had no way to
 * reach Schedule, Talks, Members, etc. at all. */
export function MobileNav({ items, variant }: { items: NavItem[]; variant: "member" | "admin" }) {
  const [open, setOpen] = useState(false);
  const activeHref = useActiveHref(items);

  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Trigger asChild>
        <button
          aria-label="Open menu"
          className="focus-ring flex size-9 items-center justify-center rounded-lg text-foreground transition hover:bg-surface md:hidden"
        >
          <Menu className="size-5" />
        </button>
      </D.Trigger>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-overlay-hide data-[state=open]:animate-overlay-show" />
        <D.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-card p-4 shadow-xl outline-none data-[state=closed]:animate-drawer-hide data-[state=open]:animate-drawer-show">
          <div className="flex items-center justify-between px-1 pb-4">
            <D.Title asChild>
              <Wordmark className="text-lg font-bold tracking-tight" />
            </D.Title>
            <D.Description className="sr-only">Navigation menu</D.Description>
            <D.Close asChild>
              <button aria-label="Close menu" className="focus-ring rounded-md p-1.5 text-muted hover:bg-surface">
                <X className="size-4" />
              </button>
            </D.Close>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto">
            {items.map((item) => (
              <NavLink key={item.href + item.label} item={item} active={item.href === activeHref} onNavigate={() => setOpen(false)} />
            ))}
          </nav>

          {variant === "admin" ? (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="mt-4 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface"
            >
              <ExternalLink className="size-4" /> View site
            </Link>
          ) : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
