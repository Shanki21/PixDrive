import { getPrismaUnavailableMessage, isPrismaUnavailableError } from "@/lib/prisma-errors";
import { verifyOtp } from "@/lib/otp-store";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "wf_user_email";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const code = String(body?.code ?? "").replace(/\D/g, "");

    if (!emailRegex.test(email) || code.length !== 6) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    if (!verifyOtp(email, code)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email },
    });

    const response = NextResponse.json({ ok: true });
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
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return NextResponse.json(
        { ok: false, message: getPrismaUnavailableMessage() },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
