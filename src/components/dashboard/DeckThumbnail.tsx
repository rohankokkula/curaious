"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { FileText, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type State = "loading" | "ready" | "error";

/**
 * First page of a locally-selected PDF, rendered to a canvas so someone can
 * see they picked the right deck before submitting it.
 *
 * Nothing is uploaded to draw this — pdfjs reads the File in the browser, the
 * same library and worker setup the SlideDeck viewer uses. `file.arrayBuffer()`
 * hands pdfjs a copy, so the File itself stays intact for the actual upload.
 */
export function DeckThumbnail({ file, className }: { file: File; className?: string }) {
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

        const bytes = await file.arrayBuffer();
        if (cancelled) return;

        doc = await pdfjs.getDocument({ data: bytes }).promise;
        if (cancelled) return;

        const page = await doc.getPage(1);
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        if (!canvas || !wrap || cancelled) return;

        const unscaled = page.getViewport({ scale: 1 });
        const dpr = window.devicePixelRatio || 1;
        const fit = Math.min(
          wrap.clientWidth / unscaled.width,
          wrap.clientHeight / unscaled.height,
        );
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
        // A corrupt or password-protected PDF still uploads fine; it just
        // can't be previewed, so this falls back rather than blocking.
        if (!cancelled) setState("error");
      }
    }

    void render();

    return () => {
      cancelled = true;
      doc?.destroy();
    };
  }, [file]);

  return (
    <div ref={wrapRef} className={cn("relative flex items-center justify-center overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        aria-label={`First page of ${file.name}`}
        className={cn("rounded transition-opacity", state === "ready" ? "opacity-100" : "opacity-0")}
      />

      {state !== "ready" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted">
          {state === "loading" ? (
            <>
              <Loader2 aria-hidden className="size-5 animate-spin" />
              <p className="text-xs">Rendering preview…</p>
            </>
          ) : (
            <>
              <FileText aria-hidden className="size-6" />
              <p className="px-4 text-center text-xs">
                Can&rsquo;t preview this one. It will still upload.
              </p>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
