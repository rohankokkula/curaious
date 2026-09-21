import { headers } from "next/headers";
import { siteUrl } from "@/lib/supabase/config";

/**
 * Server-side fetch of one of our own API routes, forwarding the caller's
 * session cookie.
 *
 * Used where a Server Component needs data that only a service-role route is
 * allowed to assemble (anonymized rating aggregates, the invite list) — that
 * way the service-role client stays confined to Route Handlers.
 */
export async function fetchInternal<T>(path: string): Promise<T | null> {
  try {
    const headerList = await headers();
    const host = headerList.get("host");
    const proto = headerList.get("x-forwarded-proto") ?? "http";
    const base = host ? `${proto}://${host}` : siteUrl();

    const response = await fetch(`${base}${path}`, {
      headers: { cookie: headerList.get("cookie") ?? "" },
      cache: "no-store",
    });

    if (!response.ok) return null;

    return (await response.json()) as T;
  } catch {
    return null;
  }
}
