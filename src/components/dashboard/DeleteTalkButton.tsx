"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function DeleteTalkButton({ talkId }: { talkId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    const res = await fetch(`/api/talks/${talkId}`, { method: "DELETE" });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    setDeleting(false);
    if (!res.ok || !json.ok) return toast.error(json.message ?? "couldn't delete that.");
    toast.success("Talk deleted. The slot is open again.");
    setOpen(false);
    router.push("/dashboard/schedule");
    router.refresh();
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
        <Trash2 className="size-4" /> Delete & resubmit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Delete this talk?">
          <p className="text-sm text-muted">
            This removes your title, description and deck, and frees the slot. You can submit a new talk to any open slot afterward. This can&rsquo;t be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete talk"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
