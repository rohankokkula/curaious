import { NextResponse } from "next/server";
import { loadSeasonSlots } from "@/lib/slots";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: false, error: "server_not_configured", slots: [] }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const result = await loadSeasonSlots(user.id);
  return NextResponse.json({ ok: true, ...result });
}
