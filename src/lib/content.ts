/**
 * Shared editorial content for the homepage.
 * Plain data only, no layout, no animation, no 3D math.
 */

/** Every "apply" surface on the public site points here instead of an in-house form. */
export const INVITE_FORM_URL = "https://forms.gle/W59rTYSjBfYP14FF6";

export interface Persona {
  /** Short one-line description of someone who could be at the table. */
  line: string;
}

/**
 * "Who you might sit next to." Framed as people, not as presentation topics.
 * Kept short on purpose: six is enough to make the point without turning the
 * section into a scroll.
 */
export const PERSONAS: Persona[] = [
  { line: "someone who shipped their first product last month" },
  { line: "a student sanity-checking a project with real users" },
  { line: "someone automating half their week with a pile of scripts" },
  { line: "someone who actually understands video generation pipelines" },
  { line: "someone thinking hard about how models get broken" },
  { line: "someone who reads eval papers for fun" },
];

export interface FeedbackCategory {
  title: string;
  description: string;
}

/**
 * What the room rates a talk on, matching the five categories in the actual
 * feedback form (see RATING_PARAMETERS in lib/ratings.ts) so this page never
 * says something the product doesn't do.
 */
export const FEEDBACK_CATEGORIES: FeedbackCategory[] = [
  {
    title: "content",
    description: "was it clear, accurate, worth the room's time",
  },
  {
    title: "depth",
    description: "how far past the surface it actually went",
  },
  {
    title: "delivery",
    description: "pace, confidence, whether it held the room",
  },
  {
    title: "takeaways",
    description: "whether anyone walks away with something to use",
  },
  {
    title: "overall",
    description: "the room's one honest read on the talk",
  },
];
