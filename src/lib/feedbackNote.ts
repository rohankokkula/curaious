/**
 * The one check on written feedback: it has to say something. Plain
 * functions, used by the form (client) and the ratings schema (server).
 */

/** Praise and filler that say nothing on their own. */
const GENERIC = new Set([
  "nice",
  "good",
  "great",
  "awesome",
  "amazing",
  "excellent",
  "cool",
  "superb",
  "fantastic",
  "wonderful",
  "brilliant",
  "perfect",
  "best",
  "loved",
  "love",
  "liked",
  "like",
  "enjoyed",
  "informative",
  "interesting",
  "insightful",
  "helpful",
  "useful",
  "fine",
  "ok",
  "okay",
  "well",
  "done",
  "job",
  "keep",
  "up",
  "it",
  "this",
  "that",
  "talk",
  "session",
  "presentation",
  "topic",
  "very",
  "really",
  "so",
  "too",
  "much",
  "a",
  "an",
  "the",
  "was",
  "is",
  "and",
  "overall",
  "everything",
  "all",
  "nothing",
  "none",
  "na",
  "n/a",
  "no",
  "improve",
  "improvement",
  "more",
  "better",
  "could",
  "be",
  "i",
  "it's",
  "its",
  "thanks",
  "thank",
  "you",
  "lot",
  "content",
  "speaker",
  "work",
  "stuff",
]);

/** True when, with the filler taken out, fewer than 3 real words are left. */
export function isGeneric(text: string) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'/-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return words.filter((w) => !GENERIC.has(w)).length < 3;
}
