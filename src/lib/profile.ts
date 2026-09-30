import { z } from "zod";

const url = z.url("enter a full link, e.g. https://...").max(200).optional().or(z.literal(""));

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(80),
  headline: z.string().trim().max(120).optional().or(z.literal("")),
  location: z.string().trim().max(80).optional().or(z.literal("")),
  bio: z.string().trim().max(600).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).default([]),
  linkedinUrl: url,
  twitterUrl: url,
  githubUrl: url,
});

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/* ── Visibility ─────────────────────────────────────────────────────────
   What a member chooses to show. Stored as `profiles.visibility` jsonb and
   merged over DEFAULT_VISIBILITY, so a stored `{}` means "all defaults" and
   a new key can be added here without a migration. */

export const VISIBILITY_KEYS = [
  "headline",
  "location",
  "bio",
  "tags",
  "email",
  "linkedin",
  "twitter",
  "github",
  "talk",
  "scores",
  "feedback",
  "recording",
  "showcase",
] as const;

export type VisibilityKey = (typeof VISIBILITY_KEYS)[number];
export type Visibility = Record<VisibilityKey, boolean>;

/** Everything on by default except email, which matches how the profile page
 * already treats it (self and admin only). `showcase` on by default is the
 * opt-out model: you appear on the public page until you say otherwise. */
export const DEFAULT_VISIBILITY: Visibility = {
  headline: true,
  location: true,
  bio: true,
  tags: true,
  email: false,
  linkedin: true,
  twitter: true,
  github: true,
  talk: true,
  scores: true,
  feedback: true,
  recording: true,
  showcase: true,
};

/** Label + helper text for each toggle, so the dialog and any future surface
 * describe these the same way. */
export const VISIBILITY_LABELS: Record<VisibilityKey, { label: string; hint: string }> = {
  headline: { label: "Headline", hint: "the one-liner under your name" },
  location: { label: "Location", hint: "where you're based" },
  bio: { label: "About", hint: "your longer description" },
  tags: { label: "Interests", hint: "the topic pills on your profile" },
  email: { label: "Email address", hint: "off by default" },
  linkedin: { label: "LinkedIn", hint: "" },
  twitter: { label: "X", hint: "" },
  github: { label: "GitHub", hint: "" },
  talk: { label: "My talk", hint: "title and description of what you presented" },
  scores: { label: "Scores I received", hint: "the averages the room gave your talk" },
  feedback: { label: "Written feedback I received", hint: "comments left on your talk" },
  recording: { label: "Recording", hint: "the video of your session" },
  showcase: { label: "Show me on the public page", hint: "the public cohort showcase, readable by anyone with the link" },
};

/** Partial on purpose: a PATCH can send only the keys that changed. */
export const visibilitySchema = z
  .object(
    Object.fromEntries(VISIBILITY_KEYS.map((key) => [key, z.boolean()])) as Record<
      VisibilityKey,
      z.ZodBoolean
    >,
  )
  .partial();

export type VisibilityUpdate = z.infer<typeof visibilitySchema>;

/** Merges whatever is stored in the jsonb column over the defaults, ignoring
 * unknown keys and non-boolean values so a malformed row can't break a page. */
export function resolveVisibility(raw: unknown): Visibility {
  const stored = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const resolved = { ...DEFAULT_VISIBILITY };

  for (const key of VISIBILITY_KEYS) {
    if (typeof stored[key] === "boolean") resolved[key] = stored[key];
  }

  return resolved;
}

export interface Viewer {
  isSelf: boolean;
  isAdmin: boolean;
}

/** You always see your own profile in full, and an admin always sees
 * everything — the toggles govern what *other members and the public* get. */
export function canSee(visibility: Visibility, key: VisibilityKey, viewer: Viewer): boolean {
  if (viewer.isSelf || viewer.isAdmin) return true;
  return visibility[key];
}
