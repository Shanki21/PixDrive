"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpDown, ChartNoAxesColumn, Eye, Search, Settings } from "lucide-react";
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
  const router = useRouter();
  const [openSort, setOpenSort] = useState(false);
  const [field, setField] = useState<SortField>("createdAt");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [sortingEnabled, setSortingEnabled] = useState(false);

  const sorted = useMemo(() => {
    const filtered = galleries.filter((g) =>
      g.name.toLowerCase().includes(deferredQuery.toLowerCase())
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
  }, [galleries, deferredQuery, field, order, sortingEnabled]);

  return (
    <div className="relative mt-6">
      <div className="mb-4 flex items-center gap-3 md:hidden">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search gallery"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-full border border-gray-300 pl-9 pr-4 text-sm"
          />
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {sorted.map((g) => (
          <div key={g.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <button
              type="button"
              className="text-left text-base font-semibold text-slate-900"
              onClick={() => router.push(`/dashboard/drive/${g.id}`)}
            >
              {g.name}
            </button>
            <p className="mt-1 text-xs text-slate-500">
              {g.filesCount ?? 0} files {g.totalSize ? `(${g.totalSize})` : ""}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                onClick={() => onPreview(g)}
              >
                <Eye size={14} />
                Preview
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                onClick={() => onSettings(g)}
              >
                <Settings size={14} />
                Settings
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <div className={`${GRID} items-center border-b px-4 py-4 text-sm text-gray-700`}>
          <div className="text-gray-500">
            <ArrowUpDown size={16} />
          </div>
          <div />
          <div className="relative col-span-2 w-full max-w-110">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-full border border-gray-300 py-2 pl-9 pr-4"
            />
          </div>
          <div className="text-left">
            <div className="group relative inline-flex items-center">
              <ChartNoAxesColumn size={18} />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-800 px-3 py-1.5 text-sm font-semibold text-white shadow-md group-hover:block">
                Number of visits
                <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gray-800" />
              </div>
            </div>
          </div>
          <div className="text-left">
            <div className="group relative inline-flex items-center">
              <ArrowDownToLine size={18} />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-800 px-3 py-1.5 text-sm font-semibold text-white shadow-md group-hover:block">
                Number of downloads
                <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gray-800" />
              </div>
            </div>
          </div>
          <div className="text-left font-semibold">Type</div>
          <div className="text-left font-semibold">Expires</div>
          <div />
          <div className="relative text-right">
            <button
              onClick={() => setOpenSort((v) => !v)}
              className="rounded-full p-2 hover:bg-gray-100"
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
            onPrefetch={() => router.prefetch(`/dashboard/drive/${g.id}`)}
            onOpen={() => router.push(`/dashboard/drive/${g.id}`)}
            onSettings={() => onSettings(g)}
            onPreview={() => onPreview(g)}
            onPinToggle={() => onPinToggle(g)}
            onDuplicate={() => onDuplicate(g)}
            onDelete={() => onDelete(g)}
            onReorder={onReorder}
          />
        ))}
      </div>
    </div>
  );
}
