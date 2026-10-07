import type { hearticleTone } from "@/lib/hearticleTone";
import { cn } from "@/lib/utils";

type Tone = ReturnType<typeof hearticleTone>;

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/**
 * A hearticle's cover: its own look, not the talk covers' grid. A halftone
 * dot field and soft rings in the hearticle's color, a giant quote mark; the
 * title set heavy near the top, the excerpt under it, the author anchored at
 * the bottom. Used on the article page (lg) and the Hearticles index (sm);
 * the share card (og/render.tsx) draws the same thing at 1200×630.
 */
export function HearticleCover({
  title,
  excerpt,
  authorName,
  authorAvatarUrl,
  readMinutes,
  tone,
  size = "sm",
  className,
}: {
  title: string;
  excerpt: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
  readMinutes: number | null;
  tone: Tone;
  size?: "sm" | "lg";
  className?: string;
}) {
  const lg = size === "lg";
  return (
    <div
      className={cn("relative isolate flex flex-col overflow-hidden", lg ? "items-center p-6 text-center md:p-10" : "p-4 text-left sm:p-5", className)}
      style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${tone.accent} 22%, ${tone.bg}) 0%, ${tone.bg} 55%)` }}
    >
      {/* halftone dots, densest top right, fading out */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `radial-gradient(color-mix(in srgb, ${tone.accent} 55%, transparent) 1.2px, transparent 1.6px)`,
          backgroundSize: lg ? "18px 18px" : "13px 13px",
          maskImage: "radial-gradient(ellipse at 100% 0%, black 0%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at 100% 0%, black 0%, transparent 70%)",
          opacity: 0.55,
        }}
      />
      {/* soft concentric rings from the bottom right */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `repeating-radial-gradient(circle at 100% 100%, transparent 0 ${lg ? 38 : 24}px, color-mix(in srgb, ${tone.accent} 14%, transparent) ${lg ? 38 : 24}px ${lg ? 39 : 25}px)`,
          maskImage: "radial-gradient(circle at 100% 100%, black 0%, transparent 65%)",
          WebkitMaskImage: "radial-gradient(circle at 100% 100%, black 0%, transparent 65%)",
        }}
      />
      {/* glow + quote mark */}
      <span
        aria-hidden
        className={cn("absolute -z-10 rounded-full blur-3xl", lg ? "-top-24 -left-16 size-96" : "-top-12 -left-10 size-48")}
        style={{ background: tone.accent, opacity: 0.18 }}
      />
      <span
        aria-hidden
        className={cn("absolute -z-10 font-serif leading-none font-bold select-none", lg ? "right-6 -bottom-24 text-[18rem] md:right-10" : "right-3 -bottom-12 text-[9rem]")}
        style={{ color: tone.accent, opacity: 0.12 }}
      >
        &rdquo;
      </span>

      {lg ? <span aria-hidden className="flex-1" /> : null}

      {/* kicker */}
      <p
        className={cn("flex items-center gap-2 font-mono font-semibold tracking-[0.18em] uppercase", lg ? "text-[11px] md:text-xs" : "text-[9px] sm:text-[10px]")}
        style={{ color: tone.accent }}
      >
        <span className="h-px w-4 bg-current" />
        {["hearticle", readMinutes ? `${readMinutes} min read` : null].filter(Boolean).join(" · ")}
        {lg ? <span className="h-px w-4 bg-current" /> : null}
      </p>

      {/* title + excerpt, up top */}
      <h2
        className={cn(
          "mt-3 font-extrabold tracking-tight text-balance text-white",
          lg ? "mx-auto max-w-3xl text-3xl leading-[1.05] md:mt-5 md:text-6xl" : "line-clamp-3 text-xl leading-[1.1] sm:text-[22px]",
        )}
      >
        {title}
      </h2>
      {excerpt ? (
        <p className={cn("text-white/70", lg ? "mx-auto mt-3 max-w-2xl text-base leading-relaxed md:mt-4 md:text-xl" : "mt-2 line-clamp-2 text-[13px] leading-snug")}>
          {excerpt}
        </p>
      ) : null}

      {/* author, anchored to the bottom */}
      {authorName ? (
        <div className={cn("mt-auto flex items-center gap-2.5 pt-4", lg && "md:pt-8")}>
          {authorAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={authorAvatarUrl}
              alt=""
              className={cn("shrink-0 rounded-full object-cover", lg ? "size-10 md:size-12" : "size-7")}
              style={{ boxShadow: `0 0 0 2px ${tone.accent}` }}
            />
          ) : (
            <span
              className={cn("flex shrink-0 items-center justify-center rounded-full font-bold", lg ? "size-10 text-sm md:size-12" : "size-7 text-[10px]")}
              style={{ background: tone.accent, color: tone.bg }}
            >
              {initialsFor(authorName)}
            </span>
          )}
          <span className={cn("truncate font-semibold", lg ? "text-base md:text-lg" : "text-[13px]")} style={{ color: tone.accent }}>
            {authorName}
          </span>
        </div>
      ) : null}
    </div>
  );
}
