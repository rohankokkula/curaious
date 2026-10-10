"use client";

import { Check, CircleDashed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Curator: mark a talk as given. Tap again to undo. */
export function MarkDoneButton({ talkId, done, className }: { talkId: string; done: boolean; className?: string }) {
  const router = useRouter();
  const [on, setOn] = useState(done);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !on;
    setBusy(true);
    setOn(next);
    const res = await fetch(`/api/admin/talks/${talkId}/presented`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: next }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    setBusy(false);
    if (!res.ok || !json.ok) {
      setOn(!next);
      return toast.error(json.message ?? "couldn't change that.");
    }
    toast.success(next ? "Marked as done" : "Marked as not done");
    router.refresh();
  }

  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={busy}
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50",
        on ? "border-sky-400/40 bg-sky-400/15 text-sky-600 dark:text-sky-300" : "border-border bg-background/60 text-muted hover:text-foreground",
        className,
      )}
    >
      {on ? <Check className="size-3.5" /> : <CircleDashed className="size-3.5" />}
      {on ? "Done" : "Mark as done"}
    </button>
  );
}
