"use client";

import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const Dialog = D.Root;

/** The little grab bar at the top of a bottom sheet, phones only. */
function SheetHandle() {
  return <div aria-hidden className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-border md:hidden max-md:mt-2" />;
}
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
          "fixed z-50 border border-border bg-card shadow-xl outline-none",
          // phone: a bottom sheet, the way an app asks a question
          "max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[90dvh] max-md:overflow-y-auto max-md:rounded-t-2xl max-md:border-x-0 max-md:border-b-0 max-md:p-5 max-md:pb-[calc(env(safe-area-inset-bottom)+1.25rem)]",
          "max-md:data-[state=open]:animate-bottom-sheet-show max-md:data-[state=closed]:animate-bottom-sheet-hide",
          // desktop: centred
          "md:top-1/2 md:left-1/2 md:w-[calc(100%-2rem)] md:max-w-md md:rounded-xl md:p-6",
          "md:data-[state=open]:animate-dialog-show md:data-[state=closed]:animate-dialog-hide",
          className,
          "max-md:max-w-none!",
        )}
        {...props}
      >
        <SheetHandle />
        <D.Title className="text-lg font-semibold">{title}</D.Title>
        <D.Description className="sr-only">{title}</D.Description>
        <div className="mt-4">{children}</div>
        <D.Close
          aria-label="Close"
          className="absolute top-4 right-4 rounded-md p-1 text-muted hover:bg-surface max-md:hidden"
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
          "fixed z-50 flex flex-col border-border bg-card shadow-xl outline-none",
          // phone: slides up from the bottom, full width
          "max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[92dvh] max-md:rounded-t-2xl max-md:border-t",
          "max-md:data-[state=open]:animate-bottom-sheet-show max-md:data-[state=closed]:animate-bottom-sheet-hide",
          // desktop: right-hand panel
          "md:inset-y-0 md:right-0 md:w-full md:max-w-md md:border-l",
          "md:data-[state=open]:animate-sheet-show md:data-[state=closed]:animate-sheet-hide",
          className,
          "max-md:max-w-none!",
        )}
        {...props}
      >
        <SheetHandle />
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4 max-md:px-5 max-md:pt-1 max-md:pb-3">
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 max-md:pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          {children}
        </div>
      </D.Content>
    </D.Portal>
  );
}

export { Dialog, DialogTrigger, DialogClose, DialogContent, SheetContent };
