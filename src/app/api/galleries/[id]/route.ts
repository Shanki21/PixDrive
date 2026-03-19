import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "wf_user_email";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    select: {
      id: true,
      name: true,
      slug: true,
      userId: true,
      coverPhotoId: true,
      createdAt: true,
      _count: {
        select: { photos: true },
      },
    },
  });

  if (!gallery) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { _count, ...rest } = gallery;
  return NextResponse.json({
    ...rest,
    photosCount: _count.photos,
  });
}

export async function PATCH(
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

  const body = await req.json();
  const nextName = String(body?.name ?? "").trim();
  if (!nextName) {
    return NextResponse.json({ error: "Gallery name is required" }, { status: 400 });
  }

  const updated = await prisma.gallery.updateMany({
    where: {
      id,
      userId: user.id,
    },
    data: {
      name: nextName,
    },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const gallery = await prisma.gallery.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      userId: true,
      coverPhotoId: true,
      createdAt: true,
    },
  });

  return NextResponse.json(gallery);
}
