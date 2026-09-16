import { z } from "zod";
import type { ApplicationFormData } from "./types";

const emailSchema = z.string().trim().email("enter a valid email address");

const linkedinSchema = z
  .string()
  .trim()
  .url("enter a valid linkedin url")
  .refine(
    (value) =>
      /linkedin\.com\/in\//i.test(value) ||
      /linkedin\.com\/pub\//i.test(value),
    "use your linkedin profile url (linkedin.com/in/...)",
  );

export const applicationSchema = z.object({
  fullName: z.string().trim().min(1, "what should we call you?"),
  email: emailSchema,
  linkedinUrl: linkedinSchema,
  currentLocation: z.string().trim().min(1, "where are you joining us from?"),
  hyderabadAvailability: z.enum(
    ["in_hyderabad", "nearby_can_travel", "elsewhere"],
    { message: "pick the option that fits best" },
  ),
  currentStage: z.enum(
    [
      "still_in_college",
      "recently_graduated",
      "building_software",
      "working_in_ai_ml",
      "researching_ai",
      "building_a_company",
      "moving_into_ai",
      "somewhere_else",
    ],
    { message: "pick the path that fits best" },
  ),
  currentWork: z.string().trim(),
  aiJourney: z
    .string()
    .trim()
    .min(1, "tell us where you are with AI right now"),
  currentlyLearningOrBuilding: z
    .string()
    .trim()
    .min(1, "what has been taking up space in your head lately?"),
  presentationTopic: z
    .string()
    .trim()
    .min(1, "what would you talk about at the table?"),
  topicToLearn: z
    .string()
    .trim()
    .min(1, "what do you wish someone would explain to you?"),
  whyJoin: z
    .string()
    .trim()
    .min(1, "why does this group sound interesting to you?"),
  contribution: z
    .string()
    .trim()
    .min(1, "what do you think you'd bring to the table?"),
  weekendCommitment: z.enum(
    ["yes_can_commit", "mostly_with_conflicts", "probably_not"],
    { message: "pick the option that's most honest" },
  ),
  portfolioOrProjectLinks: z.string().trim(),
  agreement: z.literal(true, {
    message: "please confirm you understand the participation expectations",
  }),
});

export type ApplicationValidationErrors = Partial<
  Record<keyof ApplicationFormData, string>
>;

export function validateStep(
  step: string,
  data: ApplicationFormData,
): ApplicationValidationErrors {
  const errors: ApplicationValidationErrors = {};

  switch (step) {
    case "name":
      if (!data.fullName.trim()) {
        errors.fullName = "what should we call you?";
      }
      break;
    case "contact":
      if (!emailSchema.safeParse(data.email).success) {
        errors.email = "enter a valid email address";
      }
      if (!linkedinSchema.safeParse(data.linkedinUrl).success) {
        errors.linkedinUrl =
          "use your linkedin profile url (linkedin.com/in/...)";
      }
      break;
    case "location":
      if (!data.currentLocation.trim()) {
        errors.currentLocation = "where are you joining us from?";
      }
      if (!data.hyderabadAvailability) {
        errors.hyderabadAvailability = "pick the option that fits best";
      }
      break;
    case "stage":
      if (!data.currentStage) {
        errors.currentStage = "pick the path that fits best";
      }
      break;
    case "aiJourney":
      if (!data.aiJourney.trim()) {
        errors.aiJourney = "tell us where you are with AI right now";
      }
      break;
    case "building":
      if (!data.currentlyLearningOrBuilding.trim()) {
        errors.currentlyLearningOrBuilding =
          "what has been taking up space in your head lately?";
      }
      break;
    case "presentation":
      if (!data.presentationTopic.trim()) {
        errors.presentationTopic = "what would you talk about at the table?";
      }
      break;
    case "learn":
      if (!data.topicToLearn.trim()) {
        errors.topicToLearn =
          "what do you wish someone would explain to you?";
      }
      break;
    case "whyJoin":
      if (!data.whyJoin.trim()) {
        errors.whyJoin = "why does this group sound interesting to you?";
      }
      break;
    case "contribution":
      if (!data.contribution.trim()) {
        errors.contribution = "what do you think you'd bring to the table?";
      }
      break;
    case "commitment":
      if (!data.weekendCommitment) {
        errors.weekendCommitment = "pick the option that's most honest";
      }
      break;
    case "agreement":
      if (!data.agreement) {
        errors.agreement =
          "please confirm you understand the participation expectations";
      }
      break;
    default:
      break;
  }

  return errors;
}

export function validateApplication(data: ApplicationFormData) {
  return applicationSchema.safeParse(data);
}

export function generateApplicationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `cohort01-${timestamp}-${random}`;
}
