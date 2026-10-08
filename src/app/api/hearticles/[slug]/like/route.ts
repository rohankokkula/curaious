import { NextResponse, type NextRequest } from "next/server";
import { isBot, trackableArticle, VISITOR_COOKIE } from "@/lib/hearticleAnalytics";
import { createSupabaseAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Like / unlike a hearticle. Anyone can like (no sign-in on a public page):
 * one like per member (any device), else one per browser via the visitor
 * cookie. Body: { liked: boolean }. Returns the new count.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasServiceRoleKey) return NextResponse.json({ ok: false }, { status: 503 });
  if (isBot(request.headers.get("user-agent") ?? "")) return NextResponse.json({ ok: false }, { status: 403 });

  const { slug } = await params;
  const article = await trackableArticle(slug);
  if (!article) return NextResponse.json({ ok: false }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { liked?: unknown };
  if (typeof body.liked !== "boolean") return NextResponse.json({ ok: false }, { status: 400 });

  const user = await getSessionUser();
  const cookie = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = cookie && UUID.test(cookie) ? cookie : null;
  const likerKey = user?.id ?? visitorId;
  if (!likerKey) return NextResponse.json({ ok: false, error: "no_visitor" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  if (body.liked) {
    await admin
      .from("hearticle_likes")
      .upsert({ article_id: article.id, liker_key: likerKey, profile_id: user?.id ?? null }, { onConflict: "article_id,liker_key", ignoreDuplicates: true });
  } else {
    await admin.from("hearticle_likes").delete().eq("article_id", article.id).eq("liker_key", likerKey);
  }

  const { count } = await admin.from("hearticle_likes").select("liker_key", { count: "exact", head: true }).eq("article_id", article.id);
  return NextResponse.json({ ok: true, liked: body.liked, count: count ?? 0 });
}
