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
        },
      });
      const grouped = new Map<
        string,
        { name: string; email: string; clientKey: string; photoIds: Set<string> }
      >();
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
      }
      return NextResponse.json({
        selections: Array.from(grouped.values()).map((entry) => ({
          name: entry.name,
          email: entry.email,
          clientKey: entry.clientKey,
          photoIds: Array.from(entry.photoIds),
        })),
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const blocked = rejectCrossOriginWrite(req);
  if (blocked) return blocked;

  const { id } = await params;
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

  const [validPhotos, existingActions] = await Promise.all([
    prisma.photo.findMany({
      where: { galleryId: id, id: { in: photoIds } },
      select: { id: true },
    }),
    prisma.clientPhotoAction.findMany({
      where: {
        galleryId: id,
        OR: actions.map(a => ({
          photoId: a.photoId,
          clientKey: a.clientKey,
          action: a.action,
        })),
      },
    }),
  ]);

  const validPhotoSet = new Set(validPhotos.map(p => p.id));

  const existingSet = new Set(
    existingActions.map(
      a => `${a.photoId}-${a.clientKey}-${a.action}`
    )
  );

  const createOps: Prisma.PrismaPromise<any>[] = [];
  const updateOps: Prisma.PrismaPromise<any>[] = [];

  for (const action of actions) {
    if (!validPhotoSet.has(action.photoId)) continue;

    const key = `${action.photoId}-${action.clientKey}-${action.action}`;
    const exists = existingSet.has(key);

    if (action.action === "favorite") {
      const liked = action.liked ?? true;

      if (liked && !exists) {
        createOps.push(
          prisma.clientPhotoAction.create({
            data: { galleryId: id, ...action, action: "favorite" },
          })
        );

        updateOps.push(
          prisma.photo.update({
            where: { id: action.photoId },
            data: { favoriteCount: { increment: 1 } },
          })
        );
      }

      if (!liked && exists) {
        createOps.push(
          prisma.clientPhotoAction.delete({
            where: {
              photoId_clientKey_action: {
                photoId: action.photoId,
                clientKey: action.clientKey,
                action: "favorite",
              },
            },
          })
        );

        updateOps.push(
          prisma.photo.update({
            where: { id: action.photoId },
            data: { favoriteCount: { decrement: 1 } },
          })
        );
      }
    }

    if (action.action === "download" && !exists) {
      createOps.push(
        prisma.clientPhotoAction.create({
          data: { galleryId: id, ...action, action: "download" },
        })
      );

      updateOps.push(
        prisma.photo.update({
          where: { id: action.photoId },
          data: { downloadCount: { increment: 1 } },
        })
      );
    }
  }

  await prisma.$transaction([...createOps, ...updateOps]);

  return NextResponse.json({ ok: true });
}
