import { captureException } from "@/lib/monitoring";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const blocked = rejectCrossOriginWrite(req);
  if (blocked) return blocked;

  const configuredToken = process.env.SENTRY_TEST_TOKEN?.trim();
  const providedToken = req.headers.get("x-sentry-test-token")?.trim();
  const tokenDebug = {
    configured: Boolean(configuredToken),
    provided: Boolean(providedToken),
    configuredLength: configuredToken?.length ?? 0,
    providedLength: providedToken?.length ?? 0,
  };

  if (!configuredToken) {
    return NextResponse.json(
      { ok: false, message: "SENTRY_TEST_TOKEN is not configured.", tokenDebug },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!providedToken || providedToken !== configuredToken) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized.", tokenDebug },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!process.env.SENTRY_DSN?.trim()) {
    return NextResponse.json(
      { ok: false, message: "SENTRY_DSN is not configured.", tokenDebug },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const eventId = captureException(new Error("Pixora Sentry smoke test"), {
    layer: "monitoring",
    route: "/api/monitoring/sentry-test",
  });

  return NextResponse.json(
    { ok: true, eventId: eventId ?? null, tokenDebug },
    { headers: { "Cache-Control": "no-store" } }
  );
}
