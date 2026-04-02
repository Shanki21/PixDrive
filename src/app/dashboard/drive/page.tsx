"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DriveHeader from "@/components/drive/DriveHeader";
import DriveTable from "@/components/drive/DriveTable";
import TrashTable from "@/components/drive/TrashTable";
import TrashWarning from "@/components/drive/TrashWarning";
import { getGalleryMeta } from "@/lib/gallery-meta-storage";
import { getEventSettings, saveEventSettings } from "@/lib/event-settings-storage";
import { MinimalGallery } from "@/types/DriveTableTypes";

const VISITS_STORAGE_KEY = "wf_gallery_visits";
const CLIENT_DOWNLOADS_PREFIX = "wf_client_downloads:";
const GALLERIES_CACHE_KEY = "wf_drive_galleries_cache_v1";
const GALLERIES_CACHE_TTL = 60 * 1000;

function insertAfterPinned(list: MinimalGallery[], item: MinimalGallery) {
  const pinnedCount = list.filter((g) => g.pinned).length;
  return [...list.slice(0, pinnedCount), item, ...list.slice(pinnedCount)];
}

export default function DrivePage() {
  const router = useRouter();
  const [galleries, setGalleries] = useState<MinimalGallery[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const raw = window.sessionStorage.getItem(GALLERIES_CACHE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { ts: number; data: MinimalGallery[] };
      if (!parsed?.ts || !Array.isArray(parsed.data)) return [];
      if (Date.now() - parsed.ts > GALLERIES_CACHE_TTL) return [];
      return parsed.data;
    } catch {
      return [];
    }
  });
  const [trash, setTrash] = useState<MinimalGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"galleries" | "trash">("galleries");

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/galleries");
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || !contentType.includes("application/json")) {
        return;
      }

      const rows = (await res.json()) as MinimalGallery[];
      if (!Array.isArray(rows)) {
        return;
      }

      const visitsMapRaw = localStorage.getItem(VISITS_STORAGE_KEY);
      let visitsMap: Record<string, number> = {};
      if (visitsMapRaw) {
        try {
          visitsMap = JSON.parse(visitsMapRaw) as Record<string, number>;
        } catch {
          visitsMap = {};
        }
      }

      const rowsWithVisits = rows.map((row) => {
        const meta = getGalleryMeta(row.id);
        const eventSettings = getEventSettings(row.id);
        const settingsExpiry =
          eventSettings?.expiryDate ? new Date(`${eventSettings.expiryDate}T00:00:00`).toISOString() : undefined;
        let downloadsCount = row.downloads ?? 0;
        try {
          const rawDownloads = localStorage.getItem(`${CLIENT_DOWNLOADS_PREFIX}${row.id}`);
          const parsedDownloads = rawDownloads ? (JSON.parse(rawDownloads) as string[]) : [];
          downloadsCount = Array.isArray(parsedDownloads) ? parsedDownloads.length : downloadsCount;
        } catch {
          downloadsCount = row.downloads ?? 0;
        }
        return {
          ...row,
          visitors: visitsMap[row.id] ?? row.visitors ?? 0,
          downloads: downloadsCount,
          startDate: eventSettings?.startDate ?? null,
          endDate: eventSettings?.endDate ?? null,
          eventType: eventSettings?.eventType ?? null,
          eventLocation: eventSettings?.eventLocation ?? null,
          description: eventSettings?.description ?? null,
          published: eventSettings?.published ?? true,
          photoSellingEnabled: eventSettings?.photoSellingEnabled ?? false,
          expiresAt: meta?.expiresAt ?? row.expiresAt ?? settingsExpiry ?? undefined,
          storageTimeLabel: meta?.storageTimeLabel ?? row.storageTimeLabel ?? undefined,
          favoritesEnabled: meta?.favoritesEnabled ?? row.favoritesEnabled ?? true,
          favoritesLimitSelected: meta?.favoritesLimitSelected ?? row.favoritesLimitSelected ?? false,
          favoritesName: meta?.favoritesName ?? row.favoritesName ?? undefined,
          favoritesListsCount: meta?.favoritesListsCount ?? row.favoritesListsCount ?? 0,
          selectionCompletedCount: meta?.selectionCompletedCount ?? row.selectionCompletedCount ?? 0,
          favoritesMaxSelected: meta?.favoritesMaxSelected ?? row.favoritesMaxSelected ?? null,
        };
      });

      setGalleries(rowsWithVisits);
      try {
        window.sessionStorage.setItem(
          GALLERIES_CACHE_KEY,
          JSON.stringify({ ts: Date.now(), data: rowsWithVisits })
        );
      } catch {
        // Ignore cache write failures.
      }
    };

    load().finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const prefetch = () => {
      galleries.slice(0, 4).forEach((gallery) => {
        router.prefetch(`/dashboard/drive/${gallery.id}`);
      });
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(prefetch);
      return () => window.cancelIdleCallback(id);
    }

    const timeoutId = setTimeout(prefetch, 300);
    return () => clearTimeout(timeoutId);
  }, [galleries, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(
        GALLERIES_CACHE_KEY,
        JSON.stringify({ ts: Date.now(), data: galleries })
      );
    } catch {
      // Ignore cache write failures.
    }
  }, [galleries]);

  const trashCount = useMemo(() => trash.length, [trash]);
  const totalFiles = useMemo(
    () => galleries.reduce((sum, gallery) => sum + (gallery.filesCount ?? 0), 0),
    [galleries]
  );
  const pinnedCount = useMemo(
    () => galleries.filter((gallery) => gallery.pinned).length,
    [galleries]
  );

  if (loading && galleries.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-20 text-center text-[#5f7e9a]">
        Loading your events...
      </div>
    );
  }

  return (
    <>
      <DriveHeader totalEvents={galleries.length} />

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-[#d3e8df] bg-white p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[#5f7f74]">Active Events</p>
          <p className="mt-2 text-2xl font-semibold text-[#142924]">{galleries.length}</p>
        </article>
        <article className="rounded-2xl border border-[#d3e8df] bg-white p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[#5f7f74]">Files Managed</p>
          <p className="mt-2 text-2xl font-semibold text-[#142924]">{totalFiles}</p>
        </article>
        <article className="rounded-2xl border border-[#d3e8df] bg-white p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[#5f7f74]">Pinned Priority</p>
          <p className="mt-2 text-2xl font-semibold text-[#142924]">{pinnedCount}</p>
        </article>
      </div>

      {tab === "galleries" && (
        <DriveTable
          galleries={galleries}
          trashCount={trashCount}
          onAdd={() => {
            router.push("/dashboard/create-events");
          }}
          onOpenBin={() => setTab("trash")}
          onSettings={(gallery) => {
            router.push(`/dashboard/create-events?edit=${encodeURIComponent(gallery.id)}`);
          }}
          onPreview={(gallery) => {
            router.push(`/dashboard/drive/${gallery.id}`);
          }}
          onPinToggle={(gallery) => {
            setGalleries((prev) => {
              const toggled = prev.map((g) =>
                g.id === gallery.id ? { ...g, pinned: !g.pinned } : g
              );
              const pinned = toggled.filter((g) => g.pinned);
              const regular = toggled.filter((g) => !g.pinned);
              return [...pinned, ...regular];
            });
          }}
          onPublishToggle={(gallery) => {
            const nextPublished = !(gallery.published ?? true);
            saveEventSettings(gallery.id, { published: nextPublished });
            setGalleries((prev) =>
              prev.map((item) => (item.id === gallery.id ? { ...item, published: nextPublished } : item))
            );
          }}
          onPhotoSellingToggle={(gallery) => {
            const nextPhotoSelling = !(gallery.photoSellingEnabled ?? false);
            saveEventSettings(gallery.id, { photoSellingEnabled: nextPhotoSelling });
            setGalleries((prev) =>
              prev.map((item) =>
                item.id === gallery.id ? { ...item, photoSellingEnabled: nextPhotoSelling } : item
              )
            );
          }}
          onDuplicate={(gallery) => {
            const copy: MinimalGallery = {
              ...gallery,
              id: `${gallery.id}-copy-${Date.now()}`,
              name: `${gallery.name} (Copy)`,
              pinned: false,
              createdAt: new Date().toISOString(),
            };

            setGalleries((prev) => insertAfterPinned(prev, copy));
          }}
          onDelete={(gallery) => {
            const deleted: MinimalGallery = {
              ...gallery,
              deletedAt: new Date().toISOString(),
            };

            setGalleries((prev) => prev.filter((g) => g.id !== gallery.id));
            setTrash((prev) => [deleted, ...prev]);
          }}
          onReorder={(draggedId, targetId) => {
            setGalleries((prev) => {
              const sourceIndex = prev.findIndex((g) => g.id === draggedId);
              const targetIndex = prev.findIndex((g) => g.id === targetId);

              if (sourceIndex === -1 || targetIndex === -1) {
                return prev;
              }

              const next = [...prev];
              const [moved] = next.splice(sourceIndex, 1);
              next.splice(targetIndex, 0, moved);
              return next;
            });
          }}
          />
        )}

      {tab === "trash" && (
        <div className="mt-6 space-y-4">
          <button
            type="button"
            onClick={() => setTab("galleries")}
            className="rounded-xl border border-[#d2e7de] bg-white px-4 py-2 text-sm font-semibold text-[#25493f] transition hover:border-[#0f766e] hover:text-[#0f766e]"
          >
            Back to My Events
          </button>
          <TrashWarning />
          <TrashTable
            galleries={trash}
            onRestore={(gallery) => {
              setTrash((prev) => prev.filter((g) => g.id !== gallery.id));
              setGalleries((prev) => insertAfterPinned(prev, { ...gallery, deletedAt: null }));
              setTab("galleries");
            }}
            onPermanentDelete={(gallery) => {
              setTrash((prev) => prev.filter((g) => g.id !== gallery.id));
            }}
          />
        </div>
      )}

    </>
  );
}
