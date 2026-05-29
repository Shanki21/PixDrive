"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import fetchWithRetry from "@/lib/fetchWithRetry";
import { loadGalleriesList, readCachedGalleries } from "@/lib/client-galleries-cache";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  ChartColumnIncreasing,
  Clock3,
  Eye,
  FolderOpen,
  Image as ImageIcon,
  PlusCircle,
  QrCode,
  Users2,
} from "lucide-react";
import { MinimalGallery } from "@/types/DriveTableTypes";

type DashboardGallery = MinimalGallery & {
  slug?: string | null;
};

type TaskItem = {
  id: string;
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
};

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function DashboardPage() {
  const router = useRouter();
  const [galleries, setGalleries] = useState<DashboardGallery[]>(
    () => readCachedGalleries<DashboardGallery>() ?? []
  );
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("Creator");

  useEffect(() => {
    let active = true;

    const refreshMetrics = async () => {
      const payload = await loadGalleriesList<DashboardGallery>({
        dedupeKey: `client:galleries:list:metrics`,
        forceRefresh: true,
        includeMetrics: true,
      });
      if (active) setGalleries(payload);
    };

    const loadGalleries = async () => {
      try {
        const payload = await loadGalleriesList<DashboardGallery>({ dedupeKey: `client:galleries:list:fast` });
        if (!active) return;
        setGalleries(payload);
        const schedule = () => void refreshMetrics().catch(() => undefined);
        if ("requestIdleCallback" in window) {
          window.requestIdleCallback(schedule, { timeout: 2500 });
        } else {
          globalThis.setTimeout(schedule, 500);
        }
      } catch {
        if (active) setGalleries([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadGalleries();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadMe = async () => {
      try {
        const res = await fetchWithRetry("/api/auth/me", { cache: "no-store" }, { dedupeKey: `client:me:load` });
        if (!res.ok) return;
        const data = (await res.json()) as { displayName?: string };
        const displayName = String(data.displayName ?? "").trim();
        if (active && displayName) {
          setUsername(displayName);
        }
      } catch {
        // Ignore profile fetch failures.
      }
    };

    void loadMe();
    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    const totalEvents = galleries.length;
    const totalPhotos = galleries.reduce((sum, gallery) => sum + (gallery.filesCount ?? 0), 0);
    const totalVisitors = galleries.reduce((sum, gallery) => sum + (gallery.visitors ?? 0), 0);
    const totalDownloads = galleries.reduce((sum, gallery) => sum + (gallery.downloads ?? 0), 0);
    const engagementRate =
      totalVisitors > 0 ? clamp(Math.round((totalDownloads / totalVisitors) * 100), 0, 100) : 0;

    return {
      totalEvents,
      totalPhotos,
      totalVisitors,
      totalDownloads,
      engagementRate,
    };
  }, [galleries]);

  const recentEvents = useMemo(() => {
    return galleries.slice(0, 4).map((gallery, index) => {
      const files = gallery.filesCount ?? 0;
      const visitors = gallery.visitors ?? 0;
      const downloads = gallery.downloads ?? 0;
      const progress = files === 0 ? 18 : clamp(38 + files * 6 + Math.min(visitors, 25), 25, 96);
      const status = visitors > 0 ? "active" : index % 2 === 0 ? "upcoming" : "planning";

      return {
        id: gallery.id,
        slug: gallery.slug ?? null,
        name: gallery.name,
        createdAt: formatDate(gallery.createdAt),
        files,
        visitors,
        downloads,
        progress,
        status,
        cover: gallery.coverUrl ?? gallery.firstPhotoUrl ?? null,
      };
    });
  }, [galleries]);

  const tasks = useMemo<TaskItem[]>(() => {
    if (galleries.length === 0) {
      return [
        {
          id: "first-event",
          title: "Create your first event",
          detail: "Use Create Events to launch your first branded gallery workflow.",
          priority: "high",
        },
      ];
    }

    const items: TaskItem[] = [];
    const galleryWithoutPhotos = galleries.find((gallery) => (gallery.filesCount ?? 0) === 0);
    if (galleryWithoutPhotos) {
      items.push({
        id: "upload-files",
        title: `Upload files for ${galleryWithoutPhotos.name}`,
        detail: "Add photos to activate proofing and delivery.",
        priority: "high",
      });
    }

    const galleryWithoutVisits = galleries.find((gallery) => (gallery.visitors ?? 0) === 0);
    if (galleryWithoutVisits) {
      items.push({
        id: "share-link",
        title: `Share ${galleryWithoutVisits.name} with clients`,
        detail: "Generate a QR code and send the gallery link to guests.",
        priority: "medium",
      });
    }

    items.push({
      id: "delivery-check",
      title: "Run final delivery check",
      detail: "Verify cover image, gallery order, and download permissions.",
      priority: "medium",
    });

    return items.slice(0, 4);
  }, [galleries]);

  const statCards = [
    {
      id: "events",
      label: "Total Events",
      value: totals.totalEvents.toString(),
      helper: "Across your active workspace",
      icon: CalendarDays,
      tone: "bg-[#f4e5d3] text-[#7a3f13]",
    },
    {
      id: "photos",
      label: "Photos",
      value: formatCompact(totals.totalPhotos),
      helper: "Uploaded media count",
      icon: ImageIcon,
      tone: "bg-[#f3e4d2] text-[#b9783b]",
    },
    {
      id: "visitors",
      label: "Gallery Visitors",
      value: formatCompact(totals.totalVisitors),
      helper: "Client traffic across events",
      icon: Users2,
      tone: "bg-[#f6eadb] text-[#9f682e]",
    },
    {
      id: "engagement",
      label: "Download Rate",
      value: `${totals.engagementRate}%`,
      helper: `${formatCompact(totals.totalDownloads)} downloads tracked`,
      icon: ChartColumnIncreasing,
      tone: "bg-[#f7ecdd] text-[#9b5a24]",
    },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <section className="pixora-panel relative overflow-hidden rounded-[28px] p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-stretch">
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a3f13]">Pixora Dashboard</p>
            <h1 className="font-display mt-4 max-w-3xl text-4xl font-bold leading-tight text-[#2a170d] sm:text-5xl">
              Welcome back, {username}.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#7a6a55] sm:text-base">
              Here&apos;s what&apos;s happening in your event delivery pipeline today. Keep galleries active, share QR
              links, and monitor client activity from one place.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/dashboard/create-events")}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#5b2b0c] px-5 text-sm font-semibold text-white shadow-[0_14px_24px_rgba(91,43,12,0.22)] transition hover:bg-[#7a3f13]"
              >
                <PlusCircle className="h-4 w-4" />
                Create Event
              </button>
              <Link
                href="/dashboard/drive"
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#ead7c5] bg-[#fffdf8] px-5 text-sm font-semibold text-[#5b3a23] transition hover:border-[#7a3f13] hover:text-[#7a3f13]"
              >
                <FolderOpen className="h-4 w-4" />
                Open My Event
              </Link>
            </div>
          </div>

          <div className="relative hidden min-h-56 overflow-hidden rounded-[24px] border border-[#ead7c5] bg-[linear-gradient(145deg,#fff7ee_0%,#ead4bd_100%)] lg:block">
            <div className="absolute bottom-0 right-0 h-16 w-full bg-[#b88352]" />
            <div className="absolute bottom-12 right-10 h-12 w-52 rounded-[50%] bg-[#c9945f] shadow-[0_16px_24px_rgba(91,43,12,0.18)]" />
            <div className="absolute bottom-12 right-24 h-40 w-20 rounded-[42%_42%_18%_18%] bg-[#fffaf4] shadow-[inset_-10px_0_0_rgba(122,63,19,0.08),0_18px_25px_rgba(91,43,12,0.14)]" />
            <div className="absolute bottom-12 right-8 h-28 w-20 rounded-[18px] border border-[#6b360f]/40 bg-[#8a4b1a]/70 shadow-[inset_10px_0_16px_rgba(255,255,255,0.18)]" />
            <div className="absolute bottom-[88px] right-[152px] h-28 w-px rotate-[-28deg] bg-[#b9783b]" />
            <div className="absolute bottom-[100px] right-[168px] h-6 w-12 rotate-[-20deg] rounded-[50%] bg-[#c49a67]" />
            <div className="absolute bottom-[136px] right-[124px] h-24 w-px rotate-[24deg] bg-[#b9783b]" />
            <div className="absolute bottom-[164px] right-[112px] h-5 w-11 rotate-[18deg] rounded-[50%] bg-[#c49a67]" />
            <div className="absolute bottom-[124px] right-[188px] h-20 w-px rotate-[-42deg] bg-[#b9783b]" />
            <div className="absolute bottom-[152px] right-[204px] h-4 w-10 rotate-[-26deg] rounded-[50%] bg-[#d6b383]" />
            <div className="absolute right-48 top-8 h-44 w-44 rounded-full border border-[#d8b895]/60" />
            <div className="absolute right-54 top-14 h-32 w-32 rounded-full border border-[#d8b895]/50" />
          </div>
        </div>
      </section>

      <section className="pixora-panel mt-6 rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#2a170d]">Event Command Center Tutorial</h2>
            <p className="mt-1 text-sm text-[#7a6a55]">
              Follow this quick flow to manage your full event lifecycle inside Pixora.
            </p>
          </div>
          <Link href="/dashboard/create-events" className="inline-flex items-center gap-1 text-sm font-semibold text-[#7a3f13]">
            Start Tutorial
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-[#ead7c5] bg-[#fffaf4] p-5">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#ead7c5] bg-[#fffdf8] text-[#7a3f13] shadow-sm">
              <CalendarDays className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a3f13]">Step 1</p>
            <p className="mt-2 text-base font-semibold text-[#2a170d]">Create Event Blueprint</p>
            <p className="mt-1 text-sm text-[#7a6a55]">Configure dates, access, notifications, and advanced settings.</p>
            <Link href="/dashboard/create-events" className="mt-3 inline-block text-sm font-semibold text-[#7a3f13]">
              Open Create Event <span aria-hidden="true">-&gt;</span>
            </Link>
          </article>
          <article className="rounded-2xl border border-[#ead7c5] bg-[#fffaf4] p-5">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#ead7c5] bg-[#fffdf8] text-[#7a3f13] shadow-sm">
              <FolderOpen className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b9783b]">Step 2</p>
            <p className="mt-2 text-base font-semibold text-[#2a170d]">Publish and Organize</p>
            <p className="mt-1 text-sm text-[#7a6a55]">Use My Event filters for published, unpublished, and expired events.</p>
            <Link href="/dashboard/drive" className="mt-3 inline-block text-sm font-semibold text-[#7a3f13]">
              Open My Event <span aria-hidden="true">-&gt;</span>
            </Link>
          </article>
          <article className="rounded-2xl border border-[#ead7c5] bg-[#fffaf4] p-5">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#ead7c5] bg-[#fffdf8] text-[#7a3f13] shadow-sm">
              <QrCode className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9b5a24]">Step 3</p>
            <p className="mt-2 text-base font-semibold text-[#2a170d]">Share and Measure</p>
            <p className="mt-1 text-sm text-[#7a6a55]">Generate One QR access links and share event delivery instantly.</p>
            <div className="mt-3 flex gap-3">
              <Link href="/dashboard/qr-code" className="text-sm font-semibold text-[#7a3f13]">
                Open One QR <span aria-hidden="true">-&gt;</span>
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.id} className="relative overflow-hidden rounded-2xl border border-[#eadccf] bg-[#fffdf8] p-5 shadow-[0_10px_30px_rgba(73,39,20,0.06)]">
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${card.tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a735f]">{card.label}</p>
              <p className="mt-1 text-3xl font-bold tracking-[-0.02em] text-[#2a170d]">{card.value}</p>
              <p className="mt-2 text-xs text-[#8a735f]">{card.helper}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#2a170d]">Recent Events</h2>
          <Link href="/dashboard/drive" className="inline-flex items-center gap-1 text-sm font-semibold text-[#7a3f13]">
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="h-72 animate-pulse rounded-3xl border border-[#eadccf] bg-white"
              />
            ))}
          </div>
        ) : recentEvents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#ead7c5] bg-white px-6 py-14 text-center">
            <p className="text-xl font-semibold text-[#2a170d]">No events yet</p>
            <p className="mt-2 text-sm text-[#7a6a55]">
              Start by creating your first event and uploading photos for client proofing.
            </p>
            <button
              type="button"
              onClick={() => router.push("/dashboard/create-events")}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#7a3f13] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5b2b0c]"
            >
              <PlusCircle className="h-4 w-4" />
              Create Event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {recentEvents.map((event) => (
              <article key={event.id} className="overflow-hidden rounded-3xl border border-[#eadccf] bg-white shadow-[0_14px_36px_rgba(73,39,20,0.06)] transition hover:-translate-y-0.5 hover:border-[#7a3f13] hover:shadow-[0_18px_38px_rgba(73,39,20,0.10)]">
                <div className="relative aspect-[16/9] overflow-hidden border-b border-[#f0e4d7]">
                  {event.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.cover}
                      alt={event.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[linear-gradient(145deg,rgba(122,63,19,0.15),rgba(185,120,59,0.12))]">
                      <span className="rounded-full bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#6d4426]">
                        Event Cover
                      </span>
                    </div>
                  )}
                  <span className="absolute right-4 top-4 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6d4426]">
                    {event.status}
                  </span>
                </div>
                <div className="space-y-4 p-5">
                  <div>
                    <h3 className="text-lg font-semibold text-[#2a170d]">{event.name}</h3>
                    <p className="mt-1 text-xs text-[#8a735f]">
                      {event.createdAt} - {event.files} photos - {event.visitors} visits
                    </p>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs text-[#7a6a55]">
                      <span>Progress</span>
                      <span>{event.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#f2e4d6]">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-[#7a3f13] to-[#b9783b]"
                        style={{ width: `${event.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/drive/${event.id}`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#ead7c5] bg-white px-4 py-2 text-sm font-semibold text-[#5b3a23] transition hover:border-[#7a3f13] hover:text-[#7a3f13]"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Link>
                    <Link
                      href="/dashboard/qr-code"
                      className="inline-flex items-center justify-center rounded-xl border border-[#ead7c5] bg-white px-4 py-2 text-sm font-semibold text-[#5b3a23] transition hover:border-[#7a3f13] hover:text-[#7a3f13]"
                      aria-label={`Generate QR for ${event.name}`}
                    >
                      <QrCode className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[1.7fr_1fr]">
        <article className="rounded-3xl border border-[#eadccf] bg-white p-6 shadow-[0_10px_30px_rgba(73,39,20,0.06)]">
          <h3 className="text-lg font-semibold text-[#2a170d]">Upcoming Tasks</h3>
          <div className="mt-4 space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3 rounded-2xl border border-[#f0e4d7] px-4 py-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#edf6f2] text-[#7a3f13]">
                  <Clock3 className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#2a170d]">{task.title}</p>
                  <p className="mt-1 text-xs text-[#8a735f]">{task.detail}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    task.priority === "high"
                      ? "bg-[#fee2e2] text-[#b91c1c]"
                      : task.priority === "medium"
                        ? "bg-[#fef3c7] text-[#a16207]"
                        : "bg-[#dcfce7] text-[#15803d]"
                  }`}
                >
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-[#eadccf] bg-white p-6 shadow-[0_10px_30px_rgba(73,39,20,0.06)]">
          <h3 className="text-lg font-semibold text-[#2a170d]">Quick Actions</h3>
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard/create-events")}
              className="flex w-full items-center justify-between rounded-2xl border border-[#ead7c5] bg-[#f4e5d3] px-4 py-3 text-left"
            >
              <div>
                <p className="text-sm font-semibold text-[#5b3a23]">New Event</p>
                <p className="text-xs text-[#7a6a55]">Create a new gallery workspace</p>
              </div>
              <PlusCircle className="h-4 w-4 text-[#7a3f13]" />
            </button>
            <Link
              href="/dashboard/qr-code"
              className="flex items-center justify-between rounded-2xl border border-[#ead7c5] bg-[#fff4e8] px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-[#7a3f13]">Generate QR</p>
                <p className="text-xs text-[#7a6a55]">Share event access instantly</p>
              </div>
              <QrCode className="h-4 w-4 text-[#b9783b]" />
            </Link>
          </div>
        </article>
      </section>

    </div>
  );
}
