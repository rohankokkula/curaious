export type HyderabadAvailability =
  | "in_hyderabad"
  | "nearby_can_travel"
  | "elsewhere";

export type CurrentStage =
  | "still_in_college"
  | "recently_graduated"
  | "building_software"
  | "working_in_ai_ml"
  | "researching_ai"
  | "building_a_company"
  | "moving_into_ai"
  | "somewhere_else";

export type WeekendCommitment =
  | "yes_can_commit"
  | "mostly_with_conflicts"
  | "probably_not";

export interface ApplicationFormData {
  fullName: string;
  email: string;
  linkedinUrl: string;
  currentLocation: string;
  hyderabadAvailability: HyderabadAvailability | "";
  currentStage: CurrentStage | "";
  currentWork: string;
  aiJourney: string;
  currentlyLearningOrBuilding: string;
  presentationTopic: string;
  topicToLearn: string;
  whyJoin: string;
  contribution: string;
  weekendCommitment: WeekendCommitment | "";
  portfolioOrProjectLinks: string;
  agreement: boolean;
}

export interface ApplicationSubmission extends ApplicationFormData {
  applicationId: string;
  submittedAt: string;
}

export interface SheetRowPayload {
  application_id: string;
  submitted_at: string;
  full_name: string;
  email: string;
  linkedin_url: string;
  current_location: string;
  hyderabad_availability: string;
  current_stage: string;
  current_work: string;
  ai_journey: string;
  currently_learning_or_building: string;
  presentation_topic: string;
  topic_to_learn: string;
  why_join: string;
  contribution: string;
  weekend_commitment: string;
  portfolio_or_project_links: string;
  agreement: string;
  raw_payload_json: string;
}

export const EMPTY_APPLICATION: ApplicationFormData = {
  fullName: "",
  email: "",
  linkedinUrl: "",
  currentLocation: "",
  hyderabadAvailability: "",
  currentStage: "",
  currentWork: "",
  aiJourney: "",
  currentlyLearningOrBuilding: "",
  presentationTopic: "",
  topicToLearn: "",
  whyJoin: "",
  contribution: "",
  weekendCommitment: "",
  portfolioOrProjectLinks: "",
  agreement: false,
};

export type FormStepId =
  | "intro"
  | "name"
  | "contact"
  | "location"
  | "stage"
  | "currentWork"
  | "aiJourney"
  | "building"
  | "presentation"
  | "learn"
  | "whyJoin"
  | "contribution"
  | "commitment"
  | "links"
  | "agreement"
  | "review"
  | "confirmation";

export const FORM_STEPS: FormStepId[] = [
  "intro",
  "name",
  "contact",
  "location",
  "stage",
  "currentWork",
  "aiJourney",
  "building",
  "presentation",
  "learn",
  "whyJoin",
  "contribution",
  "commitment",
  "links",
  "agreement",
  "review",
];

export const PROGRESS_STEPS: FormStepId[] = FORM_STEPS.filter(
  (step) => step !== "intro" && step !== "review" && step !== "confirmation",
);
