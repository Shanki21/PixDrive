import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getSessionEmailFromRequestAsync } from "@/lib/session";
import { withApiHandler } from "@/lib/withApiHandler";

export const runtime = "nodejs";

function monthKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function lastSixMonthKeys() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return monthKey(date);
  });
}

export const GET = withApiHandler(async (req: NextRequest) => {
  const email = await getSessionEmailFromRequestAsync(req);
  if (!email) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, message: "User not found." }, { status: 404 });
  }

  const galleries = await prisma.gallery.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { photos: true, clientProfiles: true } },
    },
  });

  const galleryIds = galleries.map((gallery) => gallery.id);
  if (galleryIds.length === 0) {
    return NextResponse.json({
      ok: true,
      totals: { registrations: 0, visits: 0, imageViews: 0, downloads: 0, photos: 0 },
      activity: lastSixMonthKeys().map((key) => ({ key, label: monthLabel(key), visits: 0, downloads: 0 })),
      events: [],
      registrations: [],
    });
  }

  const [visitRows, downloadRows, clientDownloadRows, registrationCount, registrations] = await Promise.all([
    prisma.galleryVisit.findMany({
      where: { galleryId: { in: galleryIds } },
      select: { galleryId: true, visitedAt: true },
      orderBy: { visitedAt: "desc" },
      take: 5000,
    }),
    prisma.photo.groupBy({
      by: ["galleryId"],
      _sum: { downloadCount: true },
      where: { galleryId: { in: galleryIds } },
    }),
    prisma.clientPhotoAction.groupBy({
      by: ["galleryId", "clientKey"],
      _count: { _all: true },
      where: {
        galleryId: { in: galleryIds },
        action: "download",
      },
    }),
    prisma.clientProfile.count({
      where: { galleryId: { in: galleryIds } },
    }),
    prisma.clientProfile.findMany({
      where: { galleryId: { in: galleryIds } },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        galleryId: true,
        clientKey: true,
        name: true,
        email: true,
        mobile: true,
        consent: true,
        marketingOptIn: true,
        createdAt: true,
        gallery: { select: { name: true } },
      },
    }),
  ]);

  const visitsByGallery = new Map<string, number>();
  visitRows.forEach((row) => {
    visitsByGallery.set(row.galleryId, (visitsByGallery.get(row.galleryId) ?? 0) + 1);
  });

  const downloadsByGallery = new Map<string, number>();
  downloadRows.forEach((row) => {
    downloadsByGallery.set(row.galleryId, row._sum.downloadCount ?? 0);
  });

  const downloadsByClient = new Map<string, number>();
  clientDownloadRows.forEach((row) => {
    downloadsByClient.set(`${row.galleryId}:${row.clientKey}`, row._count._all ?? 0);
  });

  const monthKeys = lastSixMonthKeys();
  const activity = monthKeys.map((key) => ({ key, label: monthLabel(key), visits: 0, downloads: 0 }));
  const activityByKey = new Map(activity.map((row) => [row.key, row]));
  visitRows.forEach((row) => {
    const bucket = activityByKey.get(monthKey(row.visitedAt));
    if (bucket) bucket.visits += 1;
  });

  const events = galleries.map((gallery) => {
    const visits = visitsByGallery.get(gallery.id) ?? 0;
    const downloads = downloadsByGallery.get(gallery.id) ?? 0;
    return {
      id: gallery.id,
      name: gallery.name,
      createdAt: gallery.createdAt.toISOString(),
      photos: gallery._count.photos,
      registrations: gallery._count.clientProfiles,
      visits,
      imageViews: 0,
      downloads,
      conversion: visits > 0 ? Math.min(100, Math.round((downloads / visits) * 100)) : 0,
    };
  });

  const registrationRows = registrations.map((registration) => ({
    id: registration.id,
    galleryId: registration.galleryId,
    eventName: registration.gallery.name,
    clientKey: registration.clientKey,
    name: registration.name ?? "Guest",
    email: registration.email ?? "",
    mobile: registration.mobile ?? "",
    consent: registration.consent,
    marketingOptIn: registration.marketingOptIn,
    createdAt: registration.createdAt.toISOString(),
    imageViews: 0,
    downloads: downloadsByClient.get(`${registration.galleryId}:${registration.clientKey}`) ?? 0,
  }));

  return NextResponse.json({
    ok: true,
    totals: {
      registrations: registrationCount,
      visits: visitRows.length,
      imageViews: 0,
      downloads: events.reduce((sum, row) => sum + row.downloads, 0),
      photos: galleries.reduce((sum, row) => sum + row._count.photos, 0),
    },
    activity,
    events,
    registrations: registrationRows,
  });
});
