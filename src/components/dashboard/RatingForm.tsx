"use client";

import { BookOpen, Lightbulb, MonitorPlay, Sparkles, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ScoreInput } from "@/components/dashboard/ScoreInput";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { FEEDBACK_MAX, FEEDBACK_MIN, RATING_MAX, RATING_PARAMETERS, type RatingParameterKey } from "@/lib/ratings";

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
  const feedbackLength = comment.trim().length;
  const feedbackOk = feedbackLength >= FEEDBACK_MIN;
  const complete = RATING_PARAMETERS.every((p) => scores[p.key] > 0) && feedbackOk;

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
      <p className="mt-1 text-sm text-muted">Score this talk from 1 to {RATING_MAX} on {RATING_PARAMETERS.length} parameters</p>

      <div className="mt-5 space-y-4">
        {RATING_PARAMETERS.map((parameter) => {
          const Icon = ICONS[parameter.icon];
          return (
            <div key={parameter.key} className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{parameter.label}</p>
                  <span className="text-xs font-semibold text-muted tabular-nums">
                    {scores[parameter.key] > 0 ? `${scores[parameter.key]}/${RATING_MAX}` : ""}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted">{parameter.hint}</p>
                <div className="mt-2">
                  <ScoreInput
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
          Feedback for the speaker <span className="text-destructive">*</span>
        </label>
        <p className="mt-0.5 text-xs text-muted">What landed for you, and one thing they could do better next time.</p>
        <Textarea
          id="comment"
          required
          minLength={FEEDBACK_MIN}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="The demo made the tradeoff click. Next time, I'd spend less time on setup and more on the results."
          maxLength={FEEDBACK_MAX}
          rows={4}
          className="mt-2 resize-none"
        />
        <p className="mt-1 flex justify-between gap-3 text-xs text-muted">
          <span>{feedbackOk ? "" : `At least ${FEEDBACK_MIN} characters (${FEEDBACK_MIN - feedbackLength} to go)`}</span>
          <span className="tabular-nums">
            {comment.length}/{FEEDBACK_MAX}
          </span>
        </p>
      </div>

      <Button type="submit" disabled={sending || !complete} className="mt-4 w-full">
        {sending ? "Submitting…" : editing ? "Update feedback" : "Submit feedback"}
      </Button>
      <p className="mt-2 text-center text-xs text-muted">Your feedback is anonymous.</p>
    </form>
  );
}
