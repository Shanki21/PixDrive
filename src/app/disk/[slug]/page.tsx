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
  const { slug } = await params;

  const gallery = await prisma.gallery.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
    },
    include: {
      photos: {
        orderBy: { id: "asc" },
      },
      user: {
        select: { email: true },
      },
    },
  });

  if (!gallery) {
    notFound();
  }

  const coverPhoto =
    (gallery.coverPhotoId
      ? gallery.photos.find((photo) => photo.id === gallery.coverPhotoId)
      : null) ?? gallery.photos[0] ?? null;
  const ownerName = gallery.user.email.split("@")[0];
  const expiresAtIso = new Date(gallery.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const photos = gallery.photos.map((photo) => ({
    id: photo.id,
    name: decodePhotoName(photo.name),
    url: photo.url,
  }));

  return (
    <DiskGalleryClient
      galleryId={gallery.id}
      galleryName={gallery.name}
      ownerName={ownerName}
      expiresAt={expiresAtIso}
      coverUrl={coverPhoto?.url ?? null}
      photos={photos}
      hostLabel="pixora.pro"
      formatHeaderDate={formatHeaderDate(gallery.createdAt)}
    />
  );
}


