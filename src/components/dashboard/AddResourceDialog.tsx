"use client";

import { Link2, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { RESOURCE_CATEGORIES, RESOURCE_CATEGORY_LABELS } from "@/lib/resources";

type Preview = { title: string | null; description: string | null; image: string | null } | null;

/**
 * "Share a link": title, url, category, an optional note — the low-effort
 * path. Pasting a url fetches a title/description/image preview server-side
 * (see /api/resources/metadata) so there's something to look at before
 * submitting, but nothing here is required beyond what was asked for.
 */
export function AddResourceDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [preview, setPreview] = useState<Preview>(null);
  const [form, setForm] = useState({ title: "", url: "", note: "", category: "other" as (typeof RESOURCE_CATEGORIES)[number] });

  async function fetchPreview(url: string) {
    if (!url.trim()) return;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return;

    setFetching(true);
    try {
      const res = await fetch("/api/resources/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; metadata?: Preview };
      if (json.ok && json.metadata) {
        setPreview(json.metadata);
        setForm((f) => (f.title ? f : { ...f, title: json.metadata?.title?.slice(0, 140) ?? f.title }));
      } else {
        setPreview(null);
      }
    } finally {
      setFetching(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/resources/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tags: [] }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    setSaving(false);
    if (!res.ok || !json.ok) return toast.error(json.message ?? "couldn't save that link.");
    toast.success("Shared");
    setForm({ title: "", url: "", note: "", category: "other" });
    setPreview(null);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Add resource
        </Button>
      </DialogTrigger>
      <SheetContent title="Share a link" description="A paper, tool, or video worth the room's time.">
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium">
            URL
            <div className="relative mt-1.5">
              <Input
                required
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                onBlur={(e) => void fetchPreview(e.target.value)}
                placeholder="https://..."
              />
              {fetching ? (
                <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" />
              ) : null}
            </div>
          </label>

          {preview ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
              {preview.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.image} alt="" className="size-14 shrink-0 rounded-md object-cover" />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-card text-muted">
                  <Link2 className="size-5" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{preview.title ?? "Preview fetched"}</p>
                {preview.description ? (
                  <p className="line-clamp-2 text-xs text-muted">{preview.description}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          <label className="block text-sm font-medium">
            Title
            <Input
              className="mt-1.5"
              required
              maxLength={140}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What is it?"
            />
          </label>

          <label className="block text-sm font-medium">
            Category
            <select
              className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category })}
            >
              {RESOURCE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {RESOURCE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium">
            Note <span className="font-normal text-muted">(optional)</span>
            <Textarea
              className="mt-1.5 resize-none"
              rows={3}
              maxLength={400}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Why is this worth reading?"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Sharing…" : "Share link"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Dialog>
  );
}
