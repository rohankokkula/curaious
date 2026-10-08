import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { BookOpenCheck, ChartNoAxesColumn, Eye } from "lucide-react";
import { MarkdownRenderer } from "@/components/dashboard/MarkdownRenderer";
import { HearticleCover } from "@/components/hearticles/HearticleCover";
import { HearticleTracker } from "@/components/hearticles/HearticleTracker";
import { LikeButton } from "@/components/hearticles/LikeButton";
import { HearticleReveal } from "@/components/hearticles/HearticleReveal";
import { ReadingProgress } from "@/components/hearticles/ReadingProgress";
import { ShareButtons } from "@/components/hearticles/ShareButtons";
import { CuraiousLogo } from "@/components/home/CuraiousLogo";
import { loadArticleBySlug, loadPublishedArticles } from "@/lib/articleData";
import { INVITE_FORM_URL } from "@/lib/content";
import { hasLiked, loadPublicStats, VISITOR_COOKIE } from "@/lib/hearticleAnalytics";
import { hearticleTone } from "@/lib/hearticleTone";
import { getSessionUser, getViewerProfile } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/siteUrl";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await loadArticleBySlug(slug);
  if (!article) return { title: "Hearticle not found", robots: { index: false } };

  const description = article.excerpt ?? article.body.replace(/[#>*_`[\]()!-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  const url = `/hearticles/${slug}`;
  const image = {
    url: ogImagePath(slug, article.updatedAt),
    width: 1200,
    height: 630,
    type: "image/png",
    alt: `${article.title}, a hearticle${article.author ? ` by ${article.author.name}` : ""}`,
  };

  // Indexable on purpose: approving a hearticle is the publish decision.
  // The share image is the hearticle's cover, from /og/hearticle/[slug].
  return {
    title: article.title,
    description,
    keywords: article.tags,
    authors: article.author ? [{ name: article.author.name }] : undefined,
    alternates: {
      canonical: url,
      types: { "application/rss+xml": [{ url: "/hearticles/rss.xml", title: "Hearticles · curaious" }] },
    },
    openGraph: {
      siteName: "curaious",
      type: "article",
      url,
      title: article.title,
      description,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: article.author ? [article.author.name] : undefined,
      section: "Hearticles",
      tags: article.tags,
      images: [image],
    },
    // Replaces the root's twitter block (the home card).
    twitter: { card: "summary_large_image", title: article.title, description, images: [image] },
    robots: { index: true, follow: true, "max-image-preview": "large" },
  };
}

/** Versioned by the last edit, so chat apps re-fetch the card after a change. */
const ogImagePath = (slug: string, updatedAt: string) => `/og/hearticle/${slug}?v=${new Date(updatedAt).getTime().toString(36)}`;

const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

function AuthorFace({ name, src, className }: { name: string; src: string | null; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn("shrink-0 rounded-full object-cover", className)} />;
  }
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-surface font-semibold text-muted", className)}>{initials}</span>;
}

