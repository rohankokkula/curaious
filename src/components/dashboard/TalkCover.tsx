import type { DayPalette } from "@/components/dashboard/seasonLayout";
import { cn } from "@/lib/utils";

/**
 * A booked talk before its deck is up: a cover in the day's color, styled
 * like a title slide — a faint grid, two color blooms, a giant watermark of
 * the talk number, a highlight along the top edge; the number and status up
 * top, the title set large with the speaker under it.
 */
export function TitleCover({
  title,
  speaker,
  speakerAvatarUrl = null,
  status,
  number,
  palette,
  size = "sm",
  kicker,
  watermark,
  subtitle,
}: {
  /** A line under the title (an article's excerpt). */
  subtitle?: string | null;
  /** Replaces "talk 01" in the top-left label (e.g. an article's "hearticles"). */
  kicker?: string;
  /** Replaces the big faint number in the corner. */
  watermark?: string;
  title: string;
  speaker: string | null;
  speakerAvatarUrl?: string | null;
  /** Small tag in the corner: the request is pending, or the deck isn't up yet. */
  status: "requested" | "deck-soon" | null;
  number: number;
  palette: DayPalette;
  /** "sm" for schedule tiles and talk cards; "lg" for a featured, full-width cover. */
  size?: "sm" | "lg";
}) {
  const n = String(number).padStart(2, "0");
  const lg = size === "lg";
  return (
    <div className={cn("absolute inset-0 flex flex-col justify-between overflow-hidden text-left", lg ? "p-5 md:p-8" : "p-2 sm:p-3", palette.label)}>
      {/* wash + grid, both drawn in the day's color via currentColor */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundImage: "linear-gradient(135deg, color-mix(in srgb, currentColor 22%, transparent), transparent 65%)" }}
      />
      <span
        aria-hidden
        className="absolute inset-0 opacity-[0.09]"
        style={{
          backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "14px 14px",
          maskImage: "radial-gradient(ellipse at 85% 20%, black 10%, transparent 70%)",
        }}
      />
      <span aria-hidden className="absolute -top-8 -right-6 size-24 rounded-full bg-current opacity-30 blur-2xl transition-transform duration-500 group-hover:scale-125" />
      <span aria-hidden className="absolute -bottom-10 -left-6 size-20 rounded-full bg-current opacity-15 blur-2xl" />
      <span
        aria-hidden
        className={cn(
          "absolute -right-1 font-mono leading-none font-bold tracking-tighter opacity-[0.09]",
          lg ? "-bottom-6 text-[8rem] md:-bottom-10 md:text-[12rem]" : "-bottom-3 text-[3.25rem] sm:-bottom-5 sm:text-7xl",
        )}
      >
        {watermark ?? n}
      </span>
      <span aria-hidden className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      <div className="relative flex items-center justify-between gap-1.5">
        <span
          className={cn(
            "flex items-center gap-1 font-mono font-semibold tracking-[0.16em] whitespace-nowrap uppercase sm:gap-1.5",
            lg ? "text-[10px] md:text-xs" : "text-[8px] sm:text-[9px]",
          )}
        >
          <span className="h-px w-2.5 bg-current sm:w-3" />
          {kicker ? (
            kicker
          ) : (
            <>
              <span className={lg ? undefined : "max-sm:hidden"}>talk</span>
              {n}
            </>
          )}
        </span>
        {status === "requested" ? (
          <span className="rounded-full bg-amber-400/90 px-1.5 py-px text-[8px] font-semibold whitespace-nowrap text-black sm:text-[9px]">
            Requested
          </span>
        ) : status === "deck-soon" ? (
          <span
            title="Deck coming soon"
            className="flex items-center gap-1 rounded-full bg-black/35 px-1.5 py-px text-[8px] font-semibold whitespace-nowrap text-foreground/85 backdrop-blur-sm sm:text-[9px]"
          >
            <span className="size-1 rounded-full bg-current" />
            <span className={lg ? undefined : "max-sm:hidden"}>Deck soon</span>
            {lg ? null : <span className="sm:hidden">Soon</span>}
          </span>
        ) : null}
      </div>

      <div className="relative min-w-0">
        <p
          className={cn(
            "font-bold tracking-tight text-balance text-foreground drop-shadow-sm",
            lg
              ? "line-clamp-3 text-2xl leading-tight md:text-4xl md:leading-[1.1]"
              : "line-clamp-2 text-[12px] leading-[1.15] sm:line-clamp-3 sm:text-base sm:leading-tight",
          )}
        >
          {title}
        </p>
        {subtitle ? (
          <p
            className={cn(
              "text-foreground/75",
              lg ? "mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed md:mt-3 md:text-lg" : "mt-1 line-clamp-2 text-[11px] leading-snug sm:text-xs",
            )}
          >
            {subtitle}
          </p>
        ) : null}
        {speaker ? (
          <p className={cn("flex min-w-0 items-center gap-1.5 font-semibold", lg ? "mt-3 text-sm md:text-base" : "mt-1 text-[9px] sm:mt-1.5 sm:text-[11px]")}>
            {speakerAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={speakerAvatarUrl}
                alt=""
                loading="lazy"
                className={cn("shrink-0 rounded-full object-cover ring-2 ring-current", lg ? "size-8" : "size-5 sm:size-6")}
              />
            ) : (
              <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-current ring-2 ring-current", lg ? "size-8" : "size-5 sm:size-6")}>
                <span className={cn("font-bold text-black/80", lg ? "text-[10px]" : "text-[7px] sm:text-[8px]")}>{initialsOf(speaker)}</span>
              </span>
            )}
            <span className="truncate">{speaker}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
