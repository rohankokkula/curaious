import type { DayPalette } from "@/components/dashboard/seasonLayout";
import { cn } from "@/lib/utils";

/**
 * The profile card's look, reusable: a card washed in a talk's day color, a
 * soft glow and a faint grid fading in from the top right. Used for profiles,
 * the talk page and the talk cards, so a talk reads the same everywhere.
 */
export function AccentCard({
  palette,
  children,
  className,
  glow = "lg",
  as: Tag = "section",
}: {
  palette: DayPalette;
  children: React.ReactNode;
  className?: string;
  glow?: "sm" | "lg";
  as?: "section" | "div" | "article" | "aside";
}) {
  return (
    <Tag className={cn("relative overflow-hidden rounded-3xl border border-border bg-card", className)}>
      <AccentGlow palette={palette} size={glow} />
      <div className="relative">{children}</div>
    </Tag>
  );
}

export function AccentGlow({ palette, size = "lg", className }: { palette: DayPalette; size?: "sm" | "lg"; className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", palette.label, className)}>
      <span
        className={cn(
          "absolute rounded-full bg-current blur-3xl transition-opacity duration-300",
          size === "lg" ? "-top-24 -right-24 size-96 opacity-[0.14]" : "-top-16 -right-16 size-48 opacity-[0.13] group-hover:opacity-[0.22]",
        )}
      />
      <span
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: size === "lg" ? "28px 28px" : "22px 22px",
          maskImage: "radial-gradient(ellipse at 90% 0%, black 0%, transparent 65%)",
        }}
      />
    </div>
  );
}
