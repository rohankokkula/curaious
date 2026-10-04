"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
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

/** "booking" = slot requests (approve the booking / decline);
 * "deck" = uploaded PDFs on booked talks (approve the deck / request changes). */
type ReviewKind = "booking" | "deck";

const COPY: Record<ReviewKind, { approve: string; sendBack: string; confirm: string; why: string; hint: string; empty: string }> = {
  booking: {
    approve: "Approve booking",
    sendBack: "Decline",
    confirm: "Confirm decline",
    why: "Why (optional, shown to them)",
    hint: "Declining frees the slot up for someone else.",
    empty: "No slot requests waiting.",
  },
  deck: {
    approve: "Approve deck",
    sendBack: "Request changes",
    confirm: "Send back with notes",
    why: "What to change (shown to them)",
    hint: "Their slot stays booked; they upload a new version.",
    empty: "No decks waiting on review.",
  },
};

export function PendingTalksTable({ talks, kind = "booking" }: { talks: PendingTalk[]; kind?: ReviewKind }) {
  const copy = COPY[kind];
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function review(
    talkId: string,
    action: "approve" | "reject" | "approve_deck" | "request_deck_changes",
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
    return (
      <Card className="p-8">
        <p className="text-sm text-muted">{copy.empty}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{message}</p>
      ) : null}

      {talks.map((talk) => (
        <Card key={talk.id} className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge>
              {talk.slotLabel} · {formatSlotDate(talk.slotDate)}
            </Badge>
            <span className="text-xs text-muted">
              Submitted {new Date(talk.submittedAt).toLocaleDateString("en-GB")}
            </span>
          </div>

          <h3 className="mt-4 text-xl font-bold tracking-tight">{talk.title}</h3>

          <p className="mt-1 text-sm">
            <Link
              href={`/dashboard/members/${talk.presenterId}`}
              className="text-muted underline-offset-4 transition hover:text-foreground hover:underline"
            >
              {talk.presenterName}
            </Link>
          </p>

          <p className="mt-3 max-w-2xl leading-relaxed text-muted">{talk.description}</p>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            {talk.hasDeck ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/dashboard/talks/${talk.id}/present`}>Open the deck</Link>
              </Button>
            ) : (
              <span className="px-3 text-sm text-muted">No deck attached</span>
            )}

            <Button
              type="button"
              size="sm"
              disabled={busyId === talk.id}
              onClick={() => review(talk.id, kind === "deck" ? "approve_deck" : "approve")}
            >
              {copy.approve}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busyId === talk.id}
              onClick={() => setRejectingId(rejectingId === talk.id ? null : talk.id)}
            >
              {rejectingId === talk.id ? "Never mind" : copy.sendBack}
            </Button>
          </div>

          {rejectingId === talk.id ? (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <label htmlFor={`reason-${talk.id}`} className="text-xs font-semibold uppercase tracking-wide text-muted">
                {copy.why}
              </label>
              <Textarea
                id={`reason-${talk.id}`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={busyId === talk.id}
                  onClick={() => review(talk.id, kind === "deck" ? "request_deck_changes" : "reject", reason.trim() || undefined)}
                >
                  {copy.confirm}
                </Button>
                <p className="text-xs text-muted">{copy.hint}</p>
              </div>
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
