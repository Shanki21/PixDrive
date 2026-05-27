import { normalizeEventSettings, normalizeGalleryMeta } from "@/lib/gallery-config";
import { getRequiredGalleryPin, hasGalleryAccessFromRequest } from "@/lib/gallery-pin-access";
import {
  normalizeClientKey,
  normalizeEmail,
  normalizeOptionalSingleLine,
  normalizeSingleLine,
} from "@/lib/input-security";
import { checkIpThrottle } from "@/lib/ip-throttle";
import prisma from "@/lib/prisma";
import { getClientIp } from "@/lib/request-ip";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import type { Prisma } from "@prisma/client";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/withApiHandler";
import { withRateLimit } from "@/lib/rate-limit";

type ClientActionPayload = {
  photoId: string;
  action: "favorite" | "download";
  liked?: boolean;
  clientKey: string;
  clientName?: string;
  clientEmail?: string;
};

const MAX_ACTION_BATCH = 100;
const MAX_CLIENT_NAME_LENGTH = 120;

function normalizeOptionalClientEmail(value: unknown) {
  const raw = normalizeSingleLine(value, 254);
  if (!raw) return null;
  const email = normalizeEmail(raw);
  return email || undefined;
}

function normalizeActions(body: unknown): ClientActionPayload[] {
  if (!body || typeof body !== "object") return [];
  const asRecord = body as { actions?: unknown };
  const raw = Array.isArray(asRecord.actions) ? asRecord.actions : [body];
  if (raw.length === 0 || raw.length > MAX_ACTION_BATCH) return [];

  const normalized: ClientActionPayload[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return [];
    const data = item as Partial<ClientActionPayload>;
    const photoId = normalizeSingleLine(data.photoId, 120);
    const clientKey = normalizeClientKey(data.clientKey);
    const clientName = normalizeOptionalSingleLine(data.clientName, MAX_CLIENT_NAME_LENGTH) ?? undefined;
    const clientEmail = normalizeOptionalClientEmail(data.clientEmail);
    if (!photoId || !data.action || !clientKey) return [];
    if (data.action !== "favorite" && data.action !== "download") return [];
    if (data.clientEmail != null && clientEmail === undefined) return [];

    normalized.push({
      photoId,
      action: data.action,
      liked: typeof data.liked === "boolean" ? data.liked : undefined,
      clientKey,
      clientName,
      clientEmail: clientEmail ?? undefined,
    });
  }

  return normalized;
}

