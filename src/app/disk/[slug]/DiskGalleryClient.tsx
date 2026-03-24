"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowsPointingInIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ShareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { HeartIcon as HeartOutlineIcon } from "@heroicons/react/24/outline";
import { getGalleryMeta, saveGalleryMeta } from "@/lib/gallery-meta-storage";

type GalleryPhoto = {
  id: string;
  name: string;
  url: string;
};

type Folder = {
  id: string;
  name: string;
  description: string;
  hidden: boolean;
  createdAt: string;
};

type DiskGalleryClientProps = {
  galleryId: string;
  gallerySlug: string;
  galleryName: string;
  ownerName: string;
  expiresAt: string;
  coverUrl: string | null;
  initialPhotos: GalleryPhoto[];
  totalPhotos: number;
  initialCursor: string | null;
  hostLabel: string;
  formatHeaderDate: string;
};

type ClientFavoritesSelection = {
  name: string;
  email: string;
  photoIds: string[];
};

type ClientIdentity = {
  name: string;
  email: string;
};

const CLIENT_FAVORITES_PREFIX = "wf_client_favorites:";
const CLIENT_PROFILE_PREFIX = "wf_client_profile:";
const FAVORITES_LIST_STORAGE_PREFIX = "wf_gallery_favorites_lists:";
const FOLDER_STORAGE_PREFIX = "wf_gallery_folders:";
const FOLDER_PHOTOS_PREFIX = "wf_gallery_folder_photos:";
const CLIENT_DOWNLOADS_PREFIX = "wf_client_downloads:";
const CLIENT_KEY_PREFIX = "wf_client_key:";

