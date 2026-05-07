"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BarChart3, CalendarClock, Download, Eye, TrendingUp } from "lucide-react";
import fetchWithRetry from "@/lib/fetchWithRetry";
import { MinimalGallery } from "@/types/DriveTableTypes";

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

export default function AnalyticsPage() {
  const [galleries, setGalleries] = useState<GalleryWithSlug[]>([]);
  const [visitMap, setVisitMap] = useState<Record<string, number>>({});
  const [downloadMap, setDownloadMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetchWithRetry("/api/galleries", {}, { dedupeKey: `client:galleries:list:analytics` });
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
    const visits: Record<string, number> = {};
    const downloads: Record<string, number> = {};
    galleries.forEach((gallery) => {
      visits[gallery.id] = gallery.visitors ?? 0;
      downloads[gallery.id] = gallery.downloads ?? 0;
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
      <section className="rounded-[28px] border border-[#eadccf] bg-white p-6 shadow-[0_20px_55px_rgba(73,39,20,0.08)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a3f13]">Analytics</p>
        <h1 className="font-display mt-3 text-3xl font-bold text-[#2a170d] sm:text-4xl">Gallery Activity Insights</h1>
        <p className="mt-3 max-w-2xl text-sm text-[#7a6a55] sm:text-base">
          Review event performance by visits, downloads, and engagement conversion to decide which galleries need
          promotion or delivery follow-up.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#eadccf] bg-white p-5 shadow-[0_10px_30px_rgba(73,39,20,0.06)]">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4e5d3] text-[#7a3f13]">
            <Eye className="h-5 w-5" />
          </span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a735f]">Total Visits</p>
          <p className="mt-1 text-3xl font-bold text-[#2a170d]">{totals.totalViews}</p>
          <p className="mt-2 text-xs text-[#8a735f]">Across all event galleries</p>
        </article>
        <article className="rounded-2xl border border-[#eadccf] bg-white p-5 shadow-[0_10px_30px_rgba(73,39,20,0.06)]">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3e4d2] text-[#b9783b]">
            <Download className="h-5 w-5" />
          </span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a735f]">Total Downloads</p>
          <p className="mt-1 text-3xl font-bold text-[#2a170d]">{totals.totalDownloads}</p>
          <p className="mt-2 text-xs text-[#8a735f]">Client download actions</p>
        </article>
        <article className="rounded-2xl border border-[#eadccf] bg-white p-5 shadow-[0_10px_30px_rgba(73,39,20,0.06)]">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4e8d6] text-[#9b5a24]">
            <BarChart3 className="h-5 w-5" />
          </span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a735f]">Avg Conversion</p>
          <p className="mt-1 text-3xl font-bold text-[#2a170d]">{totals.avgConversion}%</p>
          <p className="mt-2 text-xs text-[#8a735f]">Downloads per visit</p>
        </article>
        <article className="rounded-2xl border border-[#eadccf] bg-white p-5 shadow-[0_10px_30px_rgba(73,39,20,0.06)]">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#f6eadb] text-[#9f682e]">
            <TrendingUp className="h-5 w-5" />
          </span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a735f]">Avg Photos/Event</p>
          <p className="mt-1 text-3xl font-bold text-[#2a170d]">{totals.avgPhotosPerEvent}</p>
          <p className="mt-2 text-xs text-[#8a735f]">{galleries.length} events tracked</p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_1fr]">
        <article className="rounded-3xl border border-[#eadccf] bg-white p-6 shadow-[0_10px_30px_rgba(73,39,20,0.06)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#2a170d]">Top Performing Events</h2>
            <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#7a3f13]">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Live ranking
            </span>
          </div>

          {loading ? (
            <div className="h-60 animate-pulse rounded-bg-linear-to-rr-[#f0e4d7] bg-[#fffaf4]" />
          ) : topPerformance.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d2e4db] bg-[#fffdf8] p-8 text-center text-sm text-[#7a6a55]">
              No event data yet. Start by creating and sharing your first gallery.
            </div>
          ) : (
            <div className="space-y-4">
              {topPerformance.map((row) => {
                const width = clamp(Math.round((row.views / maxViews) * 100), 6, 100);
                return (
                  <div key={row.id} className="rounded-2xl border border-[#f0e4d7] bg-[#fffaf4] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#3a2112]">{row.name}</p>
                      <span className="text-xs text-[#8a735f]">{formatDate(row.createdAt)}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-[#f2e4d6]">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-[#7a3f13] to-[#b9783b]"
                        className="h-full rounded-full bg-linear-to-r from-[#0f766e] to-[#2563eb]"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[#7a6a55]">
                      <p>
                        <span className="font-semibold text-[#3a2112]">{row.views}</span> visits
                      </p>
                      <p>
                        <span className="font-semibold text-[#3a2112]">{row.downloads}</span> downloads
                      </p>
                      <p>
                        <span className="font-semibold text-[#3a2112]">{row.conversion}%</span> conversion
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="rounded-3xl border border-[#eadccf] bg-white p-6 shadow-[0_10px_30px_rgba(73,39,20,0.06)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#2a170d]">Activity Snapshot</h2>
            <span className="inline-flex items-center gap-1 text-xs text-[#7a6a55]">
              <CalendarClock className="h-3.5 w-3.5" />
              Latest update
            </span>
          </div>

          {loading ? (
            <div className="h-60 animate-pulse rounded-2xl border border-[#f0e4d7] bg-[#fffaf4]" />
          ) : analyticsRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d2e4db] bg-[#fffdf8] p-8 text-center text-sm text-[#7a6a55]">
              Activity appears here after galleries receive client traffic.
            </div>
          ) : (
            <div className="space-y-3">
              {analyticsRows.slice(0, 6).map((row) => (
                <div key={row.id} className="rounded-2xl border border-[#f0e4d7] bg-[#fffaf4] p-3">
                  <p className="text-sm font-semibold text-[#3a2112]">{row.name}</p>
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
