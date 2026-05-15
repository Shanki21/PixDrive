import { getClientGalleryHostLabel } from "@/lib/client-gallery-url";
import { getGalleryPublicAccess } from "@/lib/gallery-public-access";
import { getGalleryAccessModeFromCookieStore, getRequiredGalleryPin, hasGalleryAccessFromCookieStore } from "@/lib/gallery-pin-access";
import { normalizeGalleryMeta } from "@/lib/gallery-config";
import { getPrismaUnavailableMessage, isPrismaUnavailableError } from "@/lib/prisma-errors";
import prisma from "@/lib/prisma";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import DiskGalleryClient from "./DiskGalleryClient";

type DiskGalleryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ clientKey?: string }>;
};

function decodePhotoName(raw: string) {
  const separator = "::";
  const splitIndex = raw.indexOf(separator);
  if (splitIndex < 0) return raw;
  const fileName = raw.slice(splitIndex + separator.length).trim();
  return fileName || raw;
}

function formatHeaderDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA").format(value);
}

export default async function DiskGalleryPage({ params, searchParams }: DiskGalleryPageProps) {
  try {
    const requestHeaders = await headers();
    const cookieStore = await cookies();
    const forwardedHost = requestHeaders.get("x-forwarded-host");
    const host = forwardedHost || requestHeaders.get("host");
    const protocol = requestHeaders.get("x-forwarded-proto") || "https";
    const fallbackOrigin = host ? `${protocol}://${host}` : undefined;

    const { slug } = await params;
    const query = (await searchParams) ?? {};
    const clientKey = String(query.clientKey ?? "").trim();
    const initialTake = 60;

    const gallery = await prisma.gallery.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        settings: true,
        meta: true,
        coverPhotoId: true,
        user: {
          select: { email: true },
        },
      },
    });

    if (!gallery) {
      notFound();
    }
    const publicAccess = getGalleryPublicAccess({ settings: gallery.settings, meta: gallery.meta });
    if (!publicAccess.canAccess) {
      notFound();
    }
    const requiredPin = getRequiredGalleryPin(gallery.settings);
    const hasPinAccess = !requiredPin || hasGalleryAccessFromCookieStore(cookieStore, gallery.id);
    const meta = normalizeGalleryMeta(gallery.meta);
    const coverObjectPosition = `${meta?.coverPositionX ?? 50}% ${meta?.coverPositionY ?? 50}%`;
    const expiresAtIso =
      meta?.expiresAt ?? new Date(gallery.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (!hasPinAccess) {
      return (
        <DiskGalleryClient
          galleryId={gallery.id}
          gallerySlug={slug}
          galleryName={gallery.name}
          ownerName={gallery.user.email.split("@")[0]}
          expiresAt={expiresAtIso}
          coverUrl={null}
          coverObjectPosition={coverObjectPosition}
          initialPhotos={[]}
          totalPhotos={0}
          initialCursor={null}
        allowSingleDownload={publicAccess.allowSingleDownload}
        allowBulkDownload={publicAccess.allowBulkDownload}
        favoritesEnabled={publicAccess.favoritesEnabled}
        favoritesLimitSelected={meta?.favoritesLimitSelected ?? false}
        favoritesMaxSelected={meta?.favoritesMaxSelected ?? null}
        serverFolders={meta?.folders ?? []}
        serverFolderPhotosMap={meta?.folderPhotosMap ?? {}}
        hostLabel={getClientGalleryHostLabel(fallbackOrigin)}
        formatHeaderDate={formatHeaderDate(gallery.createdAt)}
        isLocked
        />
      );
    }

    const accessMode = requiredPin ? getGalleryAccessModeFromCookieStore(cookieStore, gallery.id) ?? "guest" : "full";
    const faceMatchedIds =
      accessMode === "guest" && clientKey
        ? new Set(
            (
              await prisma.faceMatch.findMany({
                where: { galleryId: gallery.id, clientKey },
                select: { photoId: true },
                take: 1000,
              })
            ).map((match) => match.photoId)
          )
        : null;
    const photoWhere = {
      galleryId: gallery.id,
      ...(faceMatchedIds ? { id: { in: Array.from(faceMatchedIds) } } : {}),
    };

    const [initialPhotos, totalPhotos, coverPhoto] = await Promise.all([
      prisma.photo.findMany({
        where: photoWhere,
        orderBy: { id: "asc" },
        take: initialTake,
        select: {
          id: true,
          name: true,
          url: true,
        },
      }),
      prisma.photo.count({ where: photoWhere }),
      gallery.coverPhotoId
        ? prisma.photo.findUnique({
            where: { id: gallery.coverPhotoId },
            select: { id: true, url: true },
          })
        : Promise.resolve(null),
    ]);

    const fallbackCover = coverPhoto ?? initialPhotos[0] ?? null;
    const ownerName = gallery.user.email.split("@")[0];
    const photos = initialPhotos.map((photo) => ({
      id: photo.id,
      name: decodePhotoName(photo.name),
      url: photo.url,
    }));
    const nextCursor = initialPhotos.length === initialTake ? initialPhotos[initialPhotos.length - 1]?.id ?? null : null;

    return (
      <DiskGalleryClient
        galleryId={gallery.id}
        gallerySlug={slug}
        galleryName={gallery.name}
        ownerName={ownerName}
        expiresAt={expiresAtIso}
        coverUrl={fallbackCover?.url ?? null}
        coverObjectPosition={coverObjectPosition}
        initialPhotos={photos}
        totalPhotos={totalPhotos}
        initialCursor={nextCursor}
        allowSingleDownload={publicAccess.allowSingleDownload}
        allowBulkDownload={publicAccess.allowBulkDownload}
        favoritesEnabled={publicAccess.favoritesEnabled}
        favoritesLimitSelected={meta?.favoritesLimitSelected ?? false}
        favoritesMaxSelected={meta?.favoritesMaxSelected ?? null}
        serverFolders={meta?.folders ?? []}
        serverFolderPhotosMap={meta?.folderPhotosMap ?? {}}
        hostLabel={getClientGalleryHostLabel(fallbackOrigin)}
        formatHeaderDate={formatHeaderDate(gallery.createdAt)}
        isLocked={false}
      />
    );
  } catch (error) {
    if (!isPrismaUnavailableError(error)) {
      throw error;
    }

    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl rounded-4xl border border-black/10 bg-white/80 p-8 text-center shadow-xl shadow-black/5 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-black/45">Pixora Drive</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black">Gallery unavailable</h1>
          <p className="mt-3 text-sm text-black/65">
            {getPrismaUnavailableMessage()}. Start your PostgreSQL server and reload this page.
          </p>
        </div>
      </main>
    );
  }
}
