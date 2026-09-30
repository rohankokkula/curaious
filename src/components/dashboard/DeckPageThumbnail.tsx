"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type State = "loading" | "ready" | "error";

/**
 * First page of an already-uploaded deck, fetched from the app's own signed
 * route rather than a local File — the schedule-tile counterpart to
 * DeckThumbnail (which renders a File picked in the submit form, before
 * upload). Same pdfjs setup as SlideDeck.tsx, so the deck view and this tile
 * always agree on what "the first slide" looks like.
 */
export function DeckPageThumbnail({ talkId, className }: { talkId: string; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    let cancelled = false;
    let doc: PDFDocumentProxy | null = null;

    async function render() {
      setState("loading");
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const response = await fetch(`/api/talks/${encodeURIComponent(talkId)}/deck/view`, { cache: "no-store" });
        if (!response.ok) throw new Error("access");
        const bytes = await response.arrayBuffer();
        if (cancelled) return;

        doc = await pdfjs.getDocument({ data: bytes }).promise;
        if (cancelled) return;

        const page = await doc.getPage(1);
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        if (!canvas || !wrap || cancelled) return;

        const unscaled = page.getViewport({ scale: 1 });
        const dpr = window.devicePixelRatio || 1;
        const fit = Math.min(wrap.clientWidth / unscaled.width, wrap.clientHeight / unscaled.height);
        const viewport = page.getViewport({ scale: fit * dpr });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    void render();
    return () => {
      cancelled = true;
      doc?.destroy();
    };
  }, [talkId]);

  if (state === "error") return null; // falls back to the caller's plain gradient tile

  return (
    <div ref={wrapRef} className={cn("relative flex items-center justify-center overflow-hidden bg-neutral-950", className)}>
      <canvas ref={canvasRef} className={cn("transition-opacity", state === "ready" ? "opacity-100" : "opacity-0")} />
    </div>
  );
}
