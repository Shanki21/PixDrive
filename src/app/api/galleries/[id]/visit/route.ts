import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: galleryId } = await params;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const clientKey = typeof body.clientKey === "string" ? body.clientKey.trim() : "";
    const clientLocation = typeof body.clientLocation === "string" ? body.clientLocation.trim() : null;
    const userAgent = req.headers.get("user-agent") ?? null;
    const forwardedFor = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null;

    await prisma.galleryVisit.create({
      data: {
        galleryId,
        clientKey,
        clientIp: forwardedFor ?? null,
        clientLocation: clientLocation ?? null,
        userAgent: userAgent ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("/api/galleries/[id]/visit error", error);
    return NextResponse.json({ ok: false, message: "Unable to record visit." }, { status: 500 });
  }
}
