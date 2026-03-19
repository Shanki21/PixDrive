import { createOtp } from "@/lib/otp-store";
import { sendOtpEmail } from "@/lib/email";
import { NextResponse } from "next/server";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();

    if (!emailRegex.test(email)) {
      return NextResponse.json({ ok: false, message: "Invalid email" }, { status: 400 });
    }

    const code = createOtp(email);
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
      return NextResponse.json({ ok: false, message: result.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, delivered: true });
  } catch {
    return NextResponse.json({ ok: false, message: "Bad request" }, { status: 400 });
  }
}
