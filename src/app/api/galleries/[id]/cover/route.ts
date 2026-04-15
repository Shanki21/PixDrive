import prisma from "@/lib/prisma";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = await getSessionEmailFromRequestAsync(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const photoId = typeof body?.photoId === "string" ? body.photoId.trim() : "";
  const nextCoverId = photoId || null;

  if (nextCoverId) {
    const belongs = await prisma.photo.findFirst({
      where: {
        id: nextCoverId,
        galleryId: id,
      },
      select: { id: true },
    });
    if (!belongs) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }
  }

  const updated = await prisma.gallery.updateMany({
    where: { id, userId: user.id },
    data: { coverPhotoId: nextCoverId },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, coverPhotoId: nextCoverId });
}
