import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const email = await getSessionEmailFromRequestAsync(req);
  if (!email) return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
  if (!user) return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });

  return NextResponse.json({ ok: true, profile: user.profile ?? null });
}

export async function PATCH(req: NextRequest) {
  const email = await getSessionEmailFromRequestAsync(req);
  if (!email) return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if ("name" in body) data.name = body.name;
  if ("occupation" in body) data.occupation = body.occupation;
  if ("phone" in body) data.phone = body.phone;
  if ("avatarUrl" in body) data.avatarUrl = body.avatarUrl;
  if ("socialAccounts" in body) data.socialAccounts = body.socialAccounts;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });

  const updateData = data as Prisma.UserProfileUncheckedUpdateInput;
  const createData = { ...(data as Prisma.UserProfileUncheckedCreateInput) };
  createData.userId = user.id;

  const profile = await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: updateData,
    create: createData,
  });

  return NextResponse.json({ ok: true, profile });
}
