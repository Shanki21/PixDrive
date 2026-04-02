"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

const VISITS_STORAGE_KEY = "wf_gallery_visits";
const CLIENT_DOWNLOADS_PREFIX = "wf_client_downloads:";

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
  const [galleries, setGalleries] = useState<DashboardGallery[]>([]);
  const [visitMap, setVisitMap] = useState<Record<string, number>>({});
  const [downloadMap, setDownloadMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("Creator");

  useEffect(() => {
    let active = true;

    const loadGalleries = async () => {
      try {
        const response = await fetch("/api/galleries");
        const contentType = response.headers.get("content-type") ?? "";

        if (!response.ok || !contentType.includes("application/json")) {
          if (active) setGalleries([]);
          return;
        }

        const payload = (await response.json()) as DashboardGallery[] | { error?: string };
        if (!active) return;
        setGalleries(Array.isArray(payload) ? payload : []);
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
    if (typeof document === "undefined") return;
    const emailCookie = document.cookie
      .split(";")
      .map((value) => value.trim())
      .find((item) => item.startsWith("wf_user_email="));

    if (!emailCookie) return;
    const emailValue = decodeURIComponent(emailCookie.split("=")[1] ?? "").trim();
    if (!emailValue) return;
    const local = emailValue.split("@")[0] ?? "Creator";
    const normalized = local
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim();
    setUsername(normalized || "Creator");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let parsedVisits: Record<string, number> = {};
    try {
      const rawVisits = window.localStorage.getItem(VISITS_STORAGE_KEY);
      parsedVisits = rawVisits ? (JSON.parse(rawVisits) as Record<string, number>) : {};
    } catch {
      parsedVisits = {};
    }

    const nextDownloads: Record<string, number> = {};
    galleries.forEach((gallery) => {
      try {
        const raw = window.localStorage.getItem(`${CLIENT_DOWNLOADS_PREFIX}${gallery.id}`);
        const parsed = raw ? (JSON.parse(raw) as string[]) : [];
        nextDownloads[gallery.id] = Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        nextDownloads[gallery.id] = 0;
      }
    });

    setVisitMap(parsedVisits);
    setDownloadMap(nextDownloads);
  }, [galleries]);

  const totals = useMemo(() => {
    const totalEvents = galleries.length;
    const totalPhotos = galleries.reduce((sum, gallery) => sum + (gallery.filesCount ?? 0), 0);
    const totalVisitors = galleries.reduce(
      (sum, gallery) => sum + (visitMap[gallery.id] ?? gallery.visitors ?? 0),
      0
    );
    const totalDownloads = galleries.reduce(
      (sum, gallery) => sum + (downloadMap[gallery.id] ?? gallery.downloads ?? 0),
      0
    );
    const engagementRate =
      totalVisitors > 0 ? clamp(Math.round((totalDownloads / totalVisitors) * 100), 0, 100) : 0;

    return {
      totalEvents,
      totalPhotos,
      totalVisitors,
      totalDownloads,
      engagementRate,
    };
  }, [downloadMap, galleries, visitMap]);

  const recentEvents = useMemo(() => {
    return galleries.slice(0, 4).map((gallery, index) => {
      const files = gallery.filesCount ?? 0;
      const visitors = visitMap[gallery.id] ?? gallery.visitors ?? 0;
      const downloads = downloadMap[gallery.id] ?? gallery.downloads ?? 0;
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
  }, [downloadMap, galleries, visitMap]);

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

    const galleryWithoutVisits = galleries.find((gallery) => (visitMap[gallery.id] ?? 0) === 0);
    if (galleryWithoutVisits) {
      items.push({
        id: "share-link",
        title: `Share ${galleryWithoutVisits.name} with clients`,
        detail: "Generate a QR code and send the gallery link to guests.",
        priority: "medium",
      });
    }

    items.push({
      id: "weekly-analytics",
      title: "Review gallery analytics",
      detail: "Track visits and downloads to improve delivery performance.",
      priority: "low",
    });

    items.push({
      id: "delivery-check",
      title: "Run final delivery check",
      detail: "Verify cover image, gallery order, and download permissions.",
      priority: "medium",
    });

    return items.slice(0, 4);
  }, [galleries, visitMap]);

  const statCards = [
    {
      id: "events",
      label: "Total Events",
      value: totals.totalEvents.toString(),
      helper: "Across your active workspace",
      icon: CalendarDays,
      tone: "bg-[#ebf5f1] text-[#0f766e]",
    },
    {
      id: "photos",
      label: "Photos",
      value: formatCompact(totals.totalPhotos),
      helper: "Uploaded media count",
      icon: ImageIcon,
      tone: "bg-[#eef5ff] text-[#2563eb]",
    },
    {
      id: "visitors",
      label: "Gallery Visitors",
      value: formatCompact(totals.totalVisitors),
      helper: "Client traffic across events",
      icon: Users2,
      tone: "bg-[#ecf9f2] text-[#059669]",
    },
    {
      id: "engagement",
      label: "Download Rate",
      value: `${totals.engagementRate}%`,
      helper: `${formatCompact(totals.totalDownloads)} downloads tracked`,
      icon: ChartColumnIncreasing,
      tone: "bg-[#f4f6fb] text-[#4f46e5]",
    },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <section className="rounded-[28px] border border-[#d5e8df] bg-white p-6 shadow-[0_20px_55px_rgba(16,39,32,0.08)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">Pixora Dashboard</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[#101c19] sm:text-4xl">
          Welcome back, {username}.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[#57726a] sm:text-base">
          Here&apos;s what&apos;s happening in your event delivery pipeline today. Keep galleries active, share QR
          links, and monitor client activity from one place.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/create-events")}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#115e59]"
          >
            <PlusCircle className="h-4 w-4" />
            Create Event
          </button>
          <Link
            href="/dashboard/drive"
            className="inline-flex items-center gap-2 rounded-xl border border-[#d7e8e0] bg-white px-5 py-2.5 text-sm font-semibold text-[#23453d] transition hover:border-[#0f766e] hover:text-[#0f766e]"
          >
            <FolderOpen className="h-4 w-4" />
            Open My Event
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-[#d8e8e1] bg-white p-6 shadow-[0_10px_30px_rgba(16,39,32,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#112420]">Event Command Center Tutorial</h2>
            <p className="mt-1 text-sm text-[#607c73]">
              Follow this quick flow to manage your full event lifecycle inside Pixora.
            </p>
          </div>
          <Link href="/dashboard/create-events" className="text-sm font-semibold text-[#0f766e] hover:underline">
            Start Tutorial
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-[#d8e8e1] bg-[#f7fbf9] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0f766e]">Step 1</p>
            <p className="mt-2 text-base font-semibold text-[#18342c]">Create Event Blueprint</p>
            <p className="mt-1 text-sm text-[#648077]">Configure dates, access, notifications, and advanced settings.</p>
            <Link href="/dashboard/create-events" className="mt-3 inline-block text-sm font-semibold text-[#0f766e]">
              Open Create Event
            </Link>
          </article>
          <article className="rounded-2xl border border-[#d8e8e1] bg-[#f7fbf9] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2563eb]">Step 2</p>
            <p className="mt-2 text-base font-semibold text-[#18342c]">Publish and Organize</p>
            <p className="mt-1 text-sm text-[#648077]">Use My Event filters for published, unpublished, expired, and photo selling events.</p>
            <Link href="/dashboard/drive" className="mt-3 inline-block text-sm font-semibold text-[#0f766e]">
              Open My Event
            </Link>
          </article>
          <article className="rounded-2xl border border-[#d8e8e1] bg-[#f7fbf9] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7c3aed]">Step 3</p>
            <p className="mt-2 text-base font-semibold text-[#18342c]">Share and Measure</p>
            <p className="mt-1 text-sm text-[#648077]">Generate QR access and monitor engagement from analytics.</p>
            <div className="mt-3 flex gap-3">
              <Link href="/dashboard/qr-code" className="text-sm font-semibold text-[#0f766e]">
                QR Code
              </Link>
              <Link href="/dashboard/analytics" className="text-sm font-semibold text-[#0f766e]">
                Analytics
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.id} className="rounded-2xl border border-[#d8e8e1] bg-white p-5 shadow-[0_10px_30px_rgba(16,39,32,0.06)]">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#68857c]">{card.label}</p>
              <p className="mt-1 text-3xl font-bold tracking-[-0.02em] text-[#102320]">{card.value}</p>
              <p className="mt-2 text-xs text-[#6f8a82]">{card.helper}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#112420]">Recent Events</h2>
          <Link href="/dashboard/drive" className="inline-flex items-center gap-1 text-sm font-semibold text-[#0f766e]">
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="h-72 animate-pulse rounded-3xl border border-[#d9e8e2] bg-white"
              />
            ))}
          </div>
        ) : recentEvents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#cce1d8] bg-white px-6 py-14 text-center">
            <p className="text-xl font-semibold text-[#102320]">No events yet</p>
            <p className="mt-2 text-sm text-[#648078]">
              Start by creating your first event and uploading photos for client proofing.
            </p>
            <button
              type="button"
              onClick={() => router.push("/dashboard/create-events")}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#115e59]"
            >
              <PlusCircle className="h-4 w-4" />
              Create Event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {recentEvents.map((event) => (
              <article key={event.id} className="overflow-hidden rounded-3xl border border-[#d9e8e2] bg-white shadow-[0_14px_36px_rgba(16,39,32,0.06)]">
                <div
                  className="relative h-40 border-b border-[#e4f0ea]"
                  style={
                    event.cover
                      ? {
                          backgroundImage: `linear-gradient(160deg, rgba(15,118,110,0.16), rgba(37,99,235,0.18)), url(${event.cover})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : {
                          background:
                            "linear-gradient(145deg, rgba(15,118,110,0.15), rgba(37,99,235,0.12))",
                        }
                  }
                >
                  {!event.cover ? (
                    <div className="flex h-full items-center justify-center">
                      <span className="rounded-full bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#20564a]">
                        Event Cover
                      </span>
                    </div>
                  ) : null}
                  <span className="absolute right-4 top-4 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1f5247]">
                    {event.status}
                  </span>
                </div>
                <div className="space-y-4 p-5">
                  <div>
                    <h3 className="text-lg font-semibold text-[#122520]">{event.name}</h3>
                    <p className="mt-1 text-xs text-[#68857c]">
                      {event.createdAt} - {event.files} photos - {event.visitors} visits
                    </p>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs text-[#668178]">
                      <span>Progress</span>
                      <span>{event.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#e5f0eb]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#0f766e] to-[#2563eb]"
                        style={{ width: `${event.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/drive/${event.id}`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#d7e8e0] bg-white px-4 py-2 text-sm font-semibold text-[#23453d] transition hover:border-[#0f766e] hover:text-[#0f766e]"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Link>
                    <Link
                      href="/dashboard/qr-code"
                      className="inline-flex items-center justify-center rounded-xl border border-[#d7e8e0] bg-white px-4 py-2 text-sm font-semibold text-[#23453d] transition hover:border-[#0f766e] hover:text-[#0f766e]"
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
        <article className="rounded-3xl border border-[#d9e8e2] bg-white p-6 shadow-[0_10px_30px_rgba(16,39,32,0.06)]">
          <h3 className="text-lg font-semibold text-[#122520]">Upcoming Tasks</h3>
          <div className="mt-4 space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3 rounded-2xl border border-[#e4f0ea] px-4 py-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#edf6f2] text-[#0f766e]">
                  <Clock3 className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1b352f]">{task.title}</p>
                  <p className="mt-1 text-xs text-[#68857c]">{task.detail}</p>
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

        <article className="rounded-3xl border border-[#d9e8e2] bg-white p-6 shadow-[0_10px_30px_rgba(16,39,32,0.06)]">
          <h3 className="text-lg font-semibold text-[#122520]">Quick Actions</h3>
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard/create-events")}
              className="flex w-full items-center justify-between rounded-2xl border border-[#cae3d9] bg-[#edf8f3] px-4 py-3 text-left"
            >
              <div>
                <p className="text-sm font-semibold text-[#174439]">New Event</p>
                <p className="text-xs text-[#5d7d73]">Create a new gallery workspace</p>
              </div>
              <PlusCircle className="h-4 w-4 text-[#0f766e]" />
            </button>
            <Link
              href="/dashboard/qr-code"
              className="flex items-center justify-between rounded-2xl border border-[#dce8fb] bg-[#f1f6ff] px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-[#1d3f7a]">Generate QR</p>
                <p className="text-xs text-[#5b7ea9]">Share event access instantly</p>
              </div>
              <QrCode className="h-4 w-4 text-[#2563eb]" />
            </Link>
            <Link
              href="/dashboard/analytics"
              className="flex items-center justify-between rounded-2xl border border-[#efe2cb] bg-[#fff8eb] px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-[#7a4a1d]">View Analytics</p>
                <p className="text-xs text-[#9c6b3d]">Track visitor and download activity</p>
              </div>
              <ChartColumnIncreasing className="h-4 w-4 text-[#b45309]" />
            </Link>
          </div>
        </article>
      </section>

    </div>
  );
}
