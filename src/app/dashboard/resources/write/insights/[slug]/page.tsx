import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpenCheck,
  Clock,
  Eye,
  Heart,
  Hourglass,
  Laptop,
  Lightbulb,
  Repeat,
  Smartphone,
  Tablet,
  Users,
} from "lucide-react";
import { HearticleCover } from "@/components/hearticles/HearticleCover";
import { loadArticleBySlug } from "@/lib/articleData";
import { formatDuration, loadInsights, type Ranked } from "@/lib/hearticleAnalytics";
import { hearticleTone } from "@/lib/hearticleTone";
import { getViewerProfile } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Hearticle insights", robots: { index: false } };

const pct = (x: number) => `${Math.round(x * 100)}%`;
const shortDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const flag = (code: string) =>
  /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : "🌐";
const countryName = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

/** Only the writer (and the curator) get here. */
export default async function HearticleInsightsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [article, viewer] = await Promise.all([loadArticleBySlug(slug), getViewerProfile()]);
  if (!article || !article.author || !viewer) notFound();
  if (viewer.id !== article.author.id && viewer.role !== "admin") notFound();

  const insights = await loadInsights({ id: article.id, authorId: article.author.id, publishedAt: article.publishedAt, readMinutes: article.readMinutes });
  const { totals } = insights;
  const tone = hearticleTone(slug);
  const accent = tone.accent;
  const mine = viewer.id === article.author.id;

  const kpis = [
    { icon: Eye, label: "Views", value: totals.views.toLocaleString(), hint: `${totals.visitors.toLocaleString()} unique ${totals.visitors === 1 ? "reader" : "readers"}` },
    { icon: BookOpenCheck, label: "Readers", value: totals.readers.toLocaleString(), hint: `${totals.reads.toLocaleString()} full ${totals.reads === 1 ? "read" : "reads"} · ${pct(totals.readRate)} of views` },
    { icon: Clock, label: "Time per read", value: totals.reads ? formatDuration(totals.medianReadSeconds) : "–", hint: article.readMinutes ? `typical · estimate ${article.readMinutes} min` : "typical read" },
    { icon: Hourglass, label: "Total attention", value: formatDuration(totals.totalSeconds), hint: "all visits, active reading only" },
    { icon: Heart, label: "Likes", value: totals.likes.toLocaleString(), hint: `${pct(totals.likeRate)} of readers` },
    { icon: Repeat, label: "Came back", value: totals.returning.toLocaleString(), hint: `${totals.members} cohort ${totals.members === 1 ? "member" : "members"} read it` },
  ];

  const maxDay = Math.max(1, ...insights.daily.map((d) => d.views));
  const maxHour = Math.max(1, ...insights.hours);
  const empty = totals.views === 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <Link href="/dashboard/resources/write" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Hearticles
      </Link>

      <header className="grid gap-5 md:grid-cols-[minmax(0,20rem)_1fr] md:items-center">
        <Link href={`/hearticles/${slug}`} className="block transition hover:-translate-y-0.5">
          <HearticleCover
            title={article.title}
            excerpt={article.excerpt}
            authorName={article.author.name}
            authorAvatarUrl={article.author.avatarUrl}
            readMinutes={article.readMinutes}
            tone={tone}
            className="aspect-[16/10] rounded-2xl border border-white/10"
          />
        </Link>
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase" style={{ color: accent }}>
            {mine ? "your insights" : `insights · ${article.author.name}`}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{article.title}</h1>
          <p className="mt-1 text-sm text-muted">
            Published {new Date(article.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · {article.wordCount} words
          </p>
          <Link
            href={`/hearticles/${slug}`}
            className="mt-3 inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-surface"
          >
            Open the live page <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </header>

      {/* headline numbers */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map(({ icon: Icon, label, value, hint }) => (
          <div key={label} className="relative overflow-hidden rounded-2xl border border-border bg-card p-4">
            <span aria-hidden className="absolute -top-10 -right-10 size-24 rounded-full opacity-15 blur-2xl" style={{ background: accent }} />
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <Icon className="size-3.5" style={{ color: accent }} /> {label}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">{value}</p>
            <p className="mt-1 text-xs leading-snug text-muted">{hint}</p>
          </div>
        ))}
      </section>

      {empty ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="font-semibold">No readers yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Share the link on WhatsApp or LinkedIn. Every visit, how far people read and how long they stay will show up here.
          </p>
        </div>
      ) : (
        <>
          {/* what stood out */}
          {insights.facts.length > 0 ? (
            <section className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`, background: `color-mix(in srgb, ${accent} 7%, transparent)` }}>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Lightbulb className="size-4" style={{ color: accent }} /> What stood out
              </h2>
              <ul className="mt-3 grid gap-x-8 gap-y-2.5 text-[15px] leading-snug sm:grid-cols-2">
                {insights.facts.map((fact) => (
                  <li key={fact} className="flex gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full" style={{ background: accent }} />
                    {fact}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* over time */}
          <Card title="Views and reads over time" subtitle={`Since ${shortDate(insights.daily[0]?.date ?? article.publishedAt.slice(0, 10))}`}>
            <div className="mb-3 flex gap-4 text-xs text-muted">
              <Legend color={`color-mix(in srgb, ${accent} 35%, transparent)`} label="Views" />
              <Legend color={accent} label="Reads" />
            </div>
            <div className="flex h-44 items-end gap-[3px]">
              {insights.daily.map((d) => (
                <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end" title={`${shortDate(d.date)}: ${d.views} views, ${d.reads} reads`}>
                  <div className="relative w-full rounded-t-[3px]" style={{ height: `${(d.views / maxDay) * 100}%`, minHeight: d.views ? 3 : 0, background: `color-mix(in srgb, ${accent} 35%, transparent)` }}>
                    <div className="absolute inset-x-0 bottom-0 rounded-t-[3px]" style={{ height: d.views ? `${(d.reads / d.views) * 100}%` : 0, background: accent }} />
                  </div>
                  <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 rounded-md bg-foreground px-1.5 py-0.5 text-[10px] whitespace-nowrap text-background group-hover:block">
                    {shortDate(d.date)} · {d.views}v · {d.reads}r
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-muted">
              <span>{shortDate(insights.daily[0].date)}</span>
              {insights.daily.length > 2 ? <span>{shortDate(insights.daily[Math.floor(insights.daily.length / 2)].date)}</span> : null}
              <span>{insights.daily.length > 1 ? "Today" : ""}</span>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* scroll depth */}
            <Card title="How far people read" subtitle={`On average, readers get ${totals.avgScroll}% of the way down`}>
              <div className="space-y-3">
                {insights.depth.map((d) => (
                  <div key={d.at} className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3 text-sm">
                    <span className="text-muted">{d.at === 90 ? "The end" : `${d.at}% in`}</span>
                    <div className="h-3 overflow-hidden rounded-full bg-surface">
                      <div className="h-full rounded-full" style={{ width: pct(d.share), background: accent, opacity: 0.35 + d.share * 0.65 }} />
                    </div>
                    <span className="text-right font-semibold tabular-nums">{pct(d.share)}</span>
                  </div>
                ))}
              </div>
              {insights.fastestRead !== null ? (
                <p className="mt-4 text-xs text-muted">
                  Fastest full read {formatDuration(insights.fastestRead)} · longest {formatDuration(insights.longestRead ?? 0)}
                </p>
              ) : null}
            </Card>

            {/* sources */}
            <Card title="Where readers come from" subtitle="From the app or site they opened the link in">
              <Bars items={insights.sources} accent={accent} />
            </Card>

            {/* devices */}
            <Card title="What they read on">
              <div className="flex h-4 overflow-hidden rounded-full">
                {insights.devices.map((d, i) => (
                  <div key={d.label} style={{ width: pct(d.share), background: accent, opacity: 1 - i * 0.3 }} />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {(["mobile", "desktop", "tablet"] as const).map((kind) => {
                  const d = insights.devices.find((x) => x.label === kind);
                  const Icon = kind === "mobile" ? Smartphone : kind === "tablet" ? Tablet : Laptop;
                  return (
                    <div key={kind} className="rounded-xl border border-border p-3">
                      <Icon className="size-4 text-muted" />
                      <p className="mt-2 text-xl font-bold tabular-nums">{pct(d?.share ?? 0)}</p>
                      <p className="text-xs text-muted capitalize">{kind === "mobile" ? "phone" : kind}</p>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* when */}
            <Card title="When they read" subtitle="Hour of day, in each reader's own time zone">
              <div className="flex h-28 items-end gap-[3px]">
                {insights.hours.map((count, hour) => (
                  <div key={hour} className="flex h-full flex-1 items-end" title={`${hour % 12 || 12}${hour < 12 ? "am" : "pm"}: ${count}`}>
                    <div className="w-full rounded-t-[3px]" style={{ height: `${(count / maxHour) * 100}%`, minHeight: count ? 3 : 1, background: count ? accent : "var(--border)", opacity: count ? 0.35 + (count / maxHour) * 0.65 : 1 }} />
                  </div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-4 text-[11px] text-muted">
                <span>12am</span>
                <span>6am</span>
                <span>12pm</span>
                <span>6pm</span>
              </div>
            </Card>

            {/* places */}
            <Card title="Where in the world">
              {insights.countries.length ? (
                <ul className="space-y-2.5">
                  {insights.countries.map((c) => (
                    <li key={c.label} className="flex items-center gap-3 text-sm">
                      <span className="text-lg leading-none">{flag(c.label)}</span>
                      <span className="flex-1 truncate">{countryName(c.label)}</span>
                      <span className="text-muted tabular-nums">{c.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Locations show up for visits on the live site.</p>
              )}
              {insights.cities.length ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {insights.cities.map((c) => (
                    <span key={c.label} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
                      {c.label} · {c.count}
                    </span>
                  ))}
                </div>
              ) : null}
            </Card>

            {/* likes */}
            <Card title="Hearts" subtitle={totals.likes ? `${totals.likes} ${totals.likes === 1 ? "person" : "people"} liked it` : "No likes yet"}>
              {insights.likers.length ? (
                <ul className="flex flex-wrap gap-2">
                  {insights.likers.map((l) => (
                    <li key={l.name} className="flex items-center gap-2 rounded-full border border-border py-1 pr-3 pl-1 text-sm">
                      {l.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.avatarUrl} alt="" className="size-6 rounded-full object-cover" />
                      ) : (
                        <span className="flex size-6 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: accent, color: tone.bg }}>
                          {l.name[0]}
                        </span>
                      )}
                      {l.name}
                    </li>
                  ))}
                </ul>
              ) : null}
              {insights.anonymousLikes ? (
                <p className={cn("flex items-center gap-1.5 text-sm text-muted", insights.likers.length && "mt-3")}>
                  <Users className="size-4" /> {insights.anonymousLikes} from readers outside the cohort
                </p>
              ) : null}
            </Card>
          </div>
        </>
      )}

      <p className="text-xs text-muted">
        Your own visits never count. A read means someone reached the end and spent real time on it, not just scrolled past. Time counts only while
        the tab is open and the reader is active.
      </p>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="font-semibold">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

function Bars({ items, accent }: { items: Ranked[]; accent: string }) {
  if (!items.length) return <p className="text-sm text-muted">Nothing yet.</p>;
  const top = items[0].share || 1;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label} className="relative overflow-hidden rounded-lg px-3 py-2 text-sm">
          <span aria-hidden className="absolute inset-y-0 left-0 rounded-lg" style={{ width: `${(item.share / top) * 100}%`, background: `color-mix(in srgb, ${accent} 18%, transparent)` }} />
          <span className="relative flex items-center justify-between gap-3">
            <span className="truncate font-medium">{item.label}</span>
            <span className="shrink-0 text-muted tabular-nums">
              {item.count} · {pct(item.share)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
