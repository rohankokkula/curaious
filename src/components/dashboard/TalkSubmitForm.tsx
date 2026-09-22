"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_DECK_BYTES, MAX_DECK_MB, talkSubmissionSchema } from "@/lib/talks";
import { cn } from "@/lib/utils";

type Errors = {
  title?: string;
  description?: string;
  deck?: string;
};

export function TalkSubmitForm({ slotId }: { slotId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deck, setDeck] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setDeck(file);

    if (!file) {
      setErrors((prev) => ({ ...prev, deck: undefined }));
      return;
    }

    if (file.size > MAX_DECK_BYTES) {
      setErrors((prev) => ({
        ...prev,
        deck: `that's over ${MAX_DECK_MB}mb — trim the deck and try again`,
      }));
      return;
    }

    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      setErrors((prev) => ({ ...prev, deck: "pdf only, please" }));
      return;
    }

    setErrors((prev) => ({ ...prev, deck: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;

    setMessage(null);

    const parsed = talkSubmissionSchema.safeParse({ title, description });
    const nextErrors: Errors = {};

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      nextErrors.title = fieldErrors.title?.[0];
      nextErrors.description = fieldErrors.description?.[0];
    }

    if (!deck) {
      nextErrors.deck = "attach your deck as a pdf";
    } else if (deck.size > MAX_DECK_BYTES) {
      nextErrors.deck = `that's over ${MAX_DECK_MB}mb — trim the deck and try again`;
    }

    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setState("sending");

    const body = new FormData();
    body.set("slotId", slotId);
    body.set("title", title.trim());
    body.set("description", description.trim());
    if (deck) body.set("deck", deck);

    try {
      const response = await fetch("/api/talks", { method: "POST", body });
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok || !result.ok) {
        setState("idle");
        setMessage(
          result.message || "couldn't save that. try again in a moment.",
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
      <div className="bg-card border border-border rounded-lg p-8 space-y-5">
        <h2 className="text-lg font-semibold text-foreground">Submitted</h2>
        <p className="text-sm text-muted">
          Your talk is waiting on review. Until it&rsquo;s approved, the slot
          shows as claimed without your name. You can check your profile
          anytime.
        </p>
        <div className="pt-4">
          <Link
            href="/dashboard"
            className="inline-block px-4 py-2 bg-foreground text-primary-foreground text-sm font-medium rounded hover:bg-foreground/90 transition"
          >
            Back to calendar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-8 space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <label htmlFor="title" className="block text-sm font-medium text-foreground">
          Talk title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What are you presenting?"
          maxLength={140}
          className={cn(
            "w-full px-4 py-2.5 border rounded text-sm bg-card outline-none transition",
            errors.title
              ? "border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-300"
              : "border-border focus:border-primary focus:ring-1 focus:ring-primary/30"
          )}
        />
        {errors.title ? (
          <p className="text-xs text-red-600">{errors.title}</p>
        ) : (
          <p className="text-xs text-muted">{title.length}/140</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium text-foreground">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What will you cover? What should people take away?"
          maxLength={2000}
          rows={5}
          className={cn(
            "w-full px-4 py-2.5 border rounded text-sm bg-card outline-none transition resize-none",
            errors.description
              ? "border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-300"
              : "border-border focus:border-primary focus:ring-1 focus:ring-primary/30"
          )}
        />
        {errors.description ? (
          <p className="text-xs text-red-600">{errors.description}</p>
        ) : (
          <p className="text-xs text-muted">{description.length}/2000</p>
        )}
      </div>

      {/* Deck upload */}
      <div className="space-y-2">
        <label htmlFor="deck" className="block text-sm font-medium text-foreground">
          Presentation deck
        </label>
        <p className="text-xs text-muted">PDF only, up to {MAX_DECK_MB}MB</p>
        <input
          id="deck"
          name="deck"
          type="file"
          accept="application/pdf"
          onChange={handleFile}
          className={cn(
            "block w-full text-sm py-2 file:mr-3 file:px-3 file:py-2 file:text-xs file:font-medium file:rounded file:border file:border-border file:bg-card file:cursor-pointer hover:file:bg-surface transition",
            errors.deck ? "file:border-red-300" : "file:border-border"
          )}
        />
        {deck && !errors.deck ? (
          <div className="flex items-center justify-between py-2 px-3 bg-surface rounded text-xs text-muted">
            <span>{deck.name}</span>
            <span>{(deck.size / (1024 * 1024)).toFixed(1)}MB</span>
          </div>
        ) : null}
        {errors.deck ? (
          <p className="text-xs text-red-600">{errors.deck}</p>
        ) : null}
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
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {state === "sending" ? "Submitting…" : "Submit for review"}
        </button>
      </div>
    </form>
  );
}
