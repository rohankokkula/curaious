/**
 * The site's absolute origin, for anything that leaves the page: share-card
 * URLs, canonical links, the sitemap, RSS and JSON-LD. The configured site URL
 * when it's a real one, else Vercel's production domain, else local dev.
 */
export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && !configured.includes("localhost")) return configured.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return (configured || "http://localhost:3000").replace(/\/+$/, "");
}

/** An absolute URL for a site path. */
export const absoluteUrl = (path: string) => `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
