import { NextRequest, NextResponse } from "next/server";

import { getGalleryPublicAccess } from "@/lib/gallery-public-access";
import prisma from "@/lib/prisma";

const MAX_FIELD_LENGTH = 180;

function asCleanString(value: unknown, maxLength = MAX_FIELD_LENGTH) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const clientKey = asCleanString(payload.clientKey, 120);
  const name = asCleanString(payload.name);
  const email = asCleanString(payload.email).toLowerCase();
  const mobile = asCleanString(payload.mobile, 32);
  const consent = payload.consent === true;
  const marketingOptIn = payload.marketing === true;

  if (!clientKey) {
    return NextResponse.json({ error: "clientKey is required." }, { status: 400 });
  }

  const gallery = await prisma.gallery.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
      deletedAt: null,
    },
    select: {
      id: true,
      settings: true,
      meta: true,
    },
  });

  if (!gallery) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const access = getGalleryPublicAccess({
    settings: gallery.settings,
    meta: gallery.meta,
  });

  if (!access.canAccess || !access.oneQrEnabled) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.clientProfile.upsert({
    where: {
      galleryId_clientKey: {
        galleryId: gallery.id,
        clientKey,
      },
    },
    create: {
      galleryId: gallery.id,
      clientKey,
      name: name || null,
      email: email || null,
      mobile: mobile || null,
      consent,
      marketingOptIn,
    },
    update: {
      name: name || null,
      email: email || null,
      mobile: mobile || null,
      consent,
      marketingOptIn,
    },
  });

  return NextResponse.json({ ok: true });
}
