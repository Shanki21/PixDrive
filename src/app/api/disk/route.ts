import JSZip from "jszip";
import { getGalleryPublicAccess } from "@/lib/gallery-public-access";
import { checkIpThrottle } from "@/lib/ip-throttle";
import { normalizeClientKey, normalizeSingleLine } from "@/lib/input-security";
import { getClientIp } from "@/lib/request-ip";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { normalizePublicUrl } from "@/lib/url-security";
import {
  hasGalleryAccessFromRequest,
  setGalleryAccessCookie,
  verifyGalleryPin,
  getRequiredGalleryPin,
} from "@/lib/gallery-pin-access";
import { normalizeGalleryMeta } from "@/lib/gallery-config";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/withApiHandler";
import { withRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
const DOWNLOAD_FETCH_TIMEOUT_MS = 12000;
const MAX_SOURCE_FILE_BYTES = 30 * 1024 * 1024;
const MAX_BULK_DOWNLOAD_FILES = 400;
const MAX_BULK_DOWNLOAD_BYTES = 500 * 1024 * 1024;
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

function uniqueFileName(base: string, used: Set<string>) {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : "";
  let counter = 2;
  let next = `${stem}-${counter}${ext}`;
  while (used.has(next)) {
    counter += 1;
    next = `${stem}-${counter}${ext}`;
  }
  used.add(next);
  return next;
}

function isAllowedImageContentType(contentType: string) {
  const lower = contentType.toLowerCase();
  return ALLOWED_IMAGE_CONTENT_TYPES.some((allowed) => lower.includes(allowed));
}

async function resolveGalleryBySlug(slug: string) {
  return prisma.gallery.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: {
      id: true,
      name: true,
      slug: true,
      settings: true,
      meta: true,
      photos: {
        select: { id: true, name: true, url: true },
        orderBy: { id: "asc" },
      },
    },
  });
}

