import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function toDisplayName(email: string) {
  const local = (email.split("@")[0] ?? "").trim();
  if (!local) return "Creator";
  const normalized = local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
  return normalized || "Creator";
}

export async function GET(req: NextRequest) {
  const email = await getSessionEmailFromRequestAsync(req);
  if (!email) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    email,
    displayName: toDisplayName(email),
  });
}

