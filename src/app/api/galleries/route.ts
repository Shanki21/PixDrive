import {
  maskEventSettingsPins,
  normalizeEventSettings,
  normalizeGalleryMeta,
} from "@/lib/gallery-config";
import { normalizeSingleLine } from "@/lib/input-security";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { secureEventSettingsForStorage } from "@/lib/event-settings-security";
import {
  getPrismaUnavailableMessage,
  isPrismaUnavailableError,
} from "@/lib/prisma-errors";
import prisma from "@/lib/prisma";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import slugify from "slugify";
import { withApiHandler } from "@/lib/withApiHandler";
import { withRateLimit } from "@/lib/rate-limit";
import { ensureCanCreateGallery } from "@/lib/billing";
import { captureProductEvent } from "@/lib/product-analytics";

const MAX_GALLERY_NAME_LENGTH = 160;

async function getSessionEmail(req: NextRequest) {
  return getSessionEmailFromRequestAsync(req);
}

function toVisitsMap(rows: Array<{ galleryId: string; _count: { _all: number | null } }>) {
  const visits: Record<string, number> = {};
  rows.forEach((row) => {
    visits[row.galleryId] = row._count._all ?? 0;
  });
  return visits;
}

function toDownloadsMap(rows: Array<{ galleryId: string; _sum: { downloadCount: number | null } }>) {
  const downloads: Record<string, number> = {};
  rows.forEach((row) => {
    downloads[row.galleryId] = row._sum.downloadCount ?? 0;
  });
  return downloads;
}

function serializeGalleryRow(
  gallery: {
    id: string;
    name: string;
    slug: string;
    userId: string;
    coverPhotoId: string | null;
    settings: Prisma.JsonValue | null;
    meta: Prisma.JsonValue | null;
    createdAt: Date;
    deletedAt: Date | null;
    photos: Array<{ url: string }>;
    coverPhoto: { url: string } | null;
    _count: { photos: number };
  },
  visitsMap: Record<string, number>,
  downloadsMap: Record<string, number>
) {
  const { _count, photos, coverPhoto, settings, meta, ...rest } = gallery;
  const parsedSettings = normalizeEventSettings(settings) ?? {};
  const parsedMeta = normalizeGalleryMeta(meta) ?? {};

  return {
    ...rest,
    settings: parsedSettings,
    meta: parsedMeta,
    firstPhotoUrl: photos[0]?.url ?? null,
    coverUrl: coverPhoto?.url ?? photos[0]?.url ?? null,
    filesCount: _count.photos,
    visitors: visitsMap[gallery.id] ?? 0,
    downloads: downloadsMap[gallery.id] ?? 0,
    startDate: parsedSettings.startDate ?? null,
    endDate: parsedSettings.endDate ?? null,
    eventType: parsedSettings.eventType ?? null,
    eventLocation: parsedSettings.eventLocation ?? null,
    description: parsedSettings.description ?? null,
    published: parsedSettings.published ?? true,
    allowSingleDownload: parsedSettings.allowSingleDownload ?? true,
    allowBulkDownload: parsedSettings.allowBulkDownload ?? false,
    oneQrEnabled: parsedSettings.oneQrEnabled ?? true,
    expiresAt: parsedMeta.expiresAt ?? null,
    storageTimeLabel: parsedMeta.storageTimeLabel ?? null,
    customDomain: parsedMeta.customDomain ?? null,
    customDomainVerified: parsedMeta.customDomainVerified ?? false,
    favoritesEnabled: parsedMeta.favoritesEnabled ?? true,
    favoritesLimitSelected: parsedMeta.favoritesLimitSelected ?? false,
    favoritesName: parsedMeta.favoritesName ?? null,
    favoritesListsCount: parsedMeta.favoritesListsCount ?? 0,
    selectionCompletedCount: parsedMeta.selectionCompletedCount ?? 0,
    favoritesMaxSelected: parsedMeta.favoritesMaxSelected ?? null,
    coverPositionX: parsedMeta.coverPositionX ?? 50,
    coverPositionY: parsedMeta.coverPositionY ?? 50,
    folders: parsedMeta.folders ?? [],
    folderPhotosMap: parsedMeta.folderPhotosMap ?? {},
    folderOrder: parsedMeta.folderOrder ?? [],
  };
}

