"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * The curator's scoring window for one talk, as a compact switch (same API
 * as RatingWindowToggle on the talk page), so a session can be run from Home.
 */
export function ScoringSwitch({ talkId, open, disabled }: { talkId: string; open: boolean; disabled?: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(open);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !on;
    setBusy(true);
    setOn(next);
    const res = await fetch(`/api/admin/talks/${talkId}/ratings-window`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ open: next }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    setBusy(false);
    if (!res.ok || !json.ok) {
      setOn(!next);
      return toast.error(json.message ?? "couldn't change that.");
    }
    toast.success(next ? "Scoring open" : "Scoring closed");
    router.refresh();
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={busy || disabled}
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50",
        on ? "border-success/40 bg-success-soft text-success" : "border-border bg-background/60 text-muted hover:text-foreground",
      )}
    >
      <span className={cn("relative inline-flex h-4 w-7 items-center rounded-full transition-colors", on ? "bg-success" : "bg-border")}>
        <span className={cn("inline-block size-3 rounded-full bg-white shadow transition-transform", on ? "translate-x-3.5" : "translate-x-0.5")} />
      </span>
      {on ? "Scoring open" : "Scoring closed"}
    </button>
  );
}
