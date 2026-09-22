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

export { Dialog, DialogTrigger, DialogClose, DialogContent };
