import { NextResponse } from "next/server";
import { resourceLinkSchema } from "@/lib/resources";
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

  const { title, url, note } = parsed.data;
  // Runs as the user — resource_links_insert_own RLS policy is the enforcement.
  const { data, error } = await supabase
    .from("resource_links")
    .insert({ cohort_id: cohort.id, added_by: user.id, title, url, note: note || null })
    .select("id")
    .single();

  if (error) {
    console.error("api/resources/links: insert failed", error.message);
    return NextResponse.json({ ok: false, message: "couldn't save that link." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
