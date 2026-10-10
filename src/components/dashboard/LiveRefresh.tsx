"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Keeps a server-rendered page live: re-fetches its data every `seconds`
 * while the tab is visible (and right away when you come back to it), and
 * shows a small "Live" pulse with how fresh it is.
 */
export function LiveRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  const [stamp, setStamp] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setStamp(Date.now());
    };
    const poll = window.setInterval(refresh, seconds * 1000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(clock);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, seconds]);

  const ago = Math.max(0, Math.round((now - stamp) / 1000));
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-success" />
      </span>
      Live · {ago < 2 ? "just now" : `${ago}s ago`}
    </span>
  );
}
