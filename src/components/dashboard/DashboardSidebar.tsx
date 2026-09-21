"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconCalendar() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 11h18" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c0-3.1 2.9-5.2 6.5-5.2s6.5 2.1 6.5 5.2" />
      <path d="M16.5 5.2a3.2 3.2 0 0 1 0 6.1M18 14.2c2.1.6 3.5 2 3.5 4" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg {...iconProps}>
      <path d="M12 3l7 3v5.5c0 4.3-2.9 7.9-7 9.5-4.1-1.6-7-5.2-7-9.5V6l7-3z" />
    </svg>
  );
}

function IconSignOut() {
  return (
    <svg {...iconProps}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function DashboardSidebar({
  profileHref,
  isAdmin,
}: {
  profileHref: string | null;
  isAdmin: boolean;
}) {
  const pathname = usePathname();

  const items = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <IconCalendar />,
      active: pathname === "/dashboard",
    },
    ...(profileHref
      ? [
          {
            href: profileHref,
            label: "My Profile",
            icon: <IconUser />,
            active: pathname === profileHref,
          },
        ]
      : []),
    {
      href: "/dashboard/members",
      label: "Members",
      icon: <IconUsers />,
      active:
        pathname === "/dashboard/members" ||
        (pathname.startsWith("/dashboard/members/") &&
          pathname !== profileHref),
    },
    ...(isAdmin
      ? [
          {
            href: "/admin",
            label: "Admin",
            icon: <IconShield />,
            active: false,
          },
        ]
      : []),
  ];

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-white md:block">
      <div className="sticky top-[69px] flex h-[calc(100vh-69px)] flex-col justify-between px-3 py-6">
        <nav className="space-y-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                item.active
                  ? "bg-emerald-50 font-semibold text-foreground"
                  : "text-muted hover:bg-surface hover:text-foreground",
              )}
            >
              <span className={item.active ? "text-emerald-600" : undefined}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <form action="/api/auth/sign-out" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted transition hover:bg-surface hover:text-foreground"
          >
            <IconSignOut />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
