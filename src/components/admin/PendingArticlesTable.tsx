"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/dashboard/MarkdownRenderer";
import { Textarea } from "@/components/ui/input";

export type PendingArticle = {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  authorName: string;
  authorId: string;
  readMinutes: number | null;
  submittedAt: string;
};

/** Same shape as PendingTalksTable, deliberately — review should look and
 * behave identically whether it's a talk or a member-written article. */
export function PendingArticlesTable({ articles }: { articles: PendingArticle[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function review(id: string, action: "approve" | "reject", rejectionReason?: string) {
    setBusyId(id);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/resources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason }),
      });
      const body = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !body.ok) {
        setMessage(body.message || "couldn't save that.");
        return;
      }
      setRejectingId(null);
      setReason("");
      router.refresh();
    } catch {
      setMessage("couldn't save that.");
    } finally {
      setBusyId(null);
    }
  }

  if (articles.length === 0) {
    return (
      <Card className="p-8">
        <p className="text-sm text-muted">Nothing waiting on review.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{message}</p>
      ) : null}

      {articles.map((article) => (
        <Card key={article.id} className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge>{article.readMinutes ? `${article.readMinutes} min read` : "Article"}</Badge>
            <span className="text-xs text-muted">
              Submitted {new Date(article.submittedAt).toLocaleDateString("en-GB")}
            </span>
          </div>

          <h3 className="mt-4 text-xl font-bold tracking-tight">{article.title}</h3>

          <p className="mt-1 text-sm">
            <Link
              href={`/dashboard/members/${article.authorId}`}
              className="text-muted underline-offset-4 transition hover:text-foreground hover:underline"
            >
              {article.authorName}
            </Link>
          </p>

          <p className="mt-3 max-w-2xl leading-relaxed text-muted">{article.excerpt}</p>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
            >
              {expandedId === article.id ? "Hide full piece" : "Read full piece"}
            </Button>

            <Button type="button" size="sm" disabled={busyId === article.id} onClick={() => review(article.id, "approve")}>
              Approve
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busyId === article.id}
              onClick={() => setRejectingId(rejectingId === article.id ? null : article.id)}
            >
              {rejectingId === article.id ? "Never mind" : "Send back"}
            </Button>
          </div>

          {expandedId === article.id ? (
            <div className="mt-4 max-h-[32rem] overflow-y-auto rounded-lg border border-border bg-surface p-5">
              <MarkdownRenderer markdown={article.body} />
            </div>
          ) : null}

          {rejectingId === article.id ? (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <label htmlFor={`reason-${article.id}`} className="text-xs font-semibold uppercase tracking-wide text-muted">
                Why (optional, shown to them)
              </label>
              <Textarea
                id={`reason-${article.id}`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={busyId === article.id}
                  onClick={() => review(article.id, "reject", reason.trim() || undefined)}
                >
                  Confirm send back
                </Button>
                <p className="text-xs text-muted">They can edit and resubmit it.</p>
              </div>
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
