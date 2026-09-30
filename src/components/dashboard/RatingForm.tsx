"use client";

import { BookOpen, Lightbulb, MonitorPlay, Sparkles, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { StarRating } from "@/components/dashboard/StarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { RATING_PARAMETERS, type RatingParameterKey } from "@/lib/ratings";

type Scores = Record<RatingParameterKey, number>;

const DEFAULT_SCORES: Scores = {
  understanding: 0,
  content: 0,
  research_depth: 0,
  delivery: 0,
  usefulness: 0,
};

const ICONS: Record<(typeof RATING_PARAMETERS)[number]["icon"], typeof BookOpen> = {
  content: BookOpen,
  depth: Lightbulb,
  delivery: MonitorPlay,
  takeaways: Sparkles,
  overall: Users,
};

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
  const complete = RATING_PARAMETERS.every((p) => scores[p.key] > 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || !complete) return;
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
      router.refresh();
    } catch {
      toast.error("Couldn't save that. Try again in a moment.");
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-bold">Your feedback</h2>
      <p className="mt-1 text-sm text-muted">Rate this talk across {RATING_PARAMETERS.length} parameters</p>

      <div className="mt-5 space-y-4">
        {RATING_PARAMETERS.map((parameter) => {
          const Icon = ICONS[parameter.icon];
          return (
            <div key={parameter.key} className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{parameter.label}</p>
                <p className="mt-0.5 text-xs text-muted">{parameter.hint}</p>
                <div className="mt-1.5">
                  <StarRating
                    label={parameter.label}
                    value={scores[parameter.key]}
                    onChange={(v) => setScores((prev) => ({ ...prev, [parameter.key]: v }))}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <label htmlFor="comment" className="text-sm font-semibold">
          Additional comments (optional)
        </label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Share your thoughts, suggestions or feedback..."
          maxLength={1500}
          rows={3}
          className="mt-2 resize-none"
        />
        <p className="mt-1 text-right text-xs text-muted">{comment.length}/1500</p>
      </div>

      <Button type="submit" disabled={sending || !complete} className="mt-4 w-full">
        {sending ? "Submitting…" : editing ? "Update feedback" : "Submit feedback"}
      </Button>
      <p className="mt-2 text-center text-xs text-muted">Your feedback is anonymous.</p>
    </form>
  );
}
