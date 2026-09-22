"use client";

import { ChevronDown, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Avatar } from "@/components/dashboard/Avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function UserMenu({
  name,
  avatarUrl,
  profileHref,
}: {
  name: string;
  avatarUrl: string | null;
  role: "member" | "admin";
  profileHref: string;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearPendingClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }
  function openNow() {
    clearPendingClose();
    setOpen(true);
  }
  function closeSoon() {
    // Clear any earlier pending close first — otherwise a stray leave/enter
    // event on the portaled content leaks a second timer that still fires
    // later even after openNow() has already cancelled the one it knew about,
    // which is what was causing the menu to shut itself while hovered.
    clearPendingClose();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  async function signOut() {
    // Not a plain <form> submit: selecting a Radix menu item closes (and
    // unmounts) the menu synchronously on click, which can race and cancel a
    // native form submission before the request goes out. A fetch survives
    // that unmount, and we drive the redirect ourselves once it settles.
    await fetch("/api/auth/sign-out", { method: "POST" }).catch(() => {});
    // A hard navigation (not router.push) so every client component — this
    // menu included — remounts clean with no stale signed-in state left over.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }

  // modal={false}: the default modal mode blocks pointer events elsewhere on
  // the page while open, which fights a hover-driven menu — the cursor
  // crossing that dead zone was the other half of the flicker.
  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
          className="focus-ring flex items-center gap-2.5 rounded-full py-1 pr-3 pl-2 transition hover:bg-surface"
        >
          <Avatar name={name} src={avatarUrl} size="sm" />
          <span className="text-sm font-medium">{name.split(" ")[0]}</span>
          <ChevronDown className={cn("size-4 text-muted transition-transform duration-150", open && "rotate-180")} />
        </button>
      </DropdownMenuTrigger>
      {/* The panel is portaled outside the trigger, so it needs its own
          hover handlers — otherwise moving the cursor from the trigger into
          the open panel counts as "leaving" and the menu flickers shut. */}
      <DropdownMenuContent align="end" className="min-w-44" onMouseEnter={openNow} onMouseLeave={closeSoon}>
        <DropdownMenuItem asChild>
          <Link href={profileHref}>
            <User className="size-4" /> My Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
