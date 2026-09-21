import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
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

/** Convenience: the current auth user, or null. */
export async function getSessionUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

export type ViewerProfile = {
  id: string;
  email: string;
  name: string;
  role: "member" | "admin";
};

/** Current user's profile row, or null if not logged in / no profile yet. */
export async function getViewerProfile(): Promise<ViewerProfile | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, name, role")
    .eq("id", user.id)
    .maybeSingle();

  return (data as ViewerProfile | null) ?? null;
}
