import { notFound } from "next/navigation";
import { Camera, Images, Sparkles, Zap } from "lucide-react";

import { getGalleryPublicAccess } from "@/lib/gallery-public-access";
import prisma from "@/lib/prisma";

import GetPhotosForm from "./GetPhotosForm";

type GetPhotosPageProps = {
  params: Promise<{
    ownerId: string;
    slug: string;
  }>;
};

export default async function GetPhotosPage({ params }: GetPhotosPageProps) {
  const { ownerId, slug } = await params;

  const gallery = await prisma.gallery.findFirst({
    where: {
      userId: ownerId,
      OR: [{ slug }, { id: slug }],
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      settings: true,
      meta: true,
    },
  });

  if (!gallery) notFound();

  const access = getGalleryPublicAccess({
    settings: gallery.settings,
    meta: gallery.meta,
  });

  if (!access.canAccess || !access.oneQrEnabled) notFound();

  return (
    <main className="min-h-screen bg-[#f7f3ee] px-4 py-8 text-[#2a170d] sm:px-6">
      <section className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="rounded-3xl border border-[#eadccf] bg-[#fffaf4] p-6 shadow-[0_18px_60px_rgba(73,39,20,0.08)] sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ead7c5] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#7a3f13]">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered
          </div>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-[#7a3f13]">{gallery.name}</p>
          <h1 className="font-display mt-3 text-4xl font-bold tracking-tight text-[#2a170d] sm:text-5xl">
            Get your photos
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#7a6a55]">
            Add your details and capture one clear selfie. Pixora will use this intake to prepare face-search matching for this event gallery.
          </p>

          <div className="mt-8 grid gap-3 text-sm text-[#5b3a23]">
            {[
              { icon: Images, label: "Open Event" },
              { icon: Camera, label: "Capture Selfie" },
              { icon: Zap, label: "Get Photos" },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-[#ead7c5] bg-white px-4 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f6eadb] text-[#7a3f13]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-semibold">{index + 1}. {item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <GetPhotosForm
          galleryId={gallery.id}
          gallerySlug={gallery.slug || gallery.id}
          galleryName={gallery.name}
        />
      </section>
    </main>
  );
}
