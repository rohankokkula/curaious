import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PenLine } from "lucide-react";
import { DAY_PALETTE } from "@/components/dashboard/seasonLayout";
import { TitleCover } from "@/components/dashboard/TalkCover";
import { getActiveCohort } from "@/lib/cohort";
import { cn } from "@/lib/utils";
import { ArticleEditor, type ExistingArticle } from "@/components/dashboard/ArticleEditor";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";
import { pageMetadata } from "@/lib/og/metadata";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("thoughts", { title: "Hearticles" });

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
  searchParams: Promise<{ edit?: string; new?: string }>;
}) {
  const { edit, new: writing } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser();

  if (!user) {
    return <p className="text-sm text-muted">Sign in to write a hearticle.</p>;
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

  // Writing (a new one, or editing your draft): the editor.
  if (existing || writing) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/dashboard/resources/write" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> All hearticles
        </Link>
        <header>
          <h1 className="text-3xl font-bold tracking-tight">{existing ? "Edit your hearticle" : "Write a hearticle"}</h1>
          <p className="mt-1 text-muted">Your own thinking, in your own words. Pasting is not allowed.</p>
        </header>
        <ArticleEditor existing={existing} />
      </div>
    );
  }

  // Otherwise: the cohort's published hearticles, and your own drafts.
  const cohort = await getActiveCohort();
  const [{ data: published }, { data: mine }] = await Promise.all([
    cohort
      ? supabase
          .from("resource_links")
          .select("id, slug, title, note, read_minutes, created_at, author:profiles!added_by (name, avatar_url)")
          .eq("kind", "article")
          .eq("status", "approved")
          .eq("cohort_id", cohort.id)
          .order("created_at", { ascending: false })
          .returns<PublishedRow[]>()
      : Promise.resolve({ data: [] as PublishedRow[] }),
    supabase
      .from("resource_links")
      .select("id, title, status, rejection_reason, created_at")
      .eq("kind", "article")
      .eq("added_by", user.id)
      .neq("status", "approved")
      .order("created_at", { ascending: false })
      .returns<DraftRow[]>(),
  ]);

  const posts = published ?? [];
  const drafts = mine ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hearticles</h1>
          <p className="mt-1 max-w-xl text-muted">The cohort&rsquo;s own thinking, in their own words. Approved ones get a public page.</p>
        </div>
        <Link
          href="/dashboard/resources/write?new=1"
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:bg-foreground/90"
        >
          <PenLine className="size-4" /> Write a hearticle
        </Link>
      </header>

      {drafts.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Your drafts</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {drafts.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/dashboard/resources/write?edit=${d.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition hover:border-foreground/30"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{d.title}</span>
                    <span className="block truncate text-xs text-muted">
                      {d.status === "pending" ? "With the curator for review" : `Sent back${d.rejection_reason ? `: ${d.rejection_reason}` : ""}`}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      d.status === "pending" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {d.status === "pending" ? "In review" : "Sent back"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {posts.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <PenLine className="size-6 text-muted" />
          <p className="mt-3 font-semibold">No hearticles yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted">Be the first: write something only you could have written.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => {
            const tone = DAY_PALETTE[[...post.slug].reduce((n, c) => n + c.charCodeAt(0), 0) % DAY_PALETTE.length];
            return (
              <Link
                key={post.id}
                href={`/hearticles/${post.slug}`}
                className={cn("group block rounded-2xl border p-2 transition hover:-translate-y-0.5 hover:shadow-xl", tone.tile)}
              >
                <div className={cn("relative aspect-[4/3] overflow-hidden rounded-xl border", tone.well)}>
                  <TitleCover
                    title={post.title}
                    speaker={post.author?.name ?? null}
                    speakerAvatarUrl={post.author?.avatar_url ?? null}
                    status={null}
                    number={0}
                    palette={tone}
                    kicker={post.read_minutes ? `${post.read_minutes} min read` : "hearticle"}
                    watermark="“"
                    subtitle={post.note}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

type PublishedRow = {
  id: string;
  slug: string;
  title: string;
  note: string | null;
  read_minutes: number | null;
  created_at: string;
  author: { name: string; avatar_url: string | null } | null;
};

type DraftRow = { id: string; title: string; status: "pending" | "rejected"; rejection_reason: string | null; created_at: string };
