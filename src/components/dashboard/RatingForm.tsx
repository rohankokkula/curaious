"use client";

import { BookOpen, Brain, Lightbulb, MonitorPlay, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ScoreSlider } from "@/components/dashboard/ScoreSlider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { scoreColor } from "@/lib/scoreColors";
import { FEEDBACK_MAX, FEEDBACK_MIN, overallOf, RATING_MAX, RATING_PARAMETERS, type RatingParameterKey } from "@/lib/ratings";

type Scores = Record<RatingParameterKey, number>;

const UNSET: Scores = {
  understanding: 0,
  content: 0,
  research_depth: 0,
  delivery: 0,
  usefulness: 0,
};

const ICONS: Record<(typeof RATING_PARAMETERS)[number]["icon"], typeof BookOpen> = {
  understanding: Brain,
  content: BookOpen,
  depth: Lightbulb,
  delivery: MonitorPlay,
  takeaways: Sparkles,
};

/**
 * Scoring a talk: five anchored sliders, each point with its own line, and
 * an overall that's worked out (the average), never asked for. Every slider
 * starts unset so no number is suggested.
 */
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
      : UNSET,
  );
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [sending, setSending] = useState(false);

  const scored = RATING_PARAMETERS.filter((p) => scores[p.key] > 0).length;
  const overall = overallOf(scores);
  const feedbackLength = comment.trim().length;
  const feedbackOk = feedbackLength >= FEEDBACK_MIN;
  const complete = scored === RATING_PARAMETERS.length && feedbackOk;

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
    <form onSubmit={handleSubmit} className="rounded-3xl border border-border bg-card p-5">
      {/* header: progress, and the overall as it builds */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-bold">{editing ? "Your scores" : "Score this talk"}</h2>
          <p className="mt-1 text-xs text-muted">
            {scored === RATING_PARAMETERS.length ? "All five scored." : `${scored} of ${RATING_PARAMETERS.length} scored. Slide each one.`}
          </p>
          <div className="mt-2 flex gap-1" aria-hidden>
            {RATING_PARAMETERS.map((p) => (
              <span
                key={p.key}
                className="h-1.5 w-6 rounded-full bg-surface transition-colors"
                style={scores[p.key] > 0 ? { background: scoreColor(scores[p.key]) } : undefined}
              />
            ))}
          </div>
        </div>
        <div className="shrink-0 rounded-2xl border border-border bg-background/40 px-3 py-2 text-center" aria-live="polite">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">Your overall</p>
          <p className="text-2xl leading-tight font-bold tabular-nums" style={overall ? { color: scoreColor(overall) } : undefined}>
            {overall ?? "–"}
            <span className="text-xs font-medium text-muted"> /{RATING_MAX}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {RATING_PARAMETERS.map((parameter) => {
          const Icon = ICONS[parameter.icon];
          const value = scores[parameter.key];
          return (
            <div key={parameter.key}>
              <div className="flex items-start gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface text-muted">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold">{parameter.label}</p>
                    <span className="text-sm font-bold tabular-nums" style={value ? { color: scoreColor(value) } : undefined}>
                      {value ? value : ""}
                    </span>
                  </div>
                  <p className="text-xs text-muted">{parameter.hint}</p>
                </div>
              </div>
              <div className="mt-1 px-1">
                <ScoreSlider
                  label={`${parameter.label}: ${parameter.hint}`}
                  anchors={parameter.anchors}
                  value={value}
                  onChange={(v) => setScores((prev) => ({ ...prev, [parameter.key]: v }))}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <label htmlFor="comment" className="text-sm font-semibold">
          A note for the speaker <span className="text-destructive">*</span>
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
        {sending ? "Submitting…" : `${editing ? "Update" : "Submit"}${overall && scored === RATING_PARAMETERS.length ? ` · overall ${overall}` : ""}`}
      </Button>
      <p className="mt-2 text-center text-xs text-muted">
        Your scores only ever show up averaged with everyone else&rsquo;s. Your note shows with your name.
      </p>
    </form>
  );
}
