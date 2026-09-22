"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type State = "loading" | "ready" | "error";

/**
 * Renders a deck as a slideshow — one page at a time in a fixed 16:9 frame,
 * with prev/next controls — instead of handing the browser a raw PDF to page
 * through on its own.
 */
export function SlideDeck({ talkId }: { talkId: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const deckSrc = `/api/talks/${encodeURIComponent(talkId)}/deck/view`;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

        const response = await fetch(deckSrc, { cache: "no-store" });
        if (!response.ok) throw new Error("access");
        const bytes = await response.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: bytes }).promise;
        if (cancelled) return;

        docRef.current = doc;
        setPageCount(doc.numPages);
        setState("ready");
      } catch {
        if (!cancelled) {
          setState("error");
          setMessage("Couldn't open the deck.");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      docRef.current?.destroy();
    };
  }, [deckSrc]);

  const renderPage = useCallback(async (pageNumber: number) => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!doc || !canvas || !wrap) return;

    renderTaskRef.current?.cancel();

    const pdfPage = await doc.getPage(pageNumber);
    const unscaled = pdfPage.getViewport({ scale: 1 });
    const scale = Math.min(wrap.clientWidth / unscaled.width, wrap.clientHeight / unscaled.height) * (window.devicePixelRatio || 1);
    const viewport = pdfPage.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width / (window.devicePixelRatio || 1)}px`;
    canvas.style.height = `${viewport.height / (window.devicePixelRatio || 1)}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const task = pdfPage.render({ canvasContext: ctx, viewport });
    renderTaskRef.current = task;
    try {
      await task.promise;
    } catch {
      // Cancelled by a newer render — expected when flipping pages quickly.
    }
  }, []);

  useEffect(() => {
    if (state !== "ready") return;
    void renderPage(page);
  }, [state, page, renderPage]);

  useEffect(() => {
    if (state !== "ready" || !wrapRef.current) return;
    const observer = new ResizeObserver(() => void renderPage(page));
    observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [state, page, renderPage]);

  useEffect(() => {
    function onChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") setPage((p) => Math.max(1, p - 1));
      if (e.key === "ArrowRight") setPage((p) => Math.min(pageCount, p + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pageCount]);

  const toggleFullscreen = useCallback(async () => {
    const node = wrapRef.current?.closest("[data-slide-frame]") as HTMLElement | null;
    if (!node) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await node.requestFullscreen();
    } catch {
      // Needs a user gesture chain some browsers won't grant here.
    }
  }, []);

  return (
    <div data-slide-frame className="overflow-hidden rounded-xl border border-border bg-neutral-900">
      <div ref={wrapRef} className="relative flex aspect-video w-full items-center justify-center bg-neutral-950">
        {state === "ready" ? (
          <canvas ref={canvasRef} className="max-h-full max-w-full" />
        ) : (
          <p className="px-6 text-center text-sm text-neutral-400">{state === "loading" ? "Opening the deck…" : message}</p>
        )}

        {state === "ready" && pageCount > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="absolute top-1/2 left-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 disabled:opacity-0"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 disabled:opacity-0"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        ) : null}
      </div>

      <div className="flex items-center justify-between px-3 py-2">
        <span className={cn("text-xs font-medium text-neutral-300", pageCount === 0 && "opacity-0")}>
          {page} / {pageCount}
        </span>
        <button
          type="button"
          onClick={toggleFullscreen}
          disabled={state !== "ready"}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-neutral-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
          {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        </button>
      </div>
    </div>
  );
}
