import { destroyCloudinaryAssetByUrl } from "@/lib/cloudinary";
import prisma from "@/lib/prisma";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

async function getAuthorizedPhoto(id: string, email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) return null;

  const photo = await prisma.photo.findFirst({
    where: { id },
    include: { gallery: true },
  });
  if (!photo || photo.gallery.userId !== user.id) return null;

  return { photo, userId: user.id };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = await getSessionEmailFromRequestAsync(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getAuthorizedPhoto(id, email);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const nextName = String(body?.name ?? "").trim();
  if (!nextName) {
    return NextResponse.json({ error: "Photo name is required" }, { status: 400 });
  }

  const updated = await prisma.photo.update({
    where: { id },
    data: { name: nextName },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = await getSessionEmailFromRequestAsync(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getAuthorizedPhoto(id, email);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.gallery.updateMany({
      where: { id: result.photo.galleryId, userId: result.userId, coverPhotoId: id },
      data: { coverPhotoId: null },
    }),
    prisma.photo.delete({ where: { id } }),
  ]);

  try {
    await destroyCloudinaryAssetByUrl(result.photo.url);
  } catch {
    // Ignore media cleanup failures to keep delete action resilient.
  }

  return NextResponse.json({ ok: true });
}
