import type { Metadata } from "next";
import Link from "next/link";
import { HearticleCover } from "@/components/hearticles/HearticleCover";
import { CuraiousLogo } from "@/components/home/CuraiousLogo";
import { loadPublishedArticles } from "@/lib/articleData";
import { INVITE_FORM_URL } from "@/lib/content";
import { hearticleTone } from "@/lib/hearticleTone";
import { absoluteUrl } from "@/lib/siteUrl";

export const revalidate = 600;

const description = "Hearticles: the curaious cohort's own thinking, in their own words. Essays on AI, learning and building, by the people in the room.";

export const metadata: Metadata = {
  title: "Hearticles",
  description,
  alternates: {
    canonical: "/hearticles",
    types: { "application/rss+xml": [{ url: "/hearticles/rss.xml", title: "Hearticles · curaious" }] },
  },
  openGraph: { siteName: "curaious", type: "website", url: "/hearticles", title: "Hearticles · curaious", description },
  twitter: { card: "summary_large_image", title: "Hearticles · curaious", description },
};

/** Every published hearticle: the public index the article pages link back to. */
export default async function HearticlesIndexPage() {
  const articles = await loadPublishedArticles();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Hearticles",
    description,
    url: absoluteUrl("/hearticles"),
    publisher: { "@type": "Organization", name: "curaious", url: absoluteUrl("/") },
    blogPost: articles.slice(0, 20).map((a) => ({
      "@type": "BlogPosting",
      headline: a.title,
      url: absoluteUrl(`/hearticles/${a.slug}`),
      datePublished: a.publishedAt,
      author: a.author ? { "@type": "Person", name: a.author.name } : undefined,
    })),
  };

  return (
    <div className="landing-dark min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

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
        <div className="mx-auto w-full max-w-5xl">
          <p className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">— hearticles</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">Written by the room</h1>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted">
            The cohort&rsquo;s own thinking, in their own words. No pasting, no ghostwriting: just people working out what they think.
          </p>

          {articles.length === 0 ? (
            <p className="mt-12 rounded-3xl border border-dashed border-white/15 p-10 text-center text-muted">The first hearticles are being written.</p>
          ) : (
            <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((a) => (
                <li key={a.slug}>
                  <Link href={`/hearticles/${a.slug}`} className="group block transition hover:-translate-y-0.5">
                    <HearticleCover
                      title={a.title}
                      excerpt={a.excerpt}
                      authorName={a.author?.name ?? null}
                      authorAvatarUrl={a.author?.avatarUrl ?? null}
                      readMinutes={a.readMinutes}
                      tone={hearticleTone(a.slug)}
                      className="aspect-[4/3] rounded-2xl border border-white/10 transition group-hover:shadow-xl"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <footer className="px-5 py-10 md:px-8 md:py-12">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-8">
          <Link href="/" className="focus-ring">
            <CuraiousLogo className="text-base opacity-80" />
            <span className="sr-only">curaious home</span>
          </Link>
          <div className="flex items-center gap-5 font-mono text-[11px] tracking-[0.18em] text-muted uppercase">
            <a href="/hearticles/rss.xml" className="hover:text-foreground">rss</a>
            <span>© {new Date().getFullYear()} curaious</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
