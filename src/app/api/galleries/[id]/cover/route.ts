import prisma from "@/lib/prisma";
import { normalizeSingleLine } from "@/lib/input-security";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const blocked = rejectCrossOriginWrite(req);
  if (blocked) {
    return blocked;
  }

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

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const photoId = normalizeSingleLine(body?.photoId, 120);
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
