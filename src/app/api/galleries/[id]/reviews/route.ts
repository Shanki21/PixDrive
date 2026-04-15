import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id: galleryId } = await params;
    const reviews = await prisma.review.findMany({
      where: { galleryId, published: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ok: true, reviews });
  } catch (error) {
    console.error("/api/galleries/[id]/reviews GET error", error);
    return NextResponse.json({ ok: false, message: "Unable to fetch reviews." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: galleryId } = await params;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const reviewerName = String(body?.reviewerName ?? "").trim();
    const text = String(body?.text ?? "").trim();
    const socialLink = typeof body.socialLink === "string" ? body.socialLink.trim() : null;
    const clientLocation = typeof body.clientLocation === "string" ? body.clientLocation.trim() : null;
    const userAgent = req.headers.get("user-agent") ?? null;
    const clientIp = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null;

    if (!reviewerName || text.length < 10) {
      return NextResponse.json({ ok: false, message: "Invalid review" }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        galleryId,
        reviewerName,
        text,
        socialLink,
        clientIp: clientIp ?? null,
        clientLocation: clientLocation ?? null,
        userAgent: userAgent ?? null,
        published: false,
      },
    });

    return NextResponse.json({ ok: true, review });
  } catch (error) {
    console.error("/api/galleries/[id]/reviews POST error", error);
    return NextResponse.json({ ok: false, message: "Unable to save review." }, { status: 500 });
  }
}
