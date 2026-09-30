import type { RatingAverages } from "@/lib/ratings";

/**
 * Shapes for the public cohort showcase (`/showcase`).
 *
 * Nothing here is sensitive by accident: the route builds these objects field
 * by field from an allowlist, so `email`, `role` and `deck_path` can't leak
 * into the payload by widening a `select("*")` somewhere.
 */

/**
 * Rating comments are attributed everywhere else in the product — the
 * aggregate carries the rater's name and avatar on purpose. On a page anyone
 * with the link can read, that publishes what each named member wrote about a
 * peer, and the *rater* has no toggle of their own (the visibility flag
 * belongs to the speaker being reviewed).
 *
 * Set this to false to publish the same comments without naming who wrote
 * them. Nothing else needs to change.
 */
export const SHOWCASE_ATTRIBUTE_COMMENTS = true;

export interface ShowcaseComment {
  /** null when SHOWCASE_ATTRIBUTE_COMMENTS is false. */
  raterName: string | null;
  raterAvatarUrl: string | null;
  text: string;
}

export interface ShowcaseTalk {
  title: string;
  description: string;
  /** null unless the speaker has kept their recording visible. */
  recordingUrl: string | null;
  slotLabel: string | null;
  slotDate: string | null;
  /** null unless the speaker has kept their scores visible. */
  scores: (RatingAverages & { count: number }) | null;
  comments: ShowcaseComment[];
}

export interface ShowcaseSpeaker {
  id: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  location: string | null;
  bio: string | null;
  tags: string[];
  linkedinUrl: string | null;
  twitterUrl: string | null;
  githubUrl: string | null;
  talk: ShowcaseTalk | null;
}

export interface ShowcasePayload {
  ok: true;
  cohort: { name: string; number: number; startsOn: string; endsOn: string } | null;
  speakers: ShowcaseSpeaker[];
}
