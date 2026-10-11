import { loadPublishedArticles } from "@/lib/articleData";
import { absoluteUrl } from "@/lib/siteUrl";

export const revalidate = 600;

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** RSS 2.0 feed of published hearticles, newest first. */
export async function GET() {
  const articles = await loadPublishedArticles(50);
  const items = articles
    .map((a) => {
      const url = absoluteUrl(`/hearticles/${a.slug}`);
      return `    <item>
      <title>${escape(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>${a.author ? `\n      <author>${escape(a.author.name)}</author>` : ""}${a.excerpt ? `\n      <description>${escape(a.excerpt)}</description>` : ""}${a.tags.map((t) => `\n      <category>${escape(t)}</category>`).join("")}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Hearticles · curaious</title>
    <link>${absoluteUrl("/hearticles")}</link>
    <atom:link href="${absoluteUrl("/hearticles/rss.xml")}" rel="self" type="application/rss+xml" />
    <description>The curaious cohort's own thinking, in their own words.</description>
    <language>en</language>${articles[0] ? `\n    <lastBuildDate>${new Date(articles[0].updatedAt).toUTCString()}</lastBuildDate>` : ""}
${items}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=600, s-maxage=600" },
  });
}
