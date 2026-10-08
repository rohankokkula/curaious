/**
 * SERVER-ONLY. Imports the service-role client.
 *
 * Hearticle views, reads and likes (tables from 0014_hearticle_analytics.sql,
 * service role only). The public page gets three counts; the writer's
 * insights page gets everything aggregated here from the raw visit rows. A
 * cohort's hearticles get hundreds of visits, not millions, so aggregating
 * in JS from one select is simpler than a pile of SQL views.
 *
 * The author's own visits (profile_id = author) never count.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const VISITOR_COOKIE = "cv_vid";

/* ───────────────────────── classifying a visit ───────────────────────── */

export function deviceFrom(ua: string): "mobile" | "tablet" | "desktop" {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Android|IEMobile|Opera Mini/i.test(ua)) return "mobile";
  return "desktop";
}

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp\/|headless|lighthouse|python|curl|wget|axios|node-fetch/i;
export const isBot = (ua: string) => !ua || BOTS.test(ua);

/**
 * Where the reader came from. In-app browsers say so in the user agent (and
 * often send no referrer at all); Android apps opening a Chrome tab send an
 * android-app:// referrer; otherwise the referrer host, then ?utm_source.
 */
export function sourceFrom(ua: string, referrer: string | null, utm: string | null, siteHost: string): { source: string; host: string | null } {
  let host: string | null = null;
  try {
    host = referrer ? new URL(referrer).hostname.replace(/^www\./, "") : null;
  } catch {
    host = null;
  }
  const r = (referrer ?? "").toLowerCase();

  if (/WhatsApp/i.test(ua) || r.includes("com.whatsapp") || host?.endsWith("whatsapp.com")) return { source: "WhatsApp", host };
  if (/Instagram/i.test(ua) || host?.endsWith("instagram.com")) return { source: "Instagram", host };
  if (/LinkedInApp/i.test(ua) || host?.endsWith("linkedin.com") || host === "lnkd.in" || r.includes("com.linkedin")) return { source: "LinkedIn", host };
  if (/FBAN|FBAV/i.test(ua) || host?.endsWith("facebook.com") || r.includes("com.facebook")) return { source: "Facebook", host };
  if (/Twitter/i.test(ua) || host === "t.co" || host?.endsWith("x.com") || host?.endsWith("twitter.com")) return { source: "X", host };
  if (r.includes("org.telegram") || host?.endsWith("t.me") || host?.includes("telegram")) return { source: "Telegram", host };
  if (host?.includes("slack")) return { source: "Slack", host };
  if (host?.includes("discord")) return { source: "Discord", host };
  if (host && /(^|\.)google\.|bing\.com|duckduckgo|yahoo\.|ecosia|perplexity|chatgpt\.com|openai/.test(host)) {
    return { source: /perplexity|chatgpt|openai/.test(host) ? "AI search" : "Search", host };
  }
  if (host && (host === siteHost || host.endsWith(".vercel.app") || host === "localhost")) return { source: "curaious", host };
  if (host?.includes("mail")) return { source: "Email", host };
  if (host) return { source: host, host };
  if (utm) return { source: utm.slice(0, 40), host: null };
  return { source: "Direct", host: null };
}

/**
 * A view becomes a "read" once the reader reached the end of the text
 * (85%+ scrolled) and spent at least a quarter of the estimated read time
 * actually reading (min 15s), so skimming to the bottom doesn't count.
 */
export function isReadDone(maxScroll: number, activeSeconds: number, readMinutes: number | null) {
  const needed = Math.max(15, Math.round((readMinutes ?? 2) * 60 * 0.25));
  return maxScroll >= 85 && activeSeconds >= needed;
}

/** The bits of a published hearticle the tracking routes need. */
export async function trackableArticle(slug: string) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("resource_links")
    .select("id, added_by, read_minutes")
    .eq("slug", slug)
    .eq("kind", "article")
    .eq("status", "approved")
    .maybeSingle<{ id: string; added_by: string; read_minutes: number | null }>();
  return data;
}

/* ───────────────────────── public counts ───────────────────────── */

/** views = every visit; reads = visits read to the end; readers = distinct
 * people behind those reads (someone who read it twice is one reader). */
export type PublicStats = { views: number; reads: number; readers: number; likes: number };

export async function loadPublicStats(articleId: string, authorId: string | null): Promise<PublicStats> {
  const admin = createSupabaseAdminClient();
  const viewCount = (readsOnly: boolean) => {
    let q = admin.from("hearticle_views").select("id", { count: "exact", head: true }).eq("article_id", articleId);
    if (readsOnly) q = q.eq("is_read", true);
    if (authorId) q = q.or(`profile_id.is.null,profile_id.neq.${authorId}`);
    return q;
  };
  let readerRows = admin.from("hearticle_views").select("visitor_id").eq("article_id", articleId).eq("is_read", true).limit(50000);
  if (authorId) readerRows = readerRows.or(`profile_id.is.null,profile_id.neq.${authorId}`);
  const [views, reads, readers, likes] = await Promise.all([
    viewCount(false),
    viewCount(true),
    readerRows.returns<{ visitor_id: string }[]>(),
    admin.from("hearticle_likes").select("liker_key", { count: "exact", head: true }).eq("article_id", articleId),
  ]);
  return {
    views: views.count ?? 0,
    reads: reads.count ?? 0,
    readers: new Set((readers.data ?? []).map((r) => r.visitor_id)).size,
    likes: likes.count ?? 0,
  };
}

