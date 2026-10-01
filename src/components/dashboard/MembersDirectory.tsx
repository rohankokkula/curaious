"use client";

import Link from "next/link";
import { ChevronRight, MapPin, Mic, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/dashboard/Avatar";
import { cn } from "@/lib/utils";

export type DirectoryMember = {
  id: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  location: string | null;
  tags: string[];
  isYou: boolean;
  /** Their approved talk this season, if any. */
  talk: { title: string; date: string; done: boolean } | null;
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

function TalkStatus({ talk, compact = false }: { talk: DirectoryMember["talk"]; compact?: boolean }) {
  if (!talk) {
    return <span className="text-xs text-muted">{compact ? "No talk yet" : "Hasn’t claimed a slot yet"}</span>;
  }
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-xs">
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
          talk.done
            ? "bg-success-soft text-success"
            : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
        )}
      >
        {talk.done ? "Presented" : `Speaking ${shortDate(talk.date)}`}
      </span>
      {compact ? null : <span className="truncate text-muted">{talk.title}</span>}
    </span>
  );
}

/**
 * The cohort roster. A phone gets a contacts-style list (small avatar, one
 * line of context, chevron); wider screens get a card grid with room for
 * location, interests and the talk itself. Search and the status filter run
 * client-side — a cohort is ten people, there's nothing to page.
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
      return [m.name, m.headline ?? "", m.location ?? "", ...m.tags, m.talk?.title ?? ""]
        .some((field) => field.toLowerCase().includes(q));
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
                filter === f.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted hover:text-foreground",
              )}
            >
              {f.label}
              <span className={cn("tabular-nums", filter === f.id ? "opacity-70" : "opacity-60")}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          Nobody matches that.
        </p>
      ) : (
        <>
          {/* phone: contacts-style list */}
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card sm:hidden">
            {visible.map((m) => (
              <li key={m.id}>
                <Link href={`/dashboard/members/${m.id}`} className="flex items-center gap-3 px-3.5 py-3 active:bg-surface">
                  <Avatar name={m.name} src={m.avatarUrl} className="size-12 text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">
                      {m.name}
                      {m.isYou ? <span className="ml-1 text-xs font-normal text-muted">(you)</span> : null}
                    </p>
                    {m.headline ? <p className="truncate text-[13px] text-muted">{m.headline}</p> : null}
                    <div className="mt-1">
                      <TalkStatus talk={m.talk} compact />
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>

          {/* wider: card grid */}
          <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((m) => (
              <Link
                key={m.id}
                href={`/dashboard/members/${m.id}`}
                className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <Avatar name={m.name} src={m.avatarUrl} className="size-14 text-base" />
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="truncate font-semibold">
                      {m.name}
                      {m.isYou ? <span className="ml-1 text-sm font-normal text-muted">(you)</span> : null}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted">{m.headline ?? "No headline yet"}</p>
                  </div>
                </div>

                <div className="mt-4 flex-1 space-y-3">
                  {m.location ? (
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      <MapPin className="size-3.5 shrink-0" /> <span className="truncate">{m.location}</span>
                    </p>
                  ) : null}
                  {m.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {m.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-muted">{tag}</span>
                      ))}
                      {m.tags.length > 3 ? (
                        <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-muted">+{m.tags.length - 3}</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                  <Mic className="size-3.5 shrink-0 text-muted" />
                  <TalkStatus talk={m.talk} />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
