import { z } from "zod";

export const resourceLinkSchema = z.object({
  title: z.string().trim().min(2, "give it a title").max(140),
  url: z.url("enter a full link, e.g. https://..."),
  note: z.string().trim().max(400).optional().or(z.literal("")),
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
