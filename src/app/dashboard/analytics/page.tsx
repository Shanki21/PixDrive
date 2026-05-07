"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BarChart3, CalendarClock, Download, Eye, TrendingUp } from "lucide-react";
import { MinimalGallery } from "@/types/DriveTableTypes";

const VISITS_STORAGE_KEY = "wf_gallery_visits";
const CLIENT_DOWNLOADS_PREFIX = "wf_client_downloads:";

type GalleryWithSlug = MinimalGallery & {
  slug?: string | null;
};

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

function readVisitsMap() {
  if (typeof window === "undefined") return {} as Record<string, number>;
  try {
    const raw = window.localStorage.getItem(VISITS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {} as Record<string, number>;
  }
}

function readDownloadCount(galleryId: string) {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(`${CLIENT_DOWNLOADS_PREFIX}${galleryId}`);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export default function AnalyticsPage() {
  const [galleries, setGalleries] = useState<GalleryWithSlug[]>([]);
  const [visitMap, setVisitMap] = useState<Record<string, number>>({});
  const [downloadMap, setDownloadMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/galleries");
        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok || !contentType.includes("application/json")) {
          if (active) setGalleries([]);
          return;
        }

        const payload = (await response.json()) as GalleryWithSlug[] | { error?: string };
        if (!active) return;
        setGalleries(Array.isArray(payload) ? payload : []);
      } catch {
        if (active) setGalleries([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const visits = readVisitsMap();
    const downloads: Record<string, number> = {};
    galleries.forEach((gallery) => {
      downloads[gallery.id] = readDownloadCount(gallery.id);
    });
    setVisitMap(visits);
    setDownloadMap(downloads);
  }, [galleries]);

  const analyticsRows = useMemo(() => {
    const rows = galleries.map((gallery) => {
      const views = visitMap[gallery.id] ?? gallery.visitors ?? 0;
      const downloads = downloadMap[gallery.id] ?? gallery.downloads ?? 0;
      const photos = gallery.filesCount ?? 0;
      const conversion = views > 0 ? clamp(Math.round((downloads / views) * 100), 0, 100) : 0;
      return {
        id: gallery.id,
        name: gallery.name,
        createdAt: gallery.createdAt,
        photos,
        views,
        downloads,
        conversion,
        score: views + downloads * 2,
      };
    });
    return rows.sort((a, b) => b.score - a.score);
  }, [downloadMap, galleries, visitMap]);

  const totals = useMemo(() => {
    const totalViews = analyticsRows.reduce((sum, row) => sum + row.views, 0);
    const totalDownloads = analyticsRows.reduce((sum, row) => sum + row.downloads, 0);
    const totalPhotos = analyticsRows.reduce((sum, row) => sum + row.photos, 0);
    const avgPhotosPerEvent = analyticsRows.length > 0 ? Math.round(totalPhotos / analyticsRows.length) : 0;
    const avgConversion =
      analyticsRows.length > 0
        ? Math.round(analyticsRows.reduce((sum, row) => sum + row.conversion, 0) / analyticsRows.length)
        : 0;
    return {
      totalViews,
      totalDownloads,
      totalPhotos,
      avgPhotosPerEvent,
      avgConversion,
    };
  }, [analyticsRows]);

  const topPerformance = analyticsRows.slice(0, 5);
  const maxViews = Math.max(...topPerformance.map((row) => row.views), 1);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="rounded-[28px] border border-[#d8e8e2] bg-white p-6 shadow-[0_20px_55px_rgba(16,39,32,0.08)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">Analytics</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[#101c19] sm:text-4xl">Gallery Activity Insights</h1>
        <p className="mt-3 max-w-2xl text-sm text-[#57726a] sm:text-base">
          Review event performance by visits, downloads, and engagement conversion to decide which galleries need
          promotion or delivery follow-up.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#d9e8e2] bg-white p-5 shadow-[0_10px_30px_rgba(16,39,32,0.06)]">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf8f3] text-[#0f766e]">
            <Eye className="h-5 w-5" />
          </span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#68857c]">Total Visits</p>
          <p className="mt-1 text-3xl font-bold text-[#102320]">{totals.totalViews}</p>
          <p className="mt-2 text-xs text-[#6f8a82]">Across all event galleries</p>
        </article>
        <article className="rounded-2xl border border-[#d9e8e2] bg-white p-5 shadow-[0_10px_30px_rgba(16,39,32,0.06)]">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef5ff] text-[#2563eb]">
            <Download className="h-5 w-5" />
          </span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#68857c]">Total Downloads</p>
          <p className="mt-1 text-3xl font-bold text-[#102320]">{totals.totalDownloads}</p>
          <p className="mt-2 text-xs text-[#6f8a82]">Client download actions</p>
        </article>
        <article className="rounded-2xl border border-[#d9e8e2] bg-white p-5 shadow-[0_10px_30px_rgba(16,39,32,0.06)]">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#f1f5ff] text-[#4f46e5]">
            <BarChart3 className="h-5 w-5" />
          </span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#68857c]">Avg Conversion</p>
          <p className="mt-1 text-3xl font-bold text-[#102320]">{totals.avgConversion}%</p>
          <p className="mt-2 text-xs text-[#6f8a82]">Downloads per visit</p>
        </article>
        <article className="rounded-2xl border border-[#d9e8e2] bg-white p-5 shadow-[0_10px_30px_rgba(16,39,32,0.06)]">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#ecf9f2] text-[#059669]">
            <TrendingUp className="h-5 w-5" />
          </span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#68857c]">Avg Photos/Event</p>
          <p className="mt-1 text-3xl font-bold text-[#102320]">{totals.avgPhotosPerEvent}</p>
          <p className="mt-2 text-xs text-[#6f8a82]">{galleries.length} events tracked</p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_1fr]">
        <article className="rounded-3xl border border-[#d9e8e2] bg-white p-6 shadow-[0_10px_30px_rgba(16,39,32,0.06)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#112420]">Top Performing Events</h2>
            <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#0f766e]">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Live ranking
            </span>
          </div>

          {loading ? (
            <div className="h-60 animate-pulse rounded-2xl border border-[#e4efe9] bg-[#f7fbf9]" />
          ) : topPerformance.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d2e4db] bg-[#f9fcfa] p-8 text-center text-sm text-[#648178]">
              No event data yet. Start by creating and sharing your first gallery.
            </div>
          ) : (
            <div className="space-y-4">
              {topPerformance.map((row) => {
                const width = clamp(Math.round((row.views / maxViews) * 100), 6, 100);
                return (
                  <div key={row.id} className="rounded-2xl border border-[#e2eee8] bg-[#f8fbf9] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#17322c]">{row.name}</p>
                      <span className="text-xs text-[#68857c]">{formatDate(row.createdAt)}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-[#e2efe9]">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-[#0f766e] to-[#2563eb]"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[#5d7a72]">
                      <p>
                        <span className="font-semibold text-[#1f3d35]">{row.views}</span> visits
                      </p>
                      <p>
                        <span className="font-semibold text-[#1f3d35]">{row.downloads}</span> downloads
                      </p>
                      <p>
                        <span className="font-semibold text-[#1f3d35]">{row.conversion}%</span> conversion
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="rounded-3xl border border-[#d9e8e2] bg-white p-6 shadow-[0_10px_30px_rgba(16,39,32,0.06)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#112420]">Activity Snapshot</h2>
            <span className="inline-flex items-center gap-1 text-xs text-[#607d74]">
              <CalendarClock className="h-3.5 w-3.5" />
              Latest update
            </span>
          </div>

          {loading ? (
            <div className="h-60 animate-pulse rounded-2xl border border-[#e4efe9] bg-[#f7fbf9]" />
          ) : analyticsRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d2e4db] bg-[#f9fcfa] p-8 text-center text-sm text-[#648178]">
              Activity appears here after galleries receive client traffic.
            </div>
          ) : (
            <div className="space-y-3">
              {analyticsRows.slice(0, 6).map((row) => (
                <div key={row.id} className="rounded-2xl border border-[#e3eee8] bg-[#f7fbf9] p-3">
                  <p className="text-sm font-semibold text-[#17322c]">{row.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#5f7b72]">
                    <span>{row.photos} photos</span>
                    <span>{row.views} visits</span>
                    <span>{row.downloads} downloads</span>
                    <span>{row.conversion}% conversion</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

