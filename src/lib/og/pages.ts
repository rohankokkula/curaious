/**
 * What a shared link to each part of curaious says about itself: the title,
 * line and artwork a WhatsApp / iMessage / Slack / LinkedIn preview shows.
 *
 * Kept free of server-only imports: the proxy reads it too, to answer link
 * scrapers on signed-in pages (see `linkPreviewHtml`), and it must stay tiny.
 *
 * Nothing here is member data. A preview of /dashboard/members/<id> says "a
 * member profile", not whose: previews are fetched without signing in, so
 * they can only ever carry what's already public.
 */

export type OgMotif = "seats" | "schedule" | "slides" | "medal" | "pages" | "profile" | "lock";

export type OgPage = {
  key: string;
  /** Small mono line above the title. */
  kicker: string;
  title: string;
  description: string;
  /** Accent for the glow and the artwork. */
  accent: string;
  motif: OgMotif;
};

export const OG_PAGES = {
  home: {
    key: "home",
    kicker: "ten seats · two speakers a session",
    title: "10 curious minds around ai.",
    description: "Everyone teaches, everyone learns. A private circle of ten, building in public and giving each other real feedback.",
    accent: "#e08a5a",
    motif: "seats",
  },
  login: {
    key: "login",
    kicker: "members only",
    title: "Member login",
    description: "Curaious is invite-only. Sign in with the Google account you were invited with.",
    accent: "#a78bfa",
    motif: "lock",
  },
  showcase: {
    key: "showcase",
    kicker: "cohort 01",
    title: "Ten curious minds, one season",
    description: "The people, the talks and the season so far, week by week.",
    accent: "#f472b6",
    motif: "seats",
  },
  dashboard: {
    key: "dashboard",
    kicker: "your season",
    title: "Your season at a glance",
    description: "Your talk, the next session, and the feedback you owe the room.",
    accent: "#e08a5a",
    motif: "seats",
  },
  schedule: {
    key: "schedule",
    kicker: "the season",
    title: "Four weekends, two talks a session",
    description: "Every session of the season, and the open slots still up for grabs.",
    accent: "#22d3ee",
    motif: "schedule",
  },
  talks: {
    key: "talks",
    kicker: "talks",
    title: "Every talk of the season",
    description: "What's coming up, what's been presented, and the decks behind them.",
    accent: "#fb7185",
    motif: "slides",
  },
  talk: {
    key: "talk",
    kicker: "a talk",
    title: "A talk from the cohort",
    description: "The deck, the speaker, and the room's feedback. Members only.",
    accent: "#fb7185",
    motif: "slides",
  },
  members: {
    key: "members",
    kicker: "the cohort",
    title: "Ten people, one room",
    description: "Who's in the cohort, what they're into, and when they're speaking.",
    accent: "#34d399",
    motif: "seats",
  },
  member: {
    key: "member",
    kicker: "member profile",
    title: "A curaious member",
    description: "Their talk, their scores and what they're into. Members only.",
    accent: "#34d399",
    motif: "profile",
  },
  badges: {
    key: "badges",
    kicker: "badges",
    title: "Earned, not given",
    description: "Showstopper, Sharp Eye, Deep Diver and The Librarian: handed out by the curator for the season.",
    accent: "#fbbf24",
    motif: "medal",
  },
  bookmarks: {
    key: "bookmarks",
    kicker: "bookmarks",
    title: "The cohort's reading list",
    description: "Papers, tools, videos and posts the cohort shared with each other.",
    accent: "#818cf8",
    motif: "pages",
  },
  resources: {
    key: "resources",
    kicker: "resources",
    title: "How the season works",
    description: "The deck template, submission guidelines and how scoring works.",
    accent: "#818cf8",
    motif: "pages",
  },
  thoughts: {
    key: "thoughts",
    kicker: "your thoughts",
    title: "Written by the cohort",
    description: "Members' own thinking, in their own words. No pasting allowed.",
    accent: "#c084fc",
    motif: "pages",
  },
  claim: {
    key: "claim",
    kicker: "open slot",
    title: "Claim a slot to present",
    description: "Pick a session, tell the room what you'll cover, attach your deck.",
    accent: "#22d3ee",
    motif: "schedule",
  },
  admin: {
    key: "admin",
    kicker: "curator",
    title: "Curator console",
    description: "Reviews, the schedule and the cohort.",
    accent: "#a78bfa",
    motif: "lock",
  },
} satisfies Record<string, OgPage>;

export type OgKey = keyof typeof OG_PAGES;

export const OG_KEYS = Object.keys(OG_PAGES) as OgKey[];

export const ogImagePath = (key: OgKey) => `/og/${key}`;

/** Which preview a signed-in path gets. Most specific match first. */
export function ogKeyForPath(pathname: string): OgKey {
  const rules: [RegExp, OgKey][] = [
    [/^\/dashboard\/slots\/[^/]+\/submit/, "claim"],
    [/^\/dashboard\/talks\/[^/]+/, "talk"],
    [/^\/dashboard\/talks\/?$/, "talks"],
    [/^\/dashboard\/schedule/, "schedule"],
    [/^\/dashboard\/members\/[^/]+/, "member"],
    [/^\/dashboard\/members\/?$/, "members"],
    [/^\/dashboard\/badges/, "badges"],
    [/^\/dashboard\/bookmarks/, "bookmarks"],
    [/^\/dashboard\/resources\/write/, "thoughts"],
    [/^\/dashboard\/resources/, "resources"],
    [/^\/dashboard/, "dashboard"],
    [/^\/admin/, "admin"],
  ];
  return rules.find(([re]) => re.test(pathname))?.[1] ?? "home";
}

/** Link-preview fetchers, not search crawlers: these only ever read the
 * head of a page to draw a card for a link someone shared. */
const PREVIEW_BOTS =
  /whatsapp|facebookexternalhit|facebookcatalog|facebot|twitterbot|slackbot|slack-imgproxy|linkedinbot|telegrambot|discordbot|skypeuripreview|microsoftpreview|teams|redditbot|pinterest|embedly|iframely|vkshare|snapchat|viber|line\/|kakaotalk|zoom|mastodon|bluesky|applebot/i;

export function isPreviewBot(userAgent: string | null) {
  return Boolean(userAgent && PREVIEW_BOTS.test(userAgent));
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * A bare HTML head for a link scraper asking for a signed-in page. Without
 * it, the scraper follows the redirect to /login and every shared dashboard
 * link previews as "Member login". This carries no page content at all,
 * only the generic title, line and image for that section.
 */
export function linkPreviewHtml(origin: string, pathname: string) {
  const page = OG_PAGES[ogKeyForPath(pathname)];
  const title = `${page.title} · curaious`;
  const image = `${origin}${ogImagePath(page.key as OgKey)}`;
  const url = `${origin}${pathname}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${escape(title)}</title>
<meta name="description" content="${escape(page.description)}">
<meta name="robots" content="noindex">
<meta property="og:site_name" content="curaious">
<meta property="og:type" content="website">
<meta property="og:url" content="${escape(url)}">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(page.description)}">
<meta property="og:image" content="${escape(image)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escape(page.title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(page.description)}">
<meta name="twitter:image" content="${escape(image)}">
</head><body></body></html>`;
}
