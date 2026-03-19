import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "wf_user_email";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_URL_LENGTH = 6_000_000;
const MAX_PAGE_SIZE = 120;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const email = req.cookies.get(SESSION_COOKIE_NAME)?.value?.trim().toLowerCase() ?? "";
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const gallery = await prisma.gallery.findFirst({
    where: {
      id,
      userId: user.id,
    },
    select: { id: true },
  });

  if (!gallery) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const rawTake = Number(searchParams.get("take") ?? "60");
  const take = Number.isFinite(rawTake) ? Math.min(Math.max(rawTake, 1), MAX_PAGE_SIZE) : 60;
  const cursor = searchParams.get("cursor");

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
      favoriteCount: true,
      downloadCount: true,
    },
  });

  const nextCursor = photos.length === take ? photos[photos.length - 1]?.id ?? null : null;

  return NextResponse.json({
    items: photos,
    nextCursor,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const email = req.cookies.get(SESSION_COOKIE_NAME)?.value?.trim().toLowerCase() ?? "";
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const gallery = await prisma.gallery.findFirst({
    where: {
      id,
      userId: user.id,
    },
    select: { id: true },
  });

  if (!gallery) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { name?: unknown; url?: unknown };
  try {
    body = (await req.json()) as { name?: unknown; url?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = String(body?.name ?? "").trim();
  const url = String(body?.url ?? "");
  if (!name || !url) {
    return NextResponse.json({ error: "name and url are required" }, { status: 400 });
  }
  if (url.length > MAX_URL_LENGTH) {
    return NextResponse.json({ error: "Image payload is too large" }, { status: 413 });
  }

  try {
    const photo = await prisma.photo.create({
      data: {
        name,
        url,
        galleryId: gallery.id,
      },
    });

    return NextResponse.json(photo);
  } catch (error) {
    console.error("Failed to create photo:", error);
    return NextResponse.json({ error: "Unable to save photo" }, { status: 500 });
  }
}