export const POST = withApiHandler(
  withRateLimit(async (req: NextRequest) => {
    const blocked = rejectCrossOriginWrite(req);
    if (blocked) {
      return blocked;
    }

    const body = (await req.json().catch(() => null)) as { slug?: unknown; pin?: unknown; action?: unknown } | null;
    const action = String(body?.action ?? "").trim();
    if (action !== "unlock") {
      return NextResponse.json({ ok: false, error: "Invalid action." }, { status: 400 });
    }

    const slug = normalizeSingleLine(body?.slug, 120);
    const pin = normalizeSingleLine(body?.pin, 64);
    if (!slug || !pin) {
      return NextResponse.json({ ok: false, error: "slug and pin are required." }, { status: 400 });
    }

    const gallery = await resolveGalleryBySlug(slug);
    if (!gallery) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const publicAccess = getGalleryPublicAccess({ settings: gallery.settings, meta: gallery.meta });
    if (!publicAccess.canAccess) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const requiredPin = getRequiredGalleryPin(gallery.settings);
    if (!requiredPin) {
      return NextResponse.json({ ok: true });
    }

    const ip = getClientIp(req) ?? "unknown";
    const unlockLimit = await checkIpThrottle({
      key: `gallery:unlock:${gallery.id}:${ip}`,
      limit: 12,
      windowMs: 15 * 60 * 1000,
    });
    if (!unlockLimit.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Too many attempts. Try again later.",
          retryAfterSeconds: unlockLimit.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    if (!(await verifyGalleryPin(gallery.settings, pin))) {
      return NextResponse.json({ ok: false, error: "Invalid PIN." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    const cookieSet = setGalleryAccessCookie(response, gallery.id);
    if (!cookieSet) {
      return NextResponse.json({ ok: false, error: "Session secret is missing." }, { status: 500 });
    }
    return response;
  }, { keyPrefix: "gallery:unlock", limit: 12, windowMs: 15 * 60 * 1000 })
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = String(searchParams.get("action") ?? "").trim();
  if (action !== "download") {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const slug = String(searchParams.get("slug") ?? "").trim();
  const scope = String(searchParams.get("scope") ?? "all").trim();
  const clientKey = normalizeClientKey(searchParams.get("clientKey"));
  if (!slug) {
    return NextResponse.json({ error: "slug is required." }, { status: 400 });
  }

  const gallery = await resolveGalleryBySlug(slug);
  if (!gallery) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const publicAccess = getGalleryPublicAccess({ settings: gallery.settings, meta: gallery.meta });
  if (!publicAccess.canAccess) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!publicAccess.allowBulkDownload) {
    return NextResponse.json({ error: "Bulk download is disabled for this gallery." }, { status: 403 });
  }

  const requiredPin = getRequiredGalleryPin(gallery.settings);
  if (requiredPin && !hasGalleryAccessFromRequest(req, gallery.id)) {
    return NextResponse.json({ error: "PIN required." }, { status: 401 });
  }

  const ip = getClientIp(req) ?? "unknown";
  const bulkDownloadLimit = await checkIpThrottle({
    key: `gallery:bulk-download:${gallery.id}:${ip}`,
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!bulkDownloadLimit.ok) {
    return NextResponse.json(
      {
        error: "Too many download requests. Try again later.",
        retryAfterSeconds: bulkDownloadLimit.retryAfterSeconds,
      },
      { status: 429 }
    );
  }

  const allPhotos = gallery.photos;
  let targetPhotos = allPhotos;

  if (scope === "favorites") {
    if (!clientKey) {
      return NextResponse.json({ error: "clientKey is required for favorites download." }, { status: 400 });
    }
    const liked = await prisma.clientPhotoAction.findMany({
      where: { galleryId: gallery.id, clientKey, action: "favorite" },
      select: { photoId: true },
    });
    const likedIds = new Set(liked.map((row) => row.photoId));
    targetPhotos = allPhotos.filter((photo) => likedIds.has(photo.id));
  } else if (scope === "all") {
    const meta = normalizeGalleryMeta(gallery.meta);
    const hiddenFolderIds = new Set((meta?.folders ?? []).filter((folder) => folder.hidden).map((folder) => folder.id));
    if (hiddenFolderIds.size > 0) {
      const hiddenPhotoIds = new Set<string>();
      const folderMap = meta?.folderPhotosMap ?? {};
      hiddenFolderIds.forEach((folderId) => {
        (folderMap[folderId] ?? []).forEach((id) => hiddenPhotoIds.add(id));
      });
      targetPhotos = allPhotos.filter((photo) => !hiddenPhotoIds.has(photo.id));
    }
  } else {
    return NextResponse.json({ error: "Invalid scope." }, { status: 400 });
  }

  if (targetPhotos.length === 0) {
    return NextResponse.json({ error: "No photos to download." }, { status: 404 });
  }
  if (targetPhotos.length > MAX_BULK_DOWNLOAD_FILES) {
    return NextResponse.json(
      { error: `Too many photos requested at once. Maximum ${MAX_BULK_DOWNLOAD_FILES} files per ZIP.` },
      { status: 413 }
    );
  }

  const zip = new JSZip();
  const usedNames = new Set<string>();
  let totalBytes = 0;
  let addedCount = 0;

  for (let index = 0; index < targetPhotos.length; index += 1) {
    const photo = targetPhotos[index];
    const sourceUrl = normalizePublicUrl(photo.url);
    if (!sourceUrl) {
      continue;
    }

    try {
      const { default: fetchWithRetry } = await import("@/lib/fetchWithRetry");
      const response = await fetchWithRetry(sourceUrl, { signal: AbortSignal.timeout(DOWNLOAD_FETCH_TIMEOUT_MS) }, { dedupeKey: `disk:download:${photo.id}` });
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type") ?? "application/octet-stream";
      if (!isAllowedImageContentType(contentType)) continue;

      const headerLength = Number(response.headers.get("content-length") ?? 0);
      if (Number.isFinite(headerLength) && headerLength > MAX_SOURCE_FILE_BYTES) {
        continue;
      }
      if (
        Number.isFinite(headerLength) &&
        headerLength > 0 &&
        totalBytes + headerLength > MAX_BULK_DOWNLOAD_BYTES
      ) {
        return NextResponse.json({ error: "Requested ZIP is too large." }, { status: 413 });
      }

      const data = await response.arrayBuffer();
      if (data.byteLength > MAX_SOURCE_FILE_BYTES) {
        continue;
      }
      if (totalBytes + data.byteLength > MAX_BULK_DOWNLOAD_BYTES) {
        return NextResponse.json({ error: "Requested ZIP is too large." }, { status: 413 });
      }

      const safe = sanitizeFileName(photo.name || `photo-${index + 1}`);
      const ext =
        safe.includes(".")
          ? ""
          : contentType.includes("image/png")
            ? ".png"
            : contentType.includes("image/webp")
              ? ".webp"
              : contentType.includes("image/jpeg")
                ? ".jpg"
                : "";
      const fileName = uniqueFileName(`${safe}${ext}`, usedNames);
      zip.file(fileName, new Uint8Array(data));
      totalBytes += data.byteLength;
      addedCount += 1;
    } catch {
      // Skip unreachable files and continue packing.
    }
  }

  if (addedCount === 0) {
    return NextResponse.json({ error: "No downloadable photos were available." }, { status: 502 });
  }

  const content = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  const body = new Uint8Array(content);
  const baseName = sanitizeFileName(gallery.name || "gallery");
  const scopeLabel = scope === "favorites" ? "favorites" : "all";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${baseName}-${scopeLabel}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
