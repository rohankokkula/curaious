import { NextResponse, type NextRequest } from "next/server";
import { isReadDone, trackableArticle, VISITOR_COOKIE } from "@/lib/hearticleAnalytics";
import { createSupabaseAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Reading progress for one visit: how far down the text (0–100) and how many
 * seconds of active reading so far. Sent every few seconds and on leaving
 * (sendBeacon, hence POST with a text body). Only the browser that started
 * the visit can update it, and numbers only ever go up.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  if (!hasServiceRoleKey) return new NextResponse(null, { status: 503 });
  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  if (!visitorId) return new NextResponse(null, { status: 403 });

  const { slug, id } = await params;
  const raw = (await request.text().catch(() => "")) || "{}";
  let body: { scroll?: unknown; seconds?: unknown } = {};
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const scroll = typeof body.scroll === "number" ? Math.max(0, Math.min(100, Math.round(body.scroll))) : 0;
  const seconds = typeof body.seconds === "number" ? Math.max(0, Math.min(21600, Math.round(body.seconds))) : 0;

  const admin = createSupabaseAdminClient();
  const [{ data: view }, article] = await Promise.all([
    admin
      .from("hearticle_views")
      .select("id, article_id, visitor_id, max_scroll, active_seconds, created_at")
      .eq("id", id)
      .maybeSingle<{ id: string; article_id: string; visitor_id: string; max_scroll: number; active_seconds: number; created_at: string }>(),
    trackableArticle(slug),
  ]);
  if (!view || !article || view.article_id !== article.id || view.visitor_id !== visitorId) return new NextResponse(null, { status: 404 });

  // can't have read for longer than the visit has existed
  const elapsed = Math.ceil((Date.now() - new Date(view.created_at).getTime()) / 1000) + 5;
  const maxScroll = Math.max(view.max_scroll, scroll);
  const activeSeconds = Math.max(view.active_seconds, Math.min(seconds, elapsed));

  await admin
    .from("hearticle_views")
    .update({
      max_scroll: maxScroll,
      active_seconds: activeSeconds,
      is_read: isReadDone(maxScroll, activeSeconds, article.read_minutes),
      updated_at: new Date().toISOString(),
    })
    .eq("id", view.id);

  return new NextResponse(null, { status: 204 });
}
