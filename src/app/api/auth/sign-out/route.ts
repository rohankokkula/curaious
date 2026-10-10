import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  // Derived from the request, not a configured site URL — see the same note
  // in auth/callback/route.ts.
  return NextResponse.redirect(new URL("/", new URL(request.url).origin), {
    status: 303,
  });
}
