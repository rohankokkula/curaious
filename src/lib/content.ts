/**
 * Shared editorial content for the homepage.
 * Plain data only — no layout, no animation, no 3D math.
 */

export interface Persona {
  /** Short one-line description of someone who could be at the table. */
  line: string;
}

/**
 * "Who you might sit next to" — the only place persona examples appear on the
 * site. Deliberately framed as people, not as presentation topics.
 */
export const PERSONAS: Persona[] = [
  { line: "someone who launched their first product on product hunt last month" },
  { line: "a college student looking for someone to sanity-check their project" },
  { line: "someone automating half their week with claude and a pile of scripts" },
  { line: "someone who actually understands video generation pipelines, higgsfield and all" },
  { line: "someone working on ai security, thinking about how models get broken" },
  { line: "someone who reads eval papers for fun, and is halfway through writing one" },
  { line: "someone prototyping with voice models and still chasing the latency" },
  { line: "someone maintaining an open-source repo, quietly looking for contributors" },
  { line: "someone building an ai sre tool that makes sense of telemetry data" },
  { line: "someone who isn't building anything yet and just wants to know what's real" },
];

export interface FeedbackCategory {
  title: string;
  description: string;
}

/**
 * What the room rates a talk on. Mechanism description only — no scores,
 * no per-person numbers.
 */
export const FEEDBACK_CATEGORIES: FeedbackCategory[] = [
  {
    title: "clarity",
    description: "how easy it was to follow if you'd never seen the topic before",
  },
  {
    title: "content",
    description: "whether what was covered was relevant and well put together",
  },
  {
    title: "depth",
    description: "how far past the surface the research actually went",
  },
  {
    title: "delivery",
    description: "how it was presented — pace, confidence, holding the room",
  },
  {
    title: "usefulness",
    description: "whether anyone walked away with something they can use",
  },
];
