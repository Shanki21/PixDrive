import { isCloudinaryConfigured, uploadImageDataUrl } from "@/lib/cloudinary";
import { normalizeSingleLine } from "@/lib/input-security";
import prisma from "@/lib/prisma";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { normalizePublicUrl } from "@/lib/url-security";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/withApiHandler";
import { withRateLimit } from "@/lib/rate-limit";

const MAX_URL_LENGTH = 6_000_000;
const MAX_PAGE_SIZE = 120;
const DATA_URL_PREFIX = "data:image/";
const MAX_EXTERNAL_URL_LENGTH = 2048;
const MAX_PHOTO_NAME_LENGTH = 180;
const ALLOWED_DATA_URL_MIME = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i;

function normalizeExternalImageUrl(value: string) {
  if (!value || value.length > MAX_EXTERNAL_URL_LENGTH) return null;
  return normalizePublicUrl(value, {
    allowHttpLocalhost: process.env.NODE_ENV !== "production",
  });
}

export const GET = withApiHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const email = await getSessionEmailFromRequestAsync(req);
  if (!email) {
    return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
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
});

export const POST = withApiHandler(
  withRateLimit(async (req: NextRequest, ...rest: unknown[]) => {
    const { params } = rest[0] as { params: Promise<{ id: string }> };
    const { id } = await params;
    const blocked = rejectCrossOriginWrite(req);
    if (blocked) {
      return blocked;
    }
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

    const name = normalizeSingleLine(body?.name, MAX_PHOTO_NAME_LENGTH);
    const rawUrl = String(body?.url ?? "").trim();
    if (!name || !rawUrl) {
      return NextResponse.json({ error: "name and url are required" }, { status: 400 });
    }
    if (name.length > MAX_PHOTO_NAME_LENGTH) {
      return NextResponse.json({ error: "Photo name is too long." }, { status: 400 });
    }

    let url = rawUrl;
    const isDataUrl = url.startsWith(DATA_URL_PREFIX);
    if (isDataUrl) {
      if (!ALLOWED_DATA_URL_MIME.test(url)) {
        return NextResponse.json({ error: "Unsupported image format." }, { status: 400 });
      }
    } else {
      const external = normalizeExternalImageUrl(url);
      if (!external) {
        return NextResponse.json({ error: "Only secure public HTTPS image URLs are allowed." }, { status: 400 });
      }
      url = external;
    }

    if (url.length > MAX_URL_LENGTH) {
      return NextResponse.json({ error: "Image payload is too large" }, { status: 413 });
    }

    try {
      let finalUrl = url;
      if (url.startsWith(DATA_URL_PREFIX)) {
        if (!isCloudinaryConfigured()) {
          return NextResponse.json(
            { error: "Cloudinary is not configured. Configure media environment variables." },
            { status: 500 }
          );
        }
        const uploaded = await uploadImageDataUrl(url);
        finalUrl = uploaded.url;
      }

      const photo = await prisma.photo.create({
        data: {
          name,
          url: finalUrl,
          galleryId: gallery.id,
        },
      });

      return NextResponse.json(photo);
    } catch (error) {
      console.error("Failed to create photo:", error);
      return NextResponse.json({ error: "Unable to save photo" }, { status: 500 });
    }
  }, { keyPrefix: "gallery:photos", limit: 200, windowMs: 15 * 60 * 1000 })
);
