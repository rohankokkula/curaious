import { z } from "zod";

/**
 * The five things a talk is scored on. "Overall" is never asked for: it's
 * the average of these five, worked out for the scorer as they go.
 *
 * Each point on the 1-10 scale has its own anchor line (a behaviourally
 * anchored scale), so a "7" means the same thing to everyone in the room
 * instead of each person's private idea of a 7. `anchors[0]` is the line
 * for a 1, `anchors[9]` for a 10.
 *
 * Keys are the database's column names; labels can change without a migration.
 */
export const RATING_PARAMETERS = [
  {
    key: "understanding",
    label: "Ease of understanding",
    hint: "The ideas, the examples, the jargon: how much of it did you follow?",
    icon: "understanding",
    anchors: [
      "I didn't understand anything",
      "It went over my head",
      "I got lost many times",
      "I understood bits and pieces",
      "I understood about half",
      "I got the main idea",
      "I understood most of it",
      "Clear, like reading a good book",
      "Like a good course, it all connected",
      "I could explain it to someone now",
    ],
  },
  {
    key: "content",
    label: "Content value",
    hint: "The topic, the ideas, what was new to you: was it worth your time?",
    icon: "content",
    anchors: [
      "I couldn't find the point",
      "Nothing new for me",
      "Little I'd remember",
      "Some parts were thin",
      "Mostly things I knew",
      "A few new things",
      "Good, mostly new to me",
      "Strong, every part mattered",
      "I learned a lot",
      "It changed how I think",
    ],
  },
  {
    key: "research_depth",
    label: "Research depth",
    hint: "The sources, the facts, their own digging: how far beyond a quick search did they go?",
    icon: "depth",
    anchors: [
      "No research at all",
      "Mostly opinions",
      "Very little research",
      "Surface level, few sources",
      "A fair overview",
      "Went past the basics",
      "Good depth, a few gaps",
      "Well researched, with sources",
      "Things a quick search won't show",
      "Expert level, with their own findings",
    ],
  },
  {
    key: "delivery",
    label: "Delivery",
    hint: "The slides, the pace, the choice of words: how well did it come across?",
    icon: "delivery",
    anchors: [
      "Felt unprepared",
      "I lost interest",
      "Hard to follow",
      "Too fast or too slow",
      "Mostly read from slides",
      "Okay, a bit flat",
      "Smooth, a few bumps",
      "Clear and confident",
      "Very engaging",
      "I couldn't look away",
    ],
  },
  {
    key: "usefulness",
    label: "Practical takeaways",
    hint: "Tools, tips, ways of thinking: can you use any of it in your own work or projects?",
    icon: "takeaways",
    anchors: [
      "Nothing I can use",
      "Too vague to act on",
      "Mostly theory",
      "Hard to see how to use it",
      "Good to know, not needed",
      "One useful idea",
      "A few ideas to try",
      "Clear things I can use",
      "I'll use this soon",
      "I want to try it today",
    ],
  },
] as const;

/** The anchor line for a score on one parameter. */
export const anchorFor = (key: RatingParameterKey, score: number) =>
  RATING_PARAMETERS.find((p) => p.key === key)?.anchors[Math.min(Math.max(Math.round(score), 1), 10) - 1] ?? "";

/** The overall score: the plain average of whichever of the five are set, to
 * one decimal (the same formula the aggregates use). Null when none are. */
export function overallOf(scores: Partial<Record<RatingParameterKey, number>>) {
  const values = RATING_PARAMETERS.map((p) => scores[p.key] ?? 0).filter((v) => v > 0);
  return values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;
}

export type RatingParameterKey = (typeof RATING_PARAMETERS)[number]["key"];

export const RATING_MIN = 1;
export const RATING_MAX = 10;

/** Written feedback is required with every rating: scores say how it went,
 * the words are what the speaker can actually act on. */
export const FEEDBACK_MIN = 20;
export const FEEDBACK_MAX = 1500;

const score = z.coerce
  .number()
  .int("whole numbers only")
  .min(RATING_MIN, `${RATING_MIN}-${RATING_MAX}`)
  .max(RATING_MAX, `${RATING_MIN}-${RATING_MAX}`);

export const ratingScoresSchema = z.object({
  understanding: score,
  content: score,
  research_depth: score,
  delivery: score,
  usefulness: score,
  comment: z
    .string()
    .trim()
    .min(FEEDBACK_MIN, `write at least ${FEEDBACK_MIN} characters of feedback for the speaker.`)
    .max(FEEDBACK_MAX, `keep feedback under ${FEEDBACK_MAX} characters.`),
});

export const ratingSubmissionSchema = ratingScoresSchema.extend({
  talkId: z.uuid("that isn't a valid talk"),
});

export type RatingSubmission = z.infer<typeof ratingSubmissionSchema>;

export type RatingAverages = Record<RatingParameterKey, number | null> & {
  overall: number | null;
};

export type RatingComment = {
  raterName: string;
  raterAvatarUrl: string | null;
  text: string;
};

export type RatingAggregate = {
  count: number;
  averages: RatingAverages;
  comments: RatingComment[];
};

export function emptyAggregate(): RatingAggregate {
  return {
    count: 0,
    averages: {
      understanding: null,
      content: null,
      research_depth: null,
      delivery: null,
      usefulness: null,
      overall: null,
    },
    comments: [],
  };
}
