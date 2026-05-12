import { createOtp, OtpRateLimitError } from "@/lib/otp-store";
import { sendOtpEmail } from "@/lib/email";
import { normalizeEmail } from "@/lib/input-security";
import { checkIpThrottle } from "@/lib/ip-throttle";
import { getClientIp } from "@/lib/request-ip";
import { getPrismaUnavailableMessage, isPrismaUnavailableError } from "@/lib/prisma-errors";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/withApiHandler";
import { withRateLimit } from "@/lib/rate-limit";

export const POST = withApiHandler(
  withRateLimit(async (req: NextRequest) => {
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

      const delivery = await sendOtpEmail({ to: email, otp: code });
      if (delivery.ok) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[DEV OTP SENT:${delivery.provider}] ${email}: ${code}`);
        }
        return NextResponse.json({ ok: true, delivered: true, provider: delivery.provider });
      }

      console.error("[auth/request-otp] email delivery failed", {
        email,
        reason: delivery.reason,
        message: delivery.message,
      });

      if (process.env.NODE_ENV !== "production") {
        console.warn(`[DEV OTP FALLBACK] ${email}: ${code}`);
        return NextResponse.json({
          ok: true,
          delivered: false,
          message: "OTP email was not sent. Development fallback printed the code to the server console.",
        });
      }

      return NextResponse.json(
        {
          ok: false,
          message: "Unable to send OTP email right now. Please try again in a moment.",
        },
        { status: 503 }
      );
    } catch (error) {
      console.error("[auth/request-otp] request failed", error);
      if (isPrismaUnavailableError(error)) {
        return NextResponse.json(
          { ok: false, message: getPrismaUnavailableMessage() },
          { status: 503 }
        );
      }

      return NextResponse.json({ ok: false, message: "Bad request" }, { status: 400 });
    }
  }, { keyPrefix: "auth:otp:request", limit: 25, windowMs: 60 * 60 * 1000 })
);
