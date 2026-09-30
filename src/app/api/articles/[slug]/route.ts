import { NextResponse } from "next/server";
import { createSupabaseAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated read for /articles/[slug]. Service-role, and
 * `status = 'approved'` is checked here explicitly — this is the one place
 * that decides what's actually public, independent of the page component.
 * Anything pending or rejected 404s, signed in or not; an author previews
 * their own unpublished piece from inside the dashboard instead, never
 * through this route.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!isSupabaseConfigured || !hasServiceRoleKey) {
    return NextResponse.json({ ok: false, error: "server_not_configured" }, { status: 503 });
  }

  const { slug } = await params;
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

  if (!article || article.status !== "approved") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const { data: author } = await admin
    .from("profiles")
    .select("id, name, headline, avatar_url")
    .eq("id", article.added_by)
    .maybeSingle<{ id: string; name: string; headline: string | null; avatar_url: string | null }>();

  return NextResponse.json({
    ok: true,
    article: {
      title: article.title,
      excerpt: article.note,
      body: article.body_markdown ?? "",
      tags: article.tags,
      readMinutes: article.read_minutes,
      publishedAt: article.created_at,
      author: author
        ? { name: author.name, headline: author.headline, avatarUrl: author.avatar_url, id: author.id }
        : null,
    },
  });
}
