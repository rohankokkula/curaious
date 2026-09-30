import { NextResponse } from "next/server";
import { articleInputSchema, estimateReadMinutes } from "@/lib/resources";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Edits and resubmits an article. Only reaches a row while it's pending or
 * rejected — `resource_links_update_own` RLS enforces that, and its `with
 * check` forces the result back to 'pending' no matter what, so an edit can
 * never quietly skip review. An approved article isn't touched through this
 * route at all (zero rows match, same 404 as "not yours").
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "sign in first." }, { status: 401 });

  const { id } = await params;

  const parsed = articleInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "invalid article." }, { status: 400 });
  }

  const { title, excerpt, body, tags } = parsed.data;
  const { data, error } = await supabase
    .from("resource_links")
    .update({
      title,
      note: excerpt,
      body_markdown: body,
      tags,
      read_minutes: estimateReadMinutes(body),
      status: "pending",
      reviewed_at: null,
      reviewed_by: null,
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("kind", "article")
    .select("id");

  if (error) {
    console.error("api/resources/articles/[id]: update failed", error.message);
    return NextResponse.json({ ok: false, message: "couldn't save that." }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json(
      { ok: false, message: "that isn't yours to edit, or it's already published." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
