import { cn } from "@/lib/utils";

interface CuraiousLogoProps {
  className?: string;
}

/**
 * Real text, not the old static SVG image. Lets the browser handle exact
 * glyph positioning (needed to underline just "ai") and makes the wordmark
 * follow the page's theme color instead of a fixed invert filter.
 */
export function CuraiousLogo({ className }: CuraiousLogoProps) {
  return (
    <span
      className={cn("font-serif text-foreground", className)}
      style={{ fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: "0.02em" }}
    >
      cur
      <span className="underline decoration-[#e08a5a] decoration-2 underline-offset-[0.06em]">ai</span>
      ous
    </span>
  );
}
