import { captureProductEvent } from "@/lib/product-analytics";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isAuthorized(req: NextRequest) {
  const configuredToken =
    process.env.SENTRY_TEST_TOKEN?.trim() ||
    process.env.HEALTHCHECK_TOKEN?.trim();
  const providedToken =
    req.headers.get("x-sentry-test-token")?.trim() ||
    req.headers.get("x-healthcheck-token")?.trim();

  return Boolean(configuredToken && providedToken && configuredToken === providedToken);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const result = await captureProductEvent("pixora_posthog_smoke_test", "pixora-monitoring", {
    route: "/api/monitoring/posthog-test",
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    checkedAt: new Date().toISOString(),
  });

  return NextResponse.json(
    {
      ok: Boolean(result?.ok),
      result,
      configured: Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()),
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://app.posthog.com",
    },
    {
      status: result?.ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
