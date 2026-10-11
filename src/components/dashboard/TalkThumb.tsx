import { DeckPageThumbnail } from "@/components/dashboard/DeckPageThumbnail";
import type { DayPalette } from "@/components/dashboard/seasonLayout";
import { TitleCover } from "@/components/dashboard/TalkCover";
import { cn } from "@/lib/utils";

/**
 * A talk's picture, the same everywhere it shows up (schedule tiles, the
 * talks page, home): once its deck is approved and is a PDF, the deck's
 * first slide in HD, with just the talk number (and "Done") on it;
 * until then (or for a PowerPoint deck, which the browser can't draw) the
 * title cover in the talk's day color.
 *
 * Fills its parent (`absolute inset-0`), like TitleCover. Clicks fall
 * through to the card link underneath, except on the speaker's name.
 */
export function TalkThumb({
  talkId,
  deckSlides,
  deckKey,
  title,
  speaker,
  speakerAvatarUrl = null,
  speakerId,
  status,
  number,
  palette,
  size = "sm",
  layout = "bottom",
}: {
  talkId: string;
  deckSlides: boolean;
  deckKey?: string | null;
  title: string;
  speaker: string | null;
  speakerAvatarUrl?: string | null;
  speakerId?: string | null;
  status: "requested" | "deck-soon" | "done" | null;
  number: number;
  palette: DayPalette;
  size?: "sm" | "lg";
  layout?: "bottom" | "center";
}) {
  const cover = (
    <TitleCover
      title={title}
      speaker={speaker}
      speakerAvatarUrl={speakerAvatarUrl}
      speakerId={speakerId}
      status={status}
      number={number}
      palette={palette}
      size={size}
      layout={layout}
    />
  );
  if (!deckSlides) return cover;

  const roomy = size === "lg" || layout === "center";
  const n = String(number).padStart(2, "0");

  // just the slide: the title and speaker already sit next to the tile (or
  // are on the slide itself), so nothing is laid over it but the number
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-neutral-950">
      <DeckPageThumbnail talkId={talkId} deckKey={deckKey} className="absolute inset-0" />
      <span className="sr-only">
        {title}
        {speaker ? ` by ${speaker}` : ""}
      </span>
      <div className={cn("absolute inset-x-0 top-0 flex items-center justify-between gap-2", roomy ? "p-3 sm:p-4" : "p-1.5 sm:p-2")}>
        <span
          className={cn(
            "rounded-full bg-black/70 font-mono font-semibold tracking-[0.16em] uppercase backdrop-blur-sm",
            palette.label,
            roomy ? "px-2.5 py-1 text-[10px]" : "px-1.5 py-px text-[8px] sm:text-[9px]",
          )}
        >
          <span className={roomy ? undefined : "max-sm:hidden"}>talk </span>
          {n}
        </span>
        {status === "done" ? (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full bg-sky-400/90 font-semibold text-black",
              roomy ? "px-2 py-0.5 text-[10px]" : "px-1.5 py-px text-[8px] sm:text-[9px]",
            )}
          >
            <svg aria-hidden viewBox="0 0 12 12" className="size-2.5">
              <path d="M2.5 6.5 5 9l4.5-5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Done
          </span>
        ) : null}
      </div>
    </div>
  );
}
