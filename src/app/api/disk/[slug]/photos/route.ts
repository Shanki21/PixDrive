import { getGalleryPublicAccess } from "@/lib/gallery-public-access";
import { getRequiredGalleryPin, hasGalleryAccessFromRequest } from "@/lib/gallery-pin-access";
import { normalizePublicUrl } from "@/lib/url-security";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import fetchWithRetry from "@/lib/fetchWithRetry";

const MAX_PAGE_SIZE = 120;
const MAX_SINGLE_DOWNLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

function sanitizeFileName(value: string) {
  const cleaned = value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
  return cleaned || "photo";
}

function getFileExtension(contentType: string, fallbackName: string) {
  const lower = contentType.toLowerCase();
  if (lower.includes("image/jpeg")) return ".jpg";
  if (lower.includes("image/png")) return ".png";
  if (lower.includes("image/webp")) return ".webp";

  const dot = fallbackName.lastIndexOf(".");
  return dot > -1 ? fallbackName.slice(dot) : "";
}

function isAllowedImageContentType(contentType: string) {
  const lower = contentType.toLowerCase();
  return ALLOWED_IMAGE_CONTENT_TYPES.some((allowed) => lower.includes(allowed));
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const rawTake = Number(searchParams.get("take") ?? "60");
  const take = Number.isFinite(rawTake) ? Math.min(Math.max(rawTake, 1), MAX_PAGE_SIZE) : 60;
  const cursor = searchParams.get("cursor");
  const downloadId = String(searchParams.get("downloadId") ?? "").trim();

  const gallery = await prisma.gallery.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
    },
    select: { id: true, settings: true, meta: true },
  });

  if (!gallery) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const publicAccess = getGalleryPublicAccess({ settings: gallery.settings, meta: gallery.meta });
  if (!publicAccess.canAccess) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const requiredPin = getRequiredGalleryPin(gallery.settings);
  if (requiredPin && !hasGalleryAccessFromRequest(req, gallery.id)) {
    return NextResponse.json({ error: "PIN required." }, { status: 401 });
  }

  if (downloadId) {
    if (!publicAccess.allowSingleDownload) {
      return NextResponse.json({ error: "Single download is disabled for this gallery." }, { status: 403 });
    }

    const photo = await prisma.photo.findFirst({
      where: { id: downloadId, galleryId: gallery.id },
      select: { id: true, name: true, url: true },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found." }, { status: 404 });
    }

    try {
      const sourceUrl = normalizePublicUrl(photo.url);
      if (!sourceUrl) {
        return NextResponse.json({ error: "Photo source is unavailable." }, { status: 415 });
      }

      const upstream = await fetchWithRetry(sourceUrl, { signal: AbortSignal.timeout(12000) }, { dedupeKey: `upstream:photo:${photo.id}`, maxAttempts: 3 });
      if (!upstream.ok) {
        return NextResponse.json({ error: "Unable to fetch source image." }, { status: 502 });
      }

      const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
      if (!isAllowedImageContentType(contentType)) {
        return NextResponse.json({ error: "Unsupported source file type." }, { status: 415 });
      }
      const headerLength = Number(upstream.headers.get("content-length") ?? 0);
      if (Number.isFinite(headerLength) && headerLength > MAX_SINGLE_DOWNLOAD_BYTES) {
        return NextResponse.json({ error: "File is too large to download." }, { status: 413 });
      }
      const data = await upstream.arrayBuffer();
      if (data.byteLength > MAX_SINGLE_DOWNLOAD_BYTES) {
        return NextResponse.json({ error: "File is too large to download." }, { status: 413 });
      }
      const safeBase = sanitizeFileName(photo.name || "photo");
      const ext = safeBase.includes(".") ? "" : getFileExtension(contentType, photo.name || "");
      const fileName = `${safeBase}${ext}`;

      return new NextResponse(data, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch {
      return NextResponse.json({ error: "Unable to download photo right now." }, { status: 502 });
    }
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
