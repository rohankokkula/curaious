import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchLinkMetadata } from "@/lib/linkMetadata";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({ url: z.url() });

/** Lets the add-link panel show a title/description/thumbnail preview before
 * submit. Authenticated only — this is a server-side fetch of whatever URL
 * the caller supplies, so it isn't opened up to anonymous callers. */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "sign in first." }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "that doesn't look like a url." }, { status: 400 });
  }

  const metadata = await fetchLinkMetadata(parsed.data.url);
  if (!metadata) {
    // Not an error the caller needs to see — plenty of pages just can't be
    // previewed (blocked, non-HTML, too slow). The form still works without one.
    return NextResponse.json({ ok: true, metadata: null });
  }

  return NextResponse.json({ ok: true, metadata });
}