function wantsMetrics(req: NextRequest) {
  const value = new URL(req.url).searchParams.get("metrics");
  return value === "1" || value === "true";
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

    const { searchParams } = new URL(req.url);
    const trash = searchParams.get("trash") === "1";
    const includeMetrics = wantsMetrics(req);
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    if (trash) {
      await prisma.gallery.deleteMany({
        where: {
          userId: user.id,
          deletedAt: { lt: cutoff },
        },
      });
    }

    const galleries = await prisma.gallery.findMany({
      where: {
        userId: user.id,
        deletedAt: trash ? { not: null } : null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        photos: {
          select: { url: true },
          take: 1,
          orderBy: { id: "asc" },
        },
        coverPhoto: {
          select: { url: true },
        },
        _count: {
          select: { photos: true },
        },
      },
    });

    const galleryIds = includeMetrics ? galleries.map((gallery) => gallery.id) : [];
    const [visitRows, downloadRows] =
      galleryIds.length === 0
        ? [[], []]
        : await Promise.all([
            prisma.galleryVisit.groupBy({
              by: ["galleryId"],
              _count: { _all: true },
              where: { galleryId: { in: galleryIds } },
            }),
            prisma.photo.groupBy({
              by: ["galleryId"],
              _sum: { downloadCount: true },
              where: { galleryId: { in: galleryIds } },
            }),
          ]);

    const visitsMap = toVisitsMap(visitRows);
    const downloadsMap = toDownloadsMap(downloadRows);
    const enriched = galleries.map((gallery) =>
      serializeGalleryRow(gallery, visitsMap, downloadsMap)
    );

    return NextResponse.json(enriched, {
      headers: {
        "Cache-Control": "private, max-age=15, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("Failed to fetch galleries:", error);
    return NextResponse.json(
      {
        error: isPrismaUnavailableError(error)
          ? getPrismaUnavailableMessage()
          : "Unable to fetch galleries",
      },
      { status: isPrismaUnavailableError(error) ? 503 : 500 }
    );
  }
}

export const POST = withApiHandler(
  withRateLimit(async (req: NextRequest) => {
    const blocked = rejectCrossOriginWrite(req);
    if (blocked) {
      return blocked;
    }

    try {
      const email = await getSessionEmail(req);
      if (!email) {
        return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
      }

      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: { email },
      });

      const planCheck = await ensureCanCreateGallery(user.id);
      if (!planCheck.ok) {
        return NextResponse.json(
          { error: planCheck.message, code: "PLAN_LIMIT_REACHED", billing: planCheck.billing },
          { status: 402 }
        );
      }

      const name = normalizeSingleLine(body?.name, MAX_GALLERY_NAME_LENGTH);
      const safeName = name || "Untitled gallery";
      const settings = normalizeEventSettings(body?.settings) ?? {};
      const meta = normalizeGalleryMeta(body?.meta) ?? {};
      const secureSettings = await secureEventSettingsForStorage(settings);

      const gallery = await prisma.gallery.create({
        data: {
          name: safeName,
          slug: `${slugify(safeName, { lower: true, strict: true }) || "gallery"}-${Date.now()}`,
          userId: user.id,
          settings: secureSettings ?? Prisma.JsonNull,
          meta: meta ?? Prisma.JsonNull,
        },
      });

      void captureProductEvent("gallery_created", user.id, { galleryId: gallery.id, plan: planCheck.billing.plan });

      return NextResponse.json({
        ...gallery,
        settings: maskEventSettingsPins(normalizeEventSettings(gallery.settings) ?? {}),
        meta: normalizeGalleryMeta(gallery.meta) ?? {},
      });
    } catch (error) {
      console.error("Failed to create gallery:", error);
      return NextResponse.json(
        {
          error: isPrismaUnavailableError(error)
            ? getPrismaUnavailableMessage()
            : "Unable to create gallery",
        },
        { status: isPrismaUnavailableError(error) ? 503 : 500 }
      );
    }
  }, { keyPrefix: "galleries:create", limit: 10, windowMs: 60 * 60 * 1000 })
);
