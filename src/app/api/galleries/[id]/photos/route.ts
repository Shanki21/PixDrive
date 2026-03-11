import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "wf_user_email";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_URL_LENGTH = 6_000_000;

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
