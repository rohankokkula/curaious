import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Toggles the current user's bookmark on a resource. Same shape as like/route.ts. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "sign in first." }, { status: 401 });

  const { id } = await params;

  const { data: existing } = await supabase
    .from("resource_saves")
    .select("resource_id")
    .eq("resource_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("resource_saves")
      .delete()
      .eq("resource_id", id)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ ok: false, message: "couldn't update that." }, { status: 500 });
  } else {
    const { error } = await supabase.from("resource_saves").insert({ resource_id: id, user_id: user.id });
    if (error) return NextResponse.json({ ok: false, message: "couldn't update that." }, { status: 500 });
  }

  const { count } = await supabase
    .from("resource_saves")
    .select("resource_id", { count: "exact", head: true })
    .eq("resource_id", id);

  return NextResponse.json({ ok: true, saved: !existing, count: count ?? 0 });
}
