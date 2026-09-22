"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, CalendarDays, Eye, FileText, Home, Mail, MessageSquare, Settings, Shield, User, Users, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  home: Home, user: User, calendar: CalendarDays, users: Users, shield: Shield, file: FileText,
  mail: Mail, message: MessageSquare, chart: BarChart3, eye: Eye, settings: Settings, layers: Layers,
};

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  /** exact-match only (for index routes like /dashboard) */
  exact?: boolean;
  badge?: number;
};

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  // longest matching href wins, so /dashboard/members doesn't light up /dashboard/members/<me>
  const activeHref = items
    .filter((i) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition",
              active
                ? "border-primary bg-primary-soft font-semibold text-foreground"
                : "border-transparent text-muted hover:bg-surface hover:text-foreground",
            )}
          >
            <Icon className={cn("size-[18px]", active && "text-primary")} />
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="rounded-full bg-destructive/10 px-2 text-xs font-semibold text-destructive">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
