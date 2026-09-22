import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminAuth";
import { COHORT_COOKIE } from "@/lib/cohort";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false, message: guard.message }, { status: guard.status });
  const body = z.object({ id: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ ok: false, message: "bad request." }, { status: 400 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COHORT_COOKIE, body.data.id, { path: "/", maxAge: 31536000, sameSite: "lax", httpOnly: true });
  return res;
}
