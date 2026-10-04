import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, PlayCircle, Rocket, Trophy } from "lucide-react";
import { BadgeArt } from "@/components/dashboard/BadgeArt";
import { CuraiousLogo } from "@/components/home/CuraiousLogo";
import { Section, SectionKicker, SectionTitle } from "@/components/home/Section";
import { GithubIcon, LinkedinIcon, XIcon } from "@/components/icons/SocialIcons";
import { BADGES } from "@/lib/badges";
import { INVITE_FORM_URL } from "@/lib/content";
import { pageMetadata } from "@/lib/og/metadata";
import { RATING_MAX } from "@/lib/ratings";
import type { ShowcasePerson, ShowcaseSession } from "@/lib/showcase";
import { loadCohortPage } from "@/lib/showcaseData";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Which season this page is about. /cohort2 would be a copy with 2. */
const SEASON_NUMBER = 1;

/**
 * Unlisted, not private: nothing links here and crawlers are asked to stay
 * away, but anyone with the URL can read it without signing in. Every field
 * comes from loadCohortPage, already filtered against each member's own
 * visibility settings. Recordings and decks stay members-only.
 */
export const metadata: Metadata = pageMetadata("showcase", {
  title: "Cohort 01",
  robots: { index: false, follow: false },
});

const DAY_TONES = [
  "border-violet-400/25 bg-violet-950/50",
  "border-cyan-400/25 bg-cyan-950/50",
  "border-rose-400/25 bg-rose-950/50",
  "border-emerald-400/25 bg-emerald-950/50",
  "border-indigo-400/25 bg-indigo-950/50",
  "border-fuchsia-400/25 bg-fuchsia-950/50",
];
const TONE_TEXT = ["text-violet-300", "text-cyan-300", "text-rose-300", "text-emerald-300", "text-indigo-300", "text-fuchsia-300"];

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Face({ name, src, className }: { name: string | null; src: string | null; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" loading="lazy" className={cn("shrink-0 rounded-full object-cover", className)} />;
  }
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-white/[0.06] font-mono text-[10px] text-muted", className)}>
      {name ? initialsFor(name) : "··"}
    </span>
  );
}

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const rangeLabel = (from: string, to: string) => {
  const f = new Date(`${from}T00:00:00Z`);
  const t = new Date(`${to}T00:00:00Z`);
  const opts = { day: "numeric", month: "short", timeZone: "UTC" } as const;
  return `${f.toLocaleDateString("en-GB", opts)} – ${t.toLocaleDateString("en-GB", { ...opts, year: "numeric" })}`;
};

/** Monday-anchored week key, same grouping as the members' schedule. */
function weekKey(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function SessionCard({ session, tone }: { session: ShowcaseSession; tone: number }) {
  const isTalk = session.type === "talk";
  const open = Math.max(0, session.capacity - session.seats.length);
  const Icon = session.type === "kickoff" ? Rocket : Trophy;

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border p-4",
        isTalk ? DAY_TONES[tone % DAY_TONES.length] : "border-white/10 bg-white/[0.03]",
      )}
    >
      <p className={cn("font-mono text-[10px] uppercase tracking-[0.18em]", isTalk ? TONE_TEXT[tone % TONE_TEXT.length] : "text-muted")}>
        {dayLabel(session.date)}
      </p>
      <h3 className="mt-1.5 text-base font-semibold capitalize leading-snug">{session.label}</h3>

      {isTalk ? (
        <ul className="mt-3 space-y-2">
          {session.seats.map((seat, i) => (
            <li key={i} className="flex items-center gap-2.5 rounded-xl bg-black/25 p-2.5">
              <Face name={seat.speakerName} src={seat.speakerAvatarUrl} className="size-8" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{seat.title ?? "A talk from the cohort"}</p>
                <p className="truncate text-[11px] text-muted">
                  {seat.speakerName ?? "a member"} · {seat.presented ? "presented" : "booked"}
                </p>
              </div>
            </li>
          ))}
          {Array.from({ length: open }).map((_, i) => (
            <li key={`open-${i}`} className="rounded-xl border border-dashed border-white/15 p-2.5 text-[12px] text-muted">
              Open seat
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 flex items-center gap-2.5 text-[13px] text-muted">
          <Icon className="size-4 shrink-0" />
          {session.type === "kickoff" ? "The whole cohort, meeting for the first time." : "The season's close, and its badges."}
        </div>
      )}

      {session.recorded ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted">
          <PlayCircle className="size-3.5" /> Recorded · members only
        </p>
      ) : null}
    </div>
  );
}

