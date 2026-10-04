import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { OG_PAGES, ogImagePath } from "@/lib/og/pages";
import "./globals.css";

// Fonts are bundled from ./fonts (latin subset) rather than fetched from
// Google at build time: next/font/google's Turbopack loader failed on Vercel
// ("next/font/google queries have exactly one entry"), and a local file can't.
const display = localFont({
  variable: "--font-display",
  display: "swap",
  src: [
    { path: "./fonts/Inter-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Inter-700.woff2", weight: "700", style: "normal" },
  ],
});

const body = localFont({
  variable: "--font-body",
  display: "swap",
  src: [
    { path: "./fonts/Inter-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Inter-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Inter-600.woff2", weight: "600", style: "normal" },
  ],
});

const mono = localFont({
  variable: "--font-mono",
  display: "swap",
  src: [
    { path: "./fonts/IBMPlexMono-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/IBMPlexMono-500.woff2", weight: "500", style: "normal" },
  ],
});

/** Draws under the notch/home indicator (padding handled with safe-area
 * insets), and tints the browser chrome to match the app on phones so it
 * reads as one surface rather than a site inside a browser. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

/** Absolute base for share-card URLs: scrapers can't resolve a relative
 * og:image. The configured site URL when it's a real one, else Vercel's
 * production domain, else local dev. */
function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && !configured.includes("localhost")) return configured;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return configured || "http://localhost:3000";
}

const DESCRIPTION = OG_PAGES.home.description;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  applicationName: "curaious",
  appleWebApp: { capable: true, title: "curaious", statusBarStyle: "black-translucent" },
  title: {
    default: "curaious · 12 curious minds around ai",
    template: "%s · curaious",
  },
  description: DESCRIPTION,
  openGraph: {
    siteName: "curaious",
    title: "curaious · 12 curious minds around ai",
    description: DESCRIPTION,
    type: "website",
    images: [{ url: ogImagePath("home"), width: 1200, height: 630, alt: "curaious: 12 curious minds around ai" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "curaious · 12 curious minds around ai",
    description: DESCRIPTION,
    images: [ogImagePath("home")],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
