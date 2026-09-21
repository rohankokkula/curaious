/**
 * SERVER-ONLY. Imports the service-role client — never import this from a
 * Client Component. Route Handlers only.
 *
 * Central place for "who is allowed to see this talk", mirroring the `talks`
 * select RLS policy: the presenter, any admin, or — once approved — any
 * logged-in member.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";
import type { TalkStatus } from "@/lib/talks";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export type TalkRecord = {
  id: string;
  slot_id: string;
  presenter_id: string;
  title: string;
  description: string;
  deck_path: string | null;
  status: TalkStatus;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
};

export type TalkAccess = {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  userId: string | null;
  isAdmin: boolean;
  isPresenter: boolean;
  canView: boolean;
  talk: TalkRecord | null;
};

const TALK_COLUMNS =
  "id, slot_id, presenter_id, title, description, deck_path, status, submitted_at, reviewed_at, rejection_reason";

export async function loadTalkAccess(talkId: string): Promise<TalkAccess> {
  const admin = createSupabaseAdminClient();
  const user = await getSessionUser();

  if (!user || !isUuid(talkId)) {
    return {
      admin,
      userId: user?.id ?? null,
      isAdmin: false,
      isPresenter: false,
      canView: false,
      talk: null,
    };
  }

  const [{ data: profile }, { data: talk }] = await Promise.all([
    admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: "member" | "admin" }>(),
    admin
      .from("talks")
      .select(TALK_COLUMNS)
      .eq("id", talkId)
      .maybeSingle<TalkRecord>(),
  ]);

  const isAdmin = profile?.role === "admin";
  const isPresenter = Boolean(talk && talk.presenter_id === user.id);
  const canView = Boolean(
    talk && (talk.status === "approved" || isPresenter || isAdmin),
  );

  return { admin, userId: user.id, isAdmin, isPresenter, canView, talk };
}
