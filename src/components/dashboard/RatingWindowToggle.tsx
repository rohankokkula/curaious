"use client";

import { Lock, LockOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Curator-only control for the scoring window on a talk.
 *
 * Approving a talk puts it on the schedule; it doesn't make it rateable. The
 * curator opens scoring once the talk has actually been given, and closes it
 * when the room is done.
 */
export function RatingWindowToggle({ talkId, open }: { talkId: string; open: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await fetch(`/api/admin/talks/${talkId}/ratings-window`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ open: !open }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    setBusy(false);

    if (!res.ok || !json.ok) {
      return toast.error(json.message ?? "couldn't change that.");
    }
    toast.success(open ? "Scoring closed" : "Scoring open");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-2">
        {open ? (
          <LockOpen aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
        ) : (
          <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            Scoring is {open ? "open" : "closed"}
          </p>
          <p className="mt-1 text-xs text-muted">
            {open
              ? "The cohort can score and comment on this talk. Close it when you're done collecting."
              : "Nobody can score or comment yet. Open it once the talk has been given."}
          </p>
        </div>
      </div>

      <Button
        type="button"
        variant={open ? "outline" : "default"}
        size="sm"
        className="mt-3 w-full"
        disabled={busy}
        onClick={toggle}
      >
        {busy ? "Saving…" : open ? "Close scoring" : "Open scoring"}
      </Button>
    </div>
  );
}
