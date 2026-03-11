"use client";

import { ChangeEvent, FormEvent, use, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import AddGalleryModal from "@/components/drive/AddGalleryModal";
import {
  ArrowUpRight,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Folder,
  Heart,
  Image as ImageIcon,
  LayoutGrid,
  Link as LinkIcon,
  List,
  MoreVertical,
  Pencil,
  Plus,
  Send,
  Settings,
  Star,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import {
  ArrowDownTrayIcon,
  EyeIcon,
  LinkIcon as LinkOutlineIcon,
  PencilIcon,
  StarIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { getGalleryMeta, saveGalleryMeta } from "@/lib/gallery-meta-storage";
import { MinimalGallery } from "@/types/DriveTableTypes";

type PhotoItem = { id: string; url: string; name: string; favoriteCount?: number; downloadCount?: number };
type GalleryData = {
  id: string;
  name: string;
  slug?: string | null;
  photos: PhotoItem[];
  createdAt?: string | null;
  expiresAt?: string | null;
  storageTimeLabel?: string | null;
  coverPhotoId?: string | null;
};
type FolderItem = { name: string; description: string };
type FavoritesListItem = { name: string; description: string };
type ClientFavoritesSelection = { name: string; email: string; photoIds: string[] };

const DEFAULT_FOLDER_NAME = "Photos";
const FOLDER_STORAGE_PREFIX = "wf_gallery_folders:";
const FAVORITES_LIST_STORAGE_PREFIX = "wf_gallery_favorites_lists:";
const CLIENT_FAVORITES_STORAGE_PREFIX = "wf_client_favorites:";
const CLIENT_DOWNLOADS_STORAGE_PREFIX = "wf_client_downloads:";
const COVER_PHOTO_STORAGE_PREFIX = "wf_gallery_cover:";
const VISITS_STORAGE_KEY = "wf_gallery_visits";
const GALLERY_HEAD_CACHE_PREFIX = "wf_gallery_detail_head:";
const PHOTO_NAME_SEPARATOR = "::";
const MAX_UPLOAD_PAYLOAD_BYTES = 3_500_000;
const COMPRESS_THRESHOLD_BYTES = 1_200_000;
const CLIENT_GALLERY_BASE_URL =
  process.env.NEXT_PUBLIC_CLIENT_GALLERY_BASE_URL?.trim() || "https://vowgraphy.pixora.pro";

type GalleryHeadCache = {
  id: string;
  name: string;
  expiresAt?: string | null;
  storageTimeLabel?: string | null;
  photosCount: number;
};

function decodePhotoName(raw: string) {
  const splitIndex = raw.indexOf(PHOTO_NAME_SEPARATOR);
  if (splitIndex < 0) {
    return { folder: DEFAULT_FOLDER_NAME, fileName: raw };
  }

  const folder = raw.slice(0, splitIndex).trim() || DEFAULT_FOLDER_NAME;
  const fileName = raw.slice(splitIndex + PHOTO_NAME_SEPARATOR.length).trim() || "file";
  return { folder, fileName };
}

function encodePhotoName(folder: string, fileName: string) {
  return `${folder}${PHOTO_NAME_SEPARATOR}${fileName}`;
}

function mergeFolders(stored: FolderItem[], photos: PhotoItem[]) {
  const map = new Map<string, FolderItem>();

  stored.forEach((folder) => {
    const normalizedName = folder.name.trim();
    if (!normalizedName) return;
    map.set(normalizedName, {
      name: normalizedName,
      description: folder.description.trim(),
    });
  });

  photos.forEach((photo) => {
    const { folder } = decodePhotoName(photo.name);
    if (!map.has(folder)) {
      map.set(folder, { name: folder, description: "" });
    }
  });

  return Array.from(map.values());
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function loadImageFromObjectUrl(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image for compression"));
    image.src = url;
  });
}

async function buildUploadDataUrl(file: File) {
  const original = await readFileAsDataUrl(file);
  const isCloudRuntime =
    typeof window !== "undefined" &&
    !["localhost", "127.0.0.1"].includes(window.location.hostname);

  // Keep original quality in deployed/cloud environments.
  if (isCloudRuntime) {
    return original;
  }

  if (!file.type.startsWith("image/") || file.size <= COMPRESS_THRESHOLD_BYTES) {
    return original;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageFromObjectUrl(objectUrl);
    const maxDimension = 1920;
    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;

    ctx.drawImage(img, 0, 0, width, height);
    const compressed = canvas.toDataURL("image/jpeg", 0.82);
    return getDataUrlByteSize(compressed) < getDataUrlByteSize(original)
      ? compressed
      : original;
  } catch {
    return original;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getDataUrlByteSize(url: string) {
  if (!url.startsWith("data:")) return 0;
  const commaIndex = url.indexOf(",");
  if (commaIndex < 0) return 0;

  const base64 = url.slice(commaIndex + 1);
  const padding = (base64.match(/=+$/)?.[0].length ?? 0);
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function readCachedGalleryHead(id: string): GalleryHeadCache | null {
  try {
    const raw = localStorage.getItem(`${GALLERY_HEAD_CACHE_PREFIX}${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as GalleryHeadCache;
  } catch {
    return null;
  }
}

function writeCachedGalleryHead(id: string, payload: GalleryData) {
  try {
    const head: GalleryHeadCache = {
      id: payload.id,
      name: payload.name,
      expiresAt: payload.expiresAt ?? null,
      storageTimeLabel: payload.storageTimeLabel ?? null,
      photosCount: payload.photos.length,
    };
    localStorage.setItem(`${GALLERY_HEAD_CACHE_PREFIX}${id}`, JSON.stringify(head));
  } catch {
    // Ignore quota/storage failures so navigation never crashes.
  }
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

export default function GalleryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [gallery, setGallery] = useState<GalleryData | null>(null);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [favoritesLists, setFavoritesLists] = useState<FavoritesListItem[]>([]);
  const [activeFolder, setActiveFolder] = useState("");
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderNameDraft, setFolderNameDraft] = useState("");
  const [folderDescriptionDraft, setFolderDescriptionDraft] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isFetchingGallery, setIsFetchingGallery] = useState(true);
  const [photoCountHint, setPhotoCountHint] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"gallery" | "favorites">("gallery");
  const [isFavoritesMenuOpen, setIsFavoritesMenuOpen] = useState(false);
  const [confirmDeleteMode, setConfirmDeleteMode] = useState<"list-only" | "list-and-files" | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [clientFavoriteSelections, setClientFavoriteSelections] = useState<ClientFavoritesSelection[]>([]);
  const [downloadedPhotoIds, setDownloadedPhotoIds] = useState<string[]>([]);
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const favoritesMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(ev: MouseEvent) {
      const target = ev.target as Node;
      if (favoritesMenuRef.current && !favoritesMenuRef.current.contains(target)) {
        setIsFavoritesMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const saveFolders = (nextFolders: FolderItem[]) => {
    setFolders(nextFolders);
    localStorage.setItem(`${FOLDER_STORAGE_PREFIX}${id}`, JSON.stringify(nextFolders));
    const meta = getGalleryMeta(id);
    if (meta?.favoritesEnabled) {
      saveGalleryMeta(id, {
        expiresAt: meta.expiresAt ?? null,
        storageTimeLabel: meta.storageTimeLabel ?? null,
        favoritesEnabled: true,
        favoritesLimitSelected: meta.favoritesLimitSelected ?? false,
        favoritesName: meta.favoritesName ?? null,
        favoritesListsCount: favoritesLists.length,
        selectionCompletedCount: meta.selectionCompletedCount ?? 0,
        favoritesMaxSelected: meta.favoritesMaxSelected ?? null,
      });
    }
  };

  const saveFavoritesLists = (nextLists: FavoritesListItem[]) => {
    setFavoritesLists(nextLists);
    localStorage.setItem(`${FAVORITES_LIST_STORAGE_PREFIX}${id}`, JSON.stringify(nextLists));
    const meta = getGalleryMeta(id);
    if (meta?.favoritesEnabled) {
      saveGalleryMeta(id, {
        expiresAt: meta.expiresAt ?? null,
        storageTimeLabel: meta.storageTimeLabel ?? null,
        favoritesEnabled: true,
        favoritesLimitSelected: meta.favoritesLimitSelected ?? false,
        favoritesName: meta.favoritesName ?? null,
        favoritesListsCount: nextLists.length,
        selectionCompletedCount: meta.selectionCompletedCount ?? 0,
        favoritesMaxSelected: meta.favoritesMaxSelected ?? null,
      });
    }
  };

  useEffect(() => {
    setIsFetchingGallery(true);
    const rawStored = localStorage.getItem(`${FOLDER_STORAGE_PREFIX}${id}`);
    const parsedStored = rawStored ? (JSON.parse(rawStored) as FolderItem[]) : [];
    const rawFavoriteLists = localStorage.getItem(`${FAVORITES_LIST_STORAGE_PREFIX}${id}`);
    const parsedFavoriteLists = rawFavoriteLists ? (JSON.parse(rawFavoriteLists) as FavoritesListItem[]) : [];
    setFavoritesLists(parsedFavoriteLists);
    const rawClientSelections = localStorage.getItem(`${CLIENT_FAVORITES_STORAGE_PREFIX}${id}`);
    const parsedClientSelections = rawClientSelections
      ? (JSON.parse(rawClientSelections) as ClientFavoritesSelection[])
      : [];
    setClientFavoriteSelections(parsedClientSelections);
    const rawDownloads = localStorage.getItem(`${CLIENT_DOWNLOADS_STORAGE_PREFIX}${id}`);
    const parsedDownloads = rawDownloads ? (JSON.parse(rawDownloads) as string[]) : [];
    setDownloadedPhotoIds(Array.isArray(parsedDownloads) ? parsedDownloads : []);
    setCoverPhotoId(localStorage.getItem(`${COVER_PHOTO_STORAGE_PREFIX}${id}`));
    const meta = getGalleryMeta(id);

    const hydrateFromGallery = (base: GalleryData) => {
      const merged: GalleryData = {
        ...base,
        expiresAt: meta?.expiresAt ?? base.expiresAt ?? null,
        storageTimeLabel: meta?.storageTimeLabel ?? base.storageTimeLabel ?? null,
      };
      setGallery(merged);
      if (merged.coverPhotoId) {
        setCoverPhotoId(merged.coverPhotoId);
        localStorage.setItem(`${COVER_PHOTO_STORAGE_PREFIX}${id}`, merged.coverPhotoId);
      }

      const nextFolders = mergeFolders(parsedStored, merged.photos ?? []);
      setFolders(nextFolders);
      if (nextFolders.length > 0) {
        setActiveFolder((prev) => prev || nextFolders[0].name);
      }
    };

    const cachedHead = readCachedGalleryHead(id);
    if (cachedHead) {
      const quickGallery: GalleryData = {
        id: cachedHead.id,
        name: cachedHead.name,
        expiresAt: cachedHead.expiresAt ?? null,
        storageTimeLabel: cachedHead.storageTimeLabel ?? null,
        photos: [],
      };
      hydrateFromGallery(quickGallery);
      setPhotoCountHint(cachedHead.photosCount);
    }

    fetch(`/api/galleries/${id}`)
      .then(async (r) => {
        const contentType = r.headers.get("content-type") ?? "";
        if (!r.ok || !contentType.includes("application/json")) {
          throw new Error("Gallery API returned a non-JSON response");
        }
        return r.json();
      })
      .then((payload: GalleryData) => {
        hydrateFromGallery(payload);
        setPhotoCountHint(null);
        writeCachedGalleryHead(id, payload);

        const visitsRaw = localStorage.getItem(VISITS_STORAGE_KEY);
        let visitsMap: Record<string, number> = {};
        if (visitsRaw) {
          try {
            visitsMap = JSON.parse(visitsRaw) as Record<string, number>;
          } catch {
            visitsMap = {};
          }
        }
        visitsMap[id] = (visitsMap[id] ?? 0) + 1;
        localStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(visitsMap));
      })
      .catch((error) => {
        console.error("Failed to fetch gallery details:", error);
      })
      .finally(() => {
        setIsFetchingGallery(false);
      });
  }, [id]);

  const folderPhotos = useMemo(() => {
    if (!gallery) return [];
    if (!activeFolder) return [];

    return gallery.photos.filter((photo) => decodePhotoName(photo.name).folder === activeFolder);
  }, [activeFolder, gallery]);

  const activeFolderMeta = useMemo(
    () => folders.find((folder) => folder.name === activeFolder) ?? null,
    [activeFolder, folders]
  );

  const totalGallerySizeLabel = useMemo(() => {
    if (!gallery) return formatFileSize(0);
    const bytes = gallery.photos.reduce((sum, photo) => sum + getDataUrlByteSize(photo.url), 0);
    return formatFileSize(bytes);
  }, [gallery]);

  const expiresLabel = useMemo(() => {
    if (!gallery) return "-";
    if (gallery.expiresAt) {
      return new Date(gallery.expiresAt).toLocaleDateString();
    }
    return gallery.storageTimeLabel ?? "-";
  }, [gallery]);

  const gallerySettingsTarget = useMemo<MinimalGallery | null>(() => {
    if (!gallery) return null;
    const meta = getGalleryMeta(id);
    return {
      id: gallery.id,
      name: gallery.name,
      createdAt: gallery.createdAt ?? null,
      expiresAt: meta?.expiresAt ?? gallery.expiresAt ?? undefined,
      storageTimeLabel: meta?.storageTimeLabel ?? gallery.storageTimeLabel ?? undefined,
      favoritesEnabled: meta?.favoritesEnabled ?? false,
      favoritesLimitSelected: meta?.favoritesLimitSelected ?? false,
      favoritesName: meta?.favoritesName ?? undefined,
      favoritesListsCount: meta?.favoritesListsCount ?? favoritesLists.length,
      selectionCompletedCount: meta?.selectionCompletedCount ?? 0,
      favoritesMaxSelected: meta?.favoritesMaxSelected ?? null,
    };
  }, [favoritesLists.length, gallery, id]);

  const addFolder = (name: string, description: string) => {
    const normalized = name.trim();
    if (!normalized) return;

    const existing = folders.find((folder) => folder.name === normalized);
    if (existing) {
      if (existing.description !== description.trim()) {
        const nextFolders = folders.map((folder) =>
          folder.name === normalized ? { ...folder, description: description.trim() } : folder
        );
        saveFolders(nextFolders);
      }
      setActiveFolder(existing.name);
      return;
    }

    const nextFolders = [...folders, { name: normalized, description: description.trim() }];
    saveFolders(nextFolders);
    setActiveFolder(normalized);
  };

  const addFavoriteList = (name: string, description: string) => {
    const normalized = name.trim();
    if (!normalized) return;
    if (favoritesLists.some((list) => list.name === normalized)) return;
    saveFavoritesLists([...favoritesLists, { name: normalized, description: description.trim() }]);
  };

  const currentFavoriteListName = favoritesLists[0]?.name ?? "";

  const removeClientFavoriteSelection = (listName: string) => {
    const nextSelections = clientFavoriteSelections.filter((entry) => entry.name !== listName);
    setClientFavoriteSelections(nextSelections);
    localStorage.setItem(`${CLIENT_FAVORITES_STORAGE_PREFIX}${id}`, JSON.stringify(nextSelections));
  };

  const onConfirmDeleteListAndFiles = () => {
    if (!currentFavoriteListName) return;
    saveFavoritesLists(favoritesLists.filter((list) => list.name !== currentFavoriteListName));
    removeClientFavoriteSelection(currentFavoriteListName);
    setFolders((prev) => {
      const next = prev.filter((folder) => folder.name !== currentFavoriteListName);
      localStorage.setItem(`${FOLDER_STORAGE_PREFIX}${id}`, JSON.stringify(next));
      if (activeFolder === currentFavoriteListName) {
        setActiveFolder(next[0]?.name ?? "");
      }
      return next;
    });
    setGallery((prev) =>
      prev
        ? {
            ...prev,
            photos: prev.photos.filter(
              (photo) => decodePhotoName(photo.name).folder !== currentFavoriteListName
            ),
          }
        : prev
    );
    setConfirmDeleteMode(null);
    setIsFavoritesMenuOpen(false);
  };

  const onConfirmDeleteListOnly = () => {
    if (!currentFavoriteListName) return;
    saveFavoritesLists(favoritesLists.filter((list) => list.name !== currentFavoriteListName));
    removeClientFavoriteSelection(currentFavoriteListName);
    setConfirmDeleteMode(null);
    setIsFavoritesMenuOpen(false);
  };

  const onSubmitAddFolder = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (activeTab === "favorites") {
      const names = folderNameDraft
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean)
        .slice(0, 50);
      names.forEach((n) => addFavoriteList(n, folderDescriptionDraft));
    } else {
      addFolder(folderNameDraft, folderDescriptionDraft);
    }
    setFolderNameDraft("");
    setFolderDescriptionDraft("");
    setIsFolderModalOpen(false);
  };

  const onUploadClick = () => {
    fileInputRef.current?.click();
  };

  const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!gallery || files.length === 0 || isUploading) return;

    let targetFolder = activeFolder.trim();
    if (!targetFolder) {
      targetFolder = folders[0]?.name || DEFAULT_FOLDER_NAME;
    }

    const hasFolder = folders.some((folder) => folder.name === targetFolder);
    if (!hasFolder) {
      const nextFolders = [...folders, { name: targetFolder, description: "" }];
      saveFolders(nextFolders);
    }

    setActiveFolder(targetFolder);
    setIsUploading(true);

    try {
      const createdPhotos: PhotoItem[] = [];
      for (const file of files) {
        const dataUrl = await buildUploadDataUrl(file);
        const payloadBytes = getDataUrlByteSize(dataUrl);
        if (payloadBytes > MAX_UPLOAD_PAYLOAD_BYTES) {
          throw new Error(
            `${file.name} is too large after compression (${formatFileSize(payloadBytes)}).`
          );
        }

        const res = await fetch(`/api/galleries/${id}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: encodePhotoName(targetFolder, file.name),
            url: dataUrl,
          }),
        });

        if (!res.ok) {
          let message = `Upload failed for ${file.name}`;
          try {
            const errorPayload = (await res.json()) as { error?: string };
            if (errorPayload?.error) {
              message = `${message}: ${errorPayload.error}`;
            }
          } catch {
            // Keep default message if response is not JSON.
          }
          throw new Error(message);
        }

        createdPhotos.push((await res.json()) as PhotoItem);
      }

      setGallery((prev) => (prev ? { ...prev, photos: [...prev.photos, ...createdPhotos] } : prev));
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const galleryName = gallery?.name ?? "Gallery";
  const previewUrl = useMemo(() => {
    if (!gallery) return "";
    if (typeof window === "undefined") return "";
    const slugOrId = (gallery.slug ?? gallery.id ?? "").trim();
    if (!slugOrId) return "";
    const normalizedConfiguredBase = CLIENT_GALLERY_BASE_URL.replace(/\/+$/, "");
    const isLocalRuntime = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const baseUrl = isLocalRuntime ? window.location.origin : (normalizedConfiguredBase || window.location.origin);
    return `${baseUrl}/disk/${encodeURIComponent(slugOrId)}`;
  }, [gallery]);

  const openPreview = () => {
    if (!previewUrl) return;
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  const setCoverPhoto = async (photoId: string | null) => {
    const nextValue = photoId ?? null;
    setCoverPhotoId(nextValue);
    setGallery((prev) => (prev ? { ...prev, coverPhotoId: nextValue } : prev));
    if (nextValue) {
      localStorage.setItem(`${COVER_PHOTO_STORAGE_PREFIX}${id}`, nextValue);
    } else {
      localStorage.removeItem(`${COVER_PHOTO_STORAGE_PREFIX}${id}`);
    }

    try {
      const res = await fetch(`/api/galleries/${id}/cover`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId: nextValue }),
      });
      if (!res.ok) {
        throw new Error("Failed to update cover");
      }
    } catch {
      // Revert on failure.
      const fallback = gallery?.coverPhotoId ?? null;
      setCoverPhotoId(fallback);
      setGallery((prev) => (prev ? { ...prev, coverPhotoId: fallback } : prev));
      if (fallback) {
        localStorage.setItem(`${COVER_PHOTO_STORAGE_PREFIX}${id}`, fallback);
      } else {
        localStorage.removeItem(`${COVER_PHOTO_STORAGE_PREFIX}${id}`);
      }
      alert("Unable to update cover. Please try again.");
    }
  };

  const openPhoto = (photo: PhotoItem) => {
    window.open(photo.url, "_blank", "noopener,noreferrer");
  };

  const copyPhotoLink = async (photo: PhotoItem) => {
    try {
      await navigator.clipboard.writeText(photo.url);
    } catch {
      // Ignore clipboard failures.
    }
  };

  const renamePhoto = async (photo: PhotoItem) => {
    const { folder, fileName } = decodePhotoName(photo.name);
    const nextName = window.prompt("Rename photo", fileName)?.trim();
    if (!nextName) return;
    const nextEncoded = encodePhotoName(folder, nextName);
    const previousName = photo.name;
    setGallery((prev) =>
      prev
        ? {
            ...prev,
            photos: prev.photos.map((item) => (item.id === photo.id ? { ...item, name: nextEncoded } : item)),
          }
        : prev
    );
    try {
      const res = await fetch(`/api/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextEncoded }),
      });
      if (!res.ok) {
        throw new Error("Rename failed");
      }
    } catch {
      setGallery((prev) =>
        prev
          ? {
              ...prev,
              photos: prev.photos.map((item) => (item.id === photo.id ? { ...item, name: previousName } : item)),
            }
          : prev
      );
      alert("Unable to rename photo. Please try again.");
    }
  };

  const deletePhoto = async (photo: PhotoItem) => {
    const confirmed = window.confirm(`Delete "${decodePhotoName(photo.name).fileName}"?`);
    if (!confirmed) return;
    const previous = gallery;
    setGallery((prev) =>
      prev ? { ...prev, photos: prev.photos.filter((item) => item.id !== photo.id) } : prev
    );
    if (coverPhotoId === photo.id) {
      await setCoverPhoto(null);
    }
    try {
      const res = await fetch(`/api/photos/${photo.id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Delete failed");
      }
    } catch {
      setGallery(previous);
      alert("Unable to delete photo. Please try again.");
    }
  };

  const galleryPhotos = gallery?.photos ?? [];
  const favoritePhotoIdsAll = useMemo(() => {
    const set = new Set<string>();
    clientFavoriteSelections.forEach((entry) => {
      entry.photoIds.forEach((photoId) => set.add(photoId));
    });
    return set;
  }, [clientFavoriteSelections]);
  const downloadedPhotoIdsSet = useMemo(() => new Set(downloadedPhotoIds), [downloadedPhotoIds]);
  const currentFavoriteSelection = clientFavoriteSelections.find(
    (entry) => entry.name === currentFavoriteListName
  );
  const favoritesPhotoIds = new Set(currentFavoriteSelection?.photoIds ?? []);
  const favoritesSelectionPhotos = galleryPhotos.filter((photo) => favoritesPhotoIds.has(photo.id));
  const favoritesSelectionCount = favoritesSelectionPhotos.length;
  const totalFilesCount = photoCountHint ?? galleryPhotos.length;
  const favoritesCount = favoritesLists.length;
  const hasFavoritesLists = favoritesCount > 0;
  const favoritesDate = gallery?.createdAt
    ? new Date(gallery.createdAt).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const tabBaseClass = "inline-flex items-center gap-1 pb-3 text-sm font-medium";

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/drive" className="text-sm text-slate-500 hover:text-slate-700">
            &larr; All galleries
          </Link>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight text-slate-900">{galleryName}</h1>
        </div>
        <div className="flex flex-col items-start gap-2 text-sm sm:items-end">
          <div className="flex items-center gap-5">
            <button className="inline-flex items-center gap-2 text-[15px] text-slate-700 hover:text-black">
              <ArrowUpRight size={16} />
              Share gallery
            </button>
            <button
              className="rounded-md border border-blue-500 px-7 py-2.5 font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={openPreview}
              disabled={!previewUrl}
            >
              Preview
            </button>
          </div>
          <p className="text-slate-500">
            Saved until {expiresLabel}, {totalFilesCount} files ({totalGallerySizeLabel})
          </p>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-6">
          <button
            className={`${tabBaseClass} ${
              activeTab === "gallery"
                ? "border-b-2 border-blue-500 text-slate-900"
                : "text-slate-700 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("gallery")}
          >
            <Folder size={14} />
            Gallery
          </button>
          <button
            className={`${tabBaseClass} ${
              activeTab === "favorites"
                ? "border-b-2 border-blue-500 text-slate-900"
                : "text-slate-700 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("favorites")}
          >
            <Heart
              size={14}
              className={activeTab === "favorites" ? "text-slate-900" : "text-slate-700"}
            />
            Favorites ({favoritesCount})
          </button>
          <button
            className="inline-flex items-center gap-1 pb-3 text-sm text-slate-700 hover:text-slate-900"
            onClick={() => setIsSettingsModalOpen(true)}
          >
            <Settings size={14} />
            Settings
          </button>
          <button className="inline-flex items-center gap-1 pb-3 text-sm text-slate-700 hover:text-slate-900">
            <ImageIcon size={14} />
            Design and cover
          </button>
        </div>
      </div>

      <div className="rounded border-l-4 border-blue-500 bg-blue-50 px-4 py-2.5 text-sm text-slate-700">
        <div className="inline-flex items-center gap-2">
          <Send size={14} className="text-blue-600" />
          Stay updated on your galleries in Telegram: favorites, storage periods, and other important events.
          <button className="text-blue-600 hover:underline">Enable notifications</button>
        </div>
      </div>

      {activeTab === "gallery" ? (
        <>
      <div className="flex flex-wrap items-center gap-3">
        {folders.map((folder) => {
          const photosInFolder = galleryPhotos.filter((photo) => decodePhotoName(photo.name).folder === folder.name);
          const folderBytes = photosInFolder.reduce((sum, photo) => sum + getDataUrlByteSize(photo.url), 0);

          return (
            <button
              key={folder.name}
              onClick={() => setActiveFolder(folder.name)}
              className={`min-w-40 rounded-md border px-4 py-2.5 text-left transition ${
                activeFolder === folder.name
                  ? "border-slate-400 bg-white text-slate-900"
                  : "border-slate-300 bg-white text-slate-800 hover:border-slate-400"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{folder.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {photosInFolder.length} files, {formatFileSize(folderBytes)}
                  </p>
                </div>
                <MoreVertical size={14} className="text-slate-500" />
              </div>
            </button>
          );
        })}
        <button
          className="px-2 py-2 text-sm font-medium text-slate-800 hover:text-slate-950"
          onClick={() => setIsFolderModalOpen(true)}
        >
          + Add folder
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="hidden min-w-40 lg:block" />
        <div className="flex items-center gap-6">
          <button
            className="inline-flex items-center gap-2 rounded bg-blue-600 px-7 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onUploadClick}
            disabled={isUploading || !gallery}
          >
            <Upload size={14} />
            {isUploading ? "Uploading..." : "Upload"}
          </button>
          <button
            className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900"
            onClick={() => {
              setFolderNameDraft(activeFolderMeta?.name ?? "");
              setFolderDescriptionDraft(activeFolderMeta?.description ?? "");
              setIsFolderModalOpen(true);
            }}
          >
            <Pencil size={14} />
            Edit description
          </button>
        </div>
        <button className="inline-flex items-center gap-1 text-sm text-slate-700 hover:text-slate-900">
          By title
          <ChevronDown size={14} />
        </button>
      </div>

      {activeFolderMeta?.description ? (
        <p className="text-center text-sm text-slate-500">{activeFolderMeta.description}</p>
      ) : null}

      {isFetchingGallery && !gallery ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center text-slate-600">
          Loading gallery...
        </div>
      ) : folderPhotos.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
          <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">There are no files in this gallery yet</h2>
          <p className="mt-2 text-base text-slate-600 sm:text-lg">Drag files here or click the button</p>
          <button
            className="mt-6 rounded bg-blue-600 px-7 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onUploadClick}
            disabled={isUploading || !gallery}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {folderPhotos.map((p) => {
            const decoded = decodePhotoName(p.name);
            const isFavorite = favoritePhotoIdsAll.has(p.id) || (p.favoriteCount ?? 0) > 0;
            const isDownloaded = downloadedPhotoIdsSet.has(p.id) || (p.downloadCount ?? 0) > 0;
            const isCover = coverPhotoId === p.id;
            return (
              <div key={p.id} className="space-y-2">
                <div className="group relative overflow-visible pt-12">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={decoded.fileName}
                    className="h-40 w-full rounded-sm object-contain sm:h-44"
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-sm bg-black/0 transition" />
                  <div className="tulip-bar pointer-events-auto absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-900 opacity-0 shadow-md transition group-hover:opacity-100 hover:opacity-100">
                    <button
                      type="button"
                      className="group/btn relative rounded-md p-1.5 text-slate-800 hover:bg-slate-100 hover:text-slate-900"
                      onClick={() => openPhoto(p)}
                      title="Open"
                    >
                      <EyeIcon className="tulip-icon text-slate-800" strokeWidth={1.8} />
                      <span className="pointer-events-none absolute left-1/2 -top-9.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition group-hover/btn:opacity-100">
                        Open
                      </span>
                      <span className="pointer-events-none absolute left-1/2 -top-3 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900 opacity-0 transition group-hover/btn:opacity-100" />
                    </button>
                    <span className="mx-0.5 h-3 w-px bg-slate-200" />
                    <button
                      type="button"
                      className={`group/btn relative rounded-md p-1.5 text-slate-800 hover:bg-slate-100 hover:text-slate-900 ${
                        isCover ? "text-amber-500" : ""
                      }`}
                      onClick={() => void setCoverPhoto(p.id)}
                      title="Set as cover"
                    >
                      <StarIcon
                        className={`tulip-icon ${isCover ? "text-amber-500" : "text-slate-800"}`}
                        strokeWidth={1.8}
                      />
                      <span className="pointer-events-none absolute left-1/2 -top-9.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition group-hover/btn:opacity-100">
                        Set as cover
                      </span>
                      <span className="pointer-events-none absolute left-1/2 -top-3 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900 opacity-0 transition group-hover/btn:opacity-100" />
                    </button>
                    <span className="mx-0.5 h-3 w-px bg-slate-200" />
                    <button
                      type="button"
                      className="group/btn relative rounded-md p-1.5 text-slate-800 hover:bg-slate-100 hover:text-slate-900"
                      onClick={() => void renamePhoto(p)}
                      title="Rename"
                    >
                      <PencilIcon className="tulip-icon text-slate-800" strokeWidth={1.8} />
                      <span className="pointer-events-none absolute left-1/2 -top-9.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition group-hover/btn:opacity-100">
                        Rename
                      </span>
                      <span className="pointer-events-none absolute left-1/2 -top-3 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900 opacity-0 transition group-hover/btn:opacity-100" />
                    </button>
                    <span className="mx-0.5 h-3 w-px bg-slate-200" />
                    <button
                      type="button"
                      className="group/btn relative rounded-md p-1.5 text-slate-800 hover:bg-slate-100 hover:text-slate-900"
                      onClick={() => triggerDownload(p.url, decoded.fileName)}
                      title="Download"
                    >
                      <ArrowDownTrayIcon className="tulip-icon text-slate-800" strokeWidth={1.8} />
                      <span className="pointer-events-none absolute left-1/2 -top-9.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition group-hover/btn:opacity-100">
                        Download
                      </span>
                      <span className="pointer-events-none absolute left-1/2 -top-3 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900 opacity-0 transition group-hover/btn:opacity-100" />
                    </button>
                    <span className="mx-0.5 h-3 w-px bg-slate-200" />
                    <button
                      type="button"
                      className="group/btn relative rounded-md p-1.5 text-slate-800 hover:bg-slate-100 hover:text-slate-900"
                      onClick={() => copyPhotoLink(p)}
                      title="Copy link"
                    >
                      <LinkOutlineIcon className="tulip-icon text-slate-800" strokeWidth={1.8} />
                      <span className="pointer-events-none absolute left-1/2 -top-9.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition group-hover/btn:opacity-100">
                        Copy link
                      </span>
                      <span className="pointer-events-none absolute left-1/2 -top-3 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900 opacity-0 transition group-hover/btn:opacity-100" />
                    </button>
                    <span className="mx-0.5 h-3 w-px bg-slate-200" />
                    <button
                      type="button"
                      className="group/btn relative rounded-md p-1.5 text-red-500 hover:bg-red-50"
                      onClick={() => void deletePhoto(p)}
                      title="Delete"
                    >
                      <TrashIcon className="tulip-icon text-red-500" strokeWidth={1.8} />
                      <span className="pointer-events-none absolute left-1/2 -top-9.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition group-hover/btn:opacity-100">
                        Delete
                      </span>
                      <span className="pointer-events-none absolute left-1/2 -top-3 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900 opacity-0 transition group-hover/btn:opacity-100" />
                    </button>
                  </div>
                  {(isFavorite || isDownloaded || isCover) ? (
                    <div className="absolute right-2 top-2 z-10 flex flex-wrap items-center gap-1">
                      {isCover ? (
                        <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Cover
                        </span>
                      ) : null}
                      {isFavorite ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/90 text-white">
                          <Heart size={12} fill="currentColor" />
                        </span>
                      ) : null}
                      {isDownloaded ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/80 text-white">
                          <Download size={12} />
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <p className="truncate text-xs text-slate-500">{decoded.fileName}</p>
              </div>
            );
          })}
        </div>
      )}
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-7">
            {hasFavoritesLists ? (
              <div className="relative" ref={favoritesMenuRef}>
                <button
                  type="button"
                  className="min-w-40 rounded-md border border-slate-400 bg-white px-4 py-2.5 text-left text-slate-900 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{favoritesLists[0]?.name ?? "Favorites"}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        <span className="h-2 w-2 rounded-full bg-yellow-400" />
                        <span>In process</span>
                        <span>-</span>
                        <Download size={12} />
                        <span>{favoritesSelectionCount} files</span>
                      </div>
                    </div>
                    <span
                      className="text-slate-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsFavoritesMenuOpen((v) => !v);
                      }}
                    >
                      <MoreVertical size={14} />
                    </span>
                  </div>
                </button>

                {isFavoritesMenuOpen ? (
                  <div className="absolute left-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                    <div className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
                      <p>5 March 2026 created</p>
                      <p>Updated 0 days ago</p>
                    </div>
                    <MenuAction
                      icon={<Eye size={14} />}
                      label="Preview"
                      onClick={() => {
                        setIsFavoritesMenuOpen(false);
                        openPreview();
                      }}
                    />
                    <MenuAction
                      icon={<Settings size={14} />}
                      label="Settings"
                      onClick={() => {
                        setIsFavoritesMenuOpen(false);
                        setIsSettingsModalOpen(true);
                      }}
                    />
                    <MenuAction icon={<LinkIcon size={14} />} label="Copy link" />
                    <MenuAction icon={<Download size={14} />} label="Download files" />
                    <MenuAction icon={<FileText size={14} />} label="List of CSV files" />
                    <MenuAction icon={<FileText size={14} />} label="Lightroom & Capture One" />
                    <MenuAction icon={<FileText size={14} />} label="Duplicate list" />
                    <MenuAction icon={<XCircle size={14} />} label="Complete selection" />
                    <div className="mt-1 border-t border-slate-100" />
                    <MenuAction
                      icon={<Trash2 size={14} />}
                      label="Delete favorites list and files"
                      danger
                      onClick={() => setConfirmDeleteMode("list-and-files")}
                    />
                    <MenuAction
                      icon={<Trash2 size={14} />}
                      label="Delete list"
                      danger
                      onClick={() => setConfirmDeleteMode("list-only")}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
            <button
              className="inline-flex items-center gap-2 text-sm text-slate-800 hover:text-slate-950"
              onClick={() => setIsFolderModalOpen(true)}
            >
              <Plus size={18} />
              Add list
            </button>
          </div>

          {!hasFavoritesLists ? (
            <p className="text-2xl text-slate-800">No list with "Favorites" has been created yet.</p>
          ) : (
            <>
              {favoritesSelectionCount === 0 ? (
                <>
                  <p className=" text-slate-900">There are no files in the favorites yet.</p>
                  <p className=" text-slate-500">{favoritesDate}</p>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-slate-900">
                    {currentFavoriteListName} selected {favoritesSelectionCount} files.
                  </p>
                  <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
                    {favoritesSelectionPhotos.map((photo) => {
                      const decoded = decodePhotoName(photo.name);
                      return (
                        <div key={photo.id} className="space-y-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.url}
                            alt={decoded.fileName}
                            className="h-40 w-full rounded-sm object-contain sm:h-44"
                          />
                          <p className="truncate text-xs text-slate-500">{decoded.fileName}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200">
                  <button className="inline-flex h-12 w-12 items-center justify-center bg-white text-slate-900">
                    <LayoutGrid size={20} />
                  </button>
                  <button className="inline-flex h-12 w-12 items-center justify-center bg-slate-50 text-slate-400">
                    <List size={20} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {confirmDeleteMode ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-xl text-center text-white">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/40">
              <Trash2 size={34} />
            </div>
            <h3 className="text-4xl font-semibold">
              {confirmDeleteMode === "list-and-files"
                ? `Delete selected files from gallery and favorites list "${currentFavoriteListName}"?`
                : `Delete favorites list "${currentFavoriteListName}"?`}
            </h3>
            <p className="mt-6 text-3xl text-slate-200">
              {confirmDeleteMode === "list-and-files"
                ? "This action is irreversible."
                : "Files will remain in the gallery."}
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                className="min-w-32 rounded-md border border-red-500 px-7 py-2 text-3xl font-semibold text-red-400"
                onClick={() => setConfirmDeleteMode(null)}
              >
                x No
              </button>
              <button
                type="button"
                className="min-w-32 rounded-md border border-emerald-500 px-7 py-2 text-3xl font-semibold text-emerald-400"
                onClick={
                  confirmDeleteMode === "list-and-files"
                    ? onConfirmDeleteListAndFiles
                    : onConfirmDeleteListOnly
                }
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onUpload} className="hidden" />

      {gallerySettingsTarget ? (
        <AddGalleryModal
          open={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          initialGallery={gallerySettingsTarget}
          onCreated={() => {}}
          onUpdated={(updated) => {
            setGallery((prev) =>
              prev
                ? {
                    ...prev,
                    id: updated.id,
                    name: updated.name ?? prev.name,
                    createdAt: updated.createdAt ?? prev.createdAt,
                    expiresAt: updated.expiresAt ?? null,
                    storageTimeLabel: updated.storageTimeLabel ?? null,
                  }
                : prev
            );
            saveGalleryMeta(id, {
              expiresAt: updated.expiresAt ?? null,
              storageTimeLabel: updated.storageTimeLabel ?? null,
              favoritesEnabled: updated.favoritesEnabled ?? false,
              favoritesLimitSelected: updated.favoritesLimitSelected ?? false,
              favoritesName: updated.favoritesName ?? null,
              favoritesListsCount: updated.favoritesListsCount ?? favoritesLists.length,
              selectionCompletedCount: updated.selectionCompletedCount ?? 0,
              favoritesMaxSelected: updated.favoritesMaxSelected ?? null,
            });
          }}
        />
      ) : null}

      {isFolderModalOpen ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/55 p-3 sm:p-4">
          {activeTab === "favorites" ? (
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-2xl font-semibold text-slate-900">Add list</h3>
                <button
                  className="h-11 w-11 rounded bg-slate-100 text-2xl text-slate-700"
                  onClick={() => setIsFolderModalOpen(false)}
                >
                  x
                </button>
              </div>

              <form className="space-y-5" onSubmit={onSubmitAddFolder}>
                <div className="rounded-lg bg-slate-50 p-4 sm:p-5">
                  <label className="block">
                    <span className="mb-2 block text-lg font-medium text-slate-800">Client name</span>
                    <textarea
                      className="min-h-36 w-full rounded border border-slate-400 px-3 py-2 text-lg"
                      placeholder="For example: Jane"
                      value={folderNameDraft}
                      onChange={(e) => setFolderNameDraft(e.target.value)}
                      required
                    />
                  </label>
                  <p className="mt-2 text-sm text-slate-500">
                    To add multiple clients, you can specify multiple names at once. Each name must start on a new
                    line. No more than 50 clients at a time.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-1">
                  <button
                    type="button"
                    className="h-11 rounded border border-slate-400 px-6 text-lg"
                    onClick={() => setIsFolderModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="h-11 rounded bg-black px-8 text-lg text-white">
                    Save
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-2xl font-semibold text-slate-900">Adding a new folder</h3>
                <button
                  className="h-9 w-9 rounded bg-slate-100 text-slate-700"
                  onClick={() => setIsFolderModalOpen(false)}
                >
                  x
                </button>
              </div>

              <form className="space-y-4" onSubmit={onSubmitAddFolder}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-800">Folder name</span>
                  <input
                    className="h-11 w-full rounded border border-slate-300 px-3"
                    placeholder="For example: wedding"
                    value={folderNameDraft}
                    onChange={(e) => setFolderNameDraft(e.target.value)}
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-800">Description</span>
                  <textarea
                    className="min-h-28 w-full rounded border border-slate-300 px-3 py-2"
                    value={folderDescriptionDraft}
                    onChange={(e) => setFolderDescriptionDraft(e.target.value)}
                    placeholder="This text appears before photos and videos in this folder."
                  />
                </label>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="h-10 rounded border border-slate-300 px-6"
                    onClick={() => setIsFolderModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="h-10 rounded bg-black px-6 text-white">
                    Add
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function MenuAction({
  icon,
  label,
  danger = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-slate-50 ${
        danger ? "text-red-500" : "text-slate-700"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}


