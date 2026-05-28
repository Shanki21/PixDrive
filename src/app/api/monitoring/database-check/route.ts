import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ColumnCheck = {
  table_name: string;
  column_name: string;
};

const REQUIRED_COLUMNS = [
  { table: "User", column: "email" },
  { table: "UserProfile", column: "socialAccounts" },
  { table: "CustomDomain", column: "domain" },
  { table: "Subscription", column: "provider" },
  { table: "Subscription", column: "razorpayCustomerId" },
  { table: "Subscription", column: "razorpaySubscriptionId" },
] as const;

function isAuthorized(req: NextRequest) {
  const configuredToken =
    process.env.SENTRY_TEST_TOKEN?.trim() || process.env.HEALTHCHECK_TOKEN?.trim();
  const providedToken =
    req.headers.get("x-sentry-test-token")?.trim() ||
    req.headers.get("x-healthcheck-token")?.trim();

  return Boolean(configuredToken && providedToken && configuredToken === providedToken);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const rows = await prisma.$queryRaw<ColumnCheck[]>`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('User', 'UserProfile', 'CustomDomain', 'Subscription')
    `;

    const found = new Set(rows.map((row) => `${row.table_name}.${row.column_name}`));
    const checks = REQUIRED_COLUMNS.map((item) => ({
      table: item.table,
      column: item.column,
      ok: found.has(`${item.table}.${item.column}`),
    }));
    const ok = checks.every((item) => item.ok);

    return NextResponse.json(
      {
        ok,
        databaseHost: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : null,
        checks,
      },
      { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Database check failed.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
