"use client";

import { PlayCircle } from "lucide-react";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { parseRecordingUrl } from "@/lib/recording";
import { cn } from "@/lib/utils";

/**
 * "Watch recording" on a session in the schedule: opens the video in the
 * right-hand side panel (a bottom sheet on phones), so the schedule stays
 * in view beside it. Only allowlisted providers are ever
 * embedded; anything else is just a link out.
 */
export function WatchRecordingButton({ url, title, className }: { url: string; title: string; className?: string }) {
  const recording = parseRecordingUrl(url);
  const buttonClass = cn(
    "inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:bg-foreground/85",
    className,
  );

  if (!recording) {
    return (
      <a href={url} target="_blank" rel="noreferrer noopener" className={buttonClass}>
        <PlayCircle className="size-3.5" /> Watch recording
      </a>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={buttonClass}>
          <PlayCircle className="size-3.5" /> Watch recording
        </button>
      </DialogTrigger>
      <SheetContent title={title} description="Session recording · members only" className="md:max-w-2xl">
        <div className="aspect-video overflow-hidden rounded-xl border border-border bg-surface">
          <iframe
            src={recording.embedUrl}
            title={`Recording of ${title}`}
            className="size-full"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
        <a
          href={recording.watchUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 inline-block text-xs text-muted underline underline-offset-4 hover:text-foreground"
        >
          Open on {recording.provider === "youtube" ? "YouTube" : recording.provider === "vimeo" ? "Vimeo" : "Loom"}
        </a>
      </SheetContent>
    </Dialog>
  );
}
