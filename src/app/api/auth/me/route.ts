import prisma from "@/lib/prisma";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const email = await getSessionEmailFromRequestAsync(req);
  if (!email) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { profile: { select: { name: true } } },
  });
  const displayName = String(user?.profile?.name ?? "").trim() || null;

  return NextResponse.json({
    ok: true,
    authenticated: true,
    email,
    displayName,
  });
}
