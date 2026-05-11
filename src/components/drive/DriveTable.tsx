"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  ArrowUpDown,
  Eye,
  PlusCircle,
  QrCode,
  Settings,
  Trash2,
  Upload,
  UserRoundPlus,
  Pin,
  Copy,
  MoreVertical,
  BadgeCheck,
  BadgeMinus,
  Store,
  Archive,
  Search,
  LayoutGrid,
} from "lucide-react";
import SortDropdown from "./SortDropdown";
import { MinimalGallery } from "../../types/DriveTableTypes";

type SortField =
  | "title"
  | "size"
  | "shootingDate"
  | "createdAt"
  | "expiresAt"
  | "flag"
  | "downloads";

type SortOrder = "asc" | "desc";

type EventFilter = "all" | "published" | "unpublished" | "expired" | "photoSelling";

function formatDate(value?: string | null) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getProgress(gallery: MinimalGallery) {
  const files = gallery.filesCount ?? 0;
  const visitors = gallery.visitors ?? 0;
  const downloads = gallery.downloads ?? 0;
  return Math.max(18, Math.min(97, 30 + files * 4 + visitors * 2 + downloads * 2));
}

function isExpired(gallery: MinimalGallery) {
  if (!gallery.expiresAt) return false;
  const expiresAtTs = new Date(gallery.expiresAt).getTime();
  if (Number.isNaN(expiresAtTs)) return false;
  return expiresAtTs < Date.now();
}

