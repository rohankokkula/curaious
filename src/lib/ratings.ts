import { z } from "zod";

export const RATING_PARAMETERS = [
  {
    key: "understanding",
    label: "understanding",
    hint: "did they actually understand what they were talking about?",
  },
  {
    key: "content",
    label: "content",
    hint: "was the material itself worth the room's time?",
  },
  {
    key: "research_depth",
    label: "research / depth",
    hint: "did they go past the surface?",
  },
  {
    key: "delivery",
    label: "delivery",
    hint: "was it clear, paced, easy to follow?",
  },
  {
    key: "usefulness",
    label: "usefulness",
    hint: "will you use any of this?",
  },
] as const;

export type RatingParameterKey = (typeof RATING_PARAMETERS)[number]["key"];

export const RATING_MIN = 1;
export const RATING_MAX = 10;

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
    .max(1500, "keep it under 1500 characters")
    .optional()
    .or(z.literal("")),
});

export const ratingSubmissionSchema = ratingScoresSchema.extend({
  talkId: z.uuid("that isn't a valid talk"),
});

export type RatingSubmission = z.infer<typeof ratingSubmissionSchema>;

export type RatingAverages = Record<RatingParameterKey, number | null> & {
  overall: number | null;
};

export type RatingAggregate = {
  count: number;
  averages: RatingAverages;
  /** Rater identity is deliberately stripped before this leaves the server. */
  comments: string[];
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
