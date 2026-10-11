import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * A member's name (or avatar + name) that opens their profile. Use it
 * anywhere a person shows up, so every name in the portal goes somewhere.
 *
 * Inside a card that links somewhere else, put the card's own link in a
 * <CardLink> underneath: this sits above it (relative z-10), so a tap on
 * the name opens the profile and a tap anywhere else opens the card's
 * target, without nesting one <a> in another.
 */
export function PersonLink({
  id,
  children,
  className,
  title,
}: {
  id: string | null | undefined;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  if (!id) return <span className={className}>{children}</span>;
  return (
    <Link
      href={`/dashboard/members/${id}`}
      title={title}
      className={cn("pointer-events-auto relative z-10 rounded-sm underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2", className)}
    >
      {children}
    </Link>
  );
}

/**
 * The "stretched link" behind a card: covers the whole card (which must be
 * `relative`) and carries its label for screen readers. Anything interactive
 * inside the card (a PersonLink, a button) stays clickable above it.
 */
export function CardLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link href={href} aria-label={label} className={cn("absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-2 focus-visible:outline-offset-2", className)}>
      <span className="sr-only">{label}</span>
    </Link>
  );
}
