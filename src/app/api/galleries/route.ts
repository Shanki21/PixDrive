import prisma from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import slugify from "slugify";

const SESSION_COOKIE_NAME = "wf_user_email";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getSessionEmail(req: NextRequest) {
  const email = req.cookies.get(SESSION_COOKIE_NAME)?.value?.trim().toLowerCase() ?? "";
  return emailRegex.test(email) ? email : null;
}

export async function GET(req: NextRequest) {
  try {
    const email = getSessionEmail(req);
    if (!email) {
      return NextResponse.json([]);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json([]);
    }

    const galleries = await prisma.gallery.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        photos: {
          select: { url: true },
          take: 1,
          orderBy: { id: "asc" },
        },
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    const enriched = galleries.map((gallery) => {
      const { _count, photos, ...rest } = gallery;

      return {
        ...rest,
        firstPhotoUrl: photos[0]?.url ?? null,
        filesCount: _count.photos,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Failed to fetch galleries:", error);
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const email = getSessionEmail(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email },
    });

    const name = String(body?.name ?? "").trim();
    const safeName = name || "Untitled gallery";

    const gallery = await prisma.gallery.create({
      data: {
        name: safeName,
        slug: `${slugify(safeName, { lower: true, strict: true }) || "gallery"}-${Date.now()}`,
        userId: user.id,
      },
    });

    return NextResponse.json(gallery);
  } catch (error) {
    console.error("Failed to create gallery:", error);
    return NextResponse.json(
      { error: "Unable to create gallery" },
      { status: 503 }
    );
  }
}
