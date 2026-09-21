"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatSlotDate } from "@/lib/talks";

export type PendingTalk = {
  id: string;
  title: string;
  description: string;
  presenterName: string;
  presenterId: string;
  slotLabel: string;
  slotDate: string;
  submittedAt: string;
  hasDeck: boolean;
};

export function PendingTalksTable({ talks }: { talks: PendingTalk[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function review(
    talkId: string,
    action: "approve" | "reject",
    rejectionReason?: string,
  ) {
    setBusyId(talkId);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/talks/${talkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason }),
      });

      const body = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok || !body.ok) {
        setMessage(body.message || "couldn't save that.");
        return;
      }

      setRejectingId(null);
      setReason("");
      router.refresh();
    } catch {
      setMessage("couldn't save that.");
    } finally {
      setBusyId(null);
    }
  }

  if (talks.length === 0) {
    return <p className="prose-quiet">nothing waiting on review.</p>;
  }

  return (
    <div className="space-y-10">
      {message ? <p className="text-sm text-accent">{message}</p> : null}

      <ul className="space-y-10">
        {talks.map((talk) => (
          <li
            key={talk.id}
            className="space-y-4 border-b border-border/50 pb-8"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="story-whisper">
                {talk.slotLabel} · {formatSlotDate(talk.slotDate)}
              </p>
              <p className="story-whisper">
                submitted {new Date(talk.submittedAt).toLocaleDateString("en-GB")}
              </p>
            </div>

            <h3 className="heading-display text-xl md:text-2xl">
              {talk.title}
            </h3>

            <p className="text-sm text-muted">
              <Link
                href={`/dashboard/members/${talk.presenterId}`}
                className="focus-ring underline-offset-4 transition hover:text-foreground hover:underline"
              >
                {talk.presenterName}
              </Link>
            </p>

            <p className="prose-quiet max-w-2xl">{talk.description}</p>

            <div className="flex flex-wrap items-center gap-5 pt-1">
              {talk.hasDeck ? (
                <Link
                  href={`/dashboard/talks/${talk.id}/present`}
                  className="focus-ring text-sm text-muted transition hover:text-foreground"
                >
                  open the deck
                </Link>
              ) : (
                <span className="text-sm text-muted">no deck attached</span>
              )}

              <button
                type="button"
                disabled={busyId === talk.id}
                onClick={() => review(talk.id, "approve")}
                className="focus-ring border-b border-foreground pb-0.5 text-sm text-foreground transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
              >
                approve
              </button>

              <button
                type="button"
                disabled={busyId === talk.id}
                onClick={() =>
                  setRejectingId(rejectingId === talk.id ? null : talk.id)
                }
                className="focus-ring text-sm text-muted transition hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
              >
                {rejectingId === talk.id ? "never mind" : "send back"}
              </button>
            </div>

            {rejectingId === talk.id ? (
              <div className="space-y-3 pt-2">
                <label htmlFor={`reason-${talk.id}`} className="form-label">
                  why · optional, shown to them
                </label>
                <textarea
                  id={`reason-${talk.id}`}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={500}
                  className="form-textarea min-h-24"
                />
                <button
                  type="button"
                  disabled={busyId === talk.id}
                  onClick={() =>
                    review(talk.id, "reject", reason.trim() || undefined)
                  }
                  className="focus-ring border-b border-accent pb-0.5 text-sm text-accent transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  confirm send back
                </button>
                <p className="text-xs text-muted">
                  sending it back frees the slot up for someone else.
                </p>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
