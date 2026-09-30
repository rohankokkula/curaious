import { PendingArticlesTable, type PendingArticle } from "@/components/admin/PendingArticlesTable";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ArticleRow = {
  id: string;
  title: string;
  note: string | null;
  body_markdown: string | null;
  read_minutes: number | null;
  created_at: string;
  added_by: string;
};

export default async function AdminResourcesPage() {
  if (!isSupabaseConfigured) {
    return <p className="text-sm text-muted">Season 1 isn&rsquo;t connected to its database yet.</p>;
  }

  const supabase = await createSupabaseServerClient();

  // `is_admin()` in resource_links_select is what makes pending articles
  // from other people visible here — same mechanism as the talks queue.
  const { data: rows } = await supabase
    .from("resource_links")
    .select("id, title, note, body_markdown, read_minutes, created_at, added_by")
    .eq("kind", "article")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .returns<ArticleRow[]>();

  const articles = rows ?? [];
  const authorIds = [...new Set(articles.map((a) => a.added_by))];
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id, name").in("id", authorIds).returns<{ id: string; name: string }[]>()
    : { data: [] };
  const authorNames = new Map((authors ?? []).map((a) => [a.id, a.name]));

  const pending: PendingArticle[] = articles.map((a) => ({
    id: a.id,
    title: a.title,
    excerpt: a.note ?? "",
    body: a.body_markdown ?? "",
    authorId: a.added_by,
    authorName: authorNames.get(a.added_by) ?? "unknown member",
    readMinutes: a.read_minutes,
    submittedAt: a.created_at,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Articles awaiting review</h1>
        <p className="mt-1 text-muted">
          Approving publishes it at a public, shareable page. Sending it back lets them edit and
          resubmit.
        </p>
      </header>

      <PendingArticlesTable articles={pending} />
    </div>
  );
}
