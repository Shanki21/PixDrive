import prisma from "@/lib/prisma";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; reviewId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const email = await getSessionEmailFromRequestAsync(req);
  if (!email) return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { id: galleryId, reviewId } = await params;

  try {
    // Ensure the gallery belongs to the user
    const user = await prisma.user.findUnique({ where: { email }, include: { galleries: true } });
    if (!user) return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
    if (!user.galleries.some((g) => g.id === galleryId)) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 403 });
    }

    const updateData: Prisma.ReviewUpdateInput = {};
    if (typeof body.published === "boolean") updateData.published = body.published;
    if (typeof body.text === "string") updateData.text = body.text.trim();
    if (typeof body.reviewerName === "string") updateData.reviewerName = body.reviewerName.trim();

    const review = await prisma.review.update({ where: { id: reviewId }, data: updateData });
    return NextResponse.json({ ok: true, review });
  } catch (error) {
    console.error("PATCH review error", error);
    return NextResponse.json({ ok: false, message: "Unable to update review" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const email = await getSessionEmailFromRequestAsync(req);
  if (!email) return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });

  try {
    const { id: galleryId, reviewId } = await params;
    const user = await prisma.user.findUnique({ where: { email }, include: { galleries: true } });
    if (!user) return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
    if (!user.galleries.some((g) => g.id === galleryId)) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 403 });
    }

    await prisma.review.delete({ where: { id: reviewId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE review error", error);
    return NextResponse.json({ ok: false, message: "Unable to delete review" }, { status: 500 });
  }
}
