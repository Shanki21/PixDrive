"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AddGalleryModal from "@/components/drive/AddGalleryModal";
import DriveHeader from "@/components/drive/DriveHeader";
import DriveTable from "@/components/drive/DriveTable";
import DriveTabs from "@/components/drive/DriveTabs";
import DriveToolbar from "@/components/drive/DriveToolbar";
import TrashTable from "@/components/drive/TrashTable";
import TrashWarning from "@/components/drive/TrashWarning";
import { getGalleryMeta, saveGalleryMeta } from "@/lib/gallery-meta-storage";
import { MinimalGallery } from "@/types/DriveTableTypes";

const VISITS_STORAGE_KEY = "wf_gallery_visits";
const GALLERIES_CACHE_KEY = "wf_drive_galleries_cache_v1";
const GALLERIES_CACHE_TTL = 60 * 1000;

function insertAfterPinned(list: MinimalGallery[], item: MinimalGallery) {
  const pinnedCount = list.filter((g) => g.pinned).length;
  return [...list.slice(0, pinnedCount), item, ...list.slice(pinnedCount)];
}

export default function DrivePage() {
  const router = useRouter();
  const [galleries, setGalleries] = useState<MinimalGallery[]>([]);
  const [trash, setTrash] = useState<MinimalGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGallery, setEditingGallery] = useState<MinimalGallery | null>(null);
  const [tab, setTab] = useState<"galleries" | "trash">("galleries");

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(GALLERIES_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { ts: number; data: MinimalGallery[] };
      if (!parsed?.ts || !Array.isArray(parsed.data)) return;
      if (Date.now() - parsed.ts > GALLERIES_CACHE_TTL) return;
      setGalleries(parsed.data);
    } catch {
      // Ignore cache read failures.
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/galleries");
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || !contentType.includes("application/json")) {
        return;
      }

      const rows = (await res.json()) as MinimalGallery[];
      if (!Array.isArray(rows) || rows.length === 0) {
        router.replace("/dashboard");
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
        return {
          ...row,
          visitors: visitsMap[row.id] ?? row.visitors ?? 0,
          expiresAt: meta?.expiresAt ?? row.expiresAt ?? undefined,
          storageTimeLabel: meta?.storageTimeLabel ?? row.storageTimeLabel ?? undefined,
          favoritesEnabled: meta?.favoritesEnabled ?? row.favoritesEnabled ?? false,
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

  if (!hasMounted || (loading && galleries.length === 0)) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-20 text-center text-[#8a7f73]">
        Loading your galleries...
      </div>
    );
  }

  return (
    <>
      <DriveHeader />

      <DriveTabs
        active={tab}
        showTrash
        trashCount={trashCount}
        onChange={setTab}
      />

      {tab === "galleries" && (
        <DriveToolbar
          onAdd={() => {
            setEditingGallery(null);
            setModalOpen(true);
          }}
        />
      )}

      {tab === "galleries" && (
        <DriveTable
          galleries={galleries}
          onSettings={(gallery) => {
            setEditingGallery(gallery);
            setModalOpen(true);
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

      {modalOpen && (
        <AddGalleryModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingGallery(null);
          }}
          initialGallery={editingGallery}
          onUpdated={(updated) => {
            saveGalleryMeta(updated.id, {
              expiresAt: updated.expiresAt ?? null,
              storageTimeLabel: updated.storageTimeLabel ?? null,
              favoritesEnabled: updated.favoritesEnabled ?? false,
              favoritesLimitSelected: updated.favoritesLimitSelected ?? false,
              favoritesName: updated.favoritesName ?? null,
              favoritesListsCount: updated.favoritesListsCount ?? 0,
              selectionCompletedCount: updated.selectionCompletedCount ?? 0,
              favoritesMaxSelected: updated.favoritesMaxSelected ?? null,
            });
            setGalleries((prev) => prev.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)));
          }}
          onCreated={(g) => {
            saveGalleryMeta(g.id, {
              expiresAt: g.expiresAt ?? null,
              storageTimeLabel: g.storageTimeLabel ?? null,
              favoritesEnabled: g.favoritesEnabled ?? false,
              favoritesLimitSelected: g.favoritesLimitSelected ?? false,
              favoritesName: g.favoritesName ?? null,
              favoritesListsCount: g.favoritesListsCount ?? 0,
              selectionCompletedCount: g.selectionCompletedCount ?? 0,
              favoritesMaxSelected: g.favoritesMaxSelected ?? null,
            });
            setGalleries((prev) => insertAfterPinned(prev, g));
          }}
        />
      )}
    </>
  );
}
