import { OG_KEYS, OG_PAGES, type OgKey } from "@/lib/og/pages";
import { renderOgPage } from "@/lib/og/render";

/**
 * Share-card images for every section: /og/home, /og/schedule, …
 *
 * Public on purpose. A link scraper fetches these without signing in, and
 * they carry no member data, only the section's own fixed title and art.
 * All of them are drawn once at build time.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return OG_KEYS.map((key) => ({ key }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const page = OG_PAGES[key as OgKey];
  if (!page) return new Response("not found", { status: 404 });

  const image = await renderOgPage(page);
  image.headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800");
  return image;
}
