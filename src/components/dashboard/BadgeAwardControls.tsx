"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { BadgeKey } from "@/lib/badges";

type Candidate = { id: string; name: string };

async function call(method: "POST" | "DELETE", body: { seasonId: string; profileId: string; badgeKey: BadgeKey }) {
  const res = await fetch("/api/admin/badges", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
  return res.ok && json.ok ? null : (json.message ?? "something went wrong.");
}

/** Curator-only: pick a member and award this badge. */
export function AwardBadge({
  badgeKey,
  badgeName,
  seasonId,
  candidates,
}: {
  badgeKey: BadgeKey;
  badgeName: string;
  seasonId: string;
  candidates: Candidate[];
}) {
  const router = useRouter();
  const [profileId, setProfileId] = useState("");
  const [busy, setBusy] = useState(false);

  async function award() {
    if (!profileId) return;
    setBusy(true);
    const error = await call("POST", { seasonId, profileId, badgeKey });
    setBusy(false);
    if (error) return toast.error(error);
    const who = candidates.find((c) => c.id === profileId)?.name ?? "them";
    toast.success(`${badgeName} awarded to ${who}`);
    setProfileId("");
    router.refresh();
  }

  if (candidates.length === 0) {
    return <p className="text-xs text-muted">Everyone already holds this one.</p>;
  }

  return (
    <div className="flex gap-2">
      <select
        value={profileId}
        onChange={(e) => setProfileId(e.target.value)}
        aria-label={`Award ${badgeName} to`}
        className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-card px-2.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <option value="">Award to…</option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => void award()}
        disabled={!profileId || busy}
        className="flex h-9 shrink-0 items-center gap-1 rounded-lg bg-foreground px-3 text-sm font-semibold text-background transition disabled:opacity-40"
      >
        <Plus className="size-3.5" /> {busy ? "Awarding…" : "Award"}
      </button>
    </div>
  );
}

/** Curator-only: the small × on a holder to take the badge back. */
export function RevokeBadge({
  badgeKey,
  seasonId,
  profileId,
  name,
}: {
  badgeKey: BadgeKey;
  seasonId: string;
  profileId: string;
  name: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function revoke() {
    if (!window.confirm(`Take this badge back from ${name}?`)) return;
    setBusy(true);
    const error = await call("DELETE", { seasonId, profileId, badgeKey });
    setBusy(false);
    if (error) return toast.error(error);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void revoke()}
      disabled={busy}
      aria-label={`Remove badge from ${name}`}
      className="rounded-full p-0.5 text-muted transition hover:bg-surface hover:text-destructive disabled:opacity-40"
    >
      <X className="size-3" />
    </button>
  );
}
