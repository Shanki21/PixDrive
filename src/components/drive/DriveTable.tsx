"use client";

import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpDown, ChartNoAxesColumn, Search } from "lucide-react";
import GalleryRow from "./GalleryRow";
import { MinimalGallery } from "../../types/DriveTableTypes";
import SortDropdown from "./SortDropdown";

const GRID =
  "grid grid-cols-[36px_36px_64px_minmax(260px,460px)_72px_72px_72px_120px_44px_44px]";

type SortField =
  | "title"
  | "size"
  | "shootingDate"
  | "createdAt"
  | "expiresAt"
  | "flag"
  | "downloads";

type SortOrder = "asc" | "desc";

export default function DriveTable({
  galleries,
  onSettings,
  onPreview,
  onPinToggle,
  onDuplicate,
  onDelete,
  onReorder,
}: {
  galleries: MinimalGallery[];
  onSettings: (gallery: MinimalGallery) => void;
  onPreview: (gallery: MinimalGallery) => void;
  onPinToggle: (gallery: MinimalGallery) => void;
  onDuplicate: (gallery: MinimalGallery) => void;
  onDelete: (gallery: MinimalGallery) => void;
  onReorder: (draggedId: string, targetId: string) => void;
}) {
  const [openSort, setOpenSort] = useState(false);
  const [field, setField] = useState<SortField>("createdAt");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [query, setQuery] = useState("");
  const [sortingEnabled, setSortingEnabled] = useState(false);

  const sorted = useMemo(() => {
    const filtered = galleries.filter((g) =>
      g.name.toLowerCase().includes(query.toLowerCase())
    );

    if (!sortingEnabled) {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      const dir = order === "asc" ? 1 : -1;

      switch (field) {
        case "title":
          return a.name.localeCompare(b.name) * dir;
        case "size":
          return ((a.filesCount ?? 0) - (b.filesCount ?? 0)) * dir;
        case "createdAt":
          return (
            (new Date(a.createdAt ?? 0).getTime() -
              new Date(b.createdAt ?? 0).getTime()) * dir
          );
        case "expiresAt":
          return (
            (new Date(a.expiresAt ?? 0).getTime() -
              new Date(b.expiresAt ?? 0).getTime()) * dir
          );
        default:
          return 0;
      }
    });
  }, [galleries, query, field, order, sortingEnabled]);

  return (
    <div className="mt-6 relative">
      <div className={`${GRID} items-center px-4 py-4 border-b text-sm text-gray-700`}>
        <div className="text-gray-500">
          <ArrowUpDown size={16} />
        </div>

        <div />

        <div className="col-span-2 relative max-w-110 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-full border border-gray-300"
          />
        </div>

        <div className="text-left"><ChartNoAxesColumn size={18} /></div>
        <div className="text-left"><ArrowDownToLine size={18} /></div>
        <div className="text-left font-semibold">Type</div>
        <div className="text-left font-semibold">Expires</div>
        <div />

        <div className="text-right relative">
          <button
            onClick={() => setOpenSort((v) => !v)}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowUpDown size={16} />
          </button>

          {openSort && (
            <SortDropdown
              field={field}
              order={order}
              onFieldChange={(f) => {
                setField(f);
                setSortingEnabled(true);
              }}
              onOrderChange={(o) => {
                setOrder(o);
                setSortingEnabled(true);
              }}
            />
          )}
        </div>
      </div>

      {sorted.map((g) => (
        <GalleryRow
          key={g.id}
          gallery={g}
          grid={GRID}
          onOpen={() => (window.location.href = `/dashboard/drive/${g.id}`)}
          onSettings={() => onSettings(g)}
          onPreview={() => onPreview(g)}
          onPinToggle={() => onPinToggle(g)}
          onDuplicate={() => onDuplicate(g)}
          onDelete={() => onDelete(g)}
          onReorder={onReorder}
        />
      ))}
    </div>
  );
}
