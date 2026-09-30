"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, BookOpen, CalendarDays, Eye, FileText, Home, Mail, MessageSquare, Mic2, Settings, Shield, User, Users, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ICONS = {
  home: Home, user: User, calendar: CalendarDays, users: Users, shield: Shield, file: FileText,
  mail: Mail, message: MessageSquare, chart: BarChart3, eye: Eye, settings: Settings, layers: Layers,
  talks: Mic2, resources: BookOpen,
};

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof NAV_ICONS;
  /** exact-match only (for index routes like /dashboard) */
  exact?: boolean;
  badge?: number;
};

/** Longest matching href wins, so /dashboard/members doesn't light up /dashboard/members/<me>. */
export function useActiveHref(items: NavItem[]) {
  const pathname = usePathname();
  return items
    .filter((i) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = NAV_ICONS[item.icon];
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
        active
          ? "bg-foreground font-semibold text-background shadow-sm"
          : "text-muted hover:bg-surface hover:text-foreground",
      )}
    >
      <Icon className="size-[18px]" />
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <span className="rounded-full bg-destructive/10 px-2 text-xs font-semibold text-destructive">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const activeHref = useActiveHref(items);
  return (
    <nav className="space-y-1">
      {items.map((item) => (
        <NavLink key={item.href + item.label} item={item} active={item.href === activeHref} />
      ))}
    </nav>
  );
}