function normalizeActionParam(value: string | null) {
  if (value === "favorite" || value === "download") return value;
  if (!value) return "favorite";
  return null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const action = normalizeActionParam(url.searchParams.get("action"));
  const rawClientKey = url.searchParams.get("clientKey");
  const clientKey = rawClientKey ? normalizeClientKey(rawClientKey) : "";

  if (!action) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (rawClientKey && !clientKey) {
    return NextResponse.json({ error: "Invalid clientKey" }, { status: 400 });
  }

  const gallery = await prisma.gallery.findUnique({
    where: { id },
    select: { id: true, settings: true, meta: true },
  });
  if (!gallery) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!clientKey) {
    const email = await getSessionEmailFromRequestAsync(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const owner = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!owner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const ownedGallery = await prisma.gallery.findFirst({
      where: { id, userId: owner.id },
      select: { id: true },
    });
    if (!ownedGallery) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (action === "favorite") {
      const rows = await prisma.clientPhotoAction.findMany({
        where: { galleryId: id, action: "favorite" },
        select: {
          photoId: true,
          clientKey: true,
          clientName: true,
          clientEmail: true,
          photo: {
            select: {
              id: true,
              name: true,
              url: true,
            },
          },
        },
      });
      const grouped = new Map<
        string,
        { name: string; email: string; clientKey: string; photoIds: Set<string> }
      >();
      const photos = new Map<string, { id: string; name: string; url: string }>();
      for (const row of rows) {
        const name = row.clientName?.trim() || `Client ${row.clientKey.slice(0, 6)}`;
        const emailOrFallback = row.clientEmail?.trim().toLowerCase() || `${row.clientKey}@pixora.local`;
        const key = `${name}::${emailOrFallback}`;
        const existing =
          grouped.get(key) ??
          {
            name,
            email: emailOrFallback,
            clientKey: row.clientKey,
            photoIds: new Set<string>(),
          };
        existing.photoIds.add(row.photoId);
        grouped.set(key, existing);
        photos.set(row.photo.id, row.photo);
      }
      return NextResponse.json({
        selections: Array.from(grouped.values()).map((entry) => ({
          name: entry.name,
          email: entry.email,
          clientKey: entry.clientKey,
          photoIds: Array.from(entry.photoIds),
        })),
        photos: Array.from(photos.values()),
      });
    }

    const rows = await prisma.clientPhotoAction.findMany({
      where: { galleryId: id, action: "download" },
      select: { photoId: true },
    });
    return NextResponse.json({
      photoIds: Array.from(new Set(rows.map((row) => row.photoId))),
    });
  }

  const settings = normalizeEventSettings(gallery.settings);
  const meta = normalizeGalleryMeta(gallery.meta);
  const isPublished = settings?.published ?? true;
  const expiresAt = meta?.expiresAt ? new Date(meta.expiresAt) : null;
  const isExpired = expiresAt ? !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now() : false;
  if (!isPublished || isExpired) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const requiredPin = getRequiredGalleryPin(gallery.settings);
  if (requiredPin && !hasGalleryAccessFromRequest(req, gallery.id)) {
    return NextResponse.json({ error: "PIN required." }, { status: 401 });
  }
  if (action === "favorite" && (meta?.favoritesEnabled ?? true) === false) {
    return NextResponse.json({ photoIds: [], clientName: null, clientEmail: null });
  }
  if (action === "download" && !(settings?.allowSingleDownload ?? true) && !(settings?.allowBulkDownload ?? false)) {
    return NextResponse.json({ photoIds: [], clientName: null, clientEmail: null });
  }

  const items = await prisma.clientPhotoAction.findMany({
    where: {
      galleryId: id,
      clientKey,
      action,
    },
    select: {
      photoId: true,
      clientName: true,
      clientEmail: true,
    },
  });

  const photoIds = Array.from(new Set(items.map((item) => item.photoId)));
  const clientName = items.find((item) => item.clientName)?.clientName ?? null;
  const clientEmail = items.find((item) => item.clientEmail)?.clientEmail ?? null;

  return NextResponse.json({ photoIds, clientName, clientEmail });
}

