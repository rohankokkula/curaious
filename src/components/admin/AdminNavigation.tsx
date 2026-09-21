"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/talks", label: "Pending Talks", icon: "📝" },
  { href: "/admin/invites", label: "Members", icon: "👥" },
  { href: "/dashboard", label: "Member View", icon: "👁️" },
];

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-border/40">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-4 py-3 text-sm font-medium transition border-b-2 -mb-px",
              isActive
                ? "border-emerald-600 text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            )}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
