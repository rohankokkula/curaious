import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/middleware";

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsMember = pathname.startsWith("/dashboard");
  const needsAdmin = pathname.startsWith("/admin");

  // Nothing is provisioned yet — send gated routes to /login, which explains
  // the situation rather than blowing up.
  if (!isSupabaseConfigured) {
    if (needsMember || needsAdmin) return redirectTo(request, "/login");
    return NextResponse.next({ request });
  }

  let session: Awaited<ReturnType<typeof updateSession>>;
  try {
    session = await updateSession(request);
  } catch {
    if (needsMember || needsAdmin) return redirectTo(request, "/login");
    return NextResponse.next({ request });
  }

  const { supabase, response, user } = session;

  if ((needsMember || needsAdmin) && !user) {
    return redirectTo(request, "/login");
  }

  if (needsAdmin && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return redirectTo(request, "/dashboard");
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except Next internals and static assets, so the
     * session is refreshed on normal navigations.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|pdf)$).*)",
  ],
};
