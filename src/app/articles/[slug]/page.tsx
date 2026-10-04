import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CuraiousLogo } from "@/components/home/CuraiousLogo";
import { Section } from "@/components/home/Section";
import { MarkdownRenderer } from "@/components/dashboard/MarkdownRenderer";
import { loadArticleBySlug } from "@/lib/articleData";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await loadArticleBySlug(slug);
  if (!article) return { title: "Article not found" };

  // Deliberately no `robots: noindex` — unlike /cohort1, a published
  // article is meant to be found. The submit-for-review step was the
  // publish decision; there's no separate "make this public" toggle.
  return {
    title: article.title,
    description: article.excerpt ?? undefined,
    // The image comes from ./opengraph-image.tsx (the article's own card).
    openGraph: {
      siteName: "curaious",
      title: article.title,
      description: article.excerpt ?? undefined,
      type: "article",
      publishedTime: article.publishedAt,
      authors: article.author ? [article.author.name] : undefined,
      tags: article.tags,
    },
    // Replaces the root's twitter block, which points at the home card;
    // with no twitter:image, X falls back to this page's og:image.
    twitter: { card: "summary_large_image", title: article.title, description: article.excerpt ?? undefined },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await loadArticleBySlug(slug);
  if (!article) notFound();

  return (
    <div className="landing-dark min-h-screen">
      <header className="px-5 py-6 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-3xl">
          <Link href="/" className="focus-ring">
            <CuraiousLogo className="text-lg" />
            <span className="sr-only">curaious home</span>
          </Link>
        </div>
      </header>

      <main>
        <Section className="pt-4 md:pt-8">
          <div className="mx-auto max-w-3xl">
            {article.author ? (
              <div className="flex items-center gap-3">
                {article.author.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={article.author.avatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-muted">
                    {article.author.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-foreground">{article.author.name}</p>
                  <p className="text-muted">
                    {new Date(article.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {article.readMinutes ? ` · ${article.readMinutes} min read` : ""}
                  </p>
                </div>
              </div>
            ) : null}

            <h1 className="heading-display mt-6 text-balance text-[2rem] leading-tight md:text-[2.75rem]">
              {article.title}
            </h1>

            {article.excerpt ? <p className="prose-quiet mt-4 max-w-2xl">{article.excerpt}</p> : null}

            {article.tags.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <MarkdownRenderer markdown={article.body} className="mt-10" />
          </div>
        </Section>
      </main>

      <footer className="section-seam relative px-5 py-10 md:px-8 md:py-12">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
          <Link href="/" className="focus-ring">
            <CuraiousLogo className="text-base opacity-80" />
            <span className="sr-only">curaious home</span>
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            © {new Date().getFullYear()} curaious
          </span>
        </div>
      </footer>
    </div>
  );
}
