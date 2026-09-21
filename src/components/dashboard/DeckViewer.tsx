"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type State = "loading" | "ready" | "error";

export function DeckViewer({ talkId }: { talkId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Same-origin path, built locally. The route redirects to a short-lived
  // signed URL server-side, so no external URL ever reaches the DOM.
  const deckSrc = useMemo(
    () => `/api/talks/${encodeURIComponent(talkId)}/deck/view`,
    [talkId],
  );

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      try {
        const response = await fetch(
          `/api/talks/${encodeURIComponent(talkId)}/deck`,
          { cache: "no-store" },
        );
        const body = (await response.json()) as {
          ok?: boolean;
          message?: string;
        };

        if (cancelled) return;

        if (!response.ok || !body.ok) {
          setState("error");
          setMessage(body.message || "couldn't open the deck.");
          return;
        }

        setState("ready");
      } catch {
        if (!cancelled) {
          setState("error");
          setMessage("couldn't open the deck.");
        }
      }
    }

    checkAccess();
    return () => {
      cancelled = true;
    };
  }, [talkId]);

  useEffect(() => {
    function onChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const node = containerRef.current;
    if (!node) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await node.requestFullscreen();
      }
    } catch {
      // Some browsers refuse without a user gesture chain; nothing to recover.
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-5">
        <button
          type="button"
          onClick={toggleFullscreen}
          disabled={state !== "ready"}
          className="focus-ring rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isFullscreen ? "exit fullscreen" : "present fullscreen"}
        </button>
        {state === "ready" ? (
          <a
            href={deckSrc}
            target="_blank"
            rel="noreferrer"
            className="focus-ring text-sm text-muted transition hover:text-foreground"
          >
            open in a new tab
          </a>
        ) : null}
      </div>

      <p className="text-xs text-muted">
        share this tab in your meet call.
      </p>

      <div ref={containerRef} className="relative w-full bg-black">
        {state === "ready" ? (
          <iframe
            src={deckSrc}
            title="talk deck"
            className={cn(
              "w-full border border-border/60 bg-black",
              isFullscreen ? "h-screen border-0" : "h-[70vh]",
            )}
            allowFullScreen
          />
        ) : (
          <div
            className={cn(
              "flex w-full items-center justify-center border border-border/60",
              isFullscreen ? "h-screen" : "h-[70vh]",
            )}
          >
            <p className="prose-quiet">
              {state === "loading" ? "opening the deck…" : message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
