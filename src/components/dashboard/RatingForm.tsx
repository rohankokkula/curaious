"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  RATING_MAX,
  RATING_MIN,
  RATING_PARAMETERS,
  type RatingParameterKey,
} from "@/lib/ratings";

type Scores = Record<RatingParameterKey, number>;

const DEFAULT_SCORES: Scores = {
  understanding: 7,
  content: 7,
  research_depth: 7,
  delivery: 7,
  usefulness: 7,
};

const VALUES = Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, i) => RATING_MIN + i);

export function RatingForm({
  talkId,
  initial,
}: {
  talkId: string;
  initial?: (Scores & { comment: string | null }) | null;
}) {
  const router = useRouter();
  const editing = Boolean(initial);
  const [scores, setScores] = useState<Scores>(
    initial
      ? {
          understanding: initial.understanding,
          content: initial.content,
          research_depth: initial.research_depth,
          delivery: initial.delivery,
          usefulness: initial.usefulness,
        }
      : DEFAULT_SCORES,
  );
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setSending(true);

    try {
      const response = await fetch("/api/ratings", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talkId, ...scores, comment: comment.trim() }),
      });
      const body = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !body.ok) {
        toast.error(body.message || "Couldn't save that. Try again in a moment.");
        setSending(false);
        return;
      }

      toast.success(editing ? "Feedback updated" : "Feedback submitted");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Couldn't save that. Try again in a moment.");
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-bold">Rate the talk</h2>
      <p className="mt-1 text-sm text-muted">Give a score for each category based on your experience.</p>

      <div className="mt-6 space-y-6">
        {RATING_PARAMETERS.map((parameter) => (
          <fieldset key={parameter.key}>
            <legend className="text-sm font-semibold">{parameter.label}</legend>
            <p className="mt-0.5 text-xs text-muted">{parameter.hint}</p>
            <div className="mt-2.5 grid grid-cols-10 gap-1 rounded-lg bg-surface p-1" role="radiogroup" aria-label={parameter.label}>
              {VALUES.map((value) => {
                const selected = scores[parameter.key] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setScores((prev) => ({ ...prev, [parameter.key]: value }))}
                    className={cn(
                      "h-9 rounded-md border text-sm transition",
                      selected
                        ? "border-primary bg-primary-soft font-semibold text-primary"
                        : "border-transparent text-muted hover:bg-card hover:text-foreground",
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-8">
        <label htmlFor="comment" className="text-sm font-semibold">
          Additional feedback (optional)
        </label>
        <p className="mt-0.5 text-xs text-muted">Share your thoughts. Be constructive and honest.</p>
        <Textarea
          id="comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Any additional thoughts..."
          maxLength={1500}
          rows={4}
          className="mt-2 resize-none"
        />
        <p className="mt-1 text-right text-xs text-muted">{comment.length}/1500</p>
      </div>

      <div className="mt-4 flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
          Cancel
        </Button>
        <Button type="submit" disabled={sending}>
          {sending ? "Submitting…" : editing ? "Update feedback" : "Submit feedback"}
        </Button>
      </div>
    </form>
  );
}
