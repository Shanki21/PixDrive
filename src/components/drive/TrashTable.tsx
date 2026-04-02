"use client";

import { Activity, Download, MoreVertical, Search, Trash2 } from "lucide-react";
import { ReactNode, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { MinimalGallery } from "@/types/DriveTableTypes";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 10);
}

function getMetaLine(gallery: MinimalGallery) {
  const shootDate = formatDate(gallery.createdAt);
  const files = gallery.filesCount ?? 0;
  const size = gallery.totalSize ?? "0 Bytes";
  return `${shootDate}  -  ${files} files (${size})`;
}

function HeaderTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="group relative flex items-center justify-center">
      {children}
      <div className="pointer-events-none absolute -top-12 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-800 px-3 py-1.5 text-xs font-semibold text-white group-hover:block">
        {label}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-gray-800" />
      </div>
    </div>
  );
}

export default function TrashTable({
  galleries,
  onRestore,
  onPermanentDelete,
}: {
  galleries: MinimalGallery[];
  onRestore: (gallery: MinimalGallery) => void;
  onPermanentDelete: (gallery: MinimalGallery) => void;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [nowMs] = useState(() => Date.now());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const rows = useMemo(
    () =>
      galleries.filter((gallery) =>
        gallery.name.toLowerCase().includes(deferredQuery.trim().toLowerCase())
      ),
    [galleries, deferredQuery]
  );

  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <div className="overflow-x-auto border-b border-gray-200 px-3 py-3 md:px-4">
        <div className="grid min-w-200 grid-cols-[minmax(220px,1fr)_70px_84px_132px_132px_220px_44px] items-center gap-3 text-sm text-gray-500">
          <label className="relative block">
            <Search
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-blue-500"
            />
            <input
              placeholder="Search archived events"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-full border border-gray-200 bg-white pl-4 pr-9 text-sm text-gray-800 outline-none transition focus:border-blue-400"
            />
          </label>

          <HeaderTooltip label="Number of visits">
            <div className="flex items-center justify-center text-gray-500">
              <Activity size={15} />
            </div>
          </HeaderTooltip>
          <HeaderTooltip label="Number of downloads">
            <div className="flex items-center justify-center text-gray-500">
              <Download size={15} />
            </div>
          </HeaderTooltip>
          <div className="font-medium text-gray-700">Created</div>
          <div className="font-medium text-gray-700">Deleted</div>
          <div />
          <div />
        </div>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {rows.map((gallery, index) => {
          const deletedAt = gallery.deletedAt ? new Date(gallery.deletedAt) : null;
          const canRestore = deletedAt
            ? (nowMs - deletedAt.getTime()) / (1000 * 60 * 60 * 24) <= 7
            : false;
          return (
            <div
              key={`${gallery.id}-${gallery.deletedAt ?? "active"}-${index}`}
              className="rounded-lg border border-slate-200 bg-white p-3"
            >
              <p className="text-sm font-semibold text-slate-900">{gallery.name}</p>
              <p className="mt-1 text-xs text-slate-500">{getMetaLine(gallery)}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
                <span>Visits: {gallery.visitors ?? 0}</span>
                <span>Downloads: {gallery.downloads ?? 0}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {canRestore ? (
                  <button
                    type="button"
                    onClick={() => onRestore(gallery)}
                    className="h-8 rounded-md border border-gray-400 px-4 text-xs font-medium text-gray-900"
                  >
                    Restore
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onPermanentDelete(gallery)}
                  className="h-8 rounded-md border border-red-300 px-4 text-xs font-medium text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden h-50 overflow-x-auto md:block">
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-sm text-gray-500">No events in archive.</div>
        ) : (
          rows.map((gallery, index) => {
            const deletedAt = gallery.deletedAt ? new Date(gallery.deletedAt) : null;
            const canRestore = deletedAt
              ? (nowMs - deletedAt.getTime()) / (1000 * 60 * 60 * 24) <= 7
              : false;

            return (
              <div
                key={`${gallery.id}-${gallery.deletedAt ?? "active"}-${index}`}
                className="grid min-w-230 grid-cols-[minmax(220px,1fr)_70px_84px_132px_132px_220px_44px] items-center gap-3 border-b border-gray-100 px-3 py-3 text-sm last:border-b-0 md:px-4"
              >
                <div>
                  <p className="text-[15px] font-medium text-gray-900">{gallery.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{getMetaLine(gallery)}</p>
                </div>

                <div className="text-center text-sm text-gray-700">{gallery.visitors ?? 0}</div>
                <div className="text-center text-sm text-gray-700">{gallery.downloads ?? 0}</div>
                <div className="text-sm text-gray-700">{formatDate(gallery.createdAt)}</div>
                <div className="text-sm text-gray-700">{formatDate(gallery.deletedAt)}</div>

                <div className="flex justify-start">
                  {canRestore ? (
                    <button
                      type="button"
                      onClick={() => onRestore(gallery)}
                      className="h-9 rounded-md border border-gray-400 px-6 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                    >
                      Restore
                    </button>
                  ) : (
                    <p className="text-sm leading-5 text-gray-400">
                      Not restorable: deleted
                      <br />
                      more than 7 days ago
                    </p>
                  )}
                </div>

                <div className="relative flex justify-end" ref={openMenuId === gallery.id ? menuRef : null}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenuId((prev) => (prev === gallery.id ? null : gallery.id))
                    }
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                    aria-label="More options"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {openMenuId === gallery.id && (
                    <div className="absolute right-0 top-10 z-20 w-60 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          onPermanentDelete(gallery);
                          setOpenMenuId(null);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-500 transition hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                        <span className="text-base font-medium">Delete permanently</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
