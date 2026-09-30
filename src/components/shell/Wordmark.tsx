import { cn } from "@/lib/utils";

/** "curaious" with "ai" underlined, in the dashboard's own sans/bold styling
 * (the landing page's serif `CuraiousLogo` is a separate typographic
 * context — this is the one used in the app header and mobile drawer). */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn(className)}>
      cur
      <span className="underline decoration-2 underline-offset-[3px]">ai</span>
      ous
    </span>
  );
}
