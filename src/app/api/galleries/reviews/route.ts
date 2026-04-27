import prisma from "@/lib/prisma";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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

export async function GET(req: NextRequest) {
  const email = await getSessionEmailFromRequestAsync(req);
  if (!email) return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email }, include: { galleries: true } });
  if (!user) return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });

  const galleryIds = user.galleries.map((g) => g.id);
  if (galleryIds.length === 0) return NextResponse.json({ ok: true, reviews: [] });

  const reviews = await prisma.review.findMany({
    where: { galleryId: { in: galleryIds } },
    orderBy: { createdAt: "desc" },
    include: {
      gallery: {
        select: { name: true },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    reviews: reviews.map(serializeReview),
  });
}
