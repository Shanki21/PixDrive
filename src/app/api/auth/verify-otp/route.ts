import { getPrismaUnavailableMessage, isPrismaUnavailableError } from "@/lib/prisma-errors";
import { verifyOtp } from "@/lib/otp-store";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "wf_user_email";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createAuthSuccessResponse(email: string, warning?: string) {
  const response = NextResponse.json({
    ok: true,
    ...(warning ? { warning } : {}),
  });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: email,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

export async function POST(req: Request) {
  let emailForFallback = "";

  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    emailForFallback = email;
    const code = String(body?.code ?? "").replace(/\D/g, "");

    if (!emailRegex.test(email) || code.length !== 6) {
      return NextResponse.json({ ok: false, message: "Invalid email or OTP format." }, { status: 400 });
    }

    if (!verifyOtp(email, code)) {
      return NextResponse.json({ ok: false, message: "Invalid or expired OTP." }, { status: 401 });
    }

    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email },
    });

    return createAuthSuccessResponse(email);
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[auth/verify-otp] prisma unavailable, using dev auth fallback");
        return createAuthSuccessResponse(
          emailForFallback,
          "Signed in with development fallback because database is unavailable."
        );
      }
      return NextResponse.json(
        { ok: false, message: getPrismaUnavailableMessage() },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: false, message: "Unable to verify OTP right now." }, { status: 400 });
  }
}