export async function hasLiked(articleId: string, likerKey: string | null) {
  if (!likerKey) return false;
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("hearticle_likes").select("liker_key").eq("article_id", articleId).eq("liker_key", likerKey).maybeSingle();
  return Boolean(data);
}

/* ───────────────────────── writer insights ───────────────────────── */

type ViewRow = {
  visitor_id: string;
  profile_id: string | null;
  source: string;
  device: "mobile" | "tablet" | "desktop";
  country: string | null;
  city: string | null;
  local_hour: number | null;
  max_scroll: number;
  active_seconds: number;
  is_read: boolean;
  created_at: string;
};

type LikeRow = { profile_id: string | null; created_at: string; liker: { name: string; avatar_url: string | null } | null };

export type Ranked = { label: string; count: number; share: number };

export type HearticleInsights = {
  totals: {
    views: number;
    visitors: number;
    reads: number;
    /** distinct people who read it to the end */
    readers: number;
    readRate: number;
    likes: number;
    likeRate: number;
    /** median active seconds of completed reads */
    medianReadSeconds: number;
    avgReadSeconds: number;
    totalSeconds: number;
    avgScroll: number;
    returning: number;
    members: number;
  };
  /** One entry per day from publish (or the first view) to today, max 60. */
  daily: { date: string; views: number; reads: number }[];
  /** % of views that got at least this far down the text. */
  depth: { at: number; share: number }[];
  sources: Ranked[];
  devices: Ranked[];
  countries: Ranked[];
  cities: Ranked[];
  hours: number[];
  fastestRead: number | null;
  longestRead: number | null;
  likers: { name: string; avatarUrl: string | null }[];
  anonymousLikes: number;
  facts: string[];
};

const rank = (values: (string | null)[], total: number, limit = 6): Ranked[] => {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count, share: total ? count / total : 0 }));
};

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};

