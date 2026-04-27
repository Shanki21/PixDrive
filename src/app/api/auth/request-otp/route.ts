import { createOtp, OtpRateLimitError } from "@/lib/otp-store";
import { sendOtpEmail } from "@/lib/email";
import { normalizeEmail } from "@/lib/input-security";
import { checkIpThrottle } from "@/lib/ip-throttle";
import { getClientIp } from "@/lib/request-ip";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const blocked = rejectCrossOriginWrite(req);
  if (blocked) {
    return blocked;
  }

  try {
    const body = await req.json();
    const email = normalizeEmail(body?.email);

    if (!email) {
      return NextResponse.json({ ok: false, message: "Invalid email" }, { status: 400 });
    }

    const ip = getClientIp(req) ?? "unknown";
    const ipLimit = await checkIpThrottle({
      key: `auth:otp:request:ip:${ip}`,
      limit: 25,
      windowMs: 60 * 60 * 1000,
    });
    if (!ipLimit.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Too many requests",
          retryAfterSeconds: ipLimit.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const emailIpLimit = await checkIpThrottle({
      key: `auth:otp:request:email-ip:${email}:${ip}`,
      limit: 8,
      windowMs: 60 * 60 * 1000,
    });
    if (!emailIpLimit.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Too many requests",
          retryAfterSeconds: emailIpLimit.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    let code: string;
    try {
      code = await createOtp(email);
    } catch (err) {
      if (err instanceof OtpRateLimitError) {
        return NextResponse.json({ ok: false, message: "Too many requests" }, { status: 429 });
      }
      throw err;
    }

    try {
      const result = await sendOtpEmail({ to: email, otp: code });
      if (!result.ok) {
        console.error("[auth/request-otp] email delivery failed", {
          reason: result.reason,
          message: result.message,
          email,
        });
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[DEV OTP FALLBACK] ${email}: ${code}`);
          return NextResponse.json({
            ok: true,
            delivered: false,
            message: "Email provider not configured. OTP logged to server console in development.",
          });
        }
        // In production we intentionally do not leak delivery failures.
        return NextResponse.json({ ok: true });
      }
      // Always return a generic success response so callers can't enumerate users.
      return NextResponse.json({ ok: true });
    } catch (err) {
      // If send fails for unexpected reasons, log and return generic success in prod.
      console.error("[auth/request-otp] unexpected error sending OTP", { error: err, email });
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[DEV OTP FALLBACK] ${email}: ${code}`);
        return NextResponse.json({ ok: true, delivered: false });
      }
      return NextResponse.json({ ok: true });
    }
  } catch {
    return NextResponse.json({ ok: false, message: "Bad request" }, { status: 400 });
  }
}
