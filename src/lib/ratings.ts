import { z } from "zod";

/** Order and copy match the "Your feedback" panel on the talk page. */
export const RATING_PARAMETERS = [
  {
    key: "content",
    label: "Content Quality",
    hint: "How clear, accurate and valuable was the content?",
    icon: "content",
  },
  {
    key: "research_depth",
    label: "Technical Depth",
    hint: "Right level of depth and technical insight?",
    icon: "depth",
  },
  {
    key: "delivery",
    label: "Delivery & Clarity",
    hint: "How engaging and clear was the delivery?",
    icon: "delivery",
  },
  {
    key: "usefulness",
    label: "Practical Takeaways",
    hint: "How useful are the takeaways for real-world use?",
    icon: "takeaways",
  },
  {
    key: "understanding",
    label: "Overall Experience",
    hint: "Overall, how would you rate this talk?",
    icon: "overall",
  },
] as const;

export type RatingParameterKey = (typeof RATING_PARAMETERS)[number]["key"];

export const RATING_MIN = 1;
export const RATING_MAX = 5;

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
