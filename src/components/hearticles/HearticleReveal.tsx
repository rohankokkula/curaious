"use client";

import { useEffect, useRef } from "react";

/**
 * Fades each top-level block of the hearticle in as it scrolls into view.
 * The hiding class is only added once JS runs, so the text is never stuck
 * invisible (no JS, crawlers, reader mode).
 */
export function HearticleReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const blocks = Array.from(root.querySelectorAll<HTMLElement>(".hearticle-prose > *"));
    blocks.forEach((block) => block.classList.add("reveal-block"));
    root.classList.add("hearticle-reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    blocks.forEach((block) => observer.observe(block));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
