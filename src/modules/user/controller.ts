import { NextRequest, NextResponse } from "next/server";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { checkIpThrottle } from "@/lib/ip-throttle";
import { getClientIp } from "@/lib/request-ip";
import { normalizeEmail } from "@/lib/input-security";
import { setSessionCookie } from "@/lib/session";
import * as userService from "./service";
import { getPrismaUnavailableMessage, isPrismaUnavailableError } from "@/lib/prisma-errors";
import { withApiHandler } from "@/lib/withApiHandler";
import { captureProductEvent } from "@/lib/product-analytics";

export async function handleVerifyOtp(req: NextRequest) {
  let emailForFallback = "";

  const blocked = rejectCrossOriginWrite(req);
  if (blocked) {
    return blocked;
  }

  try {
    const body = await req.json();
    const email = normalizeEmail(body?.email);
    emailForFallback = email;
    const code = String(body?.code ?? "").replace(/\D/g, "");
    const intent: userService.AuthIntent = body?.intent === "signup" ? "signup" : "login";

    if (!email || code.length !== 6) {
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
      const result = await userService.verifyOtpForIntent(email, code, intent);
      if (!result.ok) {
        if (result.code === "ACCOUNT_NOT_FOUND") {
          return NextResponse.json(
            { ok: false, code: result.code, message: "No Pixora account exists for this email. Please sign up first." },
            { status: 404 }
          );
        }
        if (result.code === "ACCOUNT_EXISTS") {
          return NextResponse.json(
            { ok: false, code: result.code, message: "An account already exists for this email. Please log in instead." },
            { status: 409 }
          );
        }
        return NextResponse.json({ ok: false, message: "Invalid or expired OTP." }, { status: 401 });
      }
    } catch (err) {
      // OTP store throws a typed error but we avoid coupling on the class here.
      if ((err as Error).name === "OtpRateLimitError") {
        return NextResponse.json({ ok: false, message: "Too many attempts. Try again later." }, { status: 429 });
      }
      throw err;
    }

    const response = NextResponse.json({ ok: true });
    const cookieSet = await setSessionCookie(response, email);
    if (!cookieSet) {
      return NextResponse.json(
        { ok: false, message: "Unable to create a secure session. Please try again." },
        { status: 500 }
      );
    }
    void captureProductEvent("otp_verified", email, { intent });
    return response;
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[auth/verify-otp] prisma unavailable, using dev auth fallback");
        if (!emailForFallback) {
          return NextResponse.json({ ok: false, message: "Unable to verify OTP right now." }, { status: 400 });
        }
        const response = NextResponse.json(
          { ok: true, warning: "Signed in with development fallback because database is unavailable." }
        );
        const cookieSet = await setSessionCookie(response, emailForFallback);
        if (!cookieSet) {
          return NextResponse.json(
            { ok: false, message: "Unable to create a secure session. Please try again." },
            { status: 500 }
          );
        }
        return response;
      }
      return NextResponse.json({ ok: false, message: getPrismaUnavailableMessage() }, { status: 503 });
    }

    return NextResponse.json({ ok: false, message: "Unable to verify OTP right now." }, { status: 400 });
  }
}

// Export a Next.js-style handler alias so routes can do:
// `export { handleVerifyOtp as POST } from '@/modules/user/controller'`

export const POST = withApiHandler(handleVerifyOtp);
