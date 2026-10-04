"use client";

import { CheckCircle2, Clock, FileUp, Loader2, MessageSquareWarning } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { MAX_DECK_BYTES, MAX_DECK_MB, type DeckStatus } from "@/lib/talks";
import { cn } from "@/lib/utils";

const STATE: Record<DeckStatus, { icon: typeof Clock; title: string; line: string; tone: string }> = {
  none: {
    icon: FileUp,
    title: "Add your deck",
    line: "Your slot is booked. Upload the PDF whenever it's ready; the curator gives it a quick look first.",
    tone: "border-dashed border-border",
  },
  submitted: {
    icon: Clock,
    title: "Deck with the curator",
    line: "Uploaded and waiting for review. You can still replace it.",
    tone: "border-amber-500/30 bg-amber-500/5",
  },
  changes_requested: {
    icon: MessageSquareWarning,
    title: "Changes requested",
    line: "The curator left notes on your deck. Upload a new version when it's ready.",
    tone: "border-amber-500/40 bg-amber-500/10",
  },
  approved: {
    icon: CheckCircle2,
    title: "Deck approved",
    line: "The cohort can open it now. Uploading a new version sends it back for review.",
    tone: "border-success/30 bg-success-soft",
  },
};

/**
 * The presenter's deck, after the slot is booked: upload, replace, and see
 * where the review stands (with the curator's notes when it's sent back).
 */
export function DeckUploadPanel({
  talkId,
  deckStatus,
  feedback,
  booked,
}: {
  talkId: string;
  deckStatus: DeckStatus;
  feedback: string | null;
  /** The slot request is approved; before that there's nothing to upload into yet. */
  booked: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const state = STATE[deckStatus];
  const Icon = state.icon;

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) return toast.error("PDF only, please.");
    if (file.size > MAX_DECK_BYTES) return toast.error(`That's over ${MAX_DECK_MB}MB. Trim the deck and try again.`);

    setBusy(true);
    const body = new FormData();
    body.set("deck", file);
    const res = await fetch(`/api/talks/${talkId}/deck`, { method: "PUT", body });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!res.ok || !json.ok) return toast.error(json.message ?? "Couldn't upload that.");
    toast.success("Deck uploaded. It's with the curator now.");
    router.refresh();
  }

  if (!booked) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <Clock className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300" />
        <div>
          <p className="text-sm font-semibold">Slot requested</p>
          <p className="mt-0.5 text-sm text-muted">The curator is confirming your booking. You can add your deck once it&rsquo;s booked.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border p-4", state.tone)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Icon className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{state.title}</p>
            <p className="mt-0.5 text-sm text-muted">{state.line}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background transition hover:bg-foreground/85 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <FileUp className="size-3.5" />}
          {busy ? "Uploading…" : deckStatus === "none" ? "Upload PDF" : "Replace PDF"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => void upload(e.target.files?.[0])}
        />
      </div>
      {deckStatus === "changes_requested" && feedback ? (
        <p className="mt-3 rounded-lg bg-background/60 p-3 text-sm leading-relaxed">{feedback}</p>
      ) : null}
    </div>
  );
}
