import { NextResponse } from "next/server";
import { toSheetPayload } from "@/lib/utils";
import {
  applicationSchema,
  generateApplicationId,
} from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = applicationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "validation_failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    const webhookSecret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;

    if (!webhookUrl || !webhookSecret) {
      return NextResponse.json(
        {
          ok: false,
          error: "server_not_configured",
          message:
            "application storage is not configured yet. please try again later.",
        },
        { status: 503 },
      );
    }

    const applicationId = generateApplicationId();
    const submittedAt = new Date().toISOString();
    const payload = toSheetPayload(applicationId, submittedAt, parsed.data);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret: webhookSecret,
        ...payload,
      }),
    });

    const responseText = await response.text();
    let responseJson: { ok?: boolean; error?: string; message?: string } | null =
      null;

    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = null;
    }

    if (!response.ok || responseJson?.ok === false) {
      return NextResponse.json(
        {
          ok: false,
          error: responseJson?.error || "submission_failed",
          message:
            responseJson?.message ||
            "something went wrong while saving your application. please try again.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      applicationId,
      submittedAt,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "unexpected_error",
        message:
          "something went wrong while saving your application. please try again.",
      },
      { status: 500 },
    );
  }
}