export const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h}h ${m}m`;
  return s ? `${m}m ${String(s).padStart(2, "0")}s` : `${m}m`;
};

const HOUR_LABEL = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

export async function loadInsights(article: { id: string; authorId: string; publishedAt: string; readMinutes: number | null }): Promise<HearticleInsights> {
  const admin = createSupabaseAdminClient();
  const [{ data: viewRows }, { data: likeRows }] = await Promise.all([
    admin
      .from("hearticle_views")
      .select("visitor_id, profile_id, source, device, country, city, local_hour, max_scroll, active_seconds, is_read, created_at")
      .eq("article_id", article.id)
      .order("created_at", { ascending: true })
      .limit(20000)
      .returns<ViewRow[]>(),
    admin
      .from("hearticle_likes")
      .select("profile_id, created_at, liker:profiles!profile_id (name, avatar_url)")
      .eq("article_id", article.id)
      .order("created_at", { ascending: false })
      .returns<LikeRow[]>(),
  ]);

  const views = (viewRows ?? []).filter((v) => v.profile_id !== article.authorId);
  const likes = likeRows ?? [];
  const reads = views.filter((v) => v.is_read);
  const n = views.length;

  const visitorsSeen = new Map<string, number>();
  for (const v of views) visitorsSeen.set(v.visitor_id, (visitorsSeen.get(v.visitor_id) ?? 0) + 1);
  const returning = [...visitorsSeen.values()].filter((c) => c > 1).length;
  const memberIds = new Set(views.map((v) => v.profile_id).filter(Boolean));

  const readSeconds = reads.map((v) => v.active_seconds);
  const totalSeconds = views.reduce((sum, v) => sum + v.active_seconds, 0);

  // daily series: publish day (or first view, if earlier) → today, last 60 days max
  const dayKey = (iso: string) => iso.slice(0, 10);
  const today = new Date();
  const startIso = [article.publishedAt, views[0]?.created_at].filter(Boolean).sort()[0] ?? today.toISOString();
  const start = new Date(Math.max(new Date(startIso).getTime(), today.getTime() - 59 * 86400000));
  const byDay = new Map<string, { views: number; reads: number }>();
  for (const v of views) {
    const k = dayKey(v.created_at);
    const d = byDay.get(k) ?? { views: 0, reads: 0 };
    d.views += 1;
    if (v.is_read) d.reads += 1;
    byDay.set(k, d);
  }
  const daily: HearticleInsights["daily"] = [];
  for (let t = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()); t <= today.getTime(); t += 86400000) {
    const k = new Date(t).toISOString().slice(0, 10);
    daily.push({ date: k, ...(byDay.get(k) ?? { views: 0, reads: 0 }) });
  }

  const depth = [10, 25, 50, 75, 90].map((at) => ({ at, share: n ? views.filter((v) => v.max_scroll >= at).length / n : 0 }));

  const hours = Array.from({ length: 24 }, () => 0);
  for (const v of views) if (v.local_hour !== null) hours[v.local_hour] += 1;

  const sources = rank(views.map((v) => v.source), n);
  const devices = rank(views.map((v) => v.device), n, 3);
  const countries = rank(views.map((v) => v.country), n);
  const cities = rank(views.map((v) => (v.city && v.country ? `${v.city}, ${v.country}` : v.city)), n);

  const totals = {
    views: n,
    visitors: visitorsSeen.size,
    reads: reads.length,
    readers: new Set(reads.map((v) => v.visitor_id)).size,
    readRate: n ? reads.length / n : 0,
    likes: likes.length,
    likeRate: visitorsSeen.size ? likes.length / visitorsSeen.size : 0,
    medianReadSeconds: median(readSeconds),
    avgReadSeconds: readSeconds.length ? Math.round(readSeconds.reduce((a, b) => a + b, 0) / readSeconds.length) : 0,
    totalSeconds,
    avgScroll: n ? Math.round(views.reduce((s, v) => s + v.max_scroll, 0) / n) : 0,
    returning,
    members: memberIds.size,
  };

  // The "huh, interesting" lines, only the ones the data can back up.
  const facts: string[] = [];
  if (totalSeconds >= 60) facts.push(`People have spent ${formatDuration(totalSeconds)} inside your words.`);
  if (reads.length && article.readMinutes) {
    const ratio = totals.medianReadSeconds / (article.readMinutes * 60);
    if (ratio > 1.15) facts.push(`Readers take their time: a typical read runs ${Math.round((ratio - 1) * 100)}% longer than the ${article.readMinutes} min estimate.`);
    else if (ratio < 0.7) facts.push(`It reads fast: a typical read takes ${formatDuration(totals.medianReadSeconds)}, under the ${article.readMinutes} min estimate.`);
  }
  if (n >= 5) {
    const drop = depth.find((d) => d.share < 0.5);
    if (drop) facts.push(`Half your readers are gone by the ${drop.at}% mark. That's where to tighten.`);
    else facts.push(`More than half your readers make it to the very end.`);
  }
  const mobile = devices.find((d) => d.label === "mobile");
  if (mobile && n >= 5) facts.push(`${Math.round(mobile.share * 100)}% read it on a phone.`);
  if (sources[0] && n >= 3) facts.push(`${sources[0].label} brings the most readers (${Math.round(sources[0].share * 100)}%).`);
  const peakHour = hours.indexOf(Math.max(...hours));
  if (n >= 5 && hours[peakHour] > 0) facts.push(`Most people read it around ${HOUR_LABEL(peakHour)}, their time.`);
  const peakDay = [...daily].sort((a, b) => b.views - a.views)[0];
  if (peakDay && peakDay.views >= 3)
    facts.push(`Biggest day: ${new Date(`${peakDay.date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} with ${peakDay.views} views.`);
  if (returning > 0) facts.push(`${returning} ${returning === 1 ? "person came" : "people came"} back to read it again.`);
  if (countries.length > 1) facts.push(`It has travelled to ${new Set(views.map((v) => v.country).filter(Boolean)).size} countries.`);

  return {
    totals,
    daily,
    depth,
    sources,
    devices,
    countries,
    cities,
    hours,
    fastestRead: readSeconds.length ? Math.min(...readSeconds) : null,
    longestRead: readSeconds.length ? Math.max(...readSeconds) : null,
    likers: likes.filter((l) => l.liker).map((l) => ({ name: l.liker!.name, avatarUrl: l.liker!.avatar_url })),
    anonymousLikes: likes.filter((l) => !l.liker).length,
    facts,
  };
}

/** Views / reads / likes for several hearticles at once (the writer's list). */
export async function loadStatsFor(articles: { id: string; authorId: string }[]): Promise<Map<string, PublicStats>> {
  const out = new Map<string, PublicStats>(articles.map((a) => [a.id, { views: 0, reads: 0, readers: 0, likes: 0 }]));
  if (!articles.length) return out;
  const admin = createSupabaseAdminClient();
  const ids = articles.map((a) => a.id);
  const author = new Map(articles.map((a) => [a.id, a.authorId]));
  const [{ data: views }, { data: likes }] = await Promise.all([
    admin.from("hearticle_views").select("article_id, visitor_id, profile_id, is_read").in("article_id", ids).limit(50000)
      .returns<{ article_id: string; visitor_id: string; profile_id: string | null; is_read: boolean }[]>(),
    admin.from("hearticle_likes").select("article_id").in("article_id", ids).returns<{ article_id: string }[]>(),
  ]);
  const readerSets = new Map<string, Set<string>>();
  for (const v of views ?? []) {
    if (v.profile_id && v.profile_id === author.get(v.article_id)) continue;
    const s = out.get(v.article_id)!;
    s.views += 1;
    if (!v.is_read) continue;
    s.reads += 1;
    const set = readerSets.get(v.article_id) ?? new Set<string>();
    set.add(v.visitor_id);
    readerSets.set(v.article_id, set);
  }
  for (const [id, set] of readerSets) out.get(id)!.readers = set.size;
  for (const l of likes ?? []) out.get(l.article_id)!.likes += 1;
  return out;
}
