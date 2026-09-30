import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ApplicationFormData, SheetRowPayload } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "";
}

export function toSheetPayload(
  applicationId: string,
  submittedAt: string,
  data: ApplicationFormData,
): SheetRowPayload {
  return {
    application_id: applicationId,
    submitted_at: submittedAt,
    full_name: data.fullName.trim(),
    email: data.email.trim(),
    linkedin_url: data.linkedinUrl.trim(),
    current_location: data.currentLocation.trim(),
    hyderabad_availability: data.hyderabadAvailability,
    current_stage: data.currentStage,
    current_work: data.currentWork.trim(),
    ai_journey: data.aiJourney.trim(),
    currently_learning_or_building: data.currentlyLearningOrBuilding.trim(),
    presentation_topic: data.presentationTopic.trim(),
    topic_to_learn: data.topicToLearn.trim(),
    why_join: data.whyJoin.trim(),
    contribution: data.contribution.trim(),
    weekend_commitment: data.weekendCommitment,
    portfolio_or_project_links: data.portfolioOrProjectLinks.trim(),
    agreement: data.agreement ? "yes" : "no",
    raw_payload_json: JSON.stringify({
      applicationId,
      submittedAt,
      ...data,
    }),
  };
}

export const STAGE_LABELS: Record<string, string> = {
  still_in_college: "still in college",
  recently_graduated: "recently graduated",
  building_software: "building software",
  working_in_ai_ml: "working in AI/ML",
  researching_ai: "researching AI",
  building_a_company: "building a company",
  moving_into_ai: "moving into AI",
  somewhere_else: "somewhere else",
};

export const AVAILABILITY_LABELS: Record<string, string> = {
  in_hyderabad: "already in hyderabad",
  nearby_can_travel: "nearby and can travel regularly",
  elsewhere: "somewhere else",
};

export const COMMITMENT_LABELS: Record<string, string> = {
  yes_can_commit: "yes, i can commit",
  mostly_with_conflicts: "mostly, with the occasional conflict",
  probably_not: "honestly, probably not",
};
