/**
 * SERVER-ONLY. Imports the service-role client — Route Handlers only.
 *
 * Every /api/admin/** route calls this. The middleware already blocks
 * non-admins from /admin pages, but middleware is not an authorization
 * boundary for the API: it can be bypassed by calling the route directly, so
 * the role gets re-checked against the database here, independently.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";

type AdminGuardResult =
  | {
      ok: true;
      admin: ReturnType<typeof createSupabaseAdminClient>;
      userId: string;
    }
  | { ok: false; status: 401 | 403; error: string; message: string };

export async function requireAdmin(): Promise<AdminGuardResult> {
  const user = await getSessionUser();

  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "unauthorized",
      message: "sign in first.",
    };
  }

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: "member" | "admin" }>();

  if (profile?.role !== "admin") {
    return {
      ok: false,
      status: 403,
      error: "forbidden",
      message: "that's not yours to do.",
    };
  }

  return { ok: true, admin, userId: user.id };
}
