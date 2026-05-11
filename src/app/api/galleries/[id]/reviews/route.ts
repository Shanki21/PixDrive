import { getGalleryPublicAccess } from "@/lib/gallery-public-access";
import { getRequiredGalleryPin, hasGalleryAccessFromRequest } from "@/lib/gallery-pin-access";
import {
  normalizeMultiline,
  normalizeOptionalSingleLine,
  normalizeSingleLine,
} from "@/lib/input-security";
import { checkIpThrottle } from "@/lib/ip-throttle";
import prisma from "@/lib/prisma";
import { getClientIp } from "@/lib/request-ip";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { normalizePublicUrl } from "@/lib/url-security";
import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/withApiHandler";
import { withRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };
const MAX_REVIEWER_NAME_LENGTH = 120;
const MAX_REVIEW_TEXT_LENGTH = 2000;
const MIN_REVIEW_TEXT_LENGTH = 10;
const MAX_CLIENT_LOCATION_LENGTH = 120;
const MAX_USER_AGENT_LENGTH = 512;

function serializeReview(
  review: {
    id: string;
    galleryId: string;
    reviewerName: string;
    reviewerEmail: string | null;
    text: string;
    socialLink: string | null;
    categories: string[];
    createdAt: Date;
    published: boolean;
  }
) {
  return {
    id: review.id,
    galleryId: review.galleryId,
    reviewerName: review.reviewerName,
    reviewerEmail: review.reviewerEmail,
    text: review.text,
    socialLink: review.socialLink,
    categories: review.categories,
    createdAt: review.createdAt,
    published: review.published,
  };
}

async function getAccessibleGallery(req: NextRequest, galleryId: string) {
  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { id: true, settings: true, meta: true },
  });

  if (!gallery) {
    return { ok: false as const, status: 404, message: "Gallery not found" };
  }

  const publicAccess = getGalleryPublicAccess({ settings: gallery.settings, meta: gallery.meta });
  if (!publicAccess.canAccess) {
    return { ok: false as const, status: 404, message: "Gallery not found" };
  }

  const requiredPin = getRequiredGalleryPin(gallery.settings);
  if (requiredPin && !hasGalleryAccessFromRequest(req, gallery.id)) {
    return { ok: false as const, status: 401, message: "PIN required." };
  }

  return { ok: true as const };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: galleryId } = await params;
    const access = await getAccessibleGallery(req, galleryId);
    if (!access.ok) {
      return NextResponse.json({ ok: false, message: access.message }, { status: access.status });
    }

    const reviews = await prisma.review.findMany({
      where: { galleryId, published: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, reviews: reviews.map(serializeReview) });
  } catch (error) {
    console.error("/api/galleries/[id]/reviews GET error", error);
    return NextResponse.json({ ok: false, message: "Unable to fetch reviews." }, { status: 500 });
  }
}

export const POST = withApiHandler(
  withRateLimit(async (req: NextRequest, ...rest: unknown[]) => {
    const { params } = rest[0] as RouteContext;
    const blocked = rejectCrossOriginWrite(req);
    if (blocked) {
      return blocked;
    }

    try {
      const { id: galleryId } = await params;
      const access = await getAccessibleGallery(req, galleryId);
      if (!access.ok) {
        return NextResponse.json({ ok: false, message: access.message }, { status: access.status });
      }

      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const reviewerName = normalizeSingleLine(body?.reviewerName, MAX_REVIEWER_NAME_LENGTH);
      const text = normalizeMultiline(body?.text, MAX_REVIEW_TEXT_LENGTH);
      const rawSocialLink = normalizeOptionalSingleLine(body?.socialLink, 2048);
      const socialLink = rawSocialLink
        ? normalizePublicUrl(rawSocialLink, { allowHttpLocalhost: process.env.NODE_ENV !== "production" })
        : null;
      if (rawSocialLink && !socialLink) {
        return NextResponse.json({ ok: false, message: "Invalid social link." }, { status: 400 });
      }

      const clientLocation = normalizeOptionalSingleLine(body?.clientLocation, MAX_CLIENT_LOCATION_LENGTH);
      const userAgent = normalizeOptionalSingleLine(req.headers.get("user-agent"), MAX_USER_AGENT_LENGTH);
      const clientIp = getClientIp(req) ?? "unknown";

      if (!reviewerName || text.length < MIN_REVIEW_TEXT_LENGTH) {
        return NextResponse.json({ ok: false, message: "Invalid review" }, { status: 400 });
      }

      const reviewLimit = await checkIpThrottle({
        key: `gallery:review:${galleryId}:${clientIp}`,
        limit: 6,
        windowMs: 60 * 60 * 1000,
      });
      if (!reviewLimit.ok) {
        return NextResponse.json(
          {
            ok: false,
            message: "Too many review submissions. Try again later.",
            retryAfterSeconds: reviewLimit.retryAfterSeconds,
          },
          { status: 429 }
        );
      }

      const review = await prisma.review.create({
        data: {
          galleryId,
          reviewerName,
          text,
          socialLink: socialLink ?? null,
          clientIp,
          clientLocation,
          userAgent,
          published: false,
        },
      });

      return NextResponse.json({ ok: true, review: serializeReview(review) });
    } catch (error) {
      console.error("/api/galleries/[id]/reviews POST error", error);
      return NextResponse.json({ ok: false, message: "Unable to save review." }, { status: 500 });
    }
  }, { keyPrefix: "gallery:review", limit: 10, windowMs: 60 * 60 * 1000 })
);
