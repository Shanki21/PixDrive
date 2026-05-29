import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { CalendarDays, Images, Sparkles } from "lucide-react";
import { normalizeRequestHost, resolveVerifiedCustomDomain } from "@/lib/custom-domains";
import { getGalleryPublicAccess } from "@/lib/gallery-public-access";
import { normalizeEventSettings, normalizeGalleryMeta } from "@/lib/gallery-config";
import prisma from "@/lib/prisma";

type StudioPageProps = {
  params: Promise<{ ownerId: string }>;
};

function formatEventDate(value: Date | string | null | undefined) {
  if (!value) return "Date coming soon";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date coming soon";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function StudioEventSelectorPage({ params }: StudioPageProps) {
  const { ownerId } = await params;
  const requestHeaders = await headers();
  const customDomain = await resolveVerifiedCustomDomain(
    normalizeRequestHost(requestHeaders.get("x-forwarded-host") || requestHeaders.get("host"))
  );
  if (customDomain && customDomain.userId !== ownerId) notFound();

  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: {
      id: true,
      email: true,
      galleries: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          settings: true,
          meta: true,
          coverPhoto: { select: { url: true } },
          photos: {
            take: 1,
            orderBy: { id: "asc" },
            select: { url: true },
          },
        },
      },
    },
  });

  if (!user) notFound();

  const events = user.galleries
    .map((gallery) => {
      const publicAccess = getGalleryPublicAccess({ settings: gallery.settings, meta: gallery.meta });
      if (!publicAccess.canAccess || !(publicAccess.oneQrEnabled ?? true)) return null;

      const settings = normalizeEventSettings(gallery.settings);
      const meta = normalizeGalleryMeta(gallery.meta);
      return {
        id: gallery.id,
        name: gallery.name,
        slug: gallery.slug,
        date: settings?.startDate ?? gallery.createdAt,
        eventType: settings?.eventType ?? "Event",
        description: settings?.description ?? "",
        coverUrl: gallery.coverPhoto?.url ?? gallery.photos[0]?.url ?? null,
        coverPosition: `${meta?.coverPositionX ?? 50}% ${meta?.coverPositionY ?? 50}%`,
      };
    })
    .filter((event): event is NonNullable<typeof event> => Boolean(event));

  return (
    <main className="min-h-screen bg-[#f7f3ee] px-4 py-8 text-[#2a170d] sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-5xl">
        <div className="rounded-3xl border border-[#eadccf] bg-[#fffaf4] p-6 shadow-[0_18px_60px_rgba(73,39,20,0.08)] sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ead7c5] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#7a3f13]">
            <Sparkles className="h-3.5 w-3.5" />
            Pixora Photo Delivery
          </div>
          <h1 className="font-display mt-4 text-4xl font-bold tracking-tight text-[#2a170d] sm:text-5xl">Select your event</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#7a6a55]">
            Choose the event you attended, add your details, and continue to your gallery.
          </p>
        </div>

        <div className="mt-8 grid gap-4">
          {events.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#d8b895] bg-[#fffdf8] p-10 text-center text-sm text-[#7a6a55]">
              No public events are available right now.
            </div>
          ) : (
            events.map((event) => (
              <article
                key={event.id}
                className="grid gap-5 border-b border-[#eadccf] py-8 md:grid-cols-[0.8fr_1.2fr] md:items-center"
              >
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full bg-[#f6eadb] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#7a3f13]">
                    <Images className="h-3.5 w-3.5" />
                    {event.eventType}
                  </p>
                  <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-[#2a170d]">{event.name}</h2>
                  <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#6d4426]">
                    <CalendarDays className="h-4 w-4" />
                    {formatEventDate(event.date)}
                  </p>
                  {event.description ? (
                    <p className="mt-4 max-w-sm text-xs uppercase tracking-[0.16em] text-[#8a735f]">{event.description}</p>
                  ) : null}
                  <Link
                    href={
                      customDomain
                        ? `/${encodeURIComponent(event.slug || event.id)}/get-photos`
                        : `/studio/${encodeURIComponent(user.id)}/${encodeURIComponent(event.slug || event.id)}/get-photos`
                    }
                    className="mt-8 inline-flex rounded-xl bg-[#7a3f13] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-[0_12px_22px_rgba(122,63,19,0.18)] transition hover:bg-[#5b2b0c]"
                  >
                    Show Gallery
                  </Link>
                </div>
                <div className="aspect-[16/10] overflow-hidden rounded-2xl border border-[#eadccf] shadow-[0_10px_24px_rgba(73,39,20,0.06)]">
                  {event.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.coverUrl}
                      alt={event.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
