"use client";

import { Dialog as D } from "radix-ui";
import { ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Best-effort iframe preview. Most sites (arXiv, Medium, most blogs, GitHub)
 * send headers that refuse to be framed — the iframe just goes blank for
 * those, and there's no reliable cross-origin way to detect that and fall
 * back automatically. That's why "open in new tab" is a persistent button
 * here, not a fallback shown only on failure: it has to always be there.
 */
export function LinkPreviewModal({
  open,
  onOpenChange,
  url,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=closed]:animate-overlay-hide data-[state=open]:animate-overlay-show" />
        <D.Content
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "fixed inset-4 z-50 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl outline-none md:inset-10",
            "data-[state=closed]:animate-content-hide data-[state=open]:animate-content-show",
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <D.Title className="min-w-0 truncate text-sm font-semibold">{title}</D.Title>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-surface"
              >
                Open in new tab <ExternalLink className="size-3.5" />
              </a>
              <D.Close aria-label="Close" className="focus-ring rounded-md p-1.5 text-muted hover:bg-surface">
                <X className="size-4" />
              </D.Close>
            </div>
          </div>
          <D.Description className="sr-only">Preview of {url}</D.Description>

          <div className="relative flex-1 bg-surface">
            <iframe
              src={url}
              title={title}
              className="size-full"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              referrerPolicy="strict-origin-when-cross-origin"
              loading="lazy"
            />
            <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-muted">
              Blank here? Plenty of sites don&rsquo;t allow this — use &ldquo;Open in new tab&rdquo; above.
            </p>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
