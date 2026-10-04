import type { BadgeKey } from "@/lib/badges";
import type { RatingAverages } from "@/lib/ratings";
import type { SlotType } from "@/lib/talks";

/**
 * Shapes for the public season page (`/cohort1`).
 *
 * Nothing here is sensitive by accident: the loader builds these objects
 * field by field from an allowlist, so `email`, `role`, `deck_path` and
 * recording links can't leak into the payload by widening a select.
 */

/**
 * Rating comments are attributed everywhere else in the product. On a page
 * anyone with the link can read, that publishes what each named member wrote
 * about a peer, and the *rater* has no toggle of their own (the visibility
 * flag belongs to the speaker being reviewed).
 *
 * Set this to false to publish the same comments without naming who wrote
 * them. Nothing else needs to change.
 */
export const SHOWCASE_ATTRIBUTE_COMMENTS = true;

export interface ShowcaseComment {
  /** null when SHOWCASE_ATTRIBUTE_COMMENTS is false. */
  raterName: string | null;
  text: string;
}

export interface ShowcaseTalk {
  title: string;
  description: string;
  slotLabel: string | null;
  slotDate: string | null;
  /** null unless the speaker has kept their scores visible and some are in. */
  scores: (RatingAverages & { count: number }) | null;
  comments: ShowcaseComment[];
}

export interface ShowcasePerson {
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
  badges: BadgeKey[];
  talk: ShowcaseTalk | null;
}

/** One booked seat in a session, as much as the public may see. */
export interface ShowcaseSeat {
  /** null when the speaker keeps their talk (or themselves) off the public page. */
  title: string | null;
  speakerName: string | null;
  speakerAvatarUrl: string | null;
  presented: boolean;
}

export interface ShowcaseSession {
  id: string;
  date: string;
  label: string;
  type: SlotType;
  capacity: number;
  /** A recording exists; it's for members only and never linked here. */
  recorded: boolean;
  seats: ShowcaseSeat[];
}

export interface ShowcaseSeason {
  name: string;
  number: number;
  startsOn: string;
  endsOn: string;
}

export interface CohortPageData {
  season: ShowcaseSeason | null;
  sessions: ShowcaseSession[];
  people: ShowcasePerson[];
}
