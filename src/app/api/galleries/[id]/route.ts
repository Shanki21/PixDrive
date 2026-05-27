import {
  maskEventSettingsPins,
  mergeEventSettings,
  mergeGalleryMeta,
  normalizeEventSettings,
  normalizeGalleryMeta,
} from "@/lib/gallery-config";
import { normalizeSingleLine } from "@/lib/input-security";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { secureEventSettingsForStorage } from "@/lib/event-settings-security";
import prisma from "@/lib/prisma";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/withApiHandler";
import { withRateLimit } from "@/lib/rate-limit";

const MAX_GALLERY_NAME_LENGTH = 160;

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
    select: {
      id: true,
      name: true,
      slug: true,
      userId: true,
      coverPhotoId: true,
      settings: true,
      meta: true,
      createdAt: true,
      deletedAt: true,
      _count: {
        select: { photos: true },
      },
    },
  });

  if (!gallery) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { _count, settings, meta, ...rest } = gallery;
  const parsedSettings = normalizeEventSettings(settings);
  const parsedMeta = normalizeGalleryMeta(meta);
  return NextResponse.json({
    ...rest,
    photosCount: _count.photos,
    settings: maskEventSettingsPins(parsedSettings),
    meta: parsedMeta,
    startDate: parsedSettings?.startDate ?? null,
    endDate: parsedSettings?.endDate ?? null,
    eventType: parsedSettings?.eventType ?? null,
    eventLocation: parsedSettings?.eventLocation ?? null,
    description: parsedSettings?.description ?? null,
    published: parsedSettings?.published ?? true,
    allowSingleDownload: parsedSettings?.allowSingleDownload ?? true,
    allowBulkDownload: parsedSettings?.allowBulkDownload ?? false,
    oneQrEnabled: parsedSettings?.oneQrEnabled ?? true,
    expiresAt: parsedMeta?.expiresAt ?? null,
    storageTimeLabel: parsedMeta?.storageTimeLabel ?? null,
    favoritesEnabled: parsedMeta?.favoritesEnabled ?? true,
    favoritesLimitSelected: parsedMeta?.favoritesLimitSelected ?? false,
    favoritesName: parsedMeta?.favoritesName ?? null,
    favoritesListsCount: parsedMeta?.favoritesListsCount ?? 0,
    selectionCompletedCount: parsedMeta?.selectionCompletedCount ?? 0,
    favoritesMaxSelected: parsedMeta?.favoritesMaxSelected ?? null,
    coverPositionX: parsedMeta?.coverPositionX ?? 50,
    coverPositionY: parsedMeta?.coverPositionY ?? 50,
    folders: parsedMeta?.folders ?? [],
    folderPhotosMap: parsedMeta?.folderPhotosMap ?? {},
    folderOrder: parsedMeta?.folderOrder ?? [],
    deletedAt: gallery.deletedAt?.toISOString() ?? null,
  });
});

export const PATCH = withApiHandler(
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

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const nextName = normalizeSingleLine(body?.name, MAX_GALLERY_NAME_LENGTH);
  const hasNameUpdate = nextName.length > 0;
  const hasSettingsUpdate = body?.settings !== undefined;
  const hasMetaUpdate = body?.meta !== undefined;
  const hasDeletedAtUpdate = body?.deletedAt === null;

  if (!hasNameUpdate && !hasSettingsUpdate && !hasMetaUpdate && !hasDeletedAtUpdate) {
    return NextResponse.json(
      { error: "Provide at least one field to update: name, settings, or meta." },
      { status: 400 }
    );
  }

  const existing = await prisma.gallery.findFirst({
    where: { id, userId: user.id },
    select: { id: true, settings: true, meta: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nextSettings = hasSettingsUpdate
    ? mergeEventSettings(existing.settings, body.settings)
    : undefined;
  const nextMeta = hasMetaUpdate ? mergeGalleryMeta(existing.meta, body.meta) : undefined;

  const secureSettings = hasSettingsUpdate
    ? await secureEventSettingsForStorage(nextSettings ?? null)
    : undefined;

  const gallery = await prisma.gallery.update({
    where: { id: existing.id },
    data: {
      ...(hasNameUpdate ? { name: nextName } : {}),
      ...(hasSettingsUpdate && secureSettings ? { settings: secureSettings } : {}),
      ...(hasMetaUpdate && nextMeta ? { meta: nextMeta } : {}),
      ...(hasDeletedAtUpdate ? { deletedAt: null } : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      userId: true,
      coverPhotoId: true,
      settings: true,
      meta: true,
      createdAt: true,
      deletedAt: true,
    },
  });

  return NextResponse.json({
    ...gallery,
    settings: maskEventSettingsPins(normalizeEventSettings(gallery.settings)),
    meta: normalizeGalleryMeta(gallery.meta),
    deletedAt: gallery.deletedAt?.toISOString() ?? null,
  });
}, { keyPrefix: "gallery:update", limit: 10, windowMs: 60 * 60 * 1000 })
);

export const DELETE = withApiHandler(
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

    const permanent = new URL(req.url).searchParams.get("permanent") === "1";
    const existing = await prisma.gallery.findFirst({
      where: { id, userId: user.id },
      select: { id: true, deletedAt: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!permanent) {
      await prisma.gallery.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      });
      return NextResponse.json({ ok: true, deletedAt: new Date().toISOString() });
    }

    await prisma.$transaction(async (tx) => {
      await tx.gallery.updateMany({
        where: { id: existing.id, coverPhotoId: { not: null } },
        data: { coverPhotoId: null },
      });

      await tx.galleryVisit.deleteMany({
        where: { galleryId: existing.id },
      });

      await tx.review.deleteMany({
        where: { galleryId: existing.id },
      });

      await tx.clientProfile.deleteMany({
        where: { galleryId: existing.id },
      });

      await tx.clientPhotoAction.deleteMany({
        where: { galleryId: existing.id },
      });

      await tx.photo.deleteMany({
        where: { galleryId: existing.id },
      });

      await tx.gallery.delete({
        where: { id: existing.id },
      });
    });

    return NextResponse.json({ ok: true });
  }, { keyPrefix: "gallery:delete", limit: 5, windowMs: 60 * 60 * 1000 })
);
