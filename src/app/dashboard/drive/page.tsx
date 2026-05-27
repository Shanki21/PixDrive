"use client";

import { useEffect, useMemo, useState } from "react";
import fetchWithRetry from "@/lib/fetchWithRetry";
import { useRouter } from "next/navigation";
import DriveHeader from "@/components/drive/DriveHeader";
import DriveTable from "@/components/drive/DriveTable";
import TrashTable from "@/components/drive/TrashTable";
import TrashWarning from "@/components/drive/TrashWarning";
import type { GalleryEventSettings } from "@/lib/gallery-config";
import { MinimalGallery } from "@/types/DriveTableTypes";
import {
  clearCachedGalleries,
  loadGalleriesList,
  readCachedGalleries,
  writeCachedGalleries,
} from "@/lib/client-galleries-cache";

function insertAfterPinned(list: MinimalGallery[], item: MinimalGallery) {
  const pinnedCount = list.filter((g) => g.pinned).length;
  return [...list.slice(0, pinnedCount), item, ...list.slice(pinnedCount)];
}

export default function DrivePage() {
  const router = useRouter();
  const [galleries, setGalleries] = useState<MinimalGallery[]>(() => readCachedGalleries<MinimalGallery>() ?? []);
  const [trash, setTrash] = useState<MinimalGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"galleries" | "trash">("galleries");

  useEffect(() => {
    const load = async () => {
      const rows = await loadGalleriesList<MinimalGallery>({
        dedupeKey: `client:galleries:list`,
        forceRefresh: true,
      });

      setGalleries(rows);
      const trashRes = await fetchWithRetry("/api/galleries?trash=1", { cache: "no-store" }, { dedupeKey: "client:galleries:trash" });
      if (trashRes.ok) {
        const trashRows = (await trashRes.json()) as MinimalGallery[];
        setTrash(Array.isArray(trashRows) ? trashRows : []);
      }
    };

    load().finally(() => setLoading(false));
  }, []);

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
      writeCachedGalleries(galleries);
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
          <p className="text-xs uppercase tracking-[0.14em] text-[#7a6a55]">Active Events</p>
          <p className="mt-2 text-2xl font-semibold text-[#2a170d]">{galleries.length}</p>
        </article>
        <article className="rounded-2xl border border-[#d3e8df] bg-white p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[#7a6a55]">Files Managed</p>
          <p className="mt-2 text-2xl font-semibold text-[#2a170d]">{totalFiles}</p>
        </article>
        <article className="rounded-2xl border border-[#d3e8df] bg-white p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[#7a6a55]">Pinned Priority</p>
          <p className="mt-2 text-2xl font-semibold text-[#2a170d]">{pinnedCount}</p>
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
          onOpenQr={(gallery) => {
            router.push(`/dashboard/qr-code?event=${encodeURIComponent(gallery.id)}`);
          }}
          onOpen={(gallery) => {
            router.push(`/dashboard/drive/${encodeURIComponent(gallery.id)}`);
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
          onPublishToggle={async (gallery) => {
            const nextPublished = !(gallery.published ?? true);
            const payload: GalleryEventSettings = { published: nextPublished };
            try {
              const dedupe = `galleries:patch:settings:${gallery.id}`;
              const res = await fetchWithRetry(`/api/galleries/${encodeURIComponent(gallery.id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ settings: payload }),
              }, { dedupeKey: dedupe, idempotencyKey: `${dedupe}:${Date.now()}` });
              if (!res.ok) return;
              setGalleries((prev) =>
                prev.map((item) => (item.id === gallery.id ? { ...item, published: nextPublished } : item))
              );
            } catch {
              // Ignore toggle failures.
            }
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
          onDelete={async (gallery) => {
            try {
              const dedupe = `galleries:delete:${gallery.id}`;
              const res = await fetchWithRetry(`/api/galleries/${encodeURIComponent(gallery.id)}`, {
                method: "DELETE",
              }, { dedupeKey: dedupe, idempotencyKey: dedupe });
              if (!res.ok) return;
              const payload = (await res.json().catch(() => ({}))) as { deletedAt?: string };

              const deleted: MinimalGallery = {
                ...gallery,
                deletedAt: payload.deletedAt ?? new Date().toISOString(),
              };

              setGalleries((prev) => prev.filter((g) => g.id !== gallery.id));
              setTrash((prev) => [deleted, ...prev]);
              try {
                clearCachedGalleries();
              } catch {
                // Ignore cache cleanup failures.
              }
            } catch {
              // Ignore delete failures to keep dashboard responsive.
            }
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
            className="rounded-xl border border-[#ead7c5] bg-white px-4 py-2 text-sm font-semibold text-[#5b3a23] transition hover:border-[#7a3f13] hover:text-[#7a3f13]"
          >
            Back to My Events
          </button>
          <TrashWarning />
          <TrashTable
            galleries={trash}
            onRestore={async (gallery) => {
              const dedupe = `galleries:restore:${gallery.id}`;
              const res = await fetchWithRetry(`/api/galleries/${encodeURIComponent(gallery.id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deletedAt: null }),
              }, { dedupeKey: dedupe, idempotencyKey: dedupe });
              if (!res.ok) return;
              setTrash((prev) => prev.filter((g) => g.id !== gallery.id));
              setGalleries((prev) => insertAfterPinned(prev, { ...gallery, deletedAt: null }));
              setTab("galleries");
            }}
            onPermanentDelete={async (gallery) => {
              const dedupe = `galleries:delete:permanent:${gallery.id}`;
              const res = await fetchWithRetry(`/api/galleries/${encodeURIComponent(gallery.id)}?permanent=1`, {
                method: "DELETE",
              }, { dedupeKey: dedupe, idempotencyKey: dedupe });
              if (!res.ok) return;
              setTrash((prev) => prev.filter((g) => g.id !== gallery.id));
            }}
          />
        </div>
      )}

    </>
  );
}
