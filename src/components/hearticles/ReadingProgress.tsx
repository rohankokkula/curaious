"use client";

import { useEffect, useRef } from "react";

/** A thin bar along the top edge that fills as you read. Writes straight to
 * the DOM on scroll (no re-render per frame). */
export function ReadingProgress({ color }: { color: string }) {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${pct})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div aria-hidden className="fixed inset-x-0 top-0 z-50 h-[3px]">
      <div ref={bar} className="h-full origin-left" style={{ background: color, transform: "scaleX(0)" }} />
    </div>
  );
}
