import { z } from "zod";

export const RESOURCE_CATEGORIES = [
  "paper",
  "article",
  "tool",
  "guide",
  "video",
  "demo",
  "other",
] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = {
  paper: "Paper",
  article: "Article",
  tool: "Tool",
  guide: "Guide",
  video: "Video",
  demo: "Demo",
  other: "Other",
};

const tagsField = z
  .array(z.string().trim().min(1).max(24))
  .max(6)
  .default([]);

export const resourceLinkSchema = z.object({
  title: z.string().trim().min(2, "give it a title").max(140),
  url: z.url("enter a full link, e.g. https://..."),
  note: z.string().trim().max(400).optional().or(z.literal("")),
  category: z.enum(RESOURCE_CATEGORIES).default("other"),
  tags: tagsField,
});

export type ResourceLinkInput = z.infer<typeof resourceLinkSchema>;

/** Best-effort host for display, e.g. "arxiv.org" from a full URL. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Mirrors talkReviewSchema (src/lib/talks.ts) — same shape, same review flow. */
export const resourceReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().trim().max(500, "keep the reason under 500 characters").optional(),
});

export const articleInputSchema = z.object({
  title: z.string().trim().min(4, "at least 4 characters").max(140),
  excerpt: z.string().trim().min(10, "a line or two on what this is about").max(400),
  body: z.string().trim().min(200, "give it some real length, this is a place for a full thought, not a note"),
  tags: tagsField,
});
export type ArticleInput = z.infer<typeof articleInputSchema>;

const SLUG_STRIP = /[^a-z0-9]+/g;

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(SLUG_STRIP, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "article";
}

/** ~200 words/minute, floored at 1 so a short piece never reads "0 min read". */
export function estimateReadMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
