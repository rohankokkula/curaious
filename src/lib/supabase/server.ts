import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { supabaseAnonKey, supabaseUrl } from "./config";

/**
 * Supabase client for Server Components and Route Handlers. Reads the session
 * from cookies, so every query it makes runs as the logged-in user and is
 * filtered by RLS.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components can't write cookies. That's fine — the
          // middleware session-refresh helper already did it for this request.
        }
      },
    },
  });
}

export type SessionUser = { id: string; email: string | null };

/**
 * The current auth user, or null.
 *
 * Uses `getClaims()`, not `getUser()`: the project signs sessions with an
 * asymmetric (ES256) key, so the JWT is verified locally against the cached
 * JWKS instead of a round trip to the Auth server on every call. `getUser()`
 * cost one full network hop per call, and the proxy, the layout and the page
 * each made one on every click.
 *
 * Wrapped in React `cache()` so the layout and the page share one result per
 * request instead of each verifying again.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

export type ViewerProfile = {
  id: string;
  email: string;
  name: string;
  role: "member" | "admin";
  avatar_url: string | null;
};

/** Current user's profile row, or null if not logged in / no profile yet.
 * Cached per request: the layout and the page both ask for it. */
export const getViewerProfile = cache(async (): Promise<ViewerProfile | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, name, role, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (data as ViewerProfile | null) ?? null;
});
