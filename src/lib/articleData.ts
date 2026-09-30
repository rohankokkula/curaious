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
  title: string;
  excerpt: string | null;
  body: string;
  tags: string[];
  readMinutes: number | null;
  publishedAt: string;
  author: { id: string; name: string; headline: string | null; avatarUrl: string | null } | null;
};

export async function loadArticleBySlug(slug: string): Promise<PublishedArticle | null> {
  const admin = createSupabaseAdminClient();

  const { data: article } = await admin
    .from("resource_links")
    .select("id, title, note, body_markdown, tags, read_minutes, created_at, added_by, status")
    .eq("slug", slug)
    .eq("kind", "article")
    .maybeSingle<{
      id: string;
      title: string;
      note: string | null;
      body_markdown: string | null;
      tags: string[];
      read_minutes: number | null;
      created_at: string;
      added_by: string;
      status: string;
    }>();

  if (!article || article.status !== "approved") return null;

  const { data: author } = await admin
    .from("profiles")
    .select("id, name, headline, avatar_url")
    .eq("id", article.added_by)
    .maybeSingle<{ id: string; name: string; headline: string | null; avatar_url: string | null }>();

  return {
    title: article.title,
    excerpt: article.note,
    body: article.body_markdown ?? "",
    tags: article.tags,
    readMinutes: article.read_minutes,
    publishedAt: article.created_at,
    author: author
      ? { name: author.name, headline: author.headline, avatarUrl: author.avatar_url, id: author.id }
      : null,
  };
}
