import type { MetadataRoute } from "next";
import { loadPublishedArticles } from "@/lib/articleData";
import { absoluteUrl } from "@/lib/siteUrl";

export const revalidate = 3600;

/** The public, indexable pages: home, the hearticles index and every
 * published hearticle. (/cohort1 is unlisted on purpose; see robots.ts.) */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await loadPublishedArticles();
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/hearticles"), lastModified: articles[0]?.updatedAt, changeFrequency: "weekly", priority: 0.8 },
    ...articles.map((a) => ({
      url: absoluteUrl(`/hearticles/${a.slug}`),
      lastModified: a.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
