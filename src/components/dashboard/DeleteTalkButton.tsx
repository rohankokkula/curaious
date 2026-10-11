"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Deletes a talk (DELETE /api/talks/[id]): the presenter withdrawing their
 * own, or the curator removing one (`speakerName` set), e.g. when a talk
 * didn't happen. The row, its deck file and any scores go; the seat opens up.
 */
export function DeleteTalkButton({
  talkId,
  speakerName,
  size = "sm",
  className,
}: {
  talkId: string;
  /** set when the curator is removing someone else's talk */
  speakerName?: string | null;
  size?: "sm" | "xs";
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const curator = Boolean(speakerName);

  async function confirmDelete() {
    setDeleting(true);
    const res = await fetch(`/api/talks/${talkId}`, { method: "DELETE" });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    setDeleting(false);
    if (!res.ok || !json.ok) return toast.error(json.message ?? "couldn't delete that.");
    toast.success(curator ? `${speakerName}'s talk removed. The seat is open again.` : "Talk deleted. The slot is open again.");
    setOpen(false);
    router.push("/dashboard/schedule");
    router.refresh();
  }

  return (
    <>
      {size === "xs" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-destructive/30 px-2.5 py-1 text-xs font-semibold text-destructive transition hover:bg-destructive/10",
            className,
          )}
        >
          <Trash2 className="size-3.5" /> {curator ? "Remove talk" : "Delete"}
        </button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className={cn("text-destructive hover:bg-destructive/10 hover:text-destructive", className)}
        >
          <Trash2 className="size-4" /> {curator ? "Remove talk" : "Delete & resubmit"}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={curator ? `Remove ${speakerName}'s talk?` : "Delete this talk?"}>
          <p className="text-sm text-muted">
            {curator
              ? `This removes ${speakerName}'s talk, deck and any scores and notes on it, and frees the seat. They can request a new slot afterward. This can't be undone.`
              : "This removes your title, description and deck, and frees the slot. You can submit a new talk to any open slot afterward. This can't be undone."}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Removing…" : curator ? "Remove talk" : "Delete talk"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
