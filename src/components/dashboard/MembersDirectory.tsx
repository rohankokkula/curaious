"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin, Mic, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { DayPalette } from "@/components/dashboard/seasonLayout";
import { cn } from "@/lib/utils";

export type DirectoryMember = {
  id: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  location: string | null;
  tags: string[];
  isYou: boolean;
  /** Their booked talk this season, if any. */
  talk: { title: string; date: string; done: boolean; number: number | null } | null;
  /** Their talk's day color from the schedule (plain class strings). */
  accent: DayPalette;
};

type Filter = "all" | "upcoming" | "presented" | "open";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Speaking soon" },
  { id: "presented", label: "Presented" },
  { id: "open", label: "No talk yet" },
];

function matchesFilter(member: DirectoryMember, filter: Filter) {
  if (filter === "upcoming") return Boolean(member.talk && !member.talk.done);
  if (filter === "presented") return Boolean(member.talk?.done);
  if (filter === "open") return !member.talk;
  return true;
}

const shortDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/**
 * One member, as a small version of their profile card: photo, name and
 * headline, their talk in its day color, a few interests. The whole card
 * takes the color of their talk's day on the schedule.
 */
function MemberCard({ m }: { m: DirectoryMember }) {
  const { accent } = m;
  return (
    <Link
      href={`/dashboard/members/${m.id}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-xl sm:p-5"
    >
      {/* glow + grid in the accent color */}
      <div aria-hidden className={cn("pointer-events-none absolute inset-0", accent.label)}>
        <span className="absolute -top-16 -right-16 size-48 rounded-full bg-current opacity-[0.13] blur-3xl transition-opacity duration-300 group-hover:opacity-[0.22]" />
        <span
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse at 100% 0%, black 0%, transparent 60%)",
          }}
        />
      </div>

      <div className="relative flex items-start gap-4">
        {m.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.avatarUrl}
            alt=""
            loading="lazy"
            className={cn("size-16 shrink-0 rounded-2xl border-2 object-cover shadow-md sm:size-20", accent.well)}
          />
        ) : (
          <span
            className={cn(
              "relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 sm:size-20",
              accent.well,
              accent.label,
            )}
          >
            <span aria-hidden className="absolute -top-6 -right-6 size-16 rounded-full bg-current opacity-25 blur-2xl" />
            <span className="relative text-xl font-bold tracking-tight sm:text-2xl">{initialsFor(m.name)}</span>
          </span>
        )}

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="truncate text-lg leading-tight font-bold tracking-tight">
            {m.name}
            {m.isYou ? <span className="ml-1.5 text-xs font-medium text-muted">(you)</span> : null}
          </p>
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted">{m.headline ?? "No headline yet"}</p>
          {m.location ? (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{m.location}</span>
            </p>
          ) : null}
        </div>

        <ArrowUpRight className="size-4 shrink-0 text-muted opacity-0 transition group-hover:opacity-100" />
      </div>

      {m.talk ? (
        <div className={cn("relative mt-4 rounded-2xl border p-3.5", accent.card)}>
          <div className="flex items-center justify-between gap-2">
            <p className={cn("flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] whitespace-nowrap uppercase", accent.label)}>
              <Mic className="size-3.5" />
              {m.talk.done ? "Presented" : "Speaking"}
              {m.talk.number ? ` · talk ${String(m.talk.number).padStart(2, "0")}` : ""}
            </p>
            <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", accent.well, accent.label)}>
              {shortDate(m.talk.date)}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-[15px] leading-snug font-semibold">{m.talk.title}</p>
        </div>
      ) : (
        <div className="relative mt-4 rounded-2xl border border-dashed border-border px-3.5 py-3 text-sm text-muted">
          Not on the schedule yet
        </div>
      )}

      {m.tags.length > 0 ? (
        <div className="relative mt-3 flex flex-wrap gap-1.5">
          {m.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full border border-border bg-background/40 px-2.5 py-0.5 text-xs text-muted">
              {tag}
            </span>
          ))}
          {m.tags.length > 3 ? (
            <span className="rounded-full border border-border bg-background/40 px-2.5 py-0.5 text-xs text-muted">+{m.tags.length - 3}</span>
          ) : null}
        </div>
      ) : null}
    </Link>
  );
}

/**
 * The cohort roster as profile cards. Search and the status filter run
 * client-side — a cohort is a dozen people, there's nothing to page.
 */
export function MembersDirectory({ members }: { members: DirectoryMember[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, members.filter((m) => matchesFilter(m, f.id)).length])) as Record<Filter, number>,
    [members],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (!matchesFilter(m, filter)) return false;
      if (!q) return true;
      return [m.name, m.headline ?? "", m.location ?? "", ...m.tags, m.talk?.title ?? ""].some((field) => field.toLowerCase().includes(q));
    });
  }, [members, query, filter]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block sm:w-72">
          <span className="sr-only">Search members</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, role, interest"
            className="h-11 w-full rounded-full border border-border bg-card pr-4 pl-9 text-sm outline-none transition placeholder:text-muted/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 sm:h-10"
          />
        </label>

        <div className="scroll-row -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition",
                filter === f.id ? "border-foreground bg-foreground text-background" : "border-border text-muted hover:text-foreground",
              )}
            >
              {f.label}
              <span className={cn("tabular-nums", filter === f.id ? "opacity-70" : "opacity-60")}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">Nobody matches that.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {visible.map((m) => (
            <MemberCard key={m.id} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}
