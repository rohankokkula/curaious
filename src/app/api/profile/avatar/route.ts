import { NextResponse } from "next/server";
import { AVATAR_MAX_BYTES } from "@/lib/profile";
import { createSupabaseAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "sign in first." }, { status: 401 });
  if (!hasServiceRoleKey) {
    return NextResponse.json({ ok: false, message: "uploads aren't switched on yet." }, { status: 503 });
  }

  const file = (await request.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "attach an image." }, { status: 400 });
  }
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ ok: false, message: "use a JPG, PNG or WebP image." }, { status: 400 });
  if (file.size > AVATAR_MAX_BYTES) {
    return NextResponse.json({ ok: false, message: "image must be under 2MB." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const path = `${user.id}/${Date.now()}.${ext}`;
  const { error } = await admin.storage
    .from("avatars")
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) {
    console.error("api/profile/avatar: upload failed", error.message);
    return NextResponse.json({ ok: false, message: "couldn't upload that." }, { status: 500 });
  }

  const url = admin.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  const { error: updateError } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (updateError) return NextResponse.json({ ok: false, message: "couldn't save your photo." }, { status: 500 });

  return NextResponse.json({ ok: true, url });
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  return NextResponse.json({ ok: true });
}
