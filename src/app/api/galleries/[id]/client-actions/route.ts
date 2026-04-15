import { normalizeEventSettings, normalizeGalleryMeta } from "@/lib/gallery-config";
import { getRequiredGalleryPin, hasGalleryAccessFromRequest } from "@/lib/gallery-pin-access";
import prisma from "@/lib/prisma";
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

function normalizeActions(body: unknown): ClientActionPayload[] {
  if (!body || typeof body !== "object") return [];
  const asRecord = body as { actions?: unknown };
  const raw = Array.isArray(asRecord.actions) ? asRecord.actions : [body];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const data = item as Partial<ClientActionPayload>;
      if (!data.photoId || !data.action || !data.clientKey) return null;
      if (data.action !== "favorite" && data.action !== "download") return null;
      return {
        photoId: String(data.photoId),
        action: data.action,
        liked: typeof data.liked === "boolean" ? data.liked : undefined,
        clientKey: String(data.clientKey),
        clientName: data.clientName ? String(data.clientName) : undefined,
        clientEmail: data.clientEmail ? String(data.clientEmail) : undefined,
      };
    })
    .filter(Boolean) as ClientActionPayload[];
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
  const clientKey = url.searchParams.get("clientKey")?.trim();

  if (!action) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
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
  const { id } = await params;
  const body = await req.json();
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
  const isExpired = expiresAt ? !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now() : false;
  if (!isPublished || isExpired) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const requiredPin = getRequiredGalleryPin(gallery.settings);
  if (requiredPin && !hasGalleryAccessFromRequest(req, gallery.id)) {
    return NextResponse.json({ error: "PIN required." }, { status: 401 });
  }

  const favoritesEnabled = meta?.favoritesEnabled ?? true;
  const downloadsAllowed = (settings?.allowSingleDownload ?? true) || (settings?.allowBulkDownload ?? false);

  for (const action of actions) {
    if (action.action === "favorite" && !favoritesEnabled) {
      continue;
    }
    if (action.action === "download" && !downloadsAllowed) {
      continue;
    }

    const photo = await prisma.photo.findFirst({
      where: { id: action.photoId, galleryId: id },
      select: { id: true },
    });
    if (!photo) continue;

    const key = {
      photoId: action.photoId,
      clientKey: action.clientKey,
      action: action.action,
    };

    if (action.action === "favorite") {
      const liked = action.liked ?? true;
      const existing = await prisma.clientPhotoAction.findUnique({
        where: {
          photoId_clientKey_action: key,
        },
      });

      if (liked && !existing) {
        const ops: Prisma.PrismaPromise<unknown>[] = [
          prisma.clientPhotoAction.create({
            data: {
              galleryId: id,
              photoId: action.photoId,
              clientKey: action.clientKey,
              clientName: action.clientName,
              clientEmail: action.clientEmail,
              action: "favorite",
            },
          }),
          prisma.photo.update({
            where: { id: action.photoId },
            data: { favoriteCount: { increment: 1 } },
          }),
        ];

        if (action.clientName || action.clientEmail) {
          ops.push(
            prisma.clientProfile.upsert({
              where: { galleryId_clientKey: { galleryId: id, clientKey: action.clientKey } },
              update: { name: action.clientName ?? undefined, email: action.clientEmail ?? undefined },
              create: {
                galleryId: id,
                clientKey: action.clientKey,
                name: action.clientName ?? undefined,
                email: action.clientEmail ?? undefined,
              },
            })
          );
        }

        await prisma.$transaction(ops);
      }

      if (!liked && existing) {
        await prisma.$transaction([
          prisma.clientPhotoAction.delete({
            where: {
              photoId_clientKey_action: key,
            },
          }),
          prisma.photo.update({
            where: { id: action.photoId },
            data: { favoriteCount: { decrement: 1 } },
          }),
        ]);
      }
      continue;
    }

    const existing = await prisma.clientPhotoAction.findUnique({
      where: {
        photoId_clientKey_action: key,
      },
    });
    if (!existing) {
      const ops: Prisma.PrismaPromise<unknown>[] = [
        prisma.clientPhotoAction.create({
          data: {
            galleryId: id,
            photoId: action.photoId,
            clientKey: action.clientKey,
            clientName: action.clientName,
            clientEmail: action.clientEmail,
            action: "download",
          },
        }),
        prisma.photo.update({
          where: { id: action.photoId },
          data: { downloadCount: { increment: 1 } },
        }),
      ];

      if (action.clientName || action.clientEmail) {
        ops.push(
          prisma.clientProfile.upsert({
            where: { galleryId_clientKey: { galleryId: id, clientKey: action.clientKey } },
            update: { name: action.clientName ?? undefined, email: action.clientEmail ?? undefined },
            create: {
              galleryId: id,
              clientKey: action.clientKey,
              name: action.clientName ?? undefined,
              email: action.clientEmail ?? undefined,
            },
          })
        );
      }

      await prisma.$transaction(ops);
    }
  }

  return NextResponse.json({ ok: true });
}
