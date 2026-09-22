import { NextResponse } from "next/server";
import { escapeLike, normalizeEmail } from "@/lib/invites";
import {
  createSupabaseAdminClient,
  hasServiceRoleKey,
} from "@/lib/supabase/admin";
import { isSupabaseConfigured, siteUrl } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isSupabaseConfigured || !hasServiceRoleKey) {
    return NextResponse.redirect(new URL("/login?error=not_configured", siteUrl()));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", siteUrl()));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    return NextResponse.redirect(new URL("/login?error=link_expired", siteUrl()));
  }

  const user = data.user;
  const email = normalizeEmail(user.email ?? "");
  const admin = createSupabaseAdminClient();

  // Auto-detect: check if email is admin or member
  const { data: adminRecord } = await admin
    .from("admins")
    .select("id, name, email")
    .ilike("email", escapeLike(email))
    .maybeSingle();

  const { data: invite } = await admin
    .from("invites")
    .select("id, name, accepted_at, cohort_id")
    .ilike("email", escapeLike(email))
    .maybeSingle<{
      id: string;
      name: string;
      accepted_at: string | null;
      cohort_id: string | null;
    }>();

  if (!adminRecord && !invite) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=not_invited", siteUrl()));
  }

  const isAdmin = !!adminRecord;
  const role = isAdmin ? "admin" : "member";
  const name = adminRecord?.name || invite?.name || user.email;

  // Create or update profile
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    const { error: insertError } = await admin.from("profiles").insert({
      id: user.id,
      email,
      name,
      role,
    });

    if (insertError) {
      console.error("auth/callback: profile insert failed", insertError.message);
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=profile_failed", siteUrl()));
    }
  } else {
    // Update role if needed
    await admin
      .from("profiles")
      .update({ role })
      .eq("id", user.id);
  }

  // Join the invite's cohort (falling back to the live one) so the member shows up in rosters.
  let cohortId = invite?.cohort_id ?? null;
  if (!cohortId) {
    const { data: live } = await admin.from("seasons").select("id").eq("is_active", true).limit(1).maybeSingle<{ id: string }>();
    cohortId = live?.id ?? null;
  }
  if (cohortId) {
    await admin
      .from("cohort_members")
      .upsert({ cohort_id: cohortId, profile_id: user.id, role }, { onConflict: "cohort_id,profile_id", ignoreDuplicates: true });
  }

  // Mark invite as accepted
  if (invite && !invite.accepted_at) {
    await admin
      .from("invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
  }

  // Update last_login_at for admin
  if (adminRecord) {
    await admin
      .from("admins")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", adminRecord.id);
  }

  // Redirect based on role
  const redirectUrl = isAdmin ? "/admin" : "/dashboard";
  return NextResponse.redirect(new URL(redirectUrl, siteUrl()));
}
