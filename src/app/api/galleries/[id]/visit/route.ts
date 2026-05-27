import { getGalleryPublicAccess } from "@/lib/gallery-public-access";
import { getRequiredGalleryPin, hasGalleryAccessFromRequest } from "@/lib/gallery-pin-access";
import { normalizeClientKey, normalizeOptionalSingleLine } from "@/lib/input-security";
import { checkIpThrottle } from "@/lib/ip-throttle";
import { cacheGet, cacheSet } from "@/lib/cache";
import prisma from "@/lib/prisma";
import { getClientIp } from "@/lib/request-ip";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };
const VISIT_DEDUP_WINDOW_MS = 30 * 60 * 1000;
const VISIT_DEDUP_WINDOW_SECONDS = Math.ceil(VISIT_DEDUP_WINDOW_MS / 1000);
const MAX_CLIENT_LOCATION_LENGTH = 120;
const MAX_USER_AGENT_LENGTH = 512;

import { withApiHandler } from "@/lib/withApiHandler";
import { withRateLimit } from "@/lib/rate-limit";
import { captureProductEvent } from "@/lib/product-analytics";

export const POST = withApiHandler(
  withRateLimit(async (req: NextRequest, ...rest: unknown[]) => {
    const { params } = rest[0] as RouteContext;
    const { id: galleryId } = await params;
    const blocked = rejectCrossOriginWrite(req);
    if (blocked) {
      return blocked;
    }

    try {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const clientKey = normalizeClientKey(body.clientKey);
      const clientLocation = normalizeOptionalSingleLine(body.clientLocation, MAX_CLIENT_LOCATION_LENGTH);
      const userAgent = normalizeOptionalSingleLine(req.headers.get("user-agent"), MAX_USER_AGENT_LENGTH);
      const clientIp = getClientIp(req) ?? "unknown";

      if (!clientKey) {
        return NextResponse.json({ ok: false, message: "clientKey is required." }, { status: 400 });
      }

      const gallery = await prisma.gallery.findUnique({
        where: { id: galleryId },
        select: { id: true, settings: true, meta: true },
      });

      if (!gallery) {
        return NextResponse.json({ ok: false, message: "Gallery not found." }, { status: 404 });
      }

      const publicAccess = getGalleryPublicAccess({ settings: gallery.settings, meta: gallery.meta });
      if (!publicAccess.canAccess) {
        return NextResponse.json({ ok: false, message: "Gallery not found." }, { status: 404 });
      }

      const requiredPin = getRequiredGalleryPin(gallery.settings);
      if (requiredPin && !hasGalleryAccessFromRequest(req, gallery.id)) {
        return NextResponse.json({ ok: false, message: "PIN required." }, { status: 401 });
      }

      const visitLimit = await checkIpThrottle({
        key: `gallery:visit:${galleryId}:${clientIp}`,
        limit: 90,
        windowMs: 60 * 60 * 1000,
      });
      if (!visitLimit.ok) {
        return NextResponse.json(
          {
            ok: false,
            message: "Too many visit requests. Try again later.",
            retryAfterSeconds: visitLimit.retryAfterSeconds,
          },
          { status: 429 }
        );
      }

      const dedupeKey = `gallery:visit:dedupe:${galleryId}:${clientKey}`;
      const cachedVisit = await cacheGet(dedupeKey);
      if (cachedVisit) {
        return NextResponse.json({ ok: true, deduped: true });
      }

      const recentVisit = await prisma.galleryVisit.findFirst({
        where: {
          galleryId,
          clientKey,
          visitedAt: {
            gte: new Date(Date.now() - VISIT_DEDUP_WINDOW_MS),
          },
        },
        select: { id: true },
      });

      if (recentVisit) {
        await cacheSet(dedupeKey, recentVisit.id, VISIT_DEDUP_WINDOW_SECONDS);
        return NextResponse.json({ ok: true, deduped: true });
      }

      const visit = await prisma.galleryVisit.create({
        data: {
          galleryId,
          clientKey,
          clientIp,
          clientLocation,
          userAgent,
        },
      });
      await cacheSet(dedupeKey, visit.id, VISIT_DEDUP_WINDOW_SECONDS);

      void captureProductEvent("public_gallery_viewed", galleryId, { galleryId, clientKey });

      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error("/api/galleries/[id]/visit error", error);
      return NextResponse.json({ ok: false, message: "Unable to record visit." }, { status: 500 });
    }
  }, { keyPrefix: "gallery:visit", limit: 500, windowMs: 60 * 60 * 1000 })
);
