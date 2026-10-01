"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type State = "idle" | "loading" | "ready" | "error";

/** Rendered first slides, as small JPEG data URLs, keyed by talk. Lives for
 * the tab (memory first, sessionStorage behind it) so coming back to the
 * talks list or the schedule shows thumbnails at once instead of
 * downloading and rasterising every deck again. */
const memory = new Map<string, string>();
const storageKey = (talkId: string) => `deck-thumb:v1:${talkId}`;

function readCached(talkId: string): string | null {
  const hit = memory.get(talkId);
  if (hit) return hit;
  try {
    const stored = sessionStorage.getItem(storageKey(talkId));
    if (stored) memory.set(talkId, stored);
    return stored;
  } catch {
    return null;
  }
}

function writeCached(talkId: string, dataUrl: string) {
  memory.set(talkId, dataUrl);
  try {
    sessionStorage.setItem(storageKey(talkId), dataUrl);
  } catch {
    // Quota or private mode: the in-memory copy still covers this tab.
  }
}

/**
 * First page of an already-uploaded deck, fetched from the app's own signed
 * route rather than a local File — the schedule-tile counterpart to
 * DeckThumbnail (which renders a File picked in the submit form, before
 * upload). Same pdfjs setup as SlideDeck.tsx, so the deck view and this tile
 * always agree on what "the first slide" looks like.
 *
 * Lazy: nothing (not pdfjs, not the PDF) loads until the tile is about to
 * scroll into view, and a cached render skips all of it.
 */
export function DeckPageThumbnail({ talkId, className }: { talkId: string; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // Seeded from memory only (empty on a fresh page load, so server and
  // client agree during hydration); sessionStorage is checked in the effect.
  const [rendered, setRendered] = useState<{ talkId: string; url: string } | null>(() => {
    const hit = memory.get(talkId);
    return hit ? { talkId, url: hit } : null;
  });
  const [state, setState] = useState<State>("idle");
  const cached = rendered?.talkId === talkId ? rendered.url : null;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || memory.has(talkId)) return;

    let cancelled = false;
    let doc: PDFDocumentProxy | null = null;

    async function render() {
      const stored = readCached(talkId);
      if (stored) {
        setRendered({ talkId, url: stored });
        return;
      }

      setState("loading");
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const response = await fetch(`/api/talks/${encodeURIComponent(talkId)}/deck/view`);
        if (!response.ok) throw new Error("access");
        const bytes = await response.arrayBuffer();
        if (cancelled) return;

        doc = await pdfjs.getDocument({ data: bytes }).promise;
        if (cancelled) return;

        const page = await doc.getPage(1);
        const box = wrapRef.current;
        if (!box || cancelled) return;

        const unscaled = page.getViewport({ scale: 1 });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const fit = Math.min(box.clientWidth / unscaled.width, box.clientHeight / unscaled.height) || 1;
        const viewport = page.getViewport({ scale: fit * dpr });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled) return;

        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        writeCached(talkId, dataUrl);
        setRendered({ talkId, url: dataUrl });
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    // Start a little before the tile is on screen so it's usually done by
    // the time it's visible.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void render();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(wrap);

    return () => {
      cancelled = true;
      observer.disconnect();
      void doc?.destroy();
    };
  }, [talkId]);

  if (state === "error") return null; // falls back to the caller's plain tile

  return (
    <div ref={wrapRef} className={cn("relative flex items-center justify-center overflow-hidden bg-neutral-950", className)}>
      {cached ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cached} alt="" className="max-h-full max-w-full object-contain" />
      ) : null}
    </div>
  );
}