export const POST = withApiHandler(
  withRateLimit(async (req: NextRequest, ...rest: unknown[]) => {
    const { params } = rest[0] as { params: Promise<{ id: string }> };
    const { id } = await params;
    const blocked = rejectCrossOriginWrite(req);
    if (blocked) return blocked;
    const body = await req.json().catch(() => null);
    const actions = normalizeActions(body);

    if (actions.length === 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const gallery = await prisma.gallery.findUnique({
      where: { id },
      select: { id: true, settings: true, meta: true },
    });

    if (!gallery) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const settings = normalizeEventSettings(gallery.settings);
    const meta = normalizeGalleryMeta(gallery.meta);

    const isPublished = settings?.published ?? true;
    const expiresAt = meta?.expiresAt ? new Date(meta.expiresAt) : null;
    const isExpired = expiresAt ? expiresAt.getTime() <= Date.now() : false;

    if (!isPublished || isExpired) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const requiredPin = getRequiredGalleryPin(gallery.settings);
    if (requiredPin && !hasGalleryAccessFromRequest(req, gallery.id)) {
      return NextResponse.json({ error: "PIN required." }, { status: 401 });
    }

    const clientIp = getClientIp(req) ?? "unknown";
    const throttle = await checkIpThrottle({
      key: `gallery:client-actions:${id}:${clientIp}`,
      limit: 160,
      windowMs: 15 * 60 * 1000,
    });

    if (!throttle.ok) {
      return NextResponse.json(
        { error: "Too many requests", retryAfterSeconds: throttle.retryAfterSeconds },
        { status: 429 }
      );
    }

    // 🔥 BATCH OPTIMIZATION STARTS HERE

    const photoIds = [...new Set(actions.map(a => a.photoId))];
    const favoriteLimit =
      meta?.favoritesLimitSelected && actions.some((item) => item.action === "favorite")
        ? Math.max(1, meta.favoritesMaxSelected ?? 1)
        : null;

    const validPhotos = await prisma.photo.findMany({
      where: { galleryId: id, id: { in: photoIds } },
      select: { id: true },
    });

    const validPhotoSet = new Set(validPhotos.map(p => p.id));
    if (favoriteLimit !== null) {
      const favoriteActions = actions.filter((item) => item.action === "favorite");
      const clientKeys = [...new Set(favoriteActions.map((item) => item.clientKey))];
      if (clientKeys.length > 0) {
        const existingFavorites = await prisma.clientPhotoAction.findMany({
          where: { galleryId: id, action: "favorite", clientKey: { in: clientKeys } },
          select: { clientKey: true, photoId: true },
        });
        const nextByClient = new Map<string, Set<string>>();
        existingFavorites.forEach((item) => {
          const current = nextByClient.get(item.clientKey) ?? new Set<string>();
          current.add(item.photoId);
          nextByClient.set(item.clientKey, current);
        });
        favoriteActions.forEach((item) => {
          if (!validPhotoSet.has(item.photoId)) return;
          const current = nextByClient.get(item.clientKey) ?? new Set<string>();
          if (item.liked === false) current.delete(item.photoId);
          else current.add(item.photoId);
          nextByClient.set(item.clientKey, current);
        });
        if (Array.from(nextByClient.values()).some((set) => set.size > favoriteLimit)) {
          return NextResponse.json(
            { error: `Selection limit exceeded. Maximum ${favoriteLimit} photos can be selected.` },
            { status: 409 }
          );
        }
      }
    }

    const favoriteCreates: Prisma.ClientPhotoActionCreateManyInput[] = [];
    const downloadCreates: Prisma.ClientPhotoActionCreateManyInput[] = [];
    const favoriteDeletes: Array<{ photoId: string; clientKey: string }> = [];

    for (const action of actions) {
      if (!validPhotoSet.has(action.photoId)) continue;

      const actionData = {
        galleryId: id,
        photoId: action.photoId,
        clientKey: action.clientKey,
        clientName: action.clientName,
        clientEmail: action.clientEmail,
      };

      if (action.action === "favorite") {
        const liked = action.liked ?? true;

        if (liked) {
          favoriteCreates.push({ ...actionData, action: "favorite" });
        } else {
          favoriteDeletes.push({ photoId: action.photoId, clientKey: action.clientKey });
        }
      }

      if (action.action === "download") {
        downloadCreates.push({ ...actionData, action: "download" });
      }
    }

    const writeOps: Prisma.PrismaPromise<unknown>[] = [];
    if (favoriteCreates.length > 0) {
      writeOps.push(prisma.clientPhotoAction.createMany({ data: favoriteCreates, skipDuplicates: true }));
    }
    if (downloadCreates.length > 0) {
      writeOps.push(prisma.clientPhotoAction.createMany({ data: downloadCreates, skipDuplicates: true }));
    }
    favoriteDeletes.forEach((item) => {
      writeOps.push(
        prisma.clientPhotoAction.deleteMany({
          where: {
            galleryId: id,
            photoId: item.photoId,
            clientKey: item.clientKey,
            action: "favorite",
          },
        })
      );
    });

    if (writeOps.length > 0) {
      await prisma.$transaction(writeOps);
    }

    if (photoIds.length > 0) {
      const [favoriteCounts, downloadCounts] = await Promise.all([
        prisma.clientPhotoAction.groupBy({
          by: ["photoId"],
          _count: { _all: true },
          where: { galleryId: id, photoId: { in: photoIds }, action: "favorite" },
        }),
        prisma.clientPhotoAction.groupBy({
          by: ["photoId"],
          _count: { _all: true },
          where: { galleryId: id, photoId: { in: photoIds }, action: "download" },
        }),
      ]);
      const favoritesByPhoto = new Map(favoriteCounts.map((row) => [row.photoId, row._count._all]));
      const downloadsByPhoto = new Map(downloadCounts.map((row) => [row.photoId, row._count._all]));

      await prisma.$transaction(
        photoIds.map((photoId) =>
          prisma.photo.update({
            where: { id: photoId },
            data: {
              favoriteCount: favoritesByPhoto.get(photoId) ?? 0,
              downloadCount: downloadsByPhoto.get(photoId) ?? 0,
            },
          })
        )
      );
    }

    return NextResponse.json({ ok: true });
  }, { keyPrefix: "gallery:client-actions", limit: 1000, windowMs: 15 * 60 * 1000 })
);
