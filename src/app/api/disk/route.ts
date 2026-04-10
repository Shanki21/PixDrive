import JSZip from "jszip";
import { getGalleryPublicAccess } from "@/lib/gallery-public-access";
import {
  hasGalleryAccessFromRequest,
  setGalleryAccessCookie,
  verifyGalleryPin,
  getRequiredGalleryPin,
} from "@/lib/gallery-pin-access";
import { normalizeGalleryMeta } from "@/lib/gallery-config";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { slug?: unknown; pin?: unknown; action?: unknown } | null;
  const action = String(body?.action ?? "").trim();
  if (action !== "unlock") {
    return NextResponse.json({ ok: false, error: "Invalid action." }, { status: 400 });
  }

  const slug = String(body?.slug ?? "").trim();
  const pin = String(body?.pin ?? "").trim();
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

  if (!verifyGalleryPin(gallery.settings, pin)) {
    return NextResponse.json({ ok: false, error: "Invalid PIN." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  const cookieSet = setGalleryAccessCookie(response, gallery.id);
  if (!cookieSet) {
    return NextResponse.json({ ok: false, error: "Session secret is missing." }, { status: 500 });
  }
  return response;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = String(searchParams.get("action") ?? "").trim();
  if (action !== "download") {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const slug = String(searchParams.get("slug") ?? "").trim();
  const scope = String(searchParams.get("scope") ?? "all").trim();
  const clientKey = String(searchParams.get("clientKey") ?? "").trim();
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

  const zip = new JSZip();
  const usedNames = new Set<string>();

  await Promise.all(
    targetPhotos.map(async (photo, index) => {
      try {
        const response = await fetch(photo.url, { signal: AbortSignal.timeout(12000) });
        if (!response.ok) return;
        const blob = await response.blob();
        const safe = sanitizeFileName(photo.name || `photo-${index + 1}`);
        const ext =
          safe.includes(".")
            ? ""
            : blob.type === "image/png"
              ? ".png"
              : blob.type === "image/webp"
                ? ".webp"
                : blob.type === "image/jpeg"
                  ? ".jpg"
                  : "";
        const fileName = uniqueFileName(`${safe}${ext}`, usedNames);
        zip.file(fileName, blob);
      } catch {
        // Skip unreachable files and continue packing.
      }
    })
  );

  const content = await zip.generateAsync({ type: "nodebuffer" });
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
