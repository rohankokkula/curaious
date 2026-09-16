export type StoryPhase =
  | "seats"
  | "transition"
  | "intro"
  | "scores"
  | "average"
  | "focus"
  | "form";

export const SEAT_COUNT = 10;
export const USER_SEAT_INDEX = 0;
export const SCORING_SEAT_COUNT = SEAT_COUNT - 1;

export interface TableSeat {
  persona: string;
  topic: string;
  accent: string;
  glow: string;
  icon: string;
}

export const TABLE_SEATS: TableSeat[] = [
  {
    persona: "AI RESEARCHER",
    topic: "A paper that changed how I think about reasoning models",
    accent: "#e8c547",
    glow: "rgba(232, 197, 71, 0.5)",
    icon: "✦",
  },
  {
    persona: "ML ENGINEER",
    topic: "Why my model looked good in testing but failed in production",
    accent: "#5a9de8",
    glow: "rgba(90, 157, 232, 0.45)",
    icon: "⚙",
  },
  {
    persona: "DATA PERSON",
    topic: "What I found after opening a messy dataset for the first time",
    accent: "#4ecdc4",
    glow: "rgba(78, 205, 196, 0.45)",
    icon: "◈",
  },
  {
    persona: "LLM BUILDER",
    topic: "The bug that taught me how RAG actually works",
    accent: "#6b8cff",
    glow: "rgba(107, 140, 255, 0.45)",
    icon: "⚡",
  },
  {
    persona: "BACKEND ENGINEER",
    topic: "Adding AI to a system that was never built for it",
    accent: "#6bcf7f",
    glow: "rgba(107, 207, 127, 0.45)",
    icon: "⊞",
  },
  {
    persona: "SWITCHING INTO AI",
    topic: "How I'm figuring out where to start with AI",
    accent: "#8aa4c7",
    glow: "rgba(138, 164, 199, 0.4)",
    icon: "↗",
  },
  {
    persona: "COLLEGE STUDENT",
    topic: "The story behind my first serious AI project",
    accent: "#f0c84b",
    glow: "rgba(240, 200, 75, 0.45)",
    icon: "◎",
  },
  {
    persona: "FRESH GRADUATE",
    topic: "What I'm learning after trying to break into AI",
    accent: "#7ec8e8",
    glow: "rgba(126, 200, 232, 0.45)",
    icon: "◇",
  },
  {
    persona: "FOUNDER",
    topic: "How I got my first customer using something I built with AI",
    accent: "#e87a9a",
    glow: "rgba(232, 122, 154, 0.45)",
    icon: "★",
  },
  {
    persona: "PRODUCT THINKER",
    topic: "What actually made people come back to the product",
    accent: "#b48cff",
    glow: "rgba(180, 140, 255, 0.45)",
    icon: "◉",
  },
];

/** @deprecated Use TABLE_SEATS */
export const SEAT_LABELS = TABLE_SEATS.map((seat) => seat.persona);

export function getSeatAccent(index: number): TableSeat {
  return TABLE_SEATS[index] ?? TABLE_SEATS[0];
}

export function formatSeatNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}

export type TableCenterMode = "opening" | "weekend" | "topic";

export const WEEKEND_INTRO_LINES = [
  "Every weekend,",
  "2 folks get to present",
  "a topic",
];

export const PREAMBLE_SCROLL_STEPS = 2;

export interface FeedbackRound {
  icon: string;
  title: string;
  subtitle: string;
  question: string;
  accent: string;
  glow: string;
}

export const FEEDBACK_ROUNDS: FeedbackRound[] = [
  {
    icon: "A",
    title: "Content",
    subtitle: "What you presented",
    question: "How relevant, clear and well-structured was your content?",
    accent: "#e8a55c",
    glow: "rgba(232, 165, 92, 0.5)",
  },
  {
    icon: "◎",
    title: "Delivery",
    subtitle: "How you presented",
    question: "How engaging and confident was your delivery?",
    accent: "#5a9de8",
    glow: "rgba(90, 157, 232, 0.45)",
  },
  {
    icon: "◈",
    title: "Depth",
    subtitle: "What you shared",
    question: "How insightful and useful was the material?",
    accent: "#6bcf7f",
    glow: "rgba(107, 207, 127, 0.45)",
  },
  {
    icon: "★",
    title: "Overall",
    subtitle: "The full picture",
    question: "How would you rate the session overall?",
    accent: "#b48cff",
    glow: "rgba(180, 140, 255, 0.45)",
  },
];

export const FEEDBACK_ROUND_COUNT = FEEDBACK_ROUNDS.length;

/** Illustration only — scores out of 10 from the other nine seats (seat 0 does not vote). */
export const ILLUSTRATION_SCORES = [7.5, 9, 6, 8.5, 7, 9.5, 8, 7.5, 8];

export function getIllustrationScore(seatIndex: number): number | null {
  if (seatIndex === USER_SEAT_INDEX) return null;
  return ILLUSTRATION_SCORES[seatIndex - 1] ?? null;
}

