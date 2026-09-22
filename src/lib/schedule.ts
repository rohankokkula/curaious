import { z } from "zod";
import { SLOT_TYPES } from "@/lib/talks";

const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional().or(z.literal("").transform(() => null));

export const slotInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "pick a date"),
  type: z.enum(SLOT_TYPES),
  label: z.string().trim().min(1, "give it a label").max(60),
  startsAt: time,
  endsAt: time,
});

export const slotCreateSchema = slotInputSchema.extend({ cohortId: z.uuid() });

export const reorderSchema = z.object({
  items: z
    .array(z.object({ id: z.uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), sort_order: z.number().int() }))
    .min(1)
    .max(200),
});

export const cohortCreateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  capacity: z.number().int().min(1).max(500).default(10),
  cloneFrom: z.uuid().nullable().optional(),
});

export type EditorSlot = {
  id: string;
  date: string;
  label: string;
  type: (typeof SLOT_TYPES)[number];
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  talk: { id: string; title: string; presenter: string; status: "pending" | "approved" } | null;
};
