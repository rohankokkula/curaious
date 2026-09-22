import { z } from "zod";

export const MAX_DECK_MB = 25;
export const MAX_DECK_BYTES = MAX_DECK_MB * 1024 * 1024;

export const TALK_STATUSES = ["pending", "approved", "rejected"] as const;
export type TalkStatus = (typeof TALK_STATUSES)[number];

export const SLOT_TYPES = ["kickoff", "talk", "recognition"] as const;
export type SlotType = (typeof SLOT_TYPES)[number];

/** A single talk claim inside a slot, as much of it as a member is allowed to see. */
export type SlotTalk = {
  talkId: string;
  /** Only ever set once approved — pending claims stay anonymous unless it's yours. */
  title: string | null;
  presenterName: string | null;
  status: "pending" | "approved";
  isMine: boolean;
};

/** A slot can hold more than one talk — e.g. two or three lightning talks in one session. */
export type SlotView = {
  id: string;
  date: string;
  label: string;
  type: SlotType;
  capacity: number;
  startsAt: string | null;
  endsAt: string | null;
  talks: SlotTalk[];
  isFull: boolean;
};

export const talkSubmissionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(4, "give the talk a title")
    .max(140, "keep the title under 140 characters"),
  description: z
    .string()
    .trim()
    .min(40, "a couple of sentences, so the room knows what to expect")
    .max(2000, "keep it under 2000 characters"),
});

export type TalkSubmission = z.infer<typeof talkSubmissionSchema>;

export const talkReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z
    .string()
    .trim()
    .max(500, "keep the reason under 500 characters")
    .optional(),
});

/** Keep uploaded filenames boring: storage keys are not a place for surprises. */
export function sanitizeDeckFilename(filename: string): string {
  const base = filename.replace(/\.pdf$/i, "");
  const safe = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${safe || "deck"}.pdf`;
}

export function formatSlotDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";

  const parsed = new Date(`${date}T00:00:00Z`);
  return parsed.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