function PersonCard({ person }: { person: ShowcasePerson }) {
  const links = [
    { href: person.linkedinUrl, icon: LinkedinIcon, label: "LinkedIn" },
    { href: person.twitterUrl, icon: XIcon, label: "X" },
    { href: person.githubUrl, icon: GithubIcon, label: "GitHub" },
  ].filter((l): l is { href: string; icon: typeof LinkedinIcon; label: string } => Boolean(l.href));
  const talk = person.talk;
  const topComment = talk?.comments[0];

  return (
    <article className="flex flex-col rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-start gap-3.5">
        <Face name={person.name} src={person.avatarUrl} className="size-14 text-sm" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">{person.name}</h3>
          {person.headline ? <p className="mt-0.5 line-clamp-2 text-sm text-muted">{person.headline}</p> : null}
          {person.location ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted">
              <MapPin className="size-3" /> {person.location}
            </p>
          ) : null}
        </div>
      </div>

      {person.tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {person.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full border border-border/70 px-2.5 py-0.5 text-[11px] text-muted">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {talk ? (
        <div className="mt-4 rounded-xl border border-border/60 bg-surface/60 p-3.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">their talk</p>
          <p className="mt-1 text-[15px] font-semibold leading-snug">{talk.title}</p>
          {talk.scores ? (
            <p className="mt-2 text-sm">
              <span className="font-bold tabular-nums">{talk.scores.overall}</span>
              <span className="text-muted"> / {RATING_MAX} from {talk.scores.count}</span>
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-muted">{talk.slotLabel ? `${talk.slotLabel}${talk.slotDate ? ` · ${dayLabel(talk.slotDate)}` : ""}` : ""}</p>
          )}
          {topComment ? (
            <p className="mt-2 border-l-2 border-border pl-2.5 text-[13px] leading-relaxed text-muted">
              &ldquo;{topComment.text}&rdquo;
              {topComment.raterName ? <span className="mt-1 block text-[11px]">{topComment.raterName}</span> : null}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <div className="flex gap-1.5">
          {person.badges.map((key) => (
            <span key={key} title={`${BADGES[key].name}: ${BADGES[key].awardedFor}`}>
              <BadgeArt badge={key} className="w-7" />
            </span>
          ))}
        </div>
        {links.length > 0 ? (
          <div className="flex items-center gap-1.5">
            {links.map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="flex size-8 items-center justify-center rounded-full border border-border/70 text-muted transition hover:text-foreground"
              >
                <Icon className="size-3.5" />
                <span className="sr-only">
                  {person.name} on {label}
                </span>
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default async function CohortPage() {
  const { season, sessions, people } = await loadCohortPage(SEASON_NUMBER);

  const weeks = [...new Set(sessions.map((s) => weekKey(s.date)))].sort().map((key) => ({
    key,
    sessions: sessions.filter((s) => weekKey(s.date) === key).sort((a, b) => a.date.localeCompare(b.date)),
  }));
  const seats = sessions.flatMap((s) => s.seats);
  const presented = seats.filter((s) => s.presented).length;
  let talkIndex = 0;

  return (
    <div className="landing-dark min-h-screen">
      <header className="px-5 py-6 md:px-8 md:py-8">
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

      <main>
        {/* hero */}
        <Section className="pt-6 md:pt-10">
          <SectionKicker index={String(SEASON_NUMBER).padStart(2, "0")} label={season?.name ?? "cohort"} />
          <h1 className="heading-display mt-6 text-balance text-[2.25rem] leading-[1.08] md:text-[3.75rem]">
            ten curious minds.
            <span className="block text-muted">one season, in public.</span>
          </h1>
          {season ? (
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{rangeLabel(season.startsOn, season.endsOn)}</p>
          ) : null}

          {people.length > 0 ? (
            <div className="mt-8 flex -space-x-2.5">
              {people.slice(0, 12).map((p) => (
                <span key={p.id} className="rounded-full ring-2 ring-background" title={p.name}>
                  <Face name={p.name} src={p.avatarUrl} className="size-10 sm:size-12" />
                </span>
              ))}
            </div>
          ) : null}

          <dl className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {[
              { k: "members", v: people.length },
              { k: "talks booked", v: seats.length },
              { k: "presented", v: presented },
            ].map(({ k, v }) => (
              <div key={k} className="rounded-2xl border border-border/60 bg-card p-4">
                <dd className="text-2xl font-bold tabular-nums md:text-3xl">{v}</dd>
                <dt className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{k}</dt>
              </div>
            ))}
          </dl>
        </Section>

        {/* the season */}
        <Section className="pt-0">
          <SectionKicker index="01" label="the season" />
          <SectionTitle className="mt-6">week by week.</SectionTitle>
          {weeks.length === 0 ? (
            <p className="mt-8 text-sm text-muted">The schedule isn&rsquo;t up yet.</p>
          ) : (
            <ol className="mt-10 space-y-8">
              {weeks.map((week, wi) => (
                <li key={week.key} className="grid gap-4 md:grid-cols-[110px_minmax(0,1fr)] md:gap-6">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent md:pt-4">week {wi + 1}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {week.sessions.map((session) => {
                      const tone = session.type === "talk" ? talkIndex++ : 0;
                      return <SessionCard key={session.id} session={session} tone={tone} />;
                    })}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>

        {/* the people */}
        <Section className="pt-0">
          <SectionKicker index="02" label="the people" />
          <SectionTitle className="mt-6">who&apos;s in the room.</SectionTitle>
          {people.length === 0 ? (
            <p className="mt-8 text-sm text-muted">Nobody to show yet.</p>
          ) : (
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {people.map((person) => (
                <PersonCard key={person.id} person={person} />
              ))}
            </div>
          )}
        </Section>

        {/* next cohort */}
        <Section className="pt-0">
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-surface px-6 py-12 text-center md:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-40 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(224,138,90,0.14)_0%,rgba(224,138,90,0.05)_40%,transparent_70%)]"
            />
            <div className="relative">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">next cohort</p>
              <h2 className="heading-display mx-auto mt-4 max-w-2xl text-balance text-[1.75rem] leading-[1.15] md:text-[2.75rem]">
                want a seat at the next table?
              </h2>
              <a
                href={INVITE_FORM_URL}
                target="_blank"
                rel="noreferrer"
                className="focus-ring group mt-8 inline-flex items-center gap-3 bg-foreground px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.2em] text-background transition hover:bg-accent hover:text-foreground"
              >
                get an invite
                <span aria-hidden className="transition group-hover:translate-x-1">
                  →
                </span>
              </a>
            </div>
          </div>
        </Section>
      </main>

      <footer className="px-5 py-10 md:px-8 md:py-12">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
          <Link href="/" className="focus-ring">
            <CuraiousLogo className="text-base opacity-80" />
            <span className="sr-only">curaious home</span>
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">© {new Date().getFullYear()} curaious</span>
        </div>
      </footer>
    </div>
  );
}
