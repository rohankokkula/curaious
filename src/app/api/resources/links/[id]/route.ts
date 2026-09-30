import { NextResponse } from "next/server";
import { resourceLinkSchema } from "@/lib/resources";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "sign in first." }, { status: 401 });

  const { id } = await params;
  // Runs as the user — resource_links_delete_own_or_admin RLS policy is the enforcement.
  const { error } = await supabase.from("resource_links").delete().eq("id", id);
  if (error) {
    console.error("api/resources/links/[id]: delete failed", error.message);
    return NextResponse.json({ ok: false, message: "couldn't remove that link." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * Edits a link (title/url/note/category/tags), any time, for its owner or an
 * admin — links were never behind review. `resource_links_update_own` RLS is
 * the actual enforcement; a request against someone else's link, or against
 * an approved article, simply updates zero rows.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "sign in first." }, { status: 401 });

  const { id } = await params;

  const parsed = resourceLinkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "invalid link." }, { status: 400 });
  }

  const { title, url, note, category, tags } = parsed.data;
  const { data, error } = await supabase
    .from("resource_links")
    .update({ title, url, note: note || null, category, tags, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("kind", "link")
    .select("id");

  if (error) {
    console.error("api/resources/links/[id]: update failed", error.message);
    return NextResponse.json({ ok: false, message: "couldn't save that." }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ ok: false, message: "that isn't yours to edit." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
