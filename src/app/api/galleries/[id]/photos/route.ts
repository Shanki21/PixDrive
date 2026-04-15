import { isCloudinaryConfigured, uploadImageDataUrl } from "@/lib/cloudinary";
import prisma from "@/lib/prisma";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

const MAX_URL_LENGTH = 6_000_000;
const MAX_PAGE_SIZE = 120;
const DATA_URL_PREFIX = "data:image/";
const MAX_EXTERNAL_URL_LENGTH = 2048;
const MAX_PHOTO_NAME_LENGTH = 180;
const ALLOWED_DATA_URL_MIME = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i;

function isPrivateHostname(hostname: string) {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) return true;
  if (lower === "::1") return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(lower)) {
    const [a, b] = lower.split(".").map((v) => Number(v));
    if (!Number.isFinite(a) || !Number.isFinite(b)) return true;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  if (lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80")) return true;
  return false;
}

function normalizeExternalImageUrl(value: string) {
  if (!value || value.length > MAX_EXTERNAL_URL_LENGTH) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return null;
    if (isPrivateHostname(parsed.hostname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const name = String(body?.name ?? "").trim();
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
}
