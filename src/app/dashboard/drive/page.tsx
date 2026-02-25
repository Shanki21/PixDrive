"use client";

import { useEffect, useMemo, useState } from "react";
import AddGalleryModal from "@/components/drive/AddGalleryModal";
import DriveHeader from "@/components/drive/DriveHeader";
import DriveTable from "@/components/drive/DriveTable";
import DriveTabs from "@/components/drive/DriveTabs";
import DriveToolbar from "@/components/drive/DriveToolbar";
import TrashTable from "@/components/drive/TrashTable";
import TrashWarning from "@/components/drive/TrashWarning";
import { MinimalGallery } from "@/types/DriveTableTypes";

function insertAfterPinned(list: MinimalGallery[], item: MinimalGallery) {
  const pinnedCount = list.filter((g) => g.pinned).length;
  return [...list.slice(0, pinnedCount), item, ...list.slice(pinnedCount)];
}

export default function DrivePage() {
  const [galleries, setGalleries] = useState<MinimalGallery[]>([]);
  const [trash, setTrash] = useState<MinimalGallery[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGallery, setEditingGallery] = useState<MinimalGallery | null>(null);
  const [tab, setTab] = useState<"galleries" | "trash">("galleries");

  useEffect(() => {
    fetch("/api/galleries")
      .then((res) => res.json())
      .then((rows: MinimalGallery[]) => setGalleries(rows));
  }, []);

  const trashCount = useMemo(() => trash.length, [trash]);

  return (
    <>
      <DriveHeader />

      <DriveTabs
        active={tab}
        showTrash
        trashCount={trashCount}
        onChange={setTab}
      />

      <DriveToolbar onAdd={() => {
        setEditingGallery(null);
        setModalOpen(true);
      }} />

      {tab === "galleries" && (
        <DriveTable
          galleries={galleries}
          onSettings={(gallery) => {
            setEditingGallery(gallery);
            setModalOpen(true);
          }}
          onPreview={(gallery) => {
            window.location.href = `/dashboard/drive/${gallery.id}`;
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
        <div className="space-y-4">
          <TrashWarning />
          <TrashTable
            galleries={trash}
            onRestore={(gallery) => {
              setTrash((prev) => prev.filter((g) => g.id !== gallery.id));
              setGalleries((prev) => insertAfterPinned(prev, { ...gallery, deletedAt: null }));
              setTab("galleries");
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
            setGalleries((prev) => prev.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)));
          }}
          onCreated={(g) => setGalleries((prev) => insertAfterPinned(prev, g))}
        />
      )}
    </>
  );
}
