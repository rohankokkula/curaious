/**
 * SERVER-ONLY. Imports the service-role client — Route Handlers and Server
 * Components only.
 *
 * `status = 'approved'` is checked here explicitly — this is the one place
 * that decides what's actually public, independent of anything a page does.
 * Anything pending or rejected returns null, whether the caller is signed in
 * or not; an author previews their own unpublished piece from inside the
 * dashboard instead, never through this.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type PublishedArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  tags: string[];
  readMinutes: number | null;
  publishedAt: string;
  /** Last edit, else the publish date. */
  updatedAt: string;
  wordCount: number;
  author: { id: string; name: string; headline: string | null; avatarUrl: string | null } | null;
};

export async function loadArticleBySlug(slug: string): Promise<PublishedArticle | null> {
  const admin = createSupabaseAdminClient();

  const { data: article } = await admin
    .from("resource_links")
    .select("id, slug, title, note, body_markdown, tags, read_minutes, created_at, updated_at, reviewed_at, added_by, status")
    .eq("slug", slug)
    .eq("kind", "article")
    .maybeSingle<{
      id: string;
      slug: string;
      title: string;
      note: string | null;
      body_markdown: string | null;
      tags: string[];
      read_minutes: number | null;
      created_at: string;
      updated_at: string | null;
      reviewed_at: string | null;
      added_by: string;
      status: string;
    }>();

  if (!article || article.status !== "approved") return null;

  const { data: author } = await admin
    .from("profiles")
    .select("id, name, headline, avatar_url")
    .eq("id", article.added_by)
    .maybeSingle<{ id: string; name: string; headline: string | null; avatar_url: string | null }>();

  const body = article.body_markdown ?? "";
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.note,
    body,
    tags: article.tags,
    readMinutes: article.read_minutes,
    // published = when the curator approved it (else when it was written)
    publishedAt: article.reviewed_at ?? article.created_at,
    updatedAt: article.updated_at ?? article.reviewed_at ?? article.created_at,
    wordCount: body.trim() ? body.trim().split(/\s+/).length : 0,
    author: author
      ? { name: author.name, headline: author.headline, avatarUrl: author.avatar_url, id: author.id }
      : null,
  };
}

export type ArticleSummary = {
  slug: string;
  title: string;
  excerpt: string | null;
  tags: string[];
  readMinutes: number | null;
  publishedAt: string;
  updatedAt: string;
  author: { name: string; avatarUrl: string | null } | null;
};

/** Every published hearticle, newest first (for the index, sitemap, RSS and
 * "more hearticles"). Same rule as above: approved only. */
export async function loadPublishedArticles(limit = 200): Promise<ArticleSummary[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("resource_links")
    .select("slug, title, note, tags, read_minutes, created_at, updated_at, reviewed_at, author:profiles!added_by (name, avatar_url)")
    .eq("kind", "article")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<
      {
        slug: string;
        title: string;
        note: string | null;
        tags: string[];
        read_minutes: number | null;
        created_at: string;
        updated_at: string | null;
        reviewed_at: string | null;
        author: { name: string; avatar_url: string | null } | null;
      }[]
    >();
  return (data ?? []).map((a) => ({
    slug: a.slug,
    title: a.title,
    excerpt: a.note,
    tags: a.tags,
    readMinutes: a.read_minutes,
    publishedAt: a.reviewed_at ?? a.created_at,
    updatedAt: a.updated_at ?? a.reviewed_at ?? a.created_at,
    author: a.author ? { name: a.author.name, avatarUrl: a.author.avatar_url } : null,
  }));
}
