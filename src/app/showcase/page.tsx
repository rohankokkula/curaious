import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { GithubIcon, LinkedinIcon, XIcon } from "@/components/icons/SocialIcons";
import { CuraiousLogo } from "@/components/home/CuraiousLogo";
import { Section, SectionKicker } from "@/components/home/Section";
import { parseRecordingUrl } from "@/lib/recording";
import { RATING_MAX, RATING_PARAMETERS } from "@/lib/ratings";
import type { ShowcaseSpeaker } from "@/lib/showcase";
import { loadShowcase } from "@/lib/showcaseData";

export const dynamic = "force-dynamic";

/**
 * Unlisted, not private. Nothing links here and crawlers are asked to stay
 * away, but anyone with the URL can read it without signing in — which is why
 * every field below comes from /api/showcase already filtered against each
 * member's own visibility settings.
 */
export const metadata: Metadata = {
  title: "cohort 01",
  description: "talks and speakers from the first curaious cohort.",
  robots: { index: false, follow: false },
};

function initialsFor(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5 text-accent">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className="size-4" fill={value >= n - 0.25 ? "currentColor" : "none"} strokeWidth={1.5} />
      ))}
    </div>
  );
}

function Recording({ url, title }: { url: string; title: string }) {
  const recording = parseRecordingUrl(url);

  // An unrecognised link is never put in an iframe — members supply these.
  if (!recording) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="focus-ring inline-block text-sm text-accent underline underline-offset-4"
      >
        watch the recording
      </a>
    );
  }

  return (
    <div className="aspect-video overflow-hidden rounded-xl border border-border bg-surface">
      <iframe
        src={recording.embedUrl}
        title={`Recording of ${title}`}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="size-full"
      />
    </div>
  );
}

function Speaker({ speaker, index }: { speaker: ShowcaseSpeaker; index: number }) {
  const { talk } = speaker;

  const socialLinks = [
    { href: speaker.linkedinUrl, icon: LinkedinIcon, label: "LinkedIn" },
    { href: speaker.twitterUrl, icon: XIcon, label: "X" },
    { href: speaker.githubUrl, icon: GithubIcon, label: "GitHub" },
  ].filter((link): link is { href: string; icon: typeof LinkedinIcon; label: string } =>
    Boolean(link.href),
  );

  return (
    <article className="section-seam relative py-16 first:pt-0 md:py-24">
      <div className="grid gap-10 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] md:gap-16">
        <div className="md:sticky md:top-24 md:self-start">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
            {String(index + 1).padStart(2, "0")}
          </span>

          <div className="mt-5 flex items-center gap-4">
            {speaker.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={speaker.avatarUrl}
                alt=""
                className="size-16 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-surface text-lg font-semibold text-muted">
                {initialsFor(speaker.name)}
              </span>
            )}
            <div className="min-w-0">
              <h2 className="heading-display text-2xl leading-tight">{speaker.name}</h2>
              {speaker.headline ? (
                <p className="mt-1 text-sm text-muted">{speaker.headline}</p>
              ) : null}
            </div>
          </div>

          {speaker.location ? (
            <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted">
              <MapPin aria-hidden className="size-4" />
              {speaker.location}
            </p>
          ) : null}

          {speaker.bio ? (
            <p className="mt-4 text-[15px] leading-relaxed text-muted">{speaker.bio}</p>
          ) : null}

          {speaker.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {speaker.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          {socialLinks.length > 0 ? (
            <div className="mt-5 flex items-center gap-4 text-muted">
              {socialLinks.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring transition hover:text-foreground"
                >
                  <Icon className="size-4" />
                  <span className="sr-only">
                    {speaker.name} on {label}
                  </span>
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          {!talk ? (
            <p className="text-sm text-muted">Talk details aren&rsquo;t public.</p>
          ) : (
            <>
              {talk.slotLabel ? (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                  {talk.slotLabel}
                </p>
              ) : null}
              <h3 className="heading-display mt-3 text-balance text-2xl leading-tight md:text-4xl">
                {talk.title}
              </h3>
              <p className="prose-quiet mt-5 max-w-2xl">{talk.description}</p>

              {talk.recordingUrl ? (
                <div className="mt-8">
                  <Recording url={talk.recordingUrl} title={talk.title} />
                </div>
              ) : null}

              {talk.scores ? (
                <div className="mt-10 rounded-xl border border-border/60 bg-card p-5 md:p-6">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                        what the room scored it
                      </p>
                      <p className="mt-2 text-3xl font-bold">
                        {talk.scores.overall}
                        <span className="text-lg font-medium text-muted"> / {RATING_MAX}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <Stars value={talk.scores.overall ?? 0} />
                      <p className="mt-1.5 text-xs text-muted">
                        {talk.scores.count} {talk.scores.count === 1 ? "response" : "responses"}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-6 space-y-2.5">
                    {RATING_PARAMETERS.map((parameter) => {
                      const value = talk.scores?.[parameter.key] ?? null;
                      return (
                        <div key={parameter.key} className="flex items-center gap-3">
                          <dt className="w-32 shrink-0 text-xs text-muted">{parameter.label}</dt>
                          <dd className="flex flex-1 items-center gap-3">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                              <span
                                className="block h-full rounded-full bg-accent"
                                style={{ width: `${((value ?? 0) / RATING_MAX) * 100}%` }}
                              />
                            </span>
                            <span className="w-8 text-right text-xs font-semibold">{value ?? "–"}</span>
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              ) : null}

              {talk.comments.length > 0 ? (
                <ul className="mt-6 space-y-3">
                  {talk.comments.map((comment, i) => (
                    <li key={i} className="rounded-xl border border-border/60 p-4">
                      <p className="text-[15px] leading-relaxed">&ldquo;{comment.text}&rdquo;</p>
                      {comment.raterName ? (
                        <p className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                          {comment.raterName}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default async function ShowcasePage() {
  const { speakers, cohort } = await loadShowcase();

  return (
    <div className="landing-dark min-h-screen">
      <header className="px-5 py-6 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-5xl">
          <Link href="/" className="focus-ring">
            <CuraiousLogo className="text-lg" />
            <span className="sr-only">curaious home</span>
          </Link>
        </div>
      </header>

      <main>
        <Section seam={false} className="pt-8 md:pt-12">
          <SectionKicker
            index={cohort ? String(cohort.number).padStart(2, "0") : "01"}
            label="cohort"
          />
          <h1 className="heading-display mt-6 text-balance text-[2.25rem] leading-[1.08] md:text-[3.5rem]">
            what the first ten
            <span className="block text-muted">actually built.</span>
          </h1>
          <p className="prose-quiet mt-7 max-w-xl">
            {cohort?.name ? `${cohort.name}. ` : ""}Every talk, every speaker, and the
            scores the room gave them.
          </p>
        </Section>

        <Section seam={false} className="pt-0">
          {speakers.length === 0 ? (
            <p className="text-sm text-muted">Nothing to show here yet.</p>
          ) : (
            <div>
              {speakers.map((speaker, index) => (
                <Speaker key={speaker.id} speaker={speaker} index={index} />
              ))}
            </div>
          )}
        </Section>
      </main>

      <footer className="section-seam relative px-5 py-10 md:px-8 md:py-12">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
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
