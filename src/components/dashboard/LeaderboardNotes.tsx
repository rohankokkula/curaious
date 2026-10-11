"use client";

import { MessageSquare } from "lucide-react";
import { createContext, useContext, useState } from "react";
import { Avatar } from "@/components/dashboard/Avatar";
import { PersonLink } from "@/components/dashboard/PersonLink";
import { cn } from "@/lib/utils";

export type NotesItem = {
  talkId: string;
  title: string;
  speaker: { id: string; name: string };
  /** the talk's day colors, as text-color and well classes */
  accent?: string;
  notes: {
    id: string | null;
    name: string;
    avatarUrl: string | null;
    text: string;
    cardClass?: string;
  }[];
};

type Ctx = { selected: string | null; select: (talkId: string) => void };
const NotesContext = createContext<Ctx | null>(null);
const PANEL_ID = "leaderboard-notes";

/**
 * The leaderboard's notes: a "Notes" cell on each row picks a talk, and the
 * sidebar shows that talk's notes. Starts on the first talk that has any.
 */
export function NotesProvider({
  items,
  children,
}: {
  items: NotesItem[];
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<string | null>(
    items.find((i) => i.notes.length > 0)?.talkId ?? null,
  );
  const select = (talkId: string) => {
    setSelected(talkId);
    // below xl the sidebar sits under the table: bring it into view
    if (window.innerWidth < 1280)
      document
        .getElementById(PANEL_ID)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <NotesContext.Provider value={{ selected, select }}>
      {children}
    </NotesContext.Provider>
  );
}

/** The row's notes count; tap to show them in the sidebar. */
export function NotesCell({
  talkId,
  count,
}: {
  talkId: string;
  count: number | null;
}) {
  const ctx = useContext(NotesContext);
  if (!ctx || !count)
    return <span className="block text-center text-sm text-muted/50">–</span>;
  const active = ctx.selected === talkId;
  return (
    <span className="flex justify-center">
      <button
        type="button"
        onClick={() => ctx.select(talkId)}
        aria-pressed={active}
        aria-label={`Show ${count} notes`}
        className={cn(
          "pointer-events-auto relative z-10 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-sm font-semibold tabular-nums transition",
          active
            ? "border-foreground/40 bg-foreground text-background"
            : "border-border bg-surface text-muted hover:text-foreground",
        )}
      >
        <MessageSquare className="size-3.5" />
        {count}
      </button>
    </span>
  );
}

/** The sidebar: the picked talk's notes, each in its writer's own talk color. */
export function NotesPanel({ items }: { items: NotesItem[] }) {
  const ctx = useContext(NotesContext);
  const item = items.find((i) => i.talkId === ctx?.selected) ?? null;

  return (
    <aside
      id={PANEL_ID}
      aria-label="Notes"
      // xl: exactly as tall as the table beside it; the notes scroll inside
      className="relative scroll-mt-24 rounded-3xl border border-border bg-card xl:mt-8 xl:mb-7"
    >
      <div className="flex flex-col xl:absolute xl:inset-0">
        <div className="border-b border-border p-4">
          <p
            className={cn(
              "flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase",
              item?.accent ?? "text-muted",
            )}
          >
            <MessageSquare className="size-3.5" /> Notes from the room
          </p>
          {item ? (
            <>
              <p className="mt-1.5 line-clamp-2 font-semibold leading-snug">
                {item.title}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                <PersonLink id={item.speaker.id}>
                  {item.speaker.name}
                </PersonLink>{" "}
                · {item.notes.length}{" "}
                {item.notes.length === 1 ? "note" : "notes"}
              </p>
            </>
          ) : (
            <p className="mt-1.5 text-sm text-muted">
              Pick a talk&rsquo;s notes from the table.
            </p>
          )}
        </div>
        {item ? (
          <ul
            key={item.talkId}
            className="max-h-[70dvh] space-y-2 overflow-y-auto p-3 xl:max-h-none xl:min-h-0 xl:flex-1"
          >
            {item.notes.map((n, i) => (
              <li
                key={i}
                className={cn(
                  "rounded-xl border px-3 py-2.5",
                  n.cardClass ?? "border-transparent bg-surface",
                )}
              >
                <p className="text-xs font-semibold">
                  <PersonLink
                    id={n.id}
                    className="inline-flex max-w-full items-center gap-1.5"
                  >
                    <Avatar
                      name={n.name}
                      src={n.avatarUrl}
                      size="sm"
                      className="size-5 text-[8px]"
                    />
                    <span className="truncate">{n.name}</span>
                  </PersonLink>
                </p>
                <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-line text-foreground/85">
                  {n.text}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </aside>
  );
}
