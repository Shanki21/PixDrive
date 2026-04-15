import prisma from "@/lib/prisma";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const email = await getSessionEmailFromRequestAsync(req);
  if (!email) return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email }, include: { galleries: true } });
  if (!user) return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });

  const galleryIds = user.galleries.map((g) => g.id);
  if (galleryIds.length === 0) return NextResponse.json({ ok: true, reviews: [] });

  const reviews = await prisma.review.findMany({ where: { galleryId: { in: galleryIds } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ ok: true, reviews });
}
