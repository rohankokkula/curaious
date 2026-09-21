import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { escapeLike, inviteSchema, normalizeEmail } from "@/lib/invites";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const UNIQUE_VIOLATION = "23505";

function notConfigured() {
  return NextResponse.json(
    {
      ok: false,
      error: "server_not_configured",
      message: "the database isn't connected yet.",
    },
    { status: 503 },
  );
}

type InviteRow = {
  id: string;
  name: string;
  email: string;
  role: "member" | "admin";
  accepted_at: string | null;
  created_at: string;
};

export async function GET() {
  if (!isSupabaseConfigured || !hasServiceRoleKey) return notConfigured();

  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, error: guard.error, message: guard.message },
      { status: guard.status },
    );
  }

  const { data, error } = await guard.admin
    .from("invites")
    .select("id, name, email, role, accepted_at, created_at")
    .order("created_at", { ascending: true })
    .returns<InviteRow[]>();

  if (error) {
    console.error("api/admin/invites: list failed", error.message);
    return NextResponse.json(
      { ok: false, error: "query_failed", message: "couldn't load invites." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    invites: (data ?? []).map((invite) => ({
      id: invite.id,
      name: invite.name,
      email: invite.email,
      role: invite.role,
      acceptedAt: invite.accepted_at,
      createdAt: invite.created_at,
    })),
  });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !hasServiceRoleKey) return notConfigured();

  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, error: guard.error, message: guard.message },
      { status: guard.status },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "bad_request", message: "couldn't read that." },
      { status: 400 },
    );
  }

  const parsed = inviteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "validation_failed",
        details: parsed.error.flatten().fieldErrors,
        message: "a name and a valid email, please.",
      },
      { status: 400 },
    );
  }

  const email = normalizeEmail(parsed.data.email);

  const { data: existing } = await guard.admin
    .from("invites")
    .select("id")
    .ilike("email", escapeLike(email))
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        ok: false,
        error: "duplicate_invite",
        message: "that email is already on the list.",
      },
      { status: 409 },
    );
  }

  const { data: invite, error } = await guard.admin
    .from("invites")
    .insert({
      name: parsed.data.name,
      email,
      role: parsed.data.role ?? "member",
      invited_by: guard.userId,
    })
    .select("id, name, email, role, accepted_at, created_at")
    .single<InviteRow>();

  if (error || !invite) {
    if (error?.code === UNIQUE_VIOLATION) {
      return NextResponse.json(
        {
          ok: false,
          error: "duplicate_invite",
          message: "that email is already on the list.",
        },
        { status: 409 },
      );
    }

    console.error("api/admin/invites: insert failed", error?.message);
    return NextResponse.json(
      {
        ok: false,
        error: "insert_failed",
        message: "couldn't add that. try again in a moment.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    invite: {
      id: invite.id,
      name: invite.name,
      email: invite.email,
      role: invite.role,
      acceptedAt: invite.accepted_at,
      createdAt: invite.created_at,
    },
  });
}
