"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MarkdownRenderer } from "@/components/dashboard/MarkdownRenderer";
import { MarkdownToolbar } from "@/components/dashboard/MarkdownToolbar";
import { usePasteGuard } from "@/components/dashboard/PasteGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { estimateReadMinutes } from "@/lib/resources";

export type ExistingArticle = {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  tags: string[];
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
};

/**
 * Markdown textarea + live preview, not a rich-text editor — "realtime"
 * comes from the preview pane updating as you type, not from formatted
 * inline editing. Title, excerpt and body all block paste (see PasteGuard);
 * this is the surface the "no copy-paste" rule exists for.
 */
export function ArticleEditor({ existing }: { existing?: ExistingArticle }) {
  const router = useRouter();
  const guard = usePasteGuard();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [excerpt, setExcerpt] = useState(existing?.excerpt ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [tagsText, setTagsText] = useState(existing?.tags.join(", ") ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState(false);

  const readMinutes = useMemo(() => estimateReadMinutes(body), [body]);
  const isEditing = Boolean(existing);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    const payload = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      body: body.trim(),
      tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
    };

    const url = isEditing ? `/api/resources/articles/${existing!.id}` : "/api/resources/articles";
    const res = await fetch(url, {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    setSaving(false);

    if (!res.ok || !json.ok) return toast.error(json.message ?? "couldn't save that.");
    toast.success(isEditing ? "Resubmitted for review" : "Submitted for review");
    router.push("/dashboard/bookmarks");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {existing?.status === "rejected" && existing.rejectionReason ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Sent back
          </p>
          <p className="mt-1.5 text-sm text-amber-900 dark:text-amber-100">{existing.rejectionReason}</p>
          <p className="mt-1.5 text-xs text-muted">Saving resubmits it for another look.</p>
        </div>
      ) : existing?.status === "pending" ? (
        <div className="rounded-lg bg-surface p-3">
          <Badge variant="warning">In review</Badge>
          <p className="mt-2 text-xs text-muted">Saving resubmits it as a fresh review.</p>
        </div>
      ) : null}

      <label className="block text-sm font-medium">
        Title
        <Input
          className="mt-1.5"
          required
          maxLength={140}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onPaste={guard.onPaste}
          onDrop={guard.onDrop}
          placeholder="What's this about?"
        />
      </label>

      <label className="block text-sm font-medium">
        Excerpt <span className="font-normal text-muted">(shows in the list and as the page description)</span>
        <Textarea
          className="mt-1.5 resize-none"
          rows={2}
          required
          maxLength={400}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          onPaste={guard.onPaste}
          onDrop={guard.onDrop}
          placeholder="One or two sentences on what someone gets out of this."
        />
      </label>

      <label className="block text-sm font-medium">
        Tags <span className="font-normal text-muted">(comma separated, up to 6)</span>
        <Input
          className="mt-1.5"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="agents, evals, prompting"
        />
      </label>

      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setTab("write")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${tab === "write" ? "bg-card shadow-sm" : "text-muted"}`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setTab("preview")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${tab === "preview" ? "bg-card shadow-sm" : "text-muted"}`}
            >
              Preview
            </button>
          </div>
          <span className="text-xs text-muted">~{readMinutes} min read</span>
        </div>

        {tab === "write" ? (
          <div className="mt-2">
            <MarkdownToolbar textareaRef={bodyRef} onChange={setBody} />
            <Textarea
              ref={bodyRef}
              className="min-h-[28rem] resize-y rounded-t-none font-mono text-sm leading-relaxed"
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onPaste={guard.onPaste}
              onDrop={guard.onDrop}
              placeholder={"Write it here, in your own words. Markdown works: headings, lists, `code`, > quotes, links, tables."}
            />
          </div>
        ) : (
          <div className="mt-2 min-h-[28rem] rounded-lg border border-border bg-card p-5">
            {body.trim() ? (
              <MarkdownRenderer markdown={body} />
            ) : (
              <p className="text-sm text-muted">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
        <p className="text-xs text-muted">
          An admin reviews this before it&rsquo;s public. Pasting text into these fields is off, on purpose.
        </p>
        <Button type="submit" disabled={saving}>
          {saving ? "Submitting…" : isEditing ? "Resubmit for review" : "Submit for review"}
        </Button>
      </div>
    </form>
  );
}