export function isSeatHighlighted(
  seatIndex: number,
  activeSeatIndex: number,
  storyPhase: StoryPhase,
): boolean {
  if (
    storyPhase === "intro" ||
    storyPhase === "seats" ||
    storyPhase === "scores"
  ) {
    return seatIndex === activeSeatIndex;
  }

  if (seatIndex === USER_SEAT_INDEX) {
    return true;
  }

  return false;
}

export function getUserSeatHeroScale(isMobile: boolean, focusProgress: number): number {
  const heroT = getFocusHeroT(focusProgress);
  return 1 + heroT * (isMobile ? 0.85 : 1.0);
}

export function getUserSeatHeroPosition(
  focusProgress: number,
): [number, number, number] {
  const heroT = getFocusHeroT(focusProgress);
  const [startX, , startZ] = getSeatPosition(USER_SEAT_INDEX);
  return [startX * (1 - heroT), 0, startZ * (1 - heroT)];
}

/** Final hero pose: slight turn so seat, front edge, and back read in 3/4 view. */
const FOCUS_CHAIR_YAW = 0.58;

export function getUserSeatHeroRotation(focusProgress: number): number {
  const heroT = getFocusHeroT(focusProgress);
  const start = getSeatRotation(USER_SEAT_INDEX);
  return start + (FOCUS_CHAIR_YAW - start) * heroT;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothStep(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function easeOutSoft(value: number) {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 2.4);
}

/** Table/chairs fade in parallel with the camera move (no scroll wait). */
const FOCUS_ENV_FADE_END = 0.22;

export function getFocusSceneFade(focusProgress: number): number {
  if (focusProgress <= 0) return 0;
  return easeOutSoft(clamp01(focusProgress / FOCUS_ENV_FADE_END));
}

export function getFocusScenePresence(focusProgress: number): number {
  return 1 - getFocusSceneFade(focusProgress);
}

export function getFocusEnvironmentOpacity(focusProgress: number): number {
  if (focusProgress <= 0) return 1;
  if (focusProgress >= FOCUS_ENV_FADE_END) return 0;
  return Math.max(0, 1 - easeOutSoft(focusProgress / FOCUS_ENV_FADE_END));
}

export function getFocusTableOpacity(focusProgress: number): number {
  return getFocusEnvironmentOpacity(focusProgress);
}

export function getFocusChairsOpacity(focusProgress: number): number {
  return getFocusEnvironmentOpacity(focusProgress);
}

export function getFocusCameraT(focusProgress: number): number {
  return smoothStep(focusProgress);
}

export function getFocusHeroT(focusProgress: number): number {
  return easeOutSoft(clamp01(focusProgress / 0.92));
}

export function getFocusSplitProgress(focusProgress: number): number {
  const cameraT = getFocusCameraT(focusProgress);
  return smoothStep(clamp01((cameraT - 0.58) / 0.42));
}
export const TABLE_TOP_Y = 0.74;
/** Top face of the table cylinder (mesh center + half height). */
export const TABLE_SURFACE_Y = TABLE_TOP_Y + 0.024;
export const TABLE_RADIUS = 1.15;
export const TABLE_DIAMETER = TABLE_RADIUS * 2;

export const CHAIR_FRONT_EXTENT = 0.36;
export const CHAIR_TABLE_GAP = 0.08;
export const SEAT_RADIUS =
  TABLE_RADIUS + CHAIR_TABLE_GAP + CHAIR_FRONT_EXTENT;

export function getSeatAngle(index: number): number {
  return (index / SEAT_COUNT) * Math.PI * 2 - Math.PI / 2;
}

export function getSeatPosition(index: number): [number, number, number] {
  const angle = getSeatAngle(index);
  return [
    Math.round(Math.cos(angle) * SEAT_RADIUS * 100) / 100,
    0,
    Math.round(Math.sin(angle) * SEAT_RADIUS * 100) / 100,
  ];
}

/** Rotate chair so its front (+Z local) faces the table center. */
export function getSeatRotation(index: number): number {
  const [x, , z] = getSeatPosition(index);
  return Math.atan2(-x, -z);
}

export function getScoreLabelPosition(
  index: number,
  tableRadius = TABLE_RADIUS * 0.72,
): [number, number, number] {
  const angle = getSeatAngle(index);
  return [
    Math.round(Math.cos(angle) * tableRadius * 100) / 100,
    TABLE_TOP_Y + 0.05,
    Math.round(Math.sin(angle) * tableRadius * 100) / 100,
  ];
}

export function formatScore(score: number): string {
  return Number.isInteger(score) ? `${score}/10` : `${score}/10`;
}

export function getIllustrationAverage(): number {
  const sum = ILLUSTRATION_SCORES.reduce((total, score) => total + score, 0);
  return Math.round((sum / ILLUSTRATION_SCORES.length) * 10) / 10;
}

export function formatAverage(score: number): string {
  return formatScore(score);
}

export function getTableCenterLabelPosition(): [number, number, number] {
  return [0, TABLE_SURFACE_Y + 0.002, 0];
}
