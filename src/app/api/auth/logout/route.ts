import prisma from "@/lib/prisma";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, clearSessionCookie } from "@/lib/session";
import { withApiHandler } from "@/lib/withApiHandler";
import { withRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export const POST = withApiHandler(
  withRateLimit(async (req: NextRequest) => {
    const blocked = rejectCrossOriginWrite(req);
    if (blocked) {
      return blocked;
    }

    try {
      const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
      if (token) {
        await prisma.session.deleteMany({ where: { token } }).catch(() => {});
      }
    } catch {
      // ignore errors during logout
    }

    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  }, { keyPrefix: "auth:logout", limit: 30, windowMs: 60 * 60 * 1000 })
);

export async function GET() {
  return NextResponse.json({ ok: false, message: "Method not allowed." }, { status: 405, headers: { Allow: "POST" } });
}
