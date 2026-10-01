import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminAuth";
import { BADGE_KEYS } from "@/lib/badges";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const schema = z.object({
  seasonId: z.uuid(),
  profileId: z.uuid(),
  badgeKey: z.enum(BADGE_KEYS),
});

async function guarded(request: Request) {
  if (!isSupabaseConfigured || !hasServiceRoleKey) {
    return {
      error: NextResponse.json(
        { ok: false, error: "server_not_configured", message: "the database isn't connected yet." },
        { status: 503 },
      ),
    } as const;
  }

  const guard = await requireAdmin();
  if (!guard.ok) {
    return {
      error: NextResponse.json({ ok: false, error: guard.error, message: guard.message }, { status: guard.status }),
    } as const;
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return {
      error: NextResponse.json({ ok: false, error: "validation_failed", message: "pick a member and a badge." }, { status: 400 }),
    } as const;
  }

  return { guard, body: parsed.data } as const;
}

/** Awards a badge. Curator only — anyone can be given one at any time. */
export async function POST(request: Request) {
  const result = await guarded(request);
  if ("error" in result) return result.error;
  const { guard, body } = result;

  const { error } = await guard.admin.from("member_badges").upsert(
    {
      season_id: body.seasonId,
      profile_id: body.profileId,
      badge_key: body.badgeKey,
      awarded_by: guard.userId,
    },
    { onConflict: "season_id,profile_id,badge_key", ignoreDuplicates: true },
  );

  if (error) {
    console.error("api/admin/badges: award failed", error.message);
    return NextResponse.json({ ok: false, error: "award_failed", message: "couldn't award that badge." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Takes a badge back. */
export async function DELETE(request: Request) {
  const result = await guarded(request);
  if ("error" in result) return result.error;
  const { guard, body } = result;

  const { error } = await guard.admin
    .from("member_badges")
    .delete()
    .eq("season_id", body.seasonId)
    .eq("profile_id", body.profileId)
    .eq("badge_key", body.badgeKey);

  if (error) {
    console.error("api/admin/badges: revoke failed", error.message);
    return NextResponse.json({ ok: false, error: "revoke_failed", message: "couldn't remove that badge." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
