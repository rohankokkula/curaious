"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { talkSubmissionSchema } from "@/lib/talks";

export type BookableMember = { id: string; name: string };

/**
 * Curator-only: book an open seat for a member (e.g. after they asked in
 * person). The trigger is whatever the open tile renders; the booking is
 * confirmed straight away, and the member adds their deck later.
 */
export function BookSeatDialog({
  slotId,
  slotLabel,
  members,
  children,
}: {
  slotId: string;
  slotLabel: string;
  members: BookableMember[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ presenterId: "", title: "", description: "" });

  async function book(e: React.FormEvent) {
    e.preventDefault();
    const check = talkSubmissionSchema.safeParse(form);
    if (!form.presenterId) return toast.error("Pick a member.");
    if (!check.success) return toast.error(check.error.issues[0]?.message ?? "Check the fields.");

    setBusy(true);
    const res = await fetch("/api/admin/talks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, ...form }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    setBusy(false);
    if (!res.ok || !json.ok) return toast.error(json.message ?? "Couldn't book that.");

    const who = members.find((m) => m.id === form.presenterId)?.name ?? "them";
    toast.success(`Booked ${slotLabel} for ${who}`);
    setForm({ presenterId: "", title: "", description: "" });
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent title={`Book ${slotLabel}`}>
        {members.length === 0 ? (
          <p className="text-sm text-muted">Every active member already has a talk this season.</p>
        ) : (
          <form onSubmit={book} className="space-y-3">
            <label className="block text-sm font-medium">
              Member
              <select
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                value={form.presenterId}
                onChange={(e) => setForm({ ...form, presenterId: e.target.value })}
              >
                <option value="">Pick a member…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Talk title
              <Input className="mt-1.5" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="block text-sm font-medium">
              Description
              <Textarea
                className="mt-1.5"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="A couple of sentences on what they'll cover (40+ characters)."
              />
            </label>
            <p className="text-xs text-muted">Booked straight away. They add their deck later, and it comes to you for review.</p>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Booking…" : "Book seat"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
