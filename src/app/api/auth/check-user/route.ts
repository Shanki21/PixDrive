import { normalizeEmail } from "@/lib/input-security";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const blocked = rejectCrossOriginWrite(req);
  if (blocked) {
    return blocked;
  }

  try {
    const body = await req.json();
    const email = normalizeEmail(body?.email);
    if (!email) {
      return NextResponse.json({ ok: false, message: "Email is required." }, { status: 400 });
    }

    // Keep this endpoint enumeration-safe: never reveal whether the account exists.
    return NextResponse.json({ ok: true });
  } catch {
    // Avoid leaking lookup internals.
    return NextResponse.json({ ok: true });
  }
}
