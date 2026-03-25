import { getPrismaUnavailableMessage, isPrismaUnavailableError } from "@/lib/prisma-errors";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import DiskGalleryClient from "./DiskGalleryClient";

type DiskGalleryPageProps = {
  params: Promise<{ slug: string }>;
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

export default async function DiskGalleryPage({ params }: DiskGalleryPageProps) {
  try {
    const { slug } = await params;
    const initialTake = 60;

    const gallery = await prisma.gallery.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        coverPhotoId: true,
        user: {
          select: { email: true },
        },
      },
    });

    if (!gallery) {
      notFound();
    }

    const [initialPhotos, totalPhotos, coverPhoto] = await Promise.all([
      prisma.photo.findMany({
        where: { galleryId: gallery.id },
        orderBy: { id: "asc" },
        take: initialTake,
        select: {
          id: true,
          name: true,
          url: true,
        },
      }),
      prisma.photo.count({ where: { galleryId: gallery.id } }),
      gallery.coverPhotoId
        ? prisma.photo.findUnique({
            where: { id: gallery.coverPhotoId },
            select: { id: true, url: true },
          })
        : Promise.resolve(null),
    ]);

    const fallbackCover = coverPhoto ?? initialPhotos[0] ?? null;
    const ownerName = gallery.user.email.split("@")[0];
    const expiresAtIso = new Date(gallery.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
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
        initialPhotos={photos}
        totalPhotos={totalPhotos}
        initialCursor={nextCursor}
        hostLabel="pixora.pro"
        formatHeaderDate={formatHeaderDate(gallery.createdAt)}
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
