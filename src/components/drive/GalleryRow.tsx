"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Copy,
  Heart,
  Image as ImageIcon,
  Link,
  MoreVertical,
  Pin,
  QrCode,
  Settings,
  Share2,
  Trash2,
} from "lucide-react";
import { MinimalGallery } from "../../types/DriveTableTypes";

function GalleryRow({
  gallery,
  grid,
  onOpen,
  onPrefetch,
  onSettings,
  onOpenQr,
  onPinToggle,
  onDuplicate,
  onDelete,
  onReorder,
}: {
  gallery: MinimalGallery;
  grid: string;
  onOpen: () => void;
  onPrefetch?: () => void;
  onSettings: () => void;
  onOpenQr: () => void;
  onPinToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReorder: (draggedId: string, targetId: string) => void;
}) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const shareRef = useRef<HTMLDivElement | null>(null);
  const actionRef = useRef<HTMLDivElement | null>(null);
  const prefetchedRef = useRef(false);

  const created = gallery.createdAt
    ? new Date(gallery.createdAt).toLocaleDateString()
    : "-";

  const expires = gallery.expiresAt
    ? new Date(gallery.expiresAt).toLocaleDateString()
    : gallery.storageTimeLabel ?? "-";

  const favoritesEnabled = Boolean(gallery.favoritesEnabled);
  const hasFavoritesSelection = (gallery.favoritesListsCount ?? 0) > 0;
  const showHeartIcon = favoritesEnabled;

  const favoritesListsCount = gallery.favoritesListsCount ?? 0;
  const selectionCompletedCount = gallery.selectionCompletedCount ?? 0;
  const filesLimitForSelection =
    gallery.favoritesMaxSelected == null
      ? "∞"
      : String(gallery.favoritesMaxSelected);

  useEffect(() => {
    function closeMenus(ev: MouseEvent) {
      const target = ev.target as Node;

      if (shareRef.current && !shareRef.current.contains(target)) {
        setShowShareMenu(false);
      }

      if (actionRef.current && !actionRef.current.contains(target)) {
        setShowActionMenu(false);
      }
    }

    document.addEventListener("mousedown", closeMenus);
    return () => document.removeEventListener("mousedown", closeMenus);
  }, []);

  const tryPrefetch = () => {
    if (!onPrefetch || prefetchedRef.current) return;
    prefetchedRef.current = true;
    onPrefetch();
  };

  return (
    <div
      className={`${grid} items-center px-4 py-5 border-b hover:bg-gray-50 ${isDragOver ? "bg-blue-50" : ""}`}
      onMouseEnter={tryPrefetch}
      onTouchStart={tryPrefetch}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const draggedId = e.dataTransfer.getData("text/gallery-id");
        if (draggedId && draggedId !== gallery.id) {
          onReorder(draggedId, gallery.id);
        }
      }}
    >
      <div
        className="text-gray-400 cursor-move"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/gallery-id", gallery.id);
          e.dataTransfer.effectAllowed = "move";
        }}
      >
        ↕
      </div>

      <div className="w-4 h-4 rounded-full border border-gray-400" />

      <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
        {gallery.coverUrl || gallery.firstPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gallery.coverUrl ?? gallery.firstPhotoUrl ?? ""}
            alt={gallery.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-gray-300">IMG</span>
        )}
      </div>

      <div>
        <div className="group relative inline-block">
          <p
            className="font-medium cursor-pointer"
            onMouseEnter={tryPrefetch}
            onFocus={tryPrefetch}
            onClick={onOpen}
          >
            {gallery.name}
          </p>
          <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-800 px-3 py-1.5 text-sm font-semibold text-white shadow-md group-hover:block">
            {gallery.name}
            <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gray-800" />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          <span className="group relative inline-block">
            {created}
            <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-800 px-3 py-1.5 text-sm font-semibold text-white shadow-md group-hover:block">
              Shoot date
              <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gray-800" />
            </span>
          </span>{" "}
          • {gallery.filesCount ?? 0} files{gallery.totalSize ? ` (${gallery.totalSize})` : ""}
        </p>
      </div>

      <div className="text-left">{gallery.visitors ?? 0}</div>

      <div className="text-left">{gallery.downloads ?? 0}</div>

      <div className="relative flex justify-start">
        <div className="group relative inline-flex items-center">
          {showHeartIcon ? (
            <Heart className={`w-5 h-5 ${hasFavoritesSelection ? "text-red-500" : "text-slate-700"}`} />
          ) : (
            <ImageIcon className="w-5 h-5 text-gray-700" />
          )}

          <div className="hidden group-hover:block absolute top-1/2 left-full -translate-y-1/2 ml-4 z-20">
            <div className="absolute -left-1.25 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-45 border-l border-b border-gray-200" />

            {!showHeartIcon ? (
              <div className="bg-white border border-gray-200 shadow-lg rounded-lg px-5 py-4 whitespace-nowrap text-lg font-semibold text-gray-800">
                Client event
              </div>
            ) : (
              <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-5 min-w-50 text-sm text-gray-700">
                <p className="font-semibold text-gray-800 mb-4 text-xl">
                  {"Favorites lists"}
                </p>

                <div className="space-y-3">
                  <div className="flex justify-between gap-6">
                    <span>Total favorites lists</span>
                    <span className="text-gray-500">{favoritesListsCount}</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span>With selection completed</span>
                    <span className="text-gray-500">{selectionCompletedCount}</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span>Files limit for selection</span>
                    <span className="text-gray-500">{filesLimitForSelection}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-left">{expires}</div>

      <div className="relative" ref={shareRef}>
        <div className="group relative inline-flex">
          <button
            type="button"
            onClick={() => {
              setShowShareMenu((v) => !v);
              setShowActionMenu(false);
            }}
            className="w-10 h-10 rounded-full hover:bg-gray-100 inline-flex items-center justify-center"
          >
            <Share2 size={18} className="text-gray-500" />
          </button>
          {!showShareMenu ? (
            <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-800 px-3 py-1.5 text-sm font-semibold text-white shadow-md group-hover:block">
              Share event
              <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gray-800" />
            </span>
          ) : null}
        </div>

        {showShareMenu && (
          <div className="absolute right-0 bottom-11 z-20 w-60 bg-white border border-gray-200 shadow-lg rounded-xl py-2">
            <MenuRow icon={<Link size={18} />} label="Copy link" />
            <MenuRow icon={<QrCode size={18} />} label="Download QR code" />
            <div className="border-t my-1" />
            <MenuRow icon={<SocialDot className="bg-blue-700" text="f" />} label="Facebook" />
            <MenuRow icon={<SocialDot className="bg-green-500" text="w" />} label="WhatsApp" />
            <MenuRow icon={<SocialDot className="bg-sky-500" text="t" />} label="Telegram" />
            <MenuRow icon={<SocialDot className="bg-purple-700" text="v" />} label="Viber" />
          </div>
        )}
      </div>

      <div className="relative text-right" ref={actionRef}>
        <button
          type="button"
          onClick={() => {
            setShowActionMenu((v) => !v);
            setShowShareMenu(false);
          }}
          className="w-10 h-10 rounded-full hover:bg-gray-100 inline-flex items-center justify-center"
        >
          <MoreVertical size={18} className="text-gray-600" />
        </button>

        {showActionMenu && (
          <div className="absolute right-0 bottom-11 z-20 w-64 bg-white border border-gray-200 shadow-lg rounded-xl py-2 text-left">
            <ActionRow
              icon={<Settings size={18} />}
              label="Settings"
              onClick={() => {
                setShowActionMenu(false);
                onSettings();
              }}
            />
            <ActionRow
              icon={<QrCode size={18} />}
              label="Open in One QR"
              onClick={() => {
                setShowActionMenu(false);
                onOpenQr();
              }}
            />
            <ActionRow
              icon={<Pin size={18} />}
              label={gallery.pinned ? "Unpin event" : "Pin event"}
              onClick={() => {
                setShowActionMenu(false);
                onPinToggle();
              }}
            />
            <ActionRow
              icon={<Copy size={18} />}
              label="Duplicate event"
              onClick={() => {
                setShowActionMenu(false);
                onDuplicate();
              }}
            />
            <ActionRow
              icon={<Trash2 size={18} className="text-red-500" />}
              label="Delete event"
              className="text-red-500"
              onClick={() => {
                setShowActionMenu(false);
                onDelete();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MenuRow({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button className="w-full px-5 py-2.5 flex items-center gap-3 hover:bg-gray-50 text-gray-700 text-sm">
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function ActionRow({
  icon,
  label,
  className,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-5 py-2.5 flex items-center gap-3 hover:bg-gray-50 text-gray-700 text-sm ${
        className ?? ""
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function SocialDot({
  className,
  text,
}: {
  className: string;
  text: string;
}) {
  return (
    <span
      className={`w-6 h-6 rounded-full text-white text-xs font-semibold inline-flex items-center justify-center ${className}`}
    >
      {text.toUpperCase()}
    </span>
  );
}

export default memo(GalleryRow);
