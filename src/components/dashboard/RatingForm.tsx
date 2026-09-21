"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

export function RatingForm({ talkId }: { talkId: string }) {
  const router = useRouter();
  const [scores, setScores] = useState<Scores>(DEFAULT_SCORES);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;

    setState("sending");
    setMessage(null);

    try {
      const response = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talkId, ...scores, comment: comment.trim() }),
      });

      const body = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok || !body.ok) {
        setState("idle");
        setMessage(
          body.message || "couldn't save that. try again in a moment.",
        );
        return;
      }

      setState("done");
      router.refresh();
    } catch {
      setState("idle");
      setMessage("couldn't save that. try again in a moment.");
    }
  }

  if (state === "done") {
    return (
      <div className="bg-white border border-border rounded-lg p-8 space-y-5">
        <h2 className="text-lg font-semibold text-foreground">Feedback submitted</h2>
        <p className="text-sm text-muted">
          Your scores contribute to the presenter&rsquo;s average. Your note is
          shared without your name.
        </p>
        <div className="pt-4">
          <Link
            href="/dashboard"
            className="inline-block px-4 py-2 bg-foreground text-white text-sm font-medium rounded hover:bg-foreground/90 transition"
          >
            Back to calendar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-border rounded-lg p-8 space-y-6">
      {/* Rating parameters */}
      <div className="space-y-6">
        {RATING_PARAMETERS.map((parameter) => (
          <div key={parameter.key} className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor={parameter.key} className="block text-sm font-medium text-foreground">
                {parameter.label}
              </label>
              <span className="text-lg font-semibold text-emerald-600">
                {scores[parameter.key]}
              </span>
            </div>
            <p className="text-xs text-muted">{parameter.hint}</p>
            <input
              id={parameter.key}
              name={parameter.key}
              type="range"
              min={RATING_MIN}
              max={RATING_MAX}
              step={1}
              value={scores[parameter.key]}
              onChange={(event) =>
                setScores((prev) => ({
                  ...prev,
                  [parameter.key]: Number(event.target.value),
                }))
              }
              className="w-full h-2 rounded appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-xs text-muted">
              <span>{RATING_MIN}</span>
              <span>{RATING_MAX}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Comment */}
      <div className="space-y-2 pt-2 border-t border-border">
        <label htmlFor="comment" className="block text-sm font-medium text-foreground">
          Additional feedback (optional)
        </label>
        <p className="text-xs text-muted">
          Shared anonymously. Be constructive and honest.
        </p>
        <textarea
          id="comment"
          name="comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Any additional thoughts..."
          maxLength={1500}
          rows={4}
          className="w-full px-4 py-2.5 border border-border rounded text-sm bg-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 resize-none"
        />
        <p className="text-xs text-muted">{comment.length}/1500</p>
      </div>

      {/* Error message */}
      {message ? (
        <div className={cn(
          "p-3 rounded text-sm",
          message.includes("couldn't")
            ? "bg-red-50 text-red-700 border border-red-200"
            : "bg-green-50 text-green-700 border border-green-200"
        )}>
          {message}
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-border">
        <Link
          href="/dashboard"
          className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface rounded transition"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={state === "sending"}
          className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {state === "sending" ? "Submitting…" : "Submit feedback"}
        </button>
      </div>
    </form>
  );
}
