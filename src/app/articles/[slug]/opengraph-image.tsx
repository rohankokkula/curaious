import { loadArticleBySlug } from "@/lib/articleData";
import { OG_PAGES } from "@/lib/og/pages";
import { OG_SIZE, renderOgArticle, renderOgPage } from "@/lib/og/render";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "An article written by a curaious member";

/** A published article's own card: its title, excerpt and author. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await loadArticleBySlug(slug);
  if (!article) return renderOgPage(OG_PAGES.thoughts);

  return renderOgArticle({
    title: article.title,
    excerpt: article.excerpt,
    authorName: article.author?.name ?? null,
    authorAvatarUrl: article.author?.avatarUrl ?? null,
    readMinutes: article.readMinutes,
    tags: article.tags,
  });
}
