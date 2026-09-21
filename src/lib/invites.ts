import { z } from "zod";

export const INVITE_ROLES = ["member", "admin"] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];

const emailSchema = z.string().trim().email("enter a valid email address");

export const inviteSchema = z.object({
  name: z.string().trim().min(1, "who are you inviting?").max(120),
  email: emailSchema,
  role: z.enum(INVITE_ROLES).optional(),
});

export type InviteInput = z.infer<typeof inviteSchema>;

export const loginRequestSchema = z.object({
  email: emailSchema,
});

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Case-insensitive email lookups go through PostgREST's `ilike`, where `%` and
 * `_` are wildcards — both are legal in an email local part, so escape them
 * before they turn a lookup into a pattern match.
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
