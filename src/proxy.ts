import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/middleware";
import { isPreviewBot, linkPreviewHtml } from "@/lib/og/pages";

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
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
    // A link someone shared into WhatsApp/Slack/iMessage: the preview
    // fetcher isn't signed in, so it would follow the redirect and every
    // dashboard link would preview as "Member login". Hand it the section's
    // own title and share card instead. No page content, no member data.
    if (isPreviewBot(request.headers.get("user-agent"))) {
      return new NextResponse(linkPreviewHtml(request.nextUrl.origin, pathname), {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
      });
    }
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
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|og/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|pdf)$).*)",
  ],
};