export default async function HearticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [article, all] = await Promise.all([loadArticleBySlug(slug), loadPublishedArticles(12)]);
  if (!article) notFound();

  const user = await getSessionUser();
  const visitor = (await cookies()).get(VISITOR_COOKIE)?.value ?? null;
  const [stats, liked, viewer] = await Promise.all([
    loadPublicStats(article.id, article.author?.id ?? null),
    hasLiked(article.id, user?.id ?? visitor),
    user ? getViewerProfile() : Promise.resolve(null),
  ]);
  const canSeeInsights = Boolean(viewer && (viewer.id === article.author?.id || viewer.role === "admin"));

  const tone = hearticleTone(slug);
  const url = absoluteUrl(`/hearticles/${slug}`);
  const more = all.filter((a) => a.slug !== slug).slice(0, 2);

  // Structured data: the post itself, and where it sits on the site.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.title,
      description: article.excerpt ?? undefined,
      image: [absoluteUrl(ogImagePath(slug, article.updatedAt))],
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      wordCount: article.wordCount,
      timeRequired: article.readMinutes ? `PT${article.readMinutes}M` : undefined,
      keywords: article.tags.join(", ") || undefined,
      inLanguage: "en",
      url,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      isPartOf: { "@type": "Blog", name: "Hearticles", url: absoluteUrl("/hearticles") },
      author: article.author ? { "@type": "Person", name: article.author.name, jobTitle: article.author.headline ?? undefined } : undefined,
      publisher: { "@type": "Organization", name: "curaious", url: absoluteUrl("/"), logo: { "@type": "ImageObject", url: absoluteUrl("/apple-icon") } },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "curaious", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Hearticles", item: absoluteUrl("/hearticles") },
        { "@type": "ListItem", position: 3, name: article.title, item: url },
      ],
    },
  ];

  return (
    <div className="landing-dark min-h-screen" style={{ "--tone": tone.accent } as React.CSSProperties}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ReadingProgress color={tone.accent} />
      <HearticleTracker slug={slug} />

      <header className="px-5 py-5 md:px-8 md:py-7">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
          <Link href="/" className="focus-ring">
            <CuraiousLogo className="text-lg" />
            <span className="sr-only">curaious home</span>
          </Link>
          <a
            href={INVITE_FORM_URL}
            target="_blank"
            rel="noreferrer"
            className="focus-ring bg-foreground px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-background transition hover:bg-accent sm:px-4"
          >
            get an invite
          </a>
        </div>
      </header>

      <main className="px-5 pb-16 md:px-8 md:pb-24">
        <article className="mx-auto w-full max-w-5xl" itemScope itemType="https://schema.org/BlogPosting">

          <HearticleCover
            title={article.title}
            excerpt={article.excerpt}
            authorName={article.author?.name ?? null}
            authorAvatarUrl={article.author?.avatarUrl ?? null}
            readMinutes={article.readMinutes}
            tone={tone}
            size="lg"
            className="min-h-[22rem] rounded-3xl border border-white/10 shadow-2xl md:min-h-[26rem]"
          />

          {/* the text runs the banner's full width, edges aligned with it */}
          <div className="mt-10 md:mt-14">
            <div className="min-w-0">
              {/* byline */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
                {article.author ? (
                  <div className="flex items-center gap-3" itemProp="author" itemScope itemType="https://schema.org/Person">
                    <AuthorFace name={article.author.name} src={article.author.avatarUrl} className="size-11 text-sm" />
                    <div className="min-w-0 text-sm">
                      <p className="font-semibold text-foreground" itemProp="name">{article.author.name}</p>
                      {article.author.headline ? <p className="truncate text-muted">{article.author.headline}</p> : null}
                    </div>
                  </div>
                ) : (
                  <span />
                )}
                <div className="flex flex-col gap-2 sm:items-end">
                  <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">
                    <time dateTime={article.publishedAt} itemProp="datePublished">{longDate(article.publishedAt)}</time>
                    {article.readMinutes ? ` · ${article.readMinutes} min read` : ""}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
                    {stats.views > 0 ? (
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <Eye className="size-4" /> {compact(stats.views)} {stats.views === 1 ? "view" : "views"}
                      </span>
                    ) : null}
                    {stats.reads > 0 ? (
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <BookOpenCheck className="size-4" /> {compact(stats.reads)} {stats.reads === 1 ? "read" : "reads"}
                      </span>
                    ) : null}
                    <LikeButton slug={slug} initialLiked={liked} initialCount={stats.likes} color={tone.accent} />
                  </div>
                </div>
              </div>

              {canSeeInsights ? (
                <Link
                  href={`/dashboard/resources/write/insights/${slug}`}
                  className="focus-ring mt-4 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition hover:bg-white/5"
                  style={{ borderColor: `color-mix(in srgb, ${tone.accent} 35%, transparent)` }}
                >
                  <span className="inline-flex items-center gap-2 font-medium" style={{ color: tone.accent }}>
                    <ChartNoAxesColumn className="size-4" /> {viewer?.id === article.author?.id ? "Your insights" : "Writer insights"}
                  </span>
                  <span className="text-muted">only you see this →</span>
                </Link>
              ) : null}

              <HearticleReveal className="mt-10" data-hearticle-body>
                <MarkdownRenderer markdown={article.body} className="hearticle-prose" />
              </HearticleReveal>

              {article.tags.length > 0 ? (
                <div className="mt-12 flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/12 px-3 py-1 text-xs text-muted">
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}

              {/* end of the text: like it, share it */}
              <div className="mt-10 flex flex-col items-center gap-5 rounded-3xl border border-white/10 px-5 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
                <div>
                  <p className="text-lg font-semibold text-foreground">Did this one land?</p>
                  <p className="mt-0.5 text-sm text-muted">Leave a heart for {article.author?.name.split(" ")[0] ?? "the writer"}, or pass it on.</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <LikeButton slug={slug} initialLiked={liked} initialCount={stats.likes} color={tone.accent} size="lg" />
                  <ShareButtons url={url} title={article.title} />
                </div>
              </div>

              {/* written by */}
              {article.author ? (
                <div
                  className="relative mt-12 overflow-hidden rounded-3xl border border-white/10 p-6 md:p-8"
                  style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${tone.accent} 16%, ${tone.bg}), ${tone.bg})` }}
                >
                  <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <AuthorFace name={article.author.name} src={article.author.avatarUrl} className="size-14 text-base ring-2 ring-white/15" />
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: tone.accent }}>written by</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{article.author.name}</p>
                        {article.author.headline ? <p className="text-sm text-muted">{article.author.headline}</p> : null}
                      </div>
                    </div>
                    <Link
                      href="/hearticles"
                      className="focus-ring shrink-0 self-start rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-white/10 sm:self-auto"
                    >
                      All hearticles →
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* more hearticles */}
          {more.length > 0 ? (
            <section className="mx-auto mt-20 max-w-5xl" aria-labelledby="more-hearticles">
              <h2 id="more-hearticles" className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
                more hearticles
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {more.map((post) => (
                  <Link key={post.slug} href={`/hearticles/${post.slug}`} className="group block transition hover:-translate-y-0.5">
                    <HearticleCover
                      title={post.title}
                      excerpt={post.excerpt}
                      authorName={post.author?.name ?? null}
                      authorAvatarUrl={post.author?.avatarUrl ?? null}
                      readMinutes={post.readMinutes}
                      tone={hearticleTone(post.slug)}
                      className="aspect-[16/10] rounded-2xl border border-white/10"
                    />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </article>
      </main>

      <footer className="px-5 py-10 md:px-8 md:py-12">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-8">
          <Link href="/" className="focus-ring">
            <CuraiousLogo className="text-base opacity-80" />
            <span className="sr-only">curaious home</span>
          </Link>
          <div className="flex items-center gap-5 font-mono text-[11px] tracking-[0.18em] text-muted uppercase">
            <Link href="/hearticles" className="hover:text-foreground">hearticles</Link>
            <a href="/hearticles/rss.xml" className="hover:text-foreground">rss</a>
            <span>© {new Date().getFullYear()} curaious</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
