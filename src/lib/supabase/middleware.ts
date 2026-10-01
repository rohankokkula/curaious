import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "./config";

/**
 * Standard @supabase/ssr session-refresh helper, run from src/proxy.ts.
 *
 * It rewrites refreshed auth cookies onto both the outgoing response (so the
 * browser stores them) and the incoming request (so Server Components further
 * down this same request see the fresh session).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getClaims() refreshes an expiring session (writing the new cookies via
  // setAll above) and then verifies the JWT locally against the project's
  // cached ES256 public key. getUser() did the same job with a round trip to
  // the Auth server on every single request, including every RSC navigation.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ? { id: data.claims.sub } : null;

  return { supabase, response, user };
}
