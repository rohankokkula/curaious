import { notFound } from "next/navigation";
import { ArticleEditor, type ExistingArticle } from "@/components/dashboard/ArticleEditor";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ArticleRow = {
  id: string;
  title: string;
  note: string | null;
  body_markdown: string | null;
  tags: string[];
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  added_by: string;
};

export default async function WriteArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-sm text-muted">Sign in to write an article.</p>;
  }

  let existing: ExistingArticle | undefined;

  if (edit) {
    // RLS (resource_links_select) shows your own pending/rejected rows, but
    // not anyone else's — this doubles as the ownership check.
    const { data: row } = await supabase
      .from("resource_links")
      .select("id, title, note, body_markdown, tags, status, rejection_reason, added_by")
      .eq("id", edit)
      .eq("kind", "article")
      .maybeSingle<ArticleRow>();

    if (!row || row.added_by !== user.id || row.status === "approved") notFound();

    existing = {
      id: row.id,
      title: row.title,
      excerpt: row.note ?? "",
      body: row.body_markdown ?? "",
      tags: row.tags,
      status: row.status,
      rejectionReason: row.rejection_reason,
    };
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          {existing ? "Edit your article" : "Write an article"}
        </h1>
        <p className="mt-1 text-muted">
          Your own thinking, in your own words. An admin reviews it before it goes public.
        </p>
      </header>

      <ArticleEditor existing={existing} />
    </div>
  );
}
