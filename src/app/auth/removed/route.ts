import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Where the dashboard sends someone the curator has removed: ends their
 * session (a layout can't clear auth cookies itself) and explains why on
 * the login page.
 */
export async function GET(request: Request) {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login?error=removed", new URL(request.url).origin));
}
