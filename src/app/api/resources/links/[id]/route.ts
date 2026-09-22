import { NextResponse } from "next/server";
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
