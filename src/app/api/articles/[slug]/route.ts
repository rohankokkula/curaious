import { NextResponse } from "next/server";
import { loadArticleBySlug } from "@/lib/articleData";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/** Public, unauthenticated read for /hearticles/[slug]. The actual lookup
 * lives in articleData.ts so the Server Component can call it directly
 * instead of making an HTTP round trip back to this route. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!isSupabaseConfigured || !hasServiceRoleKey) {
    return NextResponse.json({ ok: false, error: "server_not_configured" }, { status: 503 });
  }

  const { slug } = await params;
  const article = await loadArticleBySlug(slug);

  if (!article) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, article });
}
