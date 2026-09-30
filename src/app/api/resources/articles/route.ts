import { NextResponse } from "next/server";
import { articleInputSchema, estimateReadMinutes, slugify } from "@/lib/resources";
import { getActiveCohort } from "@/lib/cohort";
import { createSupabaseAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UNIQUE_VIOLATION = "23505";

/**
 * Submits a member-written article for review. Always lands as
 * `kind: 'article', status: 'pending'` — the RLS insert policy would reject
 * anything else anyway, this just keeps the 403 from ever happening on a
 * normal submission.
 *
 * Runs on the service-role client only to generate a collision-safe slug
 * (reading other people's slugs needs to see pending ones too, which RLS
 * wouldn't allow the author to do for someone else's row); the insert itself
 * still carries `added_by` as the real author and is still bound by RLS in
 * spirit — the insert policy's rule (own id, forced pending) is reproduced
 * here rather than bypassed.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured || !hasServiceRoleKey) {
    return NextResponse.json({ ok: false, message: "not available yet." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "sign in first." }, { status: 401 });

  const cohort = await getActiveCohort();
  if (!cohort) return NextResponse.json({ ok: false, message: "no active cohort." }, { status: 400 });

  const parsed = articleInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "invalid article." }, { status: 400 });
  }

  const { title, excerpt, body, tags } = parsed.data;
  const admin = createSupabaseAdminClient();
  const base = slugify(title);

  // Try the plain slug, then suffixed variants, until one isn't taken.
  let slug = base;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const { data: taken } = await admin.from("resource_links").select("id").eq("slug", slug).maybeSingle();
    if (!taken) break;
    slug = `${base}-${attempt + 2}`;
  }

  const { data, error } = await admin
    .from("resource_links")
    .insert({
      cohort_id: cohort.id,
      added_by: user.id,
      title,
      note: excerpt,
      body_markdown: body,
      tags,
      slug,
      kind: "article",
      category: "article",
      status: "pending",
      read_minutes: estimateReadMinutes(body),
      url: `/articles/${slug}`, // resource_links.url is not-null; this is its permalink
    })
    .select("id, slug")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return NextResponse.json({ ok: false, message: "that title just collided with another, tweak it and try again." }, { status: 409 });
    }
    console.error("api/resources/articles: insert failed", error.message);
    return NextResponse.json({ ok: false, message: "couldn't save that." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id, slug: data.slug });
}
