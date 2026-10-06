"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { talkSubmissionSchema } from "@/lib/talks";

/** Curator-only: edit a talk's title and description in the side panel. */
export function EditTalkDialog({
  talkId,
  title,
  description,
  size = "sm",
  className,
}: {
  talkId: string;
  title: string;
  description: string;
  size?: "sm" | "default";
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title, description });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const check = talkSubmissionSchema.safeParse(form);
    if (!check.success) return toast.error(check.error.issues[0]?.message ?? "Check the fields.");
    setBusy(true);
    const res = await fetch(`/api/admin/talks/${talkId}/details`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(check.data),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    setBusy(false);
    if (!res.ok || !json.ok) return toast.error(json.message ?? "Couldn't save that.");
    toast.success("Talk updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setForm({ title, description });
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size={size} className={className}>
          <Pencil className="size-3.5" /> Edit talk
        </Button>
      </DialogTrigger>
      <SheetContent
        title="Edit talk"
        description="Title and description, as the cohort sees them."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form={`edit-talk-${talkId}`} disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      >
        <form id={`edit-talk-${talkId}`} onSubmit={save} className="space-y-4">
          <label className="block text-sm font-medium">
            Title
            <Input className="mt-1.5" value={form.title} maxLength={140} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <span className="mt-1 block text-right text-xs font-normal text-muted">{form.title.length}/140</span>
          </label>
          <label className="block text-sm font-medium">
            Description
            <Textarea
              className="mt-1.5"
              rows={8}
              maxLength={2000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <span className="mt-1 block text-right text-xs font-normal text-muted">{form.description.length}/2000</span>
          </label>
        </form>
      </SheetContent>
    </Dialog>
  );
}
