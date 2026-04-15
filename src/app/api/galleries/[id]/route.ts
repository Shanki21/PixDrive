import {
  maskEventSettingsPins,
  mergeEventSettings,
  mergeGalleryMeta,
  normalizeEventSettings,
  normalizeGalleryMeta,
} from "@/lib/gallery-config";
import { secureEventSettingsForStorage } from "@/lib/event-settings-security";
import prisma from "@/lib/prisma";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

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
    select: {
      id: true,
      name: true,
      slug: true,
      userId: true,
      coverPhotoId: true,
      settings: true,
      meta: true,
      createdAt: true,
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
    photoSellingEnabled: parsedSettings?.photoSellingEnabled ?? false,
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
    folders: parsedMeta?.folders ?? [],
    folderPhotosMap: parsedMeta?.folderPhotosMap ?? {},
    folderOrder: parsedMeta?.folderOrder ?? [],
  });
}

export async function PATCH(
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

  const body = await req.json();
  const nextName = typeof body?.name === "string" ? body.name.trim() : "";
  const hasNameUpdate = nextName.length > 0;
  const hasSettingsUpdate = body?.settings !== undefined;
  const hasMetaUpdate = body?.meta !== undefined;

  if (!hasNameUpdate && !hasSettingsUpdate && !hasMetaUpdate) {
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
    },
  });

  return NextResponse.json({
    ...gallery,
    settings: maskEventSettingsPins(normalizeEventSettings(gallery.settings)),
    meta: normalizeGalleryMeta(gallery.meta),
  });
}

export async function DELETE(
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

  const existing = await prisma.gallery.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
}
