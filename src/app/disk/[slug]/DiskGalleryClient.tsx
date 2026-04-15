"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  allowSingleDownload: boolean;
  allowBulkDownload: boolean;
  favoritesEnabled: boolean;
  serverFolders: Folder[];
  serverFolderPhotosMap: Record<string, string[]>;
  hostLabel: string;
  formatHeaderDate: string;
  isLocked: boolean;
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
const CLIENT_DOWNLOADS_PREFIX = "wf_client_downloads:";
const CLIENT_KEY_PREFIX = "wf_client_key:";

function formatDateLabel(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
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
  allowSingleDownload,
  allowBulkDownload,
  favoritesEnabled: serverFavoritesEnabled,
  serverFolders,
  serverFolderPhotosMap,
  hostLabel,
  formatHeaderDate,
  isLocked,
}: DiskGalleryClientProps) {
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [favoritesEnabled, setFavoritesEnabled] = useState(serverFavoritesEnabled);
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
  const [folders, setFolders] = useState<Folder[]>(serverFolders);
  const [hiddenFolderIds, setHiddenFolderIds] = useState<Set<string>>(new Set());
  const [folderPhotosMap, setFolderPhotosMap] = useState<Record<string, string[]>>(serverFolderPhotosMap);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewName, setReviewName] = useState("");
  const [reviewSocialLink, setReviewSocialLink] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

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

  const activeFolderDescription = useMemo(() => {
    if (!folderFilterId) return "";
    return folders.find((folder) => folder.id === folderFilterId)?.description?.trim() ?? "";
  }, [folderFilterId, folders]);

  const activePhoto = activeIndex === null ? null : visiblePhotos[activeIndex] ?? null;
  const hasPhotos = visiblePhotos.length > 0;
  const hasMorePhotos = photos.length < totalPhotos;
  const singleDownloadAllowed = allowSingleDownload;
  const bulkDownloadAllowed = allowBulkDownload;

  const persistLikes = useCallback(
    (nextLiked: Record<string, boolean>, profile: ClientIdentity) => {
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
    },
    [galleryId]
  );

  useEffect(() => {
    if (isLocked) return;
    const syncGalleryMeta = () => {
      const meta = getGalleryMeta(galleryId);
      setFavoritesEnabled(serverFavoritesEnabled && (meta?.favoritesEnabled ?? true));
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

    void (async () => {
      try {
        await fetch(`/api/galleries/${galleryId}/visit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientKey: key,
            clientLocation:
              typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : null,
          }),
        });
      } catch {
        // ignore visit tracking failures
      }
    })();

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
  }, [galleryId, isLocked, serverFavoritesEnabled]);

  useEffect(() => {
    if (isLocked) return;
    if (!clientKey) return;
    let active = true;

    const loadServerFavorites = async () => {
      try {
        const response = await fetch(
          `/api/galleries/${galleryId}/client-actions?clientKey=${encodeURIComponent(clientKey)}&action=favorite`
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          photoIds?: string[];
          clientName?: string | null;
          clientEmail?: string | null;
        };
        if (!active) return;

        const ids = Array.isArray(data.photoIds) ? data.photoIds : [];
        if (ids.length === 0 && !data.clientName && !data.clientEmail) return;

        const storedProfile = readClientProfile(galleryId);
        let profile: ClientIdentity | null = null;
        if (data.clientName?.trim() && data.clientEmail?.trim()) {
          profile = {
            name: data.clientName.trim(),
            email: data.clientEmail.trim().toLowerCase(),
          };
          if (!storedProfile) {
            setClientProfile(profile);
            writeClientProfile(galleryId, profile);
          }
        } else if (storedProfile) {
          profile = storedProfile;
        }

        if (ids.length > 0) {
          const likedFromServer: Record<string, boolean> = {};
          ids.forEach((id) => {
            likedFromServer[id] = true;
          });

          setLiked((prev) => {
            const next = { ...prev, ...likedFromServer };
            if (profile) {
              persistLikes(next, profile);
            }
            return next;
          });
        }
      } catch {
        // Ignore fetch errors.
      }
    };

    void loadServerFavorites();
    return () => {
      active = false;
    };
  }, [clientKey, galleryId, isLocked, persistLikes]);
  useEffect(() => {
    if (selectionLimit !== null && likedCount > selectionLimit) {
      setFavoritesLimitMessage(`You can only select ${selectionLimit} photo${selectionLimit === 1 ? "" : "s"} in this gallery.`);
    } else if ((selectionLimit === null || likedCount < selectionLimit) && favoritesLimitMessage) {
      setFavoritesLimitMessage(null);
    }
  }, [likedCount, selectionLimit, favoritesLimitMessage]);

  useEffect(() => {
    if (isLocked) return;
    setFolders(serverFolders);
    setFolderPhotosMap(serverFolderPhotosMap);
    const hiddenIds = new Set(serverFolders.filter((folder) => folder.hidden).map((folder) => folder.id));
    setHiddenFolderIds(hiddenIds);
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const folderParam = urlParams?.get("folder");
    const validFolderParam =
      folderParam && folderParam !== "photos" && serverFolders.some((folder) => folder.id === folderParam)
        ? folderParam
        : null;
    setFolderFilterId(validFolderParam);
  }, [galleryId, isLocked, serverFolderPhotosMap, serverFolders]);

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

  const openShareModal = (url: string) => {
    setShareUrl(url);
    setShareCopied(false);
    setIsShareModalOpen(true);
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
    } catch {
      setShareCopied(false);
    }
  };

  const openShareWindow = (targetUrl: string) => {
    window.open(targetUrl, "_blank", "noopener,noreferrer,width=720,height=640");
  };

  const submitReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = reviewName.trim();
    const trimmedReview = reviewText.trim();
    const trimmedSocial = reviewSocialLink.trim();

    if (!trimmedName) {
      setReviewError("Please enter your name.");
      return;
    }
    if (trimmedReview.length < 30) {
      setReviewError("Minimum review length - 30 characters.");
      return;
    }
    if (trimmedSocial && !/^https?:\/\//i.test(trimmedSocial)) {
      setReviewError("Add a full social media link starting with http:// or https://");
      return;
    }

    setReviewError(null);
    setReviewSubmitted(true);

      const captureAndSave = async () => {
      let clientLocation: string | null = null;
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        clientLocation = tz || null;
      } catch {
        clientLocation = null;
      }

      try {
        await fetch(`/api/galleries/${galleryId}/reviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewerName: trimmedName,
            text: trimmedReview,
            socialLink: trimmedSocial || null,
            clientLocation,
          }),
        });
      } catch {
        // Ignore review submission failures to keep UI responsive.
      }
    };

    void captureAndSave();
    setReviewName("");
    setReviewSocialLink("");
    setReviewText("");
  };

  const registerDownloadedPhotos = (photoIds: string[]) => {
    if (photoIds.length === 0) return;
    markDownloaded(galleryId, photoIds);
  };

  const downloadSinglePhoto = async (photo: GalleryPhoto) => {
    const url = new URL(`/api/disk/${gallerySlug}/photos`, window.location.origin);
    url.searchParams.set("downloadId", photo.id);
    const response = await fetch(url.toString(), { method: "GET" });
    if (!response.ok) {
      return false;
    }
    const blob = await response.blob();
    triggerBlobDownload(blob, photo.name || "photo");
    return true;
  };

  const downloadServerZip = async (scope: "all" | "favorites") => {
    const url = new URL("/api/disk", window.location.origin);
    url.searchParams.set("action", "download");
    url.searchParams.set("slug", gallerySlug);
    url.searchParams.set("scope", scope);
    if (scope === "favorites") {
      if (!clientKey) return false;
      url.searchParams.set("clientKey", clientKey);
    }
    const response = await fetch(url.toString(), { method: "GET" });
    if (!response.ok) {
      return false;
    }
    const blob = await response.blob();
    const fileName = `${galleryName.replace(/[\\/:*?"<>|]+/g, "-").trim() || "gallery"}-${scope}.zip`;
    triggerBlobDownload(blob, fileName);
    return true;
  };

  const onDownloadAll = () => {
    if (!bulkDownloadAllowed) return;
    const photoIds = visiblePhotos.map((photo) => photo.id);
    registerDownloadedPhotos(photoIds);
    void recordClientActions(photoIds.map((photoId) => ({ photoId, action: "download" })));
    void (async () => {
      const ok = await downloadServerZip("all");
      if (!ok) {
        for (const photo of visiblePhotos) {
          await downloadSinglePhoto(photo);
        }
      }
      setIsDownloadMenuOpen(false);
    })();
  };

  const onDownloadFavorites = () => {
    if (!bulkDownloadAllowed) return;
    const selected = visiblePhotos.filter((photo) => liked[photo.id]);
    const photoIds = selected.map((photo) => photo.id);
    registerDownloadedPhotos(photoIds);
    void recordClientActions(photoIds.map((photoId) => ({ photoId, action: "download" })));
    void (async () => {
      const ok = await downloadServerZip("favorites");
      if (!ok) {
        for (const photo of selected) {
          await downloadSinglePhoto(photo);
        }
      }
      setIsDownloadMenuOpen(false);
    })();
  };

  const closeLightbox = useCallback(() => setActiveIndex(null), []);

  const showNext = useCallback(() => {
    if (activeIndex === null || visiblePhotos.length === 0) return;
    setActiveIndex((activeIndex + 1) % visiblePhotos.length);
  }, [activeIndex, visiblePhotos.length]);

  const showPrevious = useCallback(() => {
    if (activeIndex === null || visiblePhotos.length === 0) return;
    setActiveIndex((activeIndex - 1 + visiblePhotos.length) % visiblePhotos.length);
  }, [activeIndex, visiblePhotos.length]);

  useEffect(() => {
    function onKeyDown(ev: KeyboardEvent) {
      if (activeIndex === null) return;
      if (ev.key === "Escape") closeLightbox();
      if (ev.key === "ArrowRight") showNext();
      if (ev.key === "ArrowLeft") showPrevious();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, closeLightbox, showNext, showPrevious]);

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

  const loadMorePhotos = useCallback(async () => {
    if (isLocked) return;
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
  }, [gallerySlug, hasMorePhotos, isLoadingMore, isLocked, nextCursor]);

  useEffect(() => {
    if (isLocked) return;
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
  }, [hasMorePhotos, isLocked, loadMorePhotos]);

  const onUnlockGallery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pinValue.trim()) {
      setUnlockError("PIN is required.");
      return;
    }
    setUnlocking(true);
    setUnlockError(null);
    try {
      const response = await fetch("/api/disk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unlock",
          slug: gallerySlug,
          pin: pinValue.trim(),
        }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !data?.ok) {
        setUnlockError(data?.error ?? "Unable to unlock gallery.");
        return;
      }
      window.location.reload();
    } catch {
      setUnlockError("Unable to unlock gallery.");
    } finally {
      setUnlocking(false);
    }
  };

  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#f4faf7] text-[#10221d]">
        <section className="relative h-[54vh] min-h-96 w-full overflow-hidden">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt={galleryName} className="h-full w-full object-cover" decoding="async" />
          ) : (
            <div className="h-full w-full bg-slate-900" />
          )}
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white">
            <p className="text-xs uppercase tracking-[0.4em] opacity-80">{formatHeaderDate}</p>
            <h1 className="font-display mt-4 text-4xl font-semibold sm:text-6xl">{galleryName}</h1>
            <p className="mt-4 text-sm opacity-90">
              {ownerName} | <span className="underline underline-offset-2">{hostLabel}</span>
            </p>
          </div>
        </section>
        <section className="mx-auto mt-10 w-full max-w-lg rounded-3xl border border-[#d8e9e2] bg-white p-8 shadow-[0_18px_38px_rgba(15,118,110,0.16)]">
          <h2 className="text-center text-2xl font-semibold text-[#123229]">Enter Gallery PIN</h2>
          <p className="mt-2 text-center text-sm text-[#5c7d72]">
            This gallery is protected. Enter the event PIN to continue.
          </p>
          <form className="mt-6 space-y-4" onSubmit={onUnlockGallery}>
            <input
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value)}
              placeholder="PIN"
              className="h-12 w-full rounded-xl border border-[#d8e9e2] px-4 text-base outline-none focus:border-[#0f766e]"
              autoComplete="one-time-code"
              inputMode="numeric"
            />
            {unlockError ? <p className="text-sm text-[#c2410c]">{unlockError}</p> : null}
            <button
              type="submit"
              disabled={unlocking}
              className="h-12 w-full rounded-xl bg-[#0f766e] px-6 text-base font-semibold text-white transition hover:bg-[#115e59] disabled:opacity-60"
            >
              {unlocking ? "Unlocking..." : "Unlock Gallery"}
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4faf7] text-[#10221d]">
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

      <section className="sticky top-0 z-20 border-b border-[#d8e9e2] bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-end gap-4 px-4 py-4 sm:px-8">
          {favoritesEnabled ? (
            <button
              type="button"
              className="inline-flex items-center text-[#4f6d63] hover:text-[#0f766e]"
              onClick={() => setIsIdentityModalOpen(true)}
              aria-label="Favorites"
            >
              <HeartOutlineIcon className="h-6 w-6" />
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex items-center text-[#4f6d63] hover:text-[#0f766e]"
            onClick={() => openShareModal(window.location.href)}
            aria-label="Share gallery"
          >
            <ShareIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            className="inline-flex items-center text-[#4f6d63] hover:text-[#0f766e]"
            onClick={() => {
              setReviewSubmitted(false);
              setReviewError(null);
              setIsReviewModalOpen(true);
            }}
            aria-label="Leave review"
          >
            <ChatBubbleOvalLeftEllipsisIcon className="h-6 w-6" />
          </button>
          <span className="rounded-full border border-[#d3e6de] bg-[#eef8f4] px-3 py-1 text-xs font-semibold text-[#2f5c4f]">
            Expires on {formatDateLabel(expiresAt)}
          </span>
          {bulkDownloadAllowed ? (
            <div className="relative">
              <button
                className="rounded-full bg-[#0f766e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#115e59]"
                onClick={() => setIsDownloadMenuOpen((v) => !v)}
              >
                Download files
              </button>
              {isDownloadMenuOpen ? (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-[#d9e8e2] bg-white p-2 shadow-xl shadow-[#0f766e]/10">
                <button
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-[#eef8f4]"
                  onClick={onDownloadAll}
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  <span>
                    <span className="block font-medium text-[#14352d]">Whole project</span>
                    <span className="block text-xs text-[#5d7f73]">All files and folders</span>
                  </span>
                </button>
                {favoritesEnabled ? (
                  <button
                    className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-[#eef8f4]"
                    onClick={onDownloadFavorites}
                  >
                    <HeartSolidIcon className="h-4 w-4" />
                    <span>
                      <span className="block font-medium text-[#14352d]">Favorites</span>
                      <span className="block text-xs text-[#5d7f73]">Only liked files</span>
                    </span>
                  </button>
                ) : null}
              </div>
              ) : null}
            </div>
          ) : null}
        </div>
        {favoritesEnabled && selectionLimit !== null ? (
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 pb-4 text-sm text-[#476a5e] sm:px-8">
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

      {activeFolderDescription ? (
        <section className="mx-auto w-full max-w-5xl px-4 pt-10 text-center sm:px-8">
          <p className="text-base leading-8 text-[#3f6659] sm:text-lg">{activeFolderDescription}</p>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
        {hasPhotos ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {visiblePhotos.map((photo, idx) => {
                  const isLiked = Boolean(liked[photo.id]);
                  const disableLike = !isLiked && selectionLimit !== null && likedCount >= selectionLimit;
                  const tileAspect =
                    idx % 7 === 0 ? "aspect-[4/5]" : idx % 5 === 0 ? "aspect-square" : "aspect-[4/3]";
                  return (
                    <figure
                      key={photo.id}
                      className="group relative overflow-hidden rounded-[20px] border border-[#d7e9e1] bg-white shadow-[0_14px_30px_rgba(15,118,110,0.12)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,118,110,0.2)]"
                    >
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
                        className={`${tileAspect} h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]`}
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                    <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#0f241e]/45 via-transparent to-transparent opacity-70 transition group-hover:opacity-90" />
                    <div className="absolute bottom-3 left-3 max-w-[70%]">
                      <p className="truncate rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white/95 backdrop-blur">
                        {photo.name}
                      </p>
                    </div>
                    <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 transition duration-300 group-hover:opacity-100">
                      <button
                        type="button"
                        className="rounded-full bg-white/95 p-2 text-[#1f3b33] shadow-md"
                        onClick={() => openShareModal(photo.url)}
                        aria-label="Share photo"
                      >
                        <ShareIcon className="h-3.5 w-3.5" />
                      </button>
                      {singleDownloadAllowed ? (
                        <button
                          type="button"
                          className="rounded-full bg-white/95 p-2 text-[#1f3b33] shadow-md"
                          onClick={() => {
                            registerDownloadedPhotos([photo.id]);
                            void recordClientActions([
                              {
                                photoId: photo.id,
                                action: "download",
                              },
                            ]);
                            void downloadSinglePhoto(photo);
                          }}
                          aria-label="Download photo"
                        >
                          <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                      {favoritesEnabled ? (
                        <button
                          type="button"
                          className={`rounded-full p-2 text-white shadow-md ${
                            isLiked ? "bg-[#0f766e]" : "bg-black/55"
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
                      ) : null}
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
          <div className="rounded-2xl border border-[#d7e9e1] bg-white px-6 py-12 text-center text-[#5d7f73]">
            No photos uploaded yet.
          </div>
        )}
      </section>

      {activePhoto ? (
        <div className="fixed inset-0 z-50 bg-black/85">
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-4 text-white">
            {singleDownloadAllowed ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 text-lg"
                onClick={() => {
                  registerDownloadedPhotos([activePhoto.id]);
                  void recordClientActions([
                    {
                      photoId: activePhoto.id,
                      action: "download",
                    },
                  ]);
                  void downloadSinglePhoto(activePhoto);
                }}
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Download
              </button>
            ) : (
              <span className="text-sm text-white/70">Downloads disabled</span>
            )}
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
              <button type="button" onClick={() => openShareModal(activePhoto.url)} aria-label="Share photo">
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
            <h3 className="font-display text-center text-2xl font-semibold text-[#15161a]">
              Save your favorites
            </h3>
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

      {isShareModalOpen ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-xl rounded-[28px] bg-white px-5 py-8 shadow-2xl sm:px-7">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full bg-[#ece7e1] p-2 text-[#7a736d]"
              onClick={() => setIsShareModalOpen(false)}
              aria-label="Close share modal"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <h3 className="text-center text-2xl font-semibold text-[#15161a]">Share link</h3>
            <div className="mx-auto mt-7 rounded-[18px] border border-[#e6ddd3] bg-white px-5 py-4 text-base text-[#6b645c]">
              <p className="break-all">{shareUrl}</p>
            </div>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                className="rounded-2xl bg-[#101114] px-8 py-3 text-base font-semibold text-white"
                onClick={() => void copyShareLink()}
              >
                {shareCopied ? "Copied" : "Copy the link"}
              </button>
            </div>
            <p className="mt-7 text-center text-base text-[#7a736d]">Or share via social media</p>
            <div className="mt-5 flex items-center justify-center gap-4">
              <button
                type="button"
                className="text-2xl font-semibold text-[#15161a]"
                onClick={() =>
                  openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`)
                }
                aria-label="Share on Facebook"
              >
                f
              </button>
              <button
                type="button"
                className="rounded-full border border-[#15161a] px-3 py-1.5 text-xs font-semibold text-[#15161a]"
                onClick={() => openShareWindow(`https://wa.me/?text=${encodeURIComponent(shareUrl)}`)}
                aria-label="Share on WhatsApp"
              >
                WA
              </button>
              <button
                type="button"
                className="rounded-full bg-[#15161a] px-3 py-1.5 text-xs font-semibold text-white"
                onClick={() => openShareWindow(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`)}
                aria-label="Share on Telegram"
              >
                TG
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isReviewModalOpen ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-2xl rounded-[28px] bg-white px-5 py-8 shadow-2xl sm:px-8">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full bg-[#ece7e1] p-2 text-[#7a736d]"
              onClick={() => setIsReviewModalOpen(false)}
              aria-label="Close review modal"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <h3 className="text-center text-2xl font-semibold text-[#15161a]">Leave review</h3>
            <p className="mt-3 text-center text-base text-[#7a736d]">Please write your review</p>
            <form className="mx-auto mt-7 max-w-xl" onSubmit={submitReview}>
              <div className="space-y-4">
                <input
                  className="h-14 w-full rounded-[18px] border border-[#e6ddd3] px-5 text-base text-[#15161a] outline-none"
                  placeholder="Your name"
                  value={reviewName}
                  onChange={(event) => setReviewName(event.target.value)}
                />
                <input
                  className="h-14 w-full rounded-[18px] border border-[#e6ddd3] px-5 text-base text-[#15161a] outline-none"
                  placeholder="Social media link (optional)"
                  value={reviewSocialLink}
                  onChange={(event) => setReviewSocialLink(event.target.value)}
                />
                <textarea
                  className="min-h-36 w-full rounded-[18px] border border-[#e6ddd3] px-5 py-4 text-base text-[#15161a] outline-none"
                  placeholder="Your review"
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                />
              </div>
              <p className="mt-5 text-lg text-[#7a736d]">Minimum review length - 30 characters</p>
              {reviewError ? <p className="mt-3 text-sm text-[#c2410c]">{reviewError}</p> : null}
              {reviewSubmitted ? (
                <p className="mt-3 text-sm text-emerald-700">Thanks. Your review has been captured locally.</p>
              ) : null}
              <div className="mt-7 flex justify-center">
                <button
                  type="submit"
                  className="rounded-2xl bg-[#101114] px-10 py-3 text-base font-semibold text-white"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

