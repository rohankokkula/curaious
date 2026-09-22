import { NextResponse } from "next/server";
import { profileUpdateSchema } from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "sign in first." }, { status: 401 });

  const parsed = profileUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "invalid profile." },
      { status: 400 },
    );
  }

  const { name, headline, location, bio, tags } = parsed.data;
  // Runs as the user, so the profiles_update_own RLS policy is the enforcement.
  const { error } = await supabase
    .from("profiles")
    .update({ name, headline: headline || null, location: location || null, bio: bio || null, tags })
    .eq("id", user.id);

  if (error) {
    console.error("api/profile: update failed", error.message);
    return NextResponse.json({ ok: false, message: "couldn't save your profile." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
