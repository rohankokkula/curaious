"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/dashboard/Avatar";
import { cn } from "@/lib/utils";

export type Note = { name: string; avatarUrl: string | null; text: string };

/**
 * The room's written feedback as a testimonial carousel: one card at a time
 * on a phone, two on wider screens. Swipe or scroll natively (scroll-snap),
 * or use the arrows and dots.
 */
export function NotesCarousel({ notes, accentClass }: { notes: Note[]; accentClass?: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  // which card is showing, from the scroll position
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const card = el.firstElementChild as HTMLElement | null;
      if (!card) return;
      setIndex(Math.round(el.scrollLeft / (card.offsetWidth + 16)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const go = (i: number) => {
    const el = track.current;
    const card = el?.children[Math.max(0, Math.min(i, notes.length - 1))] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  return (
    <div>
      <ul
        ref={track}
        className="scroll-row -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2"
        aria-label="Feedback from the room"
      >
        {notes.map((note, i) => (
          <li
            key={i}
            className="relative flex w-[85%] shrink-0 snap-start flex-col rounded-3xl border border-border bg-background/50 p-5 sm:w-[calc(50%-0.5rem)]"
          >
            <span aria-hidden className={cn("font-serif text-5xl leading-none opacity-40", accentClass)}>
              &ldquo;
            </span>
            <p className="-mt-3 flex-1 text-[15px] leading-relaxed whitespace-pre-line text-foreground/90">{note.text}</p>
            <div className="mt-4 flex items-center gap-2.5 border-t border-border pt-3">
              <Avatar name={note.name} src={note.avatarUrl} size="sm" />
              <p className="truncate text-sm font-semibold">{note.name}</p>
            </div>
          </li>
        ))}
      </ul>

      {notes.length > 1 ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {notes.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Note ${i + 1}`}
                onClick={() => go(i)}
                className={cn("h-1.5 rounded-full transition-all", i === index ? cn("w-5 bg-current", accentClass) : "w-1.5 bg-foreground/20")}
              />
            ))}
          </div>
          <div className="flex gap-1.5">
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
              disabled={index >= notes.length - 1}
              className="flex size-8 items-center justify-center rounded-full border border-border transition hover:bg-surface disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
