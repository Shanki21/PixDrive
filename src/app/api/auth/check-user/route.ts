import { getPrismaUnavailableMessage, isPrismaUnavailableError } from "@/lib/prisma-errors";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim();
    if (!email) {
      return NextResponse.json({ exists: false, message: "Email is required." }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ exists: Boolean(user) });
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[auth/check-user] prisma unavailable, using dev fallback");
        return NextResponse.json({
          exists: true,
          warning: "Using development fallback because database is unavailable.",
        });
      }
      return NextResponse.json(
        { exists: false, message: getPrismaUnavailableMessage() },
        { status: 503 }
      );
    }
    if (process.env.NODE_ENV !== "production") {
      console.warn("[auth/check-user] unexpected error, using dev fallback");
      return NextResponse.json({
        exists: true,
        warning: "Using development fallback because user lookup failed.",
      });
    }
    return NextResponse.json(
      { exists: false, message: "Unable to validate your email right now." },
      { status: 500 }
    );
  }
}
