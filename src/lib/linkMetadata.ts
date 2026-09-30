/**
 * SERVER-ONLY. Fetches a small amount of HTML from a member-supplied URL to
 * pull a title/description/image for the resource card, and nothing more.
 *
 * This is a server-side fetch of an address any authenticated member can
 * hand it, so the SSRF guard here is the actual security boundary, not a
 * nicety: without it, this endpoint could be used to probe or hit internal
 * services (loopback, RFC1918 ranges, link-local — including the
 * 169.254.169.254 cloud metadata address) from the server's own network.
 * Every redirect hop is re-validated for the same reason; validating only
 * the first URL and then trusting `fetch`'s automatic redirect would let a
 * public first hop 302 straight into a private address.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const FETCH_TIMEOUT_MS = 5_000;
const MAX_BYTES = 300_000; // plenty for a <head>, nowhere near a real page body
const MAX_REDIRECTS = 3;
const USER_AGENT = "curaiousbot/1.0 (+link preview fetcher)";

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // "this network"
  if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1") return true; // loopback
  if (lower.startsWith("fe80:") || lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true; // link-local fe80::/10
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local fc00::/7
  if (lower.startsWith("::ffff:")) return isPrivateIPv4(lower.slice(7)); // IPv4-mapped
  return false;
}

async function assertPublicHost(hostname: string): Promise<void> {
  const version = isIP(hostname);
  if (version === 4) {
    if (isPrivateIPv4(hostname)) throw new Error("blocked_host");
    return;
  }
  if (version === 6) {
    if (isPrivateIPv6(hostname)) throw new Error("blocked_host");
    return;
  }

  // A hostname, not a literal IP — resolve it and check every address it
  // points to, since DNS is attacker-controlled here (rebinding).
  const records = await lookup(hostname, { all: true }).catch(() => []);
  if (records.length === 0) throw new Error("blocked_host");
  for (const record of records) {
    if (record.family === 4 && isPrivateIPv4(record.address)) throw new Error("blocked_host");
    if (record.family === 6 && isPrivateIPv6(record.address)) throw new Error("blocked_host");
  }
}

async function safeFetchHead(rawUrl: string): Promise<{ html: string; finalUrl: string } | null> {
  let current = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let parsed: URL;
    try {
      parsed = new URL(current);
    } catch {
      return null;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

    await assertPublicHost(parsed.hostname);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(parsed.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      });
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return null;
      current = new URL(location, parsed).toString();
      continue;
    }

    if (!response.ok || !response.body) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (total < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        total += value.byteLength;
      }
    } finally {
      await reader.cancel().catch(() => {});
    }

    const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
    return { html, finalUrl: parsed.toString() };
  }

  return null; // too many redirects
}

function metaContent(html: string, attr: "property" | "name", key: string): string | null {
  const pattern = new RegExp(
    `<meta[^>]+${attr}=["']${key}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  const reversed = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*${attr}=["']${key}["']`,
    "i",
  );
  return html.match(pattern)?.[1] ?? html.match(reversed)?.[1] ?? null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

export interface LinkMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
}

export async function fetchLinkMetadata(rawUrl: string): Promise<LinkMetadata | null> {
  const fetched = await safeFetchHead(rawUrl);
  if (!fetched) return null;

  const { html, finalUrl } = fetched;
  const head = html.slice(0, html.toLowerCase().indexOf("</head>") + 7 || undefined);

  const titleTag = head.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null;
  const title = metaContent(head, "property", "og:title") ?? titleTag;
  const description =
    metaContent(head, "property", "og:description") ?? metaContent(head, "name", "description");
  const image = metaContent(head, "property", "og:image");

  const iconMatch =
    head.match(/<link[^>]+rel=["'](?:shortcut icon|icon)["'][^>]*href=["']([^"']*)["']/i) ??
    head.match(/<link[^>]+href=["']([^"']*)["'][^>]*rel=["'](?:shortcut icon|icon)["']/i);

  const base = new URL(finalUrl);
  const resolve = (value: string | null) => {
    if (!value) return null;
    try {
      return new URL(value, base).toString();
    } catch {
      return null;
    }
  };

  return {
    title: title ? decodeEntities(title.trim()).slice(0, 200) : null,
    description: description ? decodeEntities(description.trim()).slice(0, 400) : null,
    image: resolve(image),
    favicon: resolve(iconMatch?.[1] ?? "/favicon.ico"),
  };
}
