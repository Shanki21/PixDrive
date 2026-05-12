import { NextRequest, NextResponse } from "next/server";

import { normalizeClientKey, normalizeSingleLine } from "@/lib/input-security";
import prisma from "@/lib/prisma";
import { rejectCrossOriginWrite } from "@/lib/request-security";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { withApiHandler } from "@/lib/withApiHandler";
import { withRateLimit } from "@/lib/rate-limit";

const MAX_MATCH_BATCH = 500;

type FaceMatchPayload = {
  clientKey?: unknown;
  matches?: unknown;
  provider?: unknown;
};

function normalizeMatches(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_MATCH_BATCH)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const photoId = normalizeSingleLine(record.photoId, 120);
      const rawConfidence = Number(record.confidence ?? 0);
      const confidence = Number.isFinite(rawConfidence) ? Math.min(1, Math.max(0, rawConfidence)) : null;
      if (!photoId) return null;
      return { photoId, confidence };
    })
    .filter((item): item is { photoId: string; confidence: number | null } => Boolean(item));
}

export const POST = withApiHandler(
  withRateLimit(async (req: NextRequest, ...rest: unknown[]) => {
    const { params } = rest[0] as { params: Promise<{ id: string }> };
    const { id } = await params;
    const blocked = rejectCrossOriginWrite(req);
    if (blocked) return blocked;

    const email = await getSessionEmailFromRequestAsync(req);
    if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const gallery = await prisma.gallery.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!gallery) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = (await req.json().catch(() => null)) as FaceMatchPayload | null;
    const clientKey = normalizeClientKey(body?.clientKey);
    const provider = normalizeSingleLine(body?.provider, 80) || "manual";
    const matches = normalizeMatches(body?.matches);
    if (!clientKey || matches.length === 0) {
      return NextResponse.json({ error: "clientKey and matches are required." }, { status: 400 });
    }

    const validPhotos = await prisma.photo.findMany({
      where: { galleryId: id, id: { in: matches.map((match) => match.photoId) } },
      select: { id: true },
    });
    const validIds = new Set(validPhotos.map((photo) => photo.id));
    const validMatches = matches.filter((match) => validIds.has(match.photoId));

    await prisma.$transaction([
      prisma.faceMatch.deleteMany({ where: { galleryId: id, clientKey } }),
      ...validMatches.map((match) =>
        prisma.faceMatch.create({
          data: {
            galleryId: id,
            photoId: match.photoId,
            clientKey,
            confidence: match.confidence,
            provider,
          },
        })
      ),
    ]);

    return NextResponse.json({ ok: true, matchedCount: validMatches.length });
  }, { keyPrefix: "gallery:face-matches", limit: 60, windowMs: 15 * 60 * 1000 })
);
