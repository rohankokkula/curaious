import { loadArticleBySlug } from "@/lib/articleData";
import { OG_PAGES } from "@/lib/og/pages";
import { renderOgArticle, renderOgPage } from "@/lib/og/render";

/**
 * A published hearticle's share card (1200×630 PNG), at /og/hearticle/<slug>.
 *
 * A route handler rather than an opengraph-image file so the response can be
 * fully buffered and cached: WhatsApp only draws the big banner preview when
 * the image comes back fast with a known size (Content-Length), and
 * ImageResponse streams without one. The page links here with ?v=<updated_at>,
 * so an edit gets a fresh URL and the CDN copy can live long.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await loadArticleBySlug(slug);
  const image = article
    ? await renderOgArticle({
        slug,
        title: article.title,
        excerpt: article.excerpt,
        authorName: article.author?.name ?? null,
        authorAvatarUrl: article.author?.avatarUrl ?? null,
        readMinutes: article.readMinutes,
      })
    : await renderOgPage(OG_PAGES.thoughts);

  const body = await image.arrayBuffer();
  return new Response(body, {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(body.byteLength),
      "Cache-Control": article
        ? "public, max-age=3600, s-maxage=2592000, stale-while-revalidate=2592000"
        : "public, max-age=60, s-maxage=300",
    },
  });
}