function formatDateLabel(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function triggerDownload(url: string, name: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = name || "photo";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function readClientSelections(galleryId: string): ClientFavoritesSelection[] {
  try {
    const raw = window.localStorage.getItem(`${CLIENT_FAVORITES_PREFIX}${galleryId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ClientFavoritesSelection[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeClientSelections(galleryId: string, next: ClientFavoritesSelection[]) {
  window.localStorage.setItem(`${CLIENT_FAVORITES_PREFIX}${galleryId}`, JSON.stringify(next));
}

function readClientProfile(galleryId: string): ClientIdentity | null {
  try {
    const raw = window.localStorage.getItem(`${CLIENT_PROFILE_PREFIX}${galleryId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClientIdentity;
    if (!parsed?.name?.trim() || !parsed?.email?.trim()) return null;
    return { name: parsed.name.trim(), email: parsed.email.trim().toLowerCase() };
  } catch {
    return null;
  }
}

function writeClientProfile(galleryId: string, profile: ClientIdentity) {
  window.localStorage.setItem(`${CLIENT_PROFILE_PREFIX}${galleryId}`, JSON.stringify(profile));
}

function readClientDownloads(galleryId: string) {
  try {
    const raw = window.localStorage.getItem(`${CLIENT_DOWNLOADS_PREFIX}${galleryId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeClientDownloads(galleryId: string, next: string[]) {
  window.localStorage.setItem(`${CLIENT_DOWNLOADS_PREFIX}${galleryId}`, JSON.stringify(next));
}

function readFolders(galleryId: string): Folder[] {
  try {
    const raw = window.localStorage.getItem(`${FOLDER_STORAGE_PREFIX}${galleryId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Folder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readFolderPhotos(galleryId: string): Record<string, string[]> {
  try {
    const raw = window.localStorage.getItem(`${FOLDER_PHOTOS_PREFIX}${galleryId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function markDownloaded(galleryId: string, photoIds: string[]) {
  if (photoIds.length === 0) return;
  const current = readClientDownloads(galleryId);
  const next = new Set(current);
  photoIds.forEach((id) => next.add(id));
  writeClientDownloads(galleryId, Array.from(next));
}

function favoritesListExists(galleryId: string, listName: string) {
  if (!listName.trim()) return false;
  try {
    const rawLists = window.localStorage.getItem(`${FAVORITES_LIST_STORAGE_PREFIX}${galleryId}`);
    const parsedLists = rawLists ? (JSON.parse(rawLists) as Array<{ name: string }>) : [];
    return parsedLists.some((list) => list.name === listName.trim());
  } catch {
    return false;
  }
}

function syncDashboardFavorites(
  galleryId: string,
  profile: ClientIdentity,
  selections: ClientFavoritesSelection[]
) {
  try {
    const rawLists = window.localStorage.getItem(`${FAVORITES_LIST_STORAGE_PREFIX}${galleryId}`);
    const parsedLists = rawLists ? (JSON.parse(rawLists) as Array<{ name: string; description: string }>) : [];
    const listExists = parsedLists.some((list) => list.name === profile.name);
    const nextLists = listExists
      ? parsedLists
      : [...parsedLists, { name: profile.name, description: profile.email }];
    window.localStorage.setItem(`${FAVORITES_LIST_STORAGE_PREFIX}${galleryId}`, JSON.stringify(nextLists));

    const selectionCompletedCount = selections.filter((entry) => entry.photoIds.length > 0).length;
    const meta = getGalleryMeta(galleryId);
    saveGalleryMeta(galleryId, {
      expiresAt: meta?.expiresAt ?? null,
      storageTimeLabel: meta?.storageTimeLabel ?? null,
      favoritesEnabled: true,
      favoritesLimitSelected: meta?.favoritesLimitSelected ?? false,
      favoritesName: meta?.favoritesName ?? null,
      favoritesListsCount: nextLists.length,
      selectionCompletedCount,
      favoritesMaxSelected: meta?.favoritesMaxSelected ?? null,
    });
  } catch {
    // Keep UI working even if localStorage is unavailable.
  }
}

export default function DiskGalleryClient({
  galleryId,
  gallerySlug,
  galleryName,
  ownerName,
  expiresAt,
  coverUrl,
  initialPhotos,
  totalPhotos,
  initialCursor,
  hostLabel,
  formatHeaderDate,
}: DiskGalleryClientProps) {
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [favoritesEnabled, setFavoritesEnabled] = useState(false);
  const [favoritesLimitSelected, setFavoritesLimitSelected] = useState(false);
  const [favoritesMaxSelected, setFavoritesMaxSelected] = useState<number | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientIdentity | null>(null);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [pendingLikePhotoId, setPendingLikePhotoId] = useState<string | null>(null);
  const [favoritesLimitMessage, setFavoritesLimitMessage] = useState<string | null>(null);
  const [clientKey, setClientKey] = useState("");
  const [photos, setPhotos] = useState<GalleryPhoto[]>(initialPhotos);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [folderFilterId, setFolderFilterId] = useState<string | null>(null);
  const [hiddenFolderIds, setHiddenFolderIds] = useState<Set<string>>(new Set());
  const [folderPhotosMap, setFolderPhotosMap] = useState<Record<string, string[]>>({});

  const likedCount = useMemo(() => Object.values(liked).filter(Boolean).length, [liked]);
  const selectionLimit = favoritesLimitSelected ? Math.max(1, favoritesMaxSelected ?? 1) : null;
  const hiddenPhotoIds = useMemo(() => {
    if (hiddenFolderIds.size === 0) return new Set<string>();
    const ids = new Set<string>();
    hiddenFolderIds.forEach((folderId) => {
      (folderPhotosMap[folderId] ?? []).forEach((id) => ids.add(id));
    });
    return ids;
  }, [hiddenFolderIds, folderPhotosMap]);

  const folderFilterSet = useMemo(() => {
    if (!folderFilterId) return null;
    const ids = folderPhotosMap[folderFilterId] ?? [];
    return new Set(ids);
  }, [folderFilterId, folderPhotosMap]);

  const visiblePhotos = useMemo(() => {
    return photos.filter((photo) => {
      if (hiddenPhotoIds.has(photo.id)) return false;
      if (folderFilterSet) return folderFilterSet.has(photo.id);
      return true;
    });
  }, [photos, hiddenPhotoIds, folderFilterSet]);

  const activePhoto = activeIndex === null ? null : visiblePhotos[activeIndex] ?? null;
  const hasPhotos = visiblePhotos.length > 0;
  const hasMorePhotos = photos.length < totalPhotos;

  useEffect(() => {
    const syncGalleryMeta = () => {
      const meta = getGalleryMeta(galleryId);
      setFavoritesEnabled(Boolean(meta?.favoritesEnabled));
      setFavoritesLimitSelected(Boolean(meta?.favoritesLimitSelected));
      setFavoritesMaxSelected(meta?.favoritesMaxSelected ?? null);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "wf_gallery_meta") {
        syncGalleryMeta();
      }
    };

    syncGalleryMeta();
    window.addEventListener("storage", handleStorage);

    let key = window.localStorage.getItem(`${CLIENT_KEY_PREFIX}${galleryId}`) ?? "";
    if (!key) {
      const random =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      key = random;
      window.localStorage.setItem(`${CLIENT_KEY_PREFIX}${galleryId}`, key);
    }
    setClientKey(key);

    const profile = readClientProfile(galleryId);
    if (profile) {
      setClientProfile(profile);

      const selections = readClientSelections(galleryId);
      const entry = selections.find((item) => item.name === profile.name);
      if (entry) {
        const likedMap: Record<string, boolean> = {};
        entry.photoIds.forEach((id) => {
          likedMap[id] = true;
        });
        setLiked(likedMap);
      }
    }

    return () => window.removeEventListener("storage", handleStorage);
  }, [galleryId]);

  useEffect(() => {
    if (selectionLimit !== null && likedCount > selectionLimit) {
      setFavoritesLimitMessage(`You can only select ${selectionLimit} photo${selectionLimit === 1 ? "" : "s"} in this gallery.`);
    } else if ((selectionLimit === null || likedCount < selectionLimit) && favoritesLimitMessage) {
      setFavoritesLimitMessage(null);
    }
  }, [likedCount, selectionLimit, favoritesLimitMessage]);

  useEffect(() => {
    const syncFolderState = () => {
      const folders = readFolders(galleryId);
      const hiddenIds = new Set(folders.filter((folder) => folder.hidden).map((folder) => folder.id));
      setHiddenFolderIds(hiddenIds);
      setFolderPhotosMap(readFolderPhotos(galleryId));
    };

    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const folderParam = urlParams?.get("folder");
    setFolderFilterId(folderParam && folderParam !== "photos" ? folderParam : null);

    syncFolderState();

    const handleStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (event.key.startsWith(FOLDER_STORAGE_PREFIX) || event.key.startsWith(FOLDER_PHOTOS_PREFIX)) {
        syncFolderState();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [galleryId]);

  const recordClientActions = async (
    actions: Array<{
      photoId: string;
      action: "favorite" | "download";
      liked?: boolean;
      clientName?: string;
      clientEmail?: string;
    }>
  ) => {
    if (!clientKey || actions.length === 0) return;
    try {
      await fetch(`/api/galleries/${galleryId}/client-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actions: actions.map((action) => ({
            ...action,
            clientKey,
          })),
        }),
      });
    } catch {
      // Ignore tracking failures to keep UI responsive.
    }
  };

  const persistLikes = (nextLiked: Record<string, boolean>, profile: ClientIdentity) => {
    const selections = readClientSelections(galleryId);
    const selectedIds = Object.keys(nextLiked).filter((id) => nextLiked[id]);
    const hasEntry = selections.some((entry) => entry.name === profile.name);
    const nextSelections = hasEntry
      ? selections.map((entry) =>
          entry.name === profile.name ? { ...entry, email: profile.email, photoIds: selectedIds } : entry
        )
      : [...selections, { name: profile.name, email: profile.email, photoIds: selectedIds }];

    writeClientSelections(galleryId, nextSelections);
    syncDashboardFavorites(galleryId, profile, nextSelections);
  };

  const toggleLike = (id: string) => {
    if (!favoritesEnabled) return;
    setFavoritesLimitMessage(null);
    if (!clientProfile) {
      setPendingLikePhotoId(id);
      setIsIdentityModalOpen(true);
      return;
    }
    if (!favoritesListExists(galleryId, clientProfile.name)) {
      setPendingLikePhotoId(id);
      setNameDraft(clientProfile.name);
      setEmailDraft(clientProfile.email);
      setIsIdentityModalOpen(true);
      return;
    }

    const nextValue = !liked[id];
    if (nextValue && selectionLimit !== null && likedCount >= selectionLimit) {
      setFavoritesLimitMessage(`You can only select ${selectionLimit} photo${selectionLimit === 1 ? "" : "s"} in this gallery.`);
      return;
    }

    setLiked((prev) => {
      const next = { ...prev, [id]: nextValue };
      persistLikes(next, clientProfile);
      return next;
    });
    void recordClientActions([
      {
        photoId: id,
        action: "favorite",
        liked: nextValue,
        clientName: clientProfile.name,
        clientEmail: clientProfile.email,
      },
    ]);
  };

  const onSubmitIdentity = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = nameDraft.trim();
    const email = emailDraft.trim().toLowerCase();
    if (!name || !email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    const profile = { name, email };
    setClientProfile(profile);
    writeClientProfile(galleryId, profile);
    setIsIdentityModalOpen(false);
    setNameDraft("");
    setEmailDraft("");

    if (pendingLikePhotoId) {
      if (!liked[pendingLikePhotoId] && selectionLimit !== null && likedCount >= selectionLimit) {
        setFavoritesLimitMessage(`You can only select ${selectionLimit} photo${selectionLimit === 1 ? "" : "s"} in this gallery.`);
        setPendingLikePhotoId(null);
        return;
      }
      void recordClientActions([
        {
          photoId: pendingLikePhotoId,
          action: "favorite",
          liked: true,
          clientName: profile.name,
          clientEmail: profile.email,
        },
      ]);
      setLiked((prev) => {
        const next = { ...prev, [pendingLikePhotoId]: true };
        persistLikes(next, profile);
        return next;
      });
    } else {
      persistLikes(liked, profile);
    }
    setPendingLikePhotoId(null);
  };

  const onShare = async (url: string) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: galleryName,
          text: galleryName,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
    } catch {
      // Ignore failed share attempts to keep UI flow smooth.
    }
  };

  const onDownloadAll = () => {
    markDownloaded(
      galleryId,
      visiblePhotos.map((photo) => photo.id)
    );
    void recordClientActions(
      visiblePhotos.map((photo) => ({
        photoId: photo.id,
        action: "download",
      }))
    );
    visiblePhotos.forEach((photo) => triggerDownload(photo.url, photo.name));
    setIsDownloadMenuOpen(false);
  };

  const onDownloadFavorites = () => {
    const selected = visiblePhotos.filter((photo) => liked[photo.id]);
    markDownloaded(
      galleryId,
      selected.map((photo) => photo.id)
    );
    void recordClientActions(
      selected.map((photo) => ({
        photoId: photo.id,
        action: "download",
      }))
    );
    selected.forEach((photo) => triggerDownload(photo.url, photo.name));
    setIsDownloadMenuOpen(false);
  };

  const closeLightbox = () => setActiveIndex(null);

  const showNext = () => {
    if (activeIndex === null || visiblePhotos.length === 0) return;
    setActiveIndex((activeIndex + 1) % visiblePhotos.length);
  };

  const showPrevious = () => {
    if (activeIndex === null || visiblePhotos.length === 0) return;
    setActiveIndex((activeIndex - 1 + visiblePhotos.length) % visiblePhotos.length);
  };

  useEffect(() => {
    function onKeyDown(ev: KeyboardEvent) {
      if (activeIndex === null) return;
      if (ev.key === "Escape") closeLightbox();
      if (ev.key === "ArrowRight") showNext();
      if (ev.key === "ArrowLeft") showPrevious();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex]);

  useEffect(() => {
    if (activeIndex === null) return;
    if (activeIndex >= visiblePhotos.length) {
      setActiveIndex(null);
    }
  }, [activeIndex, visiblePhotos.length]);

  const mergePhotos = (existing: GalleryPhoto[], incoming: GalleryPhoto[]) => {
    if (existing.length === 0) return incoming;
    const map = new Map<string, GalleryPhoto>();
    existing.forEach((photo) => map.set(photo.id, photo));
    incoming.forEach((photo) => map.set(photo.id, photo));
    return Array.from(map.values());
  };

  const loadMorePhotos = async () => {
    if (!hasMorePhotos || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const url = new URL(`/api/disk/${gallerySlug}/photos`, window.location.origin);
      url.searchParams.set("take", "60");
      if (nextCursor) url.searchParams.set("cursor", nextCursor);
      const res = await fetch(url.toString());
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || !contentType.includes("application/json")) {
        return;
      }
      const payload = (await res.json()) as { items?: GalleryPhoto[]; nextCursor?: string | null };
      const items = Array.isArray(payload.items) ? payload.items : [];
      setPhotos((prev) => mergePhotos(prev, items));
      setNextCursor(payload.nextCursor ?? null);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!hasMorePhotos) return;
    const target = loadMoreRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMorePhotos();
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMorePhotos, nextCursor]);

  return (
    <div className="min-h-screen bg-[#f7f3ee] text-[#15161a]">
      <section className="relative h-[74vh] min-h-115 w-full overflow-hidden">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={galleryName}
            className="h-full w-full object-cover"
            decoding="async"
          />
        ) : (
          <div className="h-full w-full bg-slate-900" />
        )}
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white">
          <p className="text-xs uppercase tracking-[0.4em] opacity-80">{formatHeaderDate}</p>
          <h1 className="font-display mt-4 text-4xl font-semibold sm:text-6xl">{galleryName}</h1>
          <p className="mt-4 text-sm opacity-90">
            {ownerName} | <span className="underline underline-offset-2">{hostLabel}</span>
          </p>
        </div>
      </section>

      <section className="sticky top-0 z-20 border-b border-white/40 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-end gap-4 px-4 py-4 sm:px-8">
          {favoritesEnabled ? (
            <button className="inline-flex items-center gap-2 text-sm text-[#5f5b55] hover:text-[#15161a]">
              <span>{selectionLimit === null ? likedCount : `${likedCount}/${selectionLimit}`}</span>
              <HeartSolidIcon className="h-4 w-4" />
            </button>
          ) : null}
          <button
            className="inline-flex items-center text-[#5f5b55] hover:text-[#15161a]"
            onClick={() => onShare(window.location.href)}
          >
            <ShareIcon className="h-4 w-4" />
          </button>
          <button className="inline-flex items-center text-[#5f5b55] hover:text-[#15161a]">
            <ChatBubbleOvalLeftEllipsisIcon className="h-4 w-4" />
          </button>
          <span className="text-sm text-[#5f5b55]">Expires on {formatDateLabel(expiresAt)}</span>
          <div className="relative">
            <button
              className="rounded-full bg-[#101114] px-5 py-2.5 text-sm font-semibold text-white"
              onClick={() => setIsDownloadMenuOpen((v) => !v)}
            >
              Download files
            </button>
            {isDownloadMenuOpen ? (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-[#e3d8cc] bg-white p-2 shadow-lg">
                <button
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-[#f7f3ee]"
                  onClick={onDownloadAll}
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  <span>
                    <span className="block font-medium text-[#15161a]">Whole project</span>
                    <span className="block text-xs text-[#8a7f73]">All files and folders</span>
                  </span>
                </button>
                {favoritesEnabled ? (
                  <button
                    className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-[#f7f3ee]"
                    onClick={onDownloadFavorites}
                  >
                    <HeartSolidIcon className="h-4 w-4" />
                    <span>
                      <span className="block font-medium text-[#15161a]">Favorites</span>
                      <span className="block text-xs text-[#8a7f73]">Only liked files</span>
                    </span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        {favoritesEnabled && selectionLimit !== null ? (
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 pb-4 text-sm text-[#5f5b55] sm:px-8">
            <span>
              Select up to {selectionLimit} photo{selectionLimit === 1 ? "" : "s"}.
            </span>
            <span>
              Chosen {likedCount} of {selectionLimit}
            </span>
          </div>
        ) : null}
        {favoritesLimitMessage ? (
          <div className="mx-auto w-full max-w-7xl px-4 pb-4 sm:px-8">
            <div className="rounded-2xl border border-[#d97757]/25 bg-[#fff1eb] px-4 py-3 text-sm text-[#9a4428]">
              {favoritesLimitMessage}
            </div>
          </div>
        ) : null}
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
        {hasPhotos ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {visiblePhotos.map((photo, idx) => {
                const isLiked = Boolean(liked[photo.id]);
                const disableLike = !isLiked && selectionLimit !== null && likedCount >= selectionLimit;
                return (
                  <figure key={photo.id} className="group relative overflow-hidden rounded-[18px] bg-white shadow-sm">
                    <button
                      type="button"
                      className="block w-full"
                      onClick={() => setActiveIndex(idx)}
                      aria-label={`Open ${photo.name}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="aspect-4/3 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                    <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/25" />
                    {favoritesEnabled ? (
                      <div className="absolute right-3 top-3 z-10">
                        <button
                          type="button"
                          className={`rounded-full p-2 text-white shadow-sm backdrop-blur-sm ${
                            isLiked ? "bg-[#d97757]" : "bg-black/60"
                          } ${disableLike ? "cursor-not-allowed opacity-60" : ""}`}
                          onClick={() => toggleLike(photo.id)}
                          disabled={disableLike}
                          aria-label="Favorite photo"
                        >
                          {isLiked ? (
                            <HeartSolidIcon className="h-3.5 w-3.5" />
                          ) : (
                            <HeartOutlineIcon className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ) : null}
                    <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        className="rounded-full bg-black/60 p-2 text-white"
                        onClick={() => onShare(photo.url)}
                        aria-label="Share photo"
                      >
                        <ShareIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="rounded-full bg-black/60 p-2 text-white"
                        onClick={() => {
                          markDownloaded(galleryId, [photo.id]);
                          void recordClientActions([
                            {
                              photoId: photo.id,
                              action: "download",
                            },
                          ]);
                          triggerDownload(photo.url, photo.name);
                        }}
                        aria-label="Download photo"
                      >
                        <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </figure>
                );
              })}
            </div>
            {hasMorePhotos ? (
              <div className="mt-6 flex items-center justify-center text-sm text-[#8a7f73]">
                {isLoadingMore ? "Loading more photos..." : "Scroll to load more"}
              </div>
            ) : null}
            <div ref={loadMoreRef} />
          </>
        ) : (
          <div className="rounded-2xl border border-[#e3d8cc] bg-white px-6 py-12 text-center text-[#8a7f73]">
            No photos uploaded yet.
          </div>
        )}
      </section>

      {activePhoto ? (
        <div className="fixed inset-0 z-50 bg-black/85">
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-4 text-white">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-lg"
              onClick={() => {
                markDownloaded(galleryId, [activePhoto.id]);
                void recordClientActions([
                  {
                    photoId: activePhoto.id,
                    action: "download",
                  },
                ]);
                triggerDownload(activePhoto.url, activePhoto.name);
              }}
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              Download
            </button>
            <div className="flex items-center gap-6">
              {favoritesEnabled ? (
                <button
                  type="button"
                  onClick={() => toggleLike(activePhoto.id)}
                  disabled={!liked[activePhoto.id] && selectionLimit !== null && likedCount >= selectionLimit}
                  className={`${liked[activePhoto.id] ? "text-rose-400" : "text-white"} ${
                    !liked[activePhoto.id] && selectionLimit !== null && likedCount >= selectionLimit
                      ? "cursor-not-allowed opacity-60"
                      : ""
                  }`}
                  aria-label="Favorite photo"
                >
                  {liked[activePhoto.id] ? (
                    <HeartSolidIcon className="h-6 w-6" />
                  ) : (
                    <HeartOutlineIcon className="h-6 w-6" />
                  )}
                </button>
              ) : null}
              <button type="button" onClick={() => onShare(activePhoto.url)} aria-label="Share photo">
                <ShareIcon className="h-6 w-6" />
              </button>
              <button type="button" aria-label="Fit image">
                <ArrowsPointingInIcon className="h-6 w-6" />
              </button>
              <button type="button" onClick={closeLightbox} aria-label="Close">
                <XMarkIcon className="h-7 w-7" />
              </button>
            </div>
          </div>

          <button
            type="button"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/90 hover:text-white"
            onClick={showPrevious}
            aria-label="Previous photo"
          >
            <ArrowLeftIcon className="h-10 w-10" />
          </button>
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/90 hover:text-white"
            onClick={showNext}
            aria-label="Next photo"
          >
            <ArrowRightIcon className="h-10 w-10" />
          </button>

          <div className="flex h-full items-center justify-center px-16 pb-20 pt-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activePhoto.url}
              alt={activePhoto.name}
              className="max-h-full max-w-full object-contain"
              decoding="async"
            />
          </div>
          <p className="absolute inset-x-0 bottom-5 text-center text-3xl text-white/90">{activePhoto.name}</p>
        </div>
      ) : null}

      {isIdentityModalOpen ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-lg rounded-[28px] bg-white px-5 py-7 sm:px-7">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full bg-[#f0e6db] p-2 text-[#6b645c]"
              onClick={() => {
                setIsIdentityModalOpen(false);
                setPendingLikePhotoId(null);
              }}
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <h3 className="font-display text-center text-2xl font-semibold text-[#15161a]">sample</h3>
            <p className="mt-1.5 text-center text-base text-[#8a7f73]">
              {selectionLimit === null
                ? `Available for selection: ${visiblePhotos.length}`
                : `Select up to ${selectionLimit} photo${selectionLimit === 1 ? "" : "s"}`}
            </p>
            <form className="mx-auto mt-5 max-w-md space-y-3.5" onSubmit={onSubmitIdentity}>
              <input
                className="h-12 w-full rounded-full border border-[#d9cfc4] bg-white px-4 text-base"
                placeholder="First name and last name"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                required
              />
              <input
                type="email"
                className="h-12 w-full rounded-full border border-[#d9cfc4] bg-white px-4 text-base"
                placeholder="Email"
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                required
              />
              <div className="flex justify-center pt-2">
                <button
                  type="submit"
                  className="h-12 min-w-48 rounded-full bg-[#101114] px-6 text-lg font-semibold text-white"
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
