import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const fallbackUsers = new Set(["demo@demo.com"]);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ exists: false }, { status: 400 });
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      return NextResponse.json({ exists: Boolean(user) });
    } catch {
      return NextResponse.json({ exists: fallbackUsers.has(email) });
    }
  } catch {
    return NextResponse.json({ exists: false }, { status: 400 });
  }
}

