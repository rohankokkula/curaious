import { z } from "zod";

const url = z.url("enter a full link, e.g. https://...").max(200).optional().or(z.literal(""));

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(80),
  headline: z.string().trim().max(120).optional().or(z.literal("")),
  location: z.string().trim().max(80).optional().or(z.literal("")),
  bio: z.string().trim().max(600).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).default([]),
  linkedinUrl: url,
  twitterUrl: url,
  githubUrl: url,
});

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
