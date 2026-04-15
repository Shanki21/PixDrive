import { maskEventSettingsPins, normalizeEventSettings, normalizeGalleryMeta } from "@/lib/gallery-config";
import { secureEventSettingsForStorage } from "@/lib/event-settings-security";
import { getPrismaUnavailableMessage, isPrismaUnavailableError } from "@/lib/prisma-errors";
import prisma from "@/lib/prisma";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { NextResponse, NextRequest } from "next/server";
import slugify from "slugify";

async function getSessionEmail(req: NextRequest) {
  return await getSessionEmailFromRequestAsync(req);
}

export async function GET(req: NextRequest) {
  try {
    const email = await getSessionEmail(req);
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
      const { _count, photos, settings, meta, ...rest } = gallery;
      const parsedSettings = normalizeEventSettings(settings);
      const parsedMeta = normalizeGalleryMeta(meta);

      return {
        ...rest,
        firstPhotoUrl: photos[0]?.url ?? null,
        filesCount: _count.photos,
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
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Failed to fetch galleries:", error);
    return NextResponse.json(
      { error: isPrismaUnavailableError(error) ? getPrismaUnavailableMessage() : "Unable to fetch galleries" },
      { status: isPrismaUnavailableError(error) ? 503 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const email = await getSessionEmail(req);
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
    const settings = normalizeEventSettings(body?.settings);
    const meta = normalizeGalleryMeta(body?.meta);
    const secureSettings = await secureEventSettingsForStorage(settings);

    const gallery = await prisma.gallery.create({
      data: {
        name: safeName,
        slug: `${slugify(safeName, { lower: true, strict: true }) || "gallery"}-${Date.now()}`,
        userId: user.id,
        settings: secureSettings ?? undefined,
        meta: meta ?? undefined,
      },
    });
    return NextResponse.json({
      ...gallery,
      settings: maskEventSettingsPins(normalizeEventSettings(gallery.settings)),
      meta: normalizeGalleryMeta(gallery.meta),
    });
  } catch (error) {
    console.error("Failed to create gallery:", error);
    return NextResponse.json(
      { error: isPrismaUnavailableError(error) ? getPrismaUnavailableMessage() : "Unable to create gallery" },
      { status: isPrismaUnavailableError(error) ? 503 : 500 }
    );
  }
}
