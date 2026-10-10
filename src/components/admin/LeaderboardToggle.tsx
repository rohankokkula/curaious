"use client";

import { Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Curator-only switch for the season leaderboard. Off hides the rankings from
 * members everywhere; the page stays as just the season's badges.
 */
export function LeaderboardToggle({ enabled, className }: { enabled: boolean; className?: string }) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !on;
    setBusy(true);
    setOn(next);
    const res = await fetch("/api/admin/leaderboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    setBusy(false);
    if (!res.ok || !json.ok) {
      setOn(!next);
      return toast.error(json.message ?? "couldn't change that.");
    }
    toast.success(next ? "Leaderboard is on" : "Leaderboard hidden");
    router.refresh();
  }

  return (
    <div className={cn("flex items-center gap-4 rounded-2xl border border-border bg-card p-4", className)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-500">
        <Trophy className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          Leaderboard {on ? "on" : "off"}
          <Link href="/dashboard/leaderboard" className="ml-2 text-xs font-medium text-muted underline-offset-2 hover:underline">
            view
          </Link>
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {on ? "Members see it in the sidebar. Rankings stay sealed until the last talk is done." : "Rankings hidden from members. They still see the badges."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Show the leaderboard to members"
        disabled={busy}
        onClick={toggle}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
          on ? "bg-success" : "bg-border",
        )}
      >
        <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform", on ? "translate-x-6" : "translate-x-1")} />
      </button>
    </div>
  );
}
