import { NextResponse } from "next/server";
import { resourceLinkSchema } from "@/lib/resources";
import { fetchLinkMetadata } from "@/lib/linkMetadata";
import { getActiveCohort } from "@/lib/cohort";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "sign in first." }, { status: 401 });

  const cohort = await getActiveCohort();
  if (!cohort) return NextResponse.json({ ok: false, message: "no active cohort." }, { status: 400 });

  const parsed = resourceLinkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "invalid link." }, { status: 400 });
  }

  const { title, url, note, category, tags } = parsed.data;

  // Best-effort — a slow or unreachable page just means no thumbnail, not a
  // failed submission. Re-fetched server-side rather than trusting whatever
  // the client's preview call returned, so a stale/tampered payload can't
  // set a mismatched image.
  const metadata = await fetchLinkMetadata(url).catch(() => null);

  // Runs as the user — resource_links_insert_own RLS policy is the
  // enforcement. kind/status are never taken from the request: links always
  // publish instantly, only articles are moderated.
  const { data, error } = await supabase
    .from("resource_links")
    .insert({
      cohort_id: cohort.id,
      added_by: user.id,
      title,
      url,
      note: note || null,
      category,
      tags,
      kind: "link",
      status: "approved",
      thumbnail_url: metadata?.image ?? null,
      favicon_url: metadata?.favicon ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("api/resources/links: insert failed", error.message);
    return NextResponse.json({ ok: false, message: "couldn't save that link." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
