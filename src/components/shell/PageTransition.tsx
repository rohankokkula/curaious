"use client";

import { usePathname } from "next/navigation";

/** Keying by pathname remounts this wrapper on every navigation, so the
 * fade-up animation (defined in globals.css) replays each time — a small
 * acknowledgment that the page actually changed, instead of content just
 * popping into place. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-fade-up">
      {children}
    </div>
  );
}
