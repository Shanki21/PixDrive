import prisma from "@/lib/prisma";
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const actions = normalizeActions(body);
  if (actions.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const gallery = await prisma.gallery.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!gallery) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  for (const action of actions) {
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
        await prisma.$transaction([
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
        ]);
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
      await prisma.$transaction([
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
      ]);
    }
  }

  return NextResponse.json({ ok: true });
}
