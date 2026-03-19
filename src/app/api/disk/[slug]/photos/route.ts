import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const MAX_PAGE_SIZE = 120;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const rawTake = Number(searchParams.get("take") ?? "60");
  const take = Number.isFinite(rawTake) ? Math.min(Math.max(rawTake, 1), MAX_PAGE_SIZE) : 60;
  const cursor = searchParams.get("cursor");

  const gallery = await prisma.gallery.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
    },
    select: { id: true },
  });

  if (!gallery) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const photos = await prisma.photo.findMany({
    where: { galleryId: gallery.id },
    orderBy: { id: "asc" },
    take,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    select: {
      id: true,
      name: true,
      url: true,
    },
  });

  const nextCursor = photos.length === take ? photos[photos.length - 1]?.id ?? null : null;

  return NextResponse.json({
    items: photos,
    nextCursor,
  });
}
