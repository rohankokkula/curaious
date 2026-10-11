"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { Avatar } from "@/components/dashboard/Avatar";
import { PersonLink } from "@/components/dashboard/PersonLink";
import { cn } from "@/lib/utils";

export type Note = {
  /** the writer's profile id (their name links to it) */
  id?: string | null;
  name: string;
  avatarUrl: string | null;
  text: string;
  /** the writer's own talk colors: card tint, and the quote mark */
  cardClass?: string;
  accentClass?: string;
};

/**
 * The room's written feedback, one note at a time in a card of one fixed
 * height (the tallest note, capped; longer ones scroll inside), with the
 * arrows and dots above it, so they stay under your cursor. Arrows, dots and
 * swipe move between notes.
 * Built for the talk page's right sidebar.
 */
export function NotesCarousel({
  notes,
  accentClass,
  cardClass,
}: {
  notes: Note[];
  /** the talk's day color, as a text-color class */
  accentClass?: string;
  /** the talk's day colors for the card (border + tint) */
  cardClass?: string;
}) {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const last = notes.length - 1;
  const current = notes[Math.min(index, last)];

  const go = (i: number) => setIndex(Math.max(0, Math.min(i, last)));

  return (
    <div>
      {/* controls up top, so they stay put whatever the note below */}
      {notes.length > 1 ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {notes.length <= 12 ? (
              notes.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Note ${i + 1}`}
                  onClick={() => go(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === index
                      ? cn("w-5 bg-current", accentClass)
                      : "w-1.5 bg-foreground/20 hover:bg-foreground/40",
                  )}
                />
              ))
            ) : (
              <span className="text-xs text-muted tabular-nums">
                {index + 1} / {notes.length}
              </span>
            )}
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              aria-label="Previous note"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              className="flex size-8 items-center justify-center rounded-full border border-border transition hover:bg-surface disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next note"
              onClick={() => go(index + 1)}
              disabled={index >= last}
              className="flex size-8 items-center justify-center rounded-full border border-border transition hover:bg-surface disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "rounded-2xl border p-4 transition-colors",
          current.cardClass ?? cardClass ?? "border-border bg-background/50",
        )}
        onTouchStart={(e) => {
          touchX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          touchX.current = null;
          const end = e.changedTouches[0]?.clientX;
          if (start === null || end === undefined || Math.abs(end - start) < 40)
            return;
          go(index + (end < start ? 1 : -1));
        }}
      >
        {/* every note sits in the same grid cell, only the current one
            visible: the card is always as tall as the tallest note (capped,
            then it scrolls), so the arrows below never move */}
        <div className="grid">
          {notes.map((note, i) => (
            <div
              key={i}
              aria-hidden={i !== index}
              className={cn(
                "col-start-1 row-start-1 max-h-72 overflow-y-auto pr-1",
                i === index ? "animate-bubble-pop" : "invisible",
              )}
            >
              <div className="flex items-center gap-2">
                <PersonLink
                  id={note.id}
                  className="inline-flex min-w-0 items-center gap-2"
                >
                  <Avatar name={note.name} src={note.avatarUrl} size="sm" />
                  <span className="truncate text-sm font-semibold">
                    {note.name}
                  </span>
                </PersonLink>
                <span
                  aria-hidden
                  className={cn(
                    "ml-auto font-serif text-4xl leading-none opacity-40",
                    note.accentClass ?? accentClass,
                  )}
                >
                  &rdquo;
                </span>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line text-foreground/90">
                {note.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
