import prisma from "@/lib/prisma";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import {
  normalizeMultiline,
  normalizeOptionalSingleLine,
  normalizeSingleLine,
} from "@/lib/input-security";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { normalizePublicUrl } from "@/lib/url-security";
import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/withApiHandler";
import { withRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; reviewId: string }> };
const MAX_CATEGORY_LENGTH = 40;
const MAX_REVIEWER_NAME_LENGTH = 120;
const MAX_REVIEW_TEXT_LENGTH = 2000;

function normalizeCategories(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return Array.from(
    new Set(
      value
        .map((item) => normalizeSingleLine(item, MAX_CATEGORY_LENGTH))
        .filter((item) => item.length > 0)
        .slice(0, 3)
    )
  );
}

function serializeReview(
  review: {
    id: string;
    galleryId: string;
    reviewerName: string;
    reviewerEmail: string | null;
    text: string;
    socialLink: string | null;
    categories: string[];
    clientIp: string | null;
    clientLocation: string | null;
    userAgent: string | null;
    createdAt: Date;
    published: boolean;
    gallery: { name: string };
  }
) {
  return {
    id: review.id,
    galleryId: review.galleryId,
    galleryName: review.gallery.name,
    reviewerName: review.reviewerName,
    reviewerEmail: review.reviewerEmail,
    text: review.text,
    socialLink: review.socialLink,
    categories: review.categories,
    clientIp: review.clientIp,
    clientLocation: review.clientLocation,
    userAgent: review.userAgent,
    createdAt: review.createdAt,
    published: review.published,
  };
}

async function getOwnedReview(email: string, galleryId: string, reviewId: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return { ok: false as const, status: 404, message: "User not found" };
  }

  const gallery = await prisma.gallery.findFirst({
    where: { id: galleryId, userId: user.id },
    select: { id: true, name: true },
  });

  if (!gallery) {
    return { ok: false as const, status: 403, message: "Unauthorized" };
  }

  const review = await prisma.review.findFirst({
    where: { id: reviewId, galleryId },
    select: { id: true },
  });

  if (!review) {
    return { ok: false as const, status: 404, message: "Review not found" };
  }

  return { ok: true as const };
}

export const PATCH = withApiHandler(
  withRateLimit(async (req: NextRequest, ...rest: unknown[]) => {
    const { params } = rest[0] as RouteContext;
    const blocked = rejectCrossOriginWrite(req);
    if (blocked) {
      return blocked;
    }

    const email = await getSessionEmailFromRequestAsync(req);
    if (!email) {
      return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const { id: galleryId, reviewId } = await params;

    try {
      const access = await getOwnedReview(email, galleryId, reviewId);
      if (!access.ok) {
        return NextResponse.json({ ok: false, message: access.message }, { status: access.status });
      }

      const updateData: Prisma.ReviewUpdateInput = {};
      if (typeof body.published === "boolean") updateData.published = body.published;

      if (typeof body.text === "string") {
        const text = normalizeMultiline(body.text, MAX_REVIEW_TEXT_LENGTH);
        if (text) updateData.text = text;
      }

      if (typeof body.reviewerName === "string") {
        const reviewerName = normalizeSingleLine(body.reviewerName, MAX_REVIEWER_NAME_LENGTH);
        if (reviewerName) updateData.reviewerName = reviewerName;
      }

      if ("socialLink" in body) {
        const rawSocialLink = normalizeOptionalSingleLine(body.socialLink, 2048);
        const socialLink = rawSocialLink
          ? normalizePublicUrl(rawSocialLink, { allowHttpLocalhost: process.env.NODE_ENV !== "production" })
          : null;
        if (rawSocialLink && !socialLink) {
          return NextResponse.json({ ok: false, message: "Invalid social link." }, { status: 400 });
        }
        updateData.socialLink = socialLink || null;
      }

      const categories = normalizeCategories(body.categories);
      if (categories) {
        updateData.categories = categories;
      }

      const review = await prisma.review.update({
        where: { id: reviewId },
        data: updateData,
        include: {
          gallery: {
            select: { name: true },
          },
        },
      });

      return NextResponse.json({ ok: true, review: serializeReview(review) });
    } catch (error) {
      console.error("PATCH review error", error);
      return NextResponse.json({ ok: false, message: "Unable to update review" }, { status: 500 });
    }
  }, { keyPrefix: "review:update", limit: 60, windowMs: 60 * 60 * 1000 })
);

export const DELETE = withApiHandler(
  withRateLimit(async (req: NextRequest, ...rest: unknown[]) => {
    const { params } = rest[0] as RouteContext;
    const blocked = rejectCrossOriginWrite(req);
    if (blocked) {
      return blocked;
    }

    const email = await getSessionEmailFromRequestAsync(req);
    if (!email) {
      return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
    }

    try {
      const { id: galleryId, reviewId } = await params;
      const access = await getOwnedReview(email, galleryId, reviewId);
      if (!access.ok) {
        return NextResponse.json({ ok: false, message: access.message }, { status: access.status });
      }

      await prisma.review.delete({ where: { id: reviewId } });
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error("DELETE review error", error);
      return NextResponse.json({ ok: false, message: "Unable to delete review" }, { status: 500 });
    }
  }, { keyPrefix: "review:delete", limit: 30, windowMs: 60 * 60 * 1000 })
);