export default function DriveTable({
  galleries,
  trashCount,
  onAdd,
  onOpenBin,
  onSettings,
  onOpenQr,
  onPinToggle,
  onPublishToggle,
  onPhotoSellingToggle,
  onDuplicate,
  onDelete,
  onReorder,
  onOpen,
}: {
  galleries: MinimalGallery[];
  trashCount: number;
  onAdd: () => void;
  onOpenBin: () => void;
  onSettings: (gallery: MinimalGallery) => void;
  onOpenQr: (gallery: MinimalGallery) => void;
  onPinToggle: (gallery: MinimalGallery) => void;
  onPublishToggle: (gallery: MinimalGallery) => void;
  onPhotoSellingToggle: (gallery: MinimalGallery) => void;
  onDuplicate: (gallery: MinimalGallery) => void;
  onDelete: (gallery: MinimalGallery) => void;
  onReorder: (draggedId: string, targetId: string) => void;
  onOpen?: (gallery: MinimalGallery) => void;
}) {
  const [openSort, setOpenSort] = useState(false);
  const [field, setField] = useState<SortField>("createdAt");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [query, setQuery] = useState("");
  const [sortingEnabled, setSortingEnabled] = useState(false);
  const [activeFilter, setActiveFilter] = useState<EventFilter>("all");
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const onDocClick = (event: globalThis.MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-sort-wrap]")) {
        setOpenSort(false);
      }
      if (!target.closest("[data-event-menu]")) {
        setOpenMenuFor(null);
      }
    };
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenSort(false);
        setOpenMenuFor(null);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const filteredAndSorted = useMemo(() => {
    const filteredByQuery = galleries.filter((gallery) =>
      gallery.name.toLowerCase().includes(deferredQuery.toLowerCase())
    );

    const filteredByTab = filteredByQuery.filter((gallery) => {
      if (activeFilter === "published") return gallery.published ?? true;
      if (activeFilter === "unpublished") return !(gallery.published ?? true);
      if (activeFilter === "expired") return isExpired(gallery);
      if (activeFilter === "photoSelling") return Boolean(gallery.photoSellingEnabled);
      return true;
    });

    if (!sortingEnabled) return filteredByTab;

    return [...filteredByTab].sort((a, b) => {
      const dir = order === "asc" ? 1 : -1;

      switch (field) {
        case "title":
          return a.name.localeCompare(b.name) * dir;
        case "size":
          return ((a.filesCount ?? 0) - (b.filesCount ?? 0)) * dir;
        case "shootingDate":
        case "createdAt":
          return (
            (new Date(a.startDate ?? a.createdAt ?? 0).getTime() -
              new Date(b.startDate ?? b.createdAt ?? 0).getTime()) *
            dir
          );
        case "expiresAt":
          return (
            (new Date(a.expiresAt ?? 0).getTime() - new Date(b.expiresAt ?? 0).getTime()) * dir
          );
        case "flag":
          return (Number(Boolean(a.pinned)) - Number(Boolean(b.pinned))) * dir;
        case "downloads":
          return ((a.downloads ?? 0) - (b.downloads ?? 0)) * dir;
        default:
          return 0;
      }
    });
  }, [activeFilter, deferredQuery, field, galleries, order, sortingEnabled]);

  const counters = useMemo(() => {
    return {
      all: galleries.length,
      published: galleries.filter((gallery) => gallery.published ?? true).length,
      unpublished: galleries.filter((gallery) => !(gallery.published ?? true)).length,
      expired: galleries.filter((gallery) => isExpired(gallery)).length,
      photoSelling: galleries.filter((gallery) => Boolean(gallery.photoSellingEnabled)).length,
    };
  }, [galleries]);

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-[min(420px,90vw)]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a735f]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by event name"
              className="h-11 w-full rounded-2xl border border-[#ead7c5] bg-[#fffdf8] pl-10 pr-4 text-sm text-[#3a2112] outline-none focus:border-[#7a3f13]"
            />
          </div>

          <div className="relative" data-sort-wrap>
            <button
              type="button"
              onClick={() => setOpenSort((current) => !current)}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#ead7c5] bg-white px-4 text-sm font-semibold text-[#6d4426] transition hover:bg-[#fff7ee]"
            >
              <ArrowUpDown className="h-4 w-4" />
              Sort By
            </button>
            {openSort ? (
              <SortDropdown
                field={field}
                order={order}
                onFieldChange={(nextField) => {
                  setField(nextField);
                  setSortingEnabled(true);
                }}
                onOrderChange={(nextOrder) => {
                  setOrder(nextOrder);
                  setSortingEnabled(true);
                }}
              />
            ) : null}
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#ead7c5] bg-white text-[#6d4426]"
            aria-label="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#5b2b0c] px-5 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(91,43,12,0.2)] transition hover:bg-[#7a3f13]"
        >
          <PlusCircle className="h-4 w-4" />
          Create Event
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eadccf] pb-2">
        <div className="flex flex-wrap items-center gap-5 text-sm font-medium text-[#7a6a55]">
          {[
            { key: "all", label: "All", count: counters.all },
            { key: "published", label: "Published", count: counters.published },
            { key: "unpublished", label: "Unpublished", count: counters.unpublished },
            { key: "expired", label: "Expired", count: counters.expired },
            { key: "photoSelling", label: "Photo Selling", count: counters.photoSelling },
          ].map((item) => {
            const active = activeFilter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveFilter(item.key as EventFilter)}
                className={`border-b-2 pb-2 transition ${
                  active ? "border-[#2a170d] text-[#2a170d]" : "border-transparent hover:text-[#2a170d]"
                }`}
              >
                {item.label} <span className="text-xs text-[#a0866e]">({item.count})</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onOpenBin}
          className="inline-flex items-center gap-2 rounded-xl border border-[#f1d9dc] bg-[#fff7f8] px-3 py-1.5 text-sm font-semibold text-[#ca3150] transition hover:bg-[#ffeef1]"
        >
          <Archive className="h-4 w-4" />
          Bin
          {trashCount > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#ca3150] px-1 text-[10px] text-white">
              {trashCount}
            </span>
          ) : null}
        </button>
      </div>

      {filteredAndSorted.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#ead7c5] bg-white px-6 py-14 text-center">
          <p className="text-xl font-semibold text-[#2a170d]">No events in this view</p>
          <p className="mt-2 text-sm text-[#7a6a55]">Try a different filter or create a new event.</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {filteredAndSorted.map((gallery) => {
          const progress = getProgress(gallery);
          const isPublished = gallery.published ?? true;
          const cover = gallery.coverUrl ?? gallery.firstPhotoUrl ?? null;
          const eventDate = gallery.startDate ?? gallery.createdAt;
          const cardStatus = isExpired(gallery)
            ? "expired"
            : isPublished
              ? "published"
              : "unpublished";

          return (
            <article
              key={gallery.id}
              className={`cursor-pointer overflow-hidden rounded-3xl border bg-[#fffdf8] shadow-[0_14px_35px_rgba(73,39,20,0.07)] ${
                dragOverId === gallery.id ? "border-[#7a3f13]" : "border-[#eadccf]"
              }`}
              onClick={() => onOpen?.(gallery)}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("text/gallery-id", gallery.id);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverId(gallery.id);
              }}
              onDragLeave={() => setDragOverId((prev) => (prev === gallery.id ? null : prev))}
              onDrop={(event) => {
                event.preventDefault();
                setDragOverId(null);
                const draggedId = event.dataTransfer.getData("text/gallery-id");
                if (draggedId && draggedId !== gallery.id) {
                  onReorder(draggedId, gallery.id);
                }
              }}
            >
              <div className="relative h-64 overflow-hidden border-b border-[#f0e4d7] bg-[#f6eadb]">
                {cover ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-xl" />
                    <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(122,63,19,0.16),rgba(255,250,244,0.18))]" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cover}
                      alt={gallery.name}
                      className="relative z-0 h-full w-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(122,63,19,0.14),rgba(185,120,59,0.18))]" />
                )}
                <div className="absolute left-4 top-4 flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      cardStatus === "published"
                        ? "bg-[#f4e5d3] text-[#7a3f13]"
                        : cardStatus === "expired"
                          ? "bg-[#fff0f3] text-[#c6234a]"
                          : "bg-[#f3f5f8] text-[#4a5f74]"
                    }`}
                  >
                    {cardStatus}
                  </span>
                  {gallery.photoSellingEnabled ? (
                    <span className="rounded-full bg-[#fff6eb] px-3 py-1 text-xs font-semibold text-[#aa5b12]">
                      photo selling
                    </span>
                  ) : null}
                </div>

                {gallery.pinned ? (
                   <button
                     type="button"
                     onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                       e.stopPropagation();
                       onPinToggle(gallery);
                     }}
                    className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#7a3f13]"
                    title="Unpin event"
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                ) : (
                   <button
                     type="button"
                     onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                       e.stopPropagation();
                       onPinToggle(gallery);
                     }}
                    className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white"
                    title="Pin event"
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <h3 className="font-display text-[2rem] font-bold leading-none text-[#2a170d]">{gallery.name}</h3>
                  <p className="mt-2 text-sm text-[#7a6a55]">{formatDate(eventDate)}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#fff1df] px-2 py-1 font-semibold text-[#7a3f13]">
                    <Upload className="h-3.5 w-3.5" />
                    {gallery.filesCount ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#f7ecdd] px-2 py-1 font-semibold text-[#9b5a24]">
                    <Eye className="h-3.5 w-3.5" />
                    {gallery.downloads ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#f5eadb] px-2 py-1 font-semibold text-[#7a4a23]">
                    <UserRoundPlus className="h-3.5 w-3.5" />
                    {gallery.visitors ?? 0}
                  </span>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-[#7a6a55]">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#f2e4d6]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#7a3f13] to-[#b9783b]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_repeat(4,40px)] items-center gap-2">
                  <button
                    type="button"
                    onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      onOpenQr(gallery);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#ead7c5] bg-white px-4 py-2 text-sm font-semibold text-[#5b3a23] transition hover:border-[#7a3f13] hover:text-[#7a3f13]"
                  >
                    <QrCode className="h-4 w-4" />
                    Open One QR
                  </button>
                  <button
                    type="button"
                    onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      onOpenQr(gallery);
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#eadccf] bg-white text-[#6d4426] hover:border-[#7a3f13] hover:text-[#7a3f13]"
                    title="Open in One QR"
                  >
                    <QrCode className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      onSettings(gallery);
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#eadccf] bg-white text-[#6d4426] hover:border-[#7a3f13] hover:text-[#7a3f13]"
                    title="Edit event"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      onDelete(gallery);
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#f1d9dc] bg-[#fff7f8] text-[#cf224d] hover:border-[#ea9fb0]"
                    title="Delete event"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="relative" data-event-menu>
                      <button
                        type="button"
                        onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          setOpenMenuFor((current) => (current === gallery.id ? null : gallery.id));
                        }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#eadccf] bg-white text-[#6d4426] hover:border-[#7a3f13] hover:text-[#7a3f13]"
                      title="More actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenuFor === gallery.id ? (
                      <div className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-xl border border-[#ead7c5] bg-white shadow-lg">
                        <button
                          type="button"
                          onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            setOpenMenuFor(null);
                            onPublishToggle(gallery);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#5b3a23] hover:bg-[#fff7ee]"
                        >
                          {isPublished ? <BadgeMinus className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
                          {isPublished ? "Move to Unpublished" : "Publish Event"}
                        </button>
                        <button
                          type="button"
                          onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            setOpenMenuFor(null);
                            onPhotoSellingToggle(gallery);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#5b3a23] hover:bg-[#fff7ee]"
                        >
                          <Store className="h-4 w-4" />
                          {gallery.photoSellingEnabled ? "Disable Photo Selling" : "Enable Photo Selling"}
                        </button>
                        <button
                          type="button"
                          onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            setOpenMenuFor(null);
                            onPinToggle(gallery);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#5b3a23] hover:bg-[#fff7ee]"
                        >
                          <Pin className="h-4 w-4" />
                          {gallery.pinned ? "Unpin Event" : "Pin Event"}
                        </button>
                        <button
                          type="button"
                          onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            setOpenMenuFor(null);
                            onDuplicate(gallery);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#5b3a23] hover:bg-[#fff7ee]"
                        >
                          <Copy className="h-4 w-4" />
                          Duplicate Event
                        </button>
                        <button
                          type="button"
                          onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            setOpenMenuFor(null);
                            onDelete(gallery);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#cf224d] hover:bg-[#fff1f4]"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Event
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
