"use client";

import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const Dialog = D.Root;
const DialogTrigger = D.Trigger;
const DialogClose = D.Close;

function DialogContent({
  className,
  children,
  title,
  ...props
}: React.ComponentProps<typeof D.Content> & { title: string }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-overlay-hide data-[state=open]:animate-overlay-show" />
      <D.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-card p-6 shadow-xl data-[state=closed]:animate-dialog-hide data-[state=open]:animate-dialog-show",
          className,
        )}
        {...props}
      >
        <D.Title className="text-lg font-semibold">{title}</D.Title>
        <D.Description className="sr-only">{title}</D.Description>
        <div className="mt-4">{children}</div>
        <D.Close
          aria-label="Close"
          className="absolute top-4 right-4 rounded-md p-1 text-muted hover:bg-surface"
        >
          <X className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}

/**
 * A dialog anchored to the right edge instead of the middle of the screen.
 * Same Radix primitives and the same focus/escape behaviour as DialogContent —
 * it's the placement and the entry animation that differ. Use it where the
 * content is long enough that a centred box would fight the viewport, like a
 * form with a lot of fields.
 *
 * The title row stays put and only the body scrolls, so the heading and the
 * close control are always reachable.
 */
function SheetContent({
  className,
  children,
  title,
  description,
  ...props
}: React.ComponentProps<typeof D.Content> & { title: string; description?: string }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-overlay-hide data-[state=open]:animate-overlay-show" />
      <D.Content
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-xl outline-none data-[state=closed]:animate-sheet-hide data-[state=open]:animate-sheet-show",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <D.Title className="text-lg font-semibold">{title}</D.Title>
            {description ? (
              <D.Description className="mt-0.5 text-sm text-muted">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          <D.Close
            aria-label="Close"
            className="focus-ring -mr-1 shrink-0 rounded-md p-1.5 text-muted transition hover:bg-surface hover:text-foreground"
          >
            <X className="size-4" />
          </D.Close>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </D.Content>
    </D.Portal>
  );
}

export { Dialog, DialogTrigger, DialogClose, DialogContent, SheetContent };
