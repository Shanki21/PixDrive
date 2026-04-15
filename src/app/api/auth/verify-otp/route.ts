import { getPrismaUnavailableMessage, isPrismaUnavailableError } from "@/lib/prisma-errors";
import { verifyOtp, OtpRateLimitError } from "@/lib/otp-store";
import { checkIpThrottle } from "@/lib/ip-throttle";
import prisma from "@/lib/prisma";
import { getClientIp } from "@/lib/request-ip";
import { setSessionCookie } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function createAuthSuccessResponse(email: string, warning?: string) {
  const response = NextResponse.json({
    ok: true,
    ...(warning ? { warning } : {}),
  });
  const cookieSet = await setSessionCookie(response, email);
  if (!cookieSet) {
    return NextResponse.json(
      { ok: false, message: "Session secret is missing. Set NEXTAUTH_SECRET or AUTH_SECRET." },
      { status: 500 }
    );
  }
  return response;
}

export async function POST(req: NextRequest) {
  let emailForFallback = "";

  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    emailForFallback = email;
    const code = String(body?.code ?? "").replace(/\D/g, "");

    if (!emailRegex.test(email) || code.length !== 6) {
      return NextResponse.json({ ok: false, message: "Invalid email or OTP format." }, { status: 400 });
    }

    const ip = getClientIp(req) ?? "unknown";
    const ipLimit = await checkIpThrottle({
      key: `auth:otp:verify:ip:${ip}`,
      limit: 50,
      windowMs: 60 * 60 * 1000,
    });
    if (!ipLimit.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Too many attempts. Try again later.",
          retryAfterSeconds: ipLimit.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const emailIpLimit = await checkIpThrottle({
      key: `auth:otp:verify:email-ip:${email}:${ip}`,
      limit: 12,
      windowMs: 15 * 60 * 1000,
    });
    if (!emailIpLimit.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Too many attempts. Try again later.",
          retryAfterSeconds: emailIpLimit.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    try {
      const ok = await verifyOtp(email, code);
      if (!ok) {
        return NextResponse.json({ ok: false, message: "Invalid or expired OTP." }, { status: 401 });
      }
    } catch (err) {
      if (err instanceof OtpRateLimitError) {
        return NextResponse.json({ ok: false, message: "Too many attempts. Try again later." }, { status: 429 });
      }
      throw err;
    }

    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email },
    });

    return await createAuthSuccessResponse(email);
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[auth/verify-otp] prisma unavailable, using dev auth fallback");
        if (!emailRegex.test(emailForFallback)) {
          return NextResponse.json({ ok: false, message: "Unable to verify OTP right now." }, { status: 400 });
        }
        return await createAuthSuccessResponse(
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
