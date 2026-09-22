"use client";

import { ExternalLink, Link2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/dashboard/Avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { hostOf } from "@/lib/resources";

export type KnowledgeLink = {
  id: string;
  title: string;
  url: string;
  note: string | null;
  createdAt: string;
  addedBy: { id: string; name: string; avatarUrl: string | null };
  canDelete: boolean;
};

function AddLinkDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", note: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/resources/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    setSaving(false);
    if (!res.ok || !json.ok) return toast.error(json.message ?? "couldn't save that link.");
    toast.success("Link shared");
    setForm({ title: "", url: "", note: "" });
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Share a link
      </Button>
      <DialogContent title="Share a link">
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-medium">
            Title
            <Input className="mt-1.5" required maxLength={140} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What is it?" />
          </label>
          <label className="block text-sm font-medium">
            URL
            <Input className="mt-1.5" required type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
          </label>
          <label className="block text-sm font-medium">
            Note <span className="font-normal text-muted">(optional)</span>
            <Textarea className="mt-1.5 resize-none" rows={3} maxLength={400} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Why is this worth reading?" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Sharing…" : "Share link"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function KnowledgeSharing({ links }: { links: KnowledgeLink[] }) {
  const router = useRouter();

  async function remove(id: string) {
    const res = await fetch(`/api/resources/links/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("couldn't remove that link.");
    toast.success("Link removed");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Articles, papers and tools the cohort has bookmarked for each other.</p>
        <AddLinkDialog />
      </div>

      {links.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          Nothing shared yet. Be the first to bookmark something.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {links.map((link) => (
            <li key={link.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Link2 className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <a href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold hover:underline">
                  {link.title} <ExternalLink className="size-3.5 text-muted" />
                </a>
                <p className="text-xs text-muted">{hostOf(link.url)}</p>
                {link.note ? <p className="mt-1.5 text-sm text-muted">{link.note}</p> : null}
                <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                  <Avatar name={link.addedBy.name} src={link.addedBy.avatarUrl} size="sm" />
                  <span>{link.addedBy.name}</span>
                  <span>·</span>
                  <span>{new Date(link.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>
              </div>
              {link.canDelete ? (
                <button type="button" aria-label="Remove link" onClick={() => remove(link.id)} className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-destructive">
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
