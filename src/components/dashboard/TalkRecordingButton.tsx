"use client";

import { Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Add, change or remove one talk's recording (PATCH /api/talks/[id]): the
 * curator for any talk, the speaker for their own. Each talk has its own
 * video; whole-session recordings are only for the kickoff and recognitions.
 */
export function TalkRecordingButton({
  talkId,
  current,
  className,
}: {
  talkId: string;
  current: string | null;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(current ?? "");
  const [busy, setBusy] = useState(false);

  async function save(next: string) {
    setBusy(true);
    const res = await fetch(`/api/talks/${talkId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordingUrl: next.trim() }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    setBusy(false);
    if (!res.ok || !json.ok) return toast.error(json.message ?? "Couldn't save that link.");
    toast.success(next.trim() ? "Recording added" : "Recording removed");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setUrl(current ?? "");
          setOpen(true);
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs font-semibold text-muted transition hover:text-foreground",
          className,
        )}
      >
        <Video className="size-3.5" /> {current ? "Change recording" : "Add recording"}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={current ? "Change this talk's recording" : "Add this talk's recording"}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save(url);
            }}
          >
            <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtu.be/…" autoFocus />
            <p className="mt-1.5 text-xs text-muted">YouTube (unlisted is fine), Vimeo or Loom. Signed-in members can watch it on the talk and the schedule.</p>
            <div className="mt-5 flex justify-between gap-2">
              {current ? (
                <Button type="button" variant="ghost" className="text-destructive" disabled={busy} onClick={() => void save("")}>
                  Remove
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy || !url.trim()}>
                  {busy ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
