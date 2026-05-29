import { NextRequest, NextResponse } from "next/server";

import { getCustomDomainUserScope } from "@/lib/custom-domain-scope";
import { getGalleryPublicAccess } from "@/lib/gallery-public-access";
import { normalizeClientKey, normalizeEmail, normalizeSingleLine } from "@/lib/input-security";
import prisma from "@/lib/prisma";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { withApiHandler } from "@/lib/withApiHandler";
import { withRateLimit } from "@/lib/rate-limit";

const MAX_FIELD_LENGTH = 180;

export const POST = withApiHandler(
  withRateLimit(async (req: NextRequest, ...rest: unknown[]) => {
    const { params } = rest[0] as { params: Promise<{ slug: string }> };
    const blocked = rejectCrossOriginWrite(req);
    if (blocked) return blocked;

    const { slug } = await params;
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const payload = body as Record<string, unknown>;
    const clientKey = normalizeClientKey(payload.clientKey, 120);
    const name = normalizeSingleLine(payload.name, MAX_FIELD_LENGTH);
    const email = normalizeEmail(payload.email);
    const mobile = normalizeSingleLine(payload.mobile, 32);
    const consent = payload.consent === true;
    const marketingOptIn = payload.marketing === true;

    if (!clientKey) {
      return NextResponse.json({ error: "clientKey is required." }, { status: 400 });
    }

    const gallery = await prisma.gallery.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
        ...(await getCustomDomainUserScope(req.headers)),
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
  }, { keyPrefix: "disk:client-profile", limit: 40, windowMs: 15 * 60 * 1000 })
);
