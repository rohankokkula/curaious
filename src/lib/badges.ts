/**
 * The season's badges. The curator hands these out (any time, by hand); the
 * database only stores who holds which key — names, copy and artwork live
 * here so they can be reworded without a migration. Keys must match the
 * check constraint in supabase/migrations/0010_member_badges.sql.
 */
export const BADGE_KEYS = ["showstopper", "sharp_eye", "deep_diver", "librarian"] as const;
export type BadgeKey = (typeof BADGE_KEYS)[number];

export type BadgeDefinition = {
  key: BadgeKey;
  name: string;
  /** What it's actually for, in plain words. */
  awardedFor: string;
  blurb: string;
};

export const BADGES: Record<BadgeKey, BadgeDefinition> = {
  showstopper: {
    key: "showstopper",
    name: "Showstopper",
    awardedFor: "Best presenter",
    blurb: "Held the room. The talk people were still quoting a week later.",
  },
  sharp_eye: {
    key: "sharp_eye",
    name: "Sharp Eye",
    awardedFor: "Best feedback giver",
    blurb: "Notes that were specific, kind and genuinely useful to every speaker.",
  },
  deep_diver: {
    key: "deep_diver",
    name: "Deep Diver",
    awardedFor: "Best researcher",
    blurb: "Went further down the rabbit hole than anyone, and came back with receipts.",
  },
  librarian: {
    key: "librarian",
    name: "The Librarian",
    awardedFor: "Most shared to Bookmarks",
    blurb: "Kept the cohort's reading list full of things worth the time.",
  },
};

export const BADGE_LIST = BADGE_KEYS.map((key) => BADGES[key]);

export function isBadgeKey(value: unknown): value is BadgeKey {
  return typeof value === "string" && (BADGE_KEYS as readonly string[]).includes(value);
}
