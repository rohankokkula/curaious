"use client";

import { useEffect } from "react";

/** Seconds without scroll/mouse/keys/touch before we stop counting someone as reading. */
const IDLE_AFTER = 30;
const REPORT_EVERY = 10_000;

/**
 * Records a visit to a hearticle and how it was read: how far down the text
 * (the element marked data-hearticle-body) and how many seconds of active
 * reading, meaning the tab is visible and the person did something in the
 * last 30s. Reports every 10s and once more on leaving. Renders nothing.
 */
export function HearticleTracker({ slug }: { slug: string }) {
  useEffect(() => {
    let viewId: string | null = null;
    let cancelled = false;
    let seconds = 0;
    let maxScroll = 0;
    let lastActive = Date.now();
    let lastSent = { scroll: -1, seconds: -1 };

    const base = `/api/hearticles/${encodeURIComponent(slug)}/views`;
    const body = () => document.querySelector<HTMLElement>("[data-hearticle-body]");

    const measureScroll = () => {
      const el = body();
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const seen = window.innerHeight - rect.top;
      const pct = rect.height > 0 ? Math.round((seen / rect.height) * 100) : 0;
      maxScroll = Math.max(maxScroll, Math.max(0, Math.min(100, pct)));
    };

    const report = (leaving = false) => {
      if (!viewId) return;
      if (lastSent.scroll === maxScroll && lastSent.seconds === seconds) return;
      lastSent = { scroll: maxScroll, seconds };
      const payload = JSON.stringify({ scroll: maxScroll, seconds });
      const url = `${base}/${viewId}`;
      if (leaving && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([payload], { type: "text/plain" }));
      } else {
        fetch(url, { method: "POST", body: payload, keepalive: true }).catch(() => {});
      }
    };

    const params = new URLSearchParams(window.location.search);
    fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrer: document.referrer || null, utm: params.get("utm_source"), hour: new Date().getHours() }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { id?: string } | null) => {
        if (!cancelled && data?.id) viewId = data.id;
      })
      .catch(() => {});

    const onActivity = () => {
      lastActive = Date.now();
    };
    const onScroll = () => {
      onActivity();
      measureScroll();
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") report(true);
    };
    const onLeave = () => report(true);

    measureScroll();
    const tick = window.setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - lastActive < IDLE_AFTER * 1000) seconds += 1;
    }, 1000);
    const flush = window.setInterval(() => report(), REPORT_EVERY);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measureScroll);
    for (const type of ["mousemove", "keydown", "touchstart", "pointerdown", "wheel"]) window.addEventListener(type, onActivity, { passive: true });
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onLeave);

    return () => {
      cancelled = true;
      report(true);
      window.clearInterval(tick);
      window.clearInterval(flush);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measureScroll);
      for (const type of ["mousemove", "keydown", "touchstart", "pointerdown", "wheel"]) window.removeEventListener(type, onActivity);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onLeave);
    };
  }, [slug]);

  return null;
}
