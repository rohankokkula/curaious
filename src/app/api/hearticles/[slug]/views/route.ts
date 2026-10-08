import { NextResponse, type NextRequest } from "next/server";
import { deviceFrom, isBot, sourceFrom, trackableArticle, VISITOR_COOKIE } from "@/lib/hearticleAnalytics";
import { createSupabaseAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const YEAR = 60 * 60 * 24 * 365;

/**
 * Starts a visit: called once by the page's tracker after it loads in a real
 * browser (scrapers don't run JS, and bot user agents are dropped here too).
 * Returns the visit id the tracker then reports reading progress against.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasServiceRoleKey) return NextResponse.json({ ok: false }, { status: 503 });
  const ua = request.headers.get("user-agent") ?? "";
  if (isBot(ua)) return new NextResponse(null, { status: 204 });

  const { slug } = await params;
  const article = await trackableArticle(slug);
  if (!article) return NextResponse.json({ ok: false }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { referrer?: unknown; utm?: unknown; hour?: unknown };
  const existing = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = existing && UUID.test(existing) ? existing : crypto.randomUUID();
  const user = await getSessionUser();

  const { source, host } = sourceFrom(
    ua,
    typeof body.referrer === "string" ? body.referrer.slice(0, 500) : null,
    typeof body.utm === "string" ? body.utm : null,
    request.nextUrl.hostname,
  );
  const hour = typeof body.hour === "number" && Number.isInteger(body.hour) && body.hour >= 0 && body.hour < 24 ? body.hour : null;
  const city = request.headers.get("x-vercel-ip-city");

  const { data, error } = await createSupabaseAdminClient()
    .from("hearticle_views")
    .insert({
      article_id: article.id,
      visitor_id: visitorId,
      profile_id: user?.id ?? null,
      source,
      referrer_host: host,
      device: deviceFrom(ua),
      country: request.headers.get("x-vercel-ip-country"),
      city: city ? decodeURIComponent(city) : null,
      local_hour: hour,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return NextResponse.json({ ok: false }, { status: 500 });

  const response = NextResponse.json({ ok: true, id: data.id });
  if (visitorId !== existing) {
    response.cookies.set(VISITOR_COOKIE, visitorId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: YEAR, path: "/" });
  }
  return response;
}
