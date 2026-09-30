import { NextResponse } from "next/server";
import { profileUpdateSchema, resolveVisibility, visibilitySchema } from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The profile form and the visibility toggles both land here. `visibility` is
 * optional and partial, so the toggles can save on their own without the
 * dialog having to resubmit every text field. */
const schema = profileUpdateSchema.extend({
  visibility: visibilitySchema.optional(),
});

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "sign in first." }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "invalid profile." },
      { status: 400 },
    );
  }

  const { name, headline, location, bio, tags, linkedinUrl, twitterUrl, githubUrl, visibility } =
    parsed.data;

  const update: Record<string, unknown> = {
    name,
    headline: headline || null,
    location: location || null,
    bio: bio || null,
    tags,
    linkedin_url: linkedinUrl || null,
    twitter_url: twitterUrl || null,
    github_url: githubUrl || null,
  };

  // Merge over what's stored rather than replacing it, so a partial update
  // can't silently reset the toggles the request didn't mention.
  if (visibility) {
    const { data: current } = await supabase
      .from("profiles")
      .select("visibility")
      .eq("id", user.id)
      .maybeSingle<{ visibility: unknown }>();

    update.visibility = { ...resolveVisibility(current?.visibility), ...visibility };
  }

  // Runs as the user, so the profiles_update_own RLS policy is the enforcement.
  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);

  if (error) {
    console.error("api/profile: update failed", error.message);
    return NextResponse.json({ ok: false, message: "couldn't save your profile." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
