import type { Metadata } from "next";
import { OG_PAGES, ogImagePath, type OgKey } from "@/lib/og/pages";

/**
 * Page metadata from the share-card table, so a page's tab title, its
 * description and its link preview always agree. A page's `openGraph`
 * replaces the root layout's whole object (Next doesn't deep-merge it),
 * which is why the image is set here every time rather than inherited.
 */
export function pageMetadata(key: OgKey, overrides: { title?: string; robots?: Metadata["robots"] } = {}): Metadata {
  const page = OG_PAGES[key];
  const title = overrides.title ?? page.title;
  const images = [{ url: ogImagePath(key), width: 1200, height: 630, alt: page.title }];
  return {
    title,
    description: page.description,
    robots: overrides.robots,
    openGraph: { siteName: "curaious", type: "website", title, description: page.description, images },
    twitter: { card: "summary_large_image", title, description: page.description, images: images.map((i) => i.url) },
  };
}
