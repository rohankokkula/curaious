import { NextResponse } from "next/server";
import { loadShowcase } from "@/lib/showcaseData";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated read for /showcase. The actual assembly lives in
 * showcaseData.ts so the Server Component can call it directly instead of
 * making an HTTP round trip back to this route.
 */
export async function GET() {
  if (!isSupabaseConfigured || !hasServiceRoleKey) {
    return NextResponse.json({ ok: false, error: "server_not_configured" }, { status: 503 });
  }

  const result = await loadShowcase();
  return NextResponse.json({ ok: true, ...result });
}
