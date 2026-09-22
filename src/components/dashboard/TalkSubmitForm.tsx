"use client";

import { ArrowLeft, Check, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { MAX_DECK_BYTES, MAX_DECK_MB, talkSubmissionSchema } from "@/lib/talks";
import { cn } from "@/lib/utils";

type Errors = { title?: string; description?: string; deck?: string };
type Step = "details" | "review" | "submitted";

const STEPS: { id: Step; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "review", label: "Review" },
  { id: "submitted", label: "Submitted" },
];

function StepIndicator({ step }: { step: Step }) {
  const index = STEPS.findIndex((s) => s.id === step);
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-card py-1.5 pr-4 pl-1.5">
      {STEPS.map((s, i) => (
        <Fragment key={s.id}>
          {i > 0 ? <span className={cn("h-px w-5 shrink-0 sm:w-8", i <= index ? "bg-primary" : "bg-border")} /> : null}
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                i <= index ? "bg-primary text-primary-foreground" : "border border-border bg-surface text-muted",
              )}
            >
              {i < index ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cn("hidden text-sm font-medium sm:inline", i === index ? "text-foreground" : "text-muted")}>{s.label}</span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

function validateDeck(file: File | null): string | undefined {
  if (!file) return "attach your deck as a pdf";
  if (file.size > MAX_DECK_BYTES) return `that's over ${MAX_DECK_MB}mb, trim the deck and try again`;
  if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) return "pdf only, please";
  return undefined;
}

export function TalkSubmitForm({
  slotId,
  slotLabel,
  slotDate,
}: {
  slotId: string;
  slotLabel: string;
  slotDate: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("details");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deck, setDeck] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [sending, setSending] = useState(false);

  function setFile(file: File | null) {
    setDeck(file);
    setErrors((prev) => ({ ...prev, deck: file ? validateDeck(file) : undefined }));
  }

  function goToReview(event: React.FormEvent) {
    event.preventDefault();
    const parsed = talkSubmissionSchema.safeParse({ title, description });
    const nextErrors: Errors = {};
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      nextErrors.title = fieldErrors.title?.[0];
      nextErrors.description = fieldErrors.description?.[0];
    }
    nextErrors.deck = validateDeck(deck);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    setStep("review");
  }

  async function submit() {
    if (sending) return;
    setSending(true);
    setMessage(null);

    const body = new FormData();
    body.set("slotId", slotId);
    body.set("title", title.trim());
    body.set("description", description.trim());
    if (deck) body.set("deck", deck);

    try {
      const response = await fetch("/api/talks", { method: "POST", body });
      const result = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) {
        setSending(false);
        setMessage(result.message || "couldn't save that. try again in a moment.");
        return;
      }
      setStep("submitted");
      router.refresh();
    } catch {
      setSending(false);
      setMessage("couldn't save that. try again in a moment.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/dashboard/talks" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to talks
        </Link>
        <div className="flex items-center gap-4">
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary capitalize">
            {slotLabel} · {slotDate}
          </span>
          <StepIndicator step={step} />
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Submit your talk</h1>
        <p className="mt-1 max-w-xl text-muted">
          {step === "submitted"
            ? "Your talk is on its way to review."
            : "Share what you'll be talking about. An admin will review your submission before it appears on the schedule."}
        </p>
      </div>

      {step === "submitted" ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Check className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Submitted for review</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Until it&rsquo;s approved, the slot shows as claimed without your name. You can check your profile anytime.
          </p>
          <Button asChild className="mt-5">
            <Link href="/dashboard/schedule">Back to schedule</Link>
          </Button>
        </div>
      ) : step === "review" ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Talk title</p>
          <p className="mt-1 text-lg font-semibold">{title}</p>
          <p className="mt-5 text-xs font-semibold tracking-wide text-muted uppercase">Description</p>
          <p className="mt-1 whitespace-pre-wrap text-muted">{description}</p>
          <p className="mt-5 text-xs font-semibold tracking-wide text-muted uppercase">Presentation deck</p>
          <div className="mt-1 flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
            <span>{deck?.name}</span>
            <span className="text-muted">{deck ? `${(deck.size / (1024 * 1024)).toFixed(1)}MB` : ""}</span>
          </div>

          {message ? <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{message}</p> : null}

          <div className="mt-6 flex gap-3 border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={() => setStep("details")}>Back to edit</Button>
            <Button type="button" onClick={submit} disabled={sending}>
              {sending ? "Submitting…" : "Submit for review"}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={goToReview} className="rounded-xl border border-border bg-card p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="text-sm font-semibold">
                  Talk title <span className="text-destructive">*</span>
                </label>
                <p className="mt-0.5 text-xs text-muted">Keep it clear and engaging. Max 140 characters.</p>
                <Input
                  id="title"
                  className={cn("mt-2", errors.title && "border-destructive")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g. Building AI Agents with Real-World Data"
                  maxLength={140}
                />
                <div className="mt-1 flex justify-between text-xs">
                  <span className="text-destructive">{errors.title ?? ""}</span>
                  <span className="text-muted">{title.length}/140</span>
                </div>
              </div>

              <div>
                <label htmlFor="description" className="text-sm font-semibold">
                  Description <span className="text-destructive">*</span>
                </label>
                <p className="mt-0.5 text-xs text-muted">What will you cover? What should people take away?</p>
                <Textarea
                  id="description"
                  className={cn("mt-2 resize-none", errors.description && "border-destructive")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write a short description of your talk..."
                  maxLength={2000}
                  rows={6}
                />
                <div className="mt-1 flex justify-between text-xs">
                  <span className="text-destructive">{errors.description ?? ""}</span>
                  <span className="text-muted">{description.length}/2000</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">
                Presentation deck <span className="text-destructive">*</span>
              </label>
              <p className="mt-0.5 text-xs text-muted">PDF only, up to {MAX_DECK_MB}MB.</p>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  setFile(e.dataTransfer.files?.[0] ?? null);
                }}
                className={cn(
                  "mt-2 flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition",
                  dragOver ? "border-primary bg-primary-soft" : errors.deck ? "border-destructive/50" : "border-border hover:bg-surface",
                )}
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-surface text-muted">
                  <Upload className="size-4" />
                </span>
                <p className="text-sm">
                  <span className="font-semibold text-foreground">Click to upload</span> <span className="text-muted">or drag and drop</span>
                </p>
                <p className="text-xs text-muted">PDF (max {MAX_DECK_MB}MB)</p>
                {deck ? <p className="mt-1 max-w-full truncate text-xs font-medium text-foreground">{deck.name}</p> : null}
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </button>
              {errors.deck ? <p className="mt-1.5 text-xs text-destructive">{errors.deck}</p> : null}
            </div>
          </div>

          <div className="mt-6 flex justify-between border-t border-border pt-5">
            <Button asChild variant="outline">
              <Link href="/dashboard/schedule">Cancel</Link>
            </Button>
            <Button type="submit">Submit for review →</Button>
          </div>
        </form>
      )}
    </div>
  );
}
