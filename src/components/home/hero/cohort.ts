/**
 * The ten people in a season. Plain data only — mirrors `src/lib/content.ts`.
 *
 * This is the whole concept in one array: ten seats, and on any given
 * session one of them is on stage while the *other nine* score the talk.
 * The Hero rotates the "on stage" index through all ten, so the audience
 * is always `COHORT` minus whoever is presenting.
 *
 * Names/roles stay consistent with the fictional cohort already used in
 * ProductPreview's schedule mockup rather than inventing a new cast.
 */
export interface CohortMember {
  id: string;
  name: string;
  role: string;
  talkTitle: string;
  talkSubtitle: string;
  /** Index into TONES — the color that identifies this person everywhere. */
  tone: number;
  /** Picks the silhouette build, so the figure on stage matches whoever is
   * actually presenting instead of everyone sharing one body. */
  presents: "f" | "m";
  /** Index into GESTURES in SpeakerFigure — which pose they hold. */
  gesture: number;
}

export const TONES = [
  { rim: "text-emerald-400", chip: "text-emerald-300", avatar: "bg-emerald-100 text-emerald-700" },
  { rim: "text-sky-400", chip: "text-sky-300", avatar: "bg-sky-100 text-sky-700" },
  { rim: "text-amber-400", chip: "text-amber-300", avatar: "bg-amber-100 text-amber-700" },
  { rim: "text-violet-400", chip: "text-violet-300", avatar: "bg-violet-100 text-violet-700" },
  { rim: "text-rose-400", chip: "text-rose-300", avatar: "bg-rose-100 text-rose-700" },
  { rim: "text-teal-400", chip: "text-teal-300", avatar: "bg-teal-100 text-teal-700" },
];

export const COHORT: CohortMember[] = [
  {
    id: "rohan",
    name: "Rohan Kokkula",
    role: "Developer Advocate",
    talkTitle: "From Prompt to Product",
    talkSubtitle: "Lessons from building with LLMs in practice.",
    tone: 0,
    presents: "m",
    gesture: 0,
  },
  {
    id: "sana",
    name: "Sana Rahman",
    role: "ML Engineer · Independent",
    talkTitle: "AI Agents in the Real World",
    talkSubtitle: "Patterns, pitfalls, and possibilities.",
    tone: 1,
    presents: "f",
    gesture: 1,
  },
  {
    id: "diya",
    name: "Diya Iyer",
    role: "Applied Researcher",
    talkTitle: "Open Source LLM Tools",
    talkSubtitle: "Tools, tradeoffs, and real world use cases.",
    tone: 2,
    presents: "f",
    gesture: 2,
  },
  {
    id: "karthik",
    name: "Karthik Menon",
    role: "Platform Engineer",
    talkTitle: "Evaluating AI Systems",
    talkSubtitle: "Building evals that actually catch regressions.",
    tone: 3,
    presents: "m",
    gesture: 3,
  },
  {
    id: "ananya",
    name: "Ananya Sharma",
    role: "AI Harness Engineer",
    talkTitle: "Harnesses, Not Prompts",
    talkSubtitle: "Why the scaffolding matters more than the wording.",
    tone: 4,
    presents: "f",
    gesture: 0,
  },
  {
    id: "vikram",
    name: "Vikram Chandra",
    role: "Independent Builder",
    talkTitle: "Shipping Solo with AI",
    talkSubtitle: "What actually speeds up a one-person team.",
    tone: 5,
    presents: "m",
    gesture: 1,
  },
  {
    id: "naomi",
    name: "Naomi Lee",
    role: "Research Engineer",
    talkTitle: "Retrieval That Holds Up",
    talkSubtitle: "Where most RAG pipelines quietly fail.",
    tone: 0,
    presents: "f",
    gesture: 3,
  },
  {
    id: "arjun",
    name: "Arjun Nair",
    role: "Founder",
    talkTitle: "Selling to Your First Ten Users",
    talkSubtitle: "What changed once we stopped demoing the model.",
    tone: 1,
    presents: "m",
    gesture: 2,
  },
  {
    id: "meera",
    name: "Meera Joshi",
    role: "Design Engineer",
    talkTitle: "Interfaces for Uncertain Output",
    talkSubtitle: "Designing for a system that is sometimes wrong.",
    tone: 2,
    presents: "f",
    gesture: 1,
  },
  {
    id: "tanvi",
    name: "Tanvi Rao",
    role: "Final Year Student",
    talkTitle: "Breaking Models on Purpose",
    talkSubtitle: "A semester of red-teaming, and what held up.",
    tone: 3,
    presents: "f",
    gesture: 0,
  },
];

/** Slide counter flavor ("03 / 24") — implies a full season of talks
 * without needing 24 entries in the rotation. */
export const SLIDE_TOTAL = 24;

export function initialsFor(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * The score a given rater hands the current speaker. Deterministic on the
 * pair so the room's numbers stay put across re-renders instead of
 * flickering — whole numbers spread across 7-10, since the real form is a
 * 1-10 scale and a wall of straight 10s would read as fake.
 */
export function scoreFor(speakerIndex: number, raterIndex: number): string {
  // Small integer hash of the pair. (The old `(s * 7 + r * 13) % 13` dropped
  // the rater entirely, since r * 13 is always 0 mod 13, so the whole room
  // gave each speaker the identical score.)
  let h = (speakerIndex + 1) * 374761393 + (raterIndex + 1) * 668265263;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  h ^= h >>> 16;
  // Weighted toward 8 and 9, with the odd 6 and 10: a believable room.
  const SCORES = [6, 7, 7, 8, 8, 8, 9, 9, 9, 10];
  return String(SCORES[(h >>> 0) % SCORES.length]);
}
