"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AddGalleryModal from "@/components/drive/AddGalleryModal";
import { getGalleryMeta, saveGalleryMeta } from "@/lib/gallery-meta-storage";
import { MinimalGallery } from "@/types/DriveTableTypes";
import {
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  Eye,
  ExternalLink,
  FolderPlus,
  Heart,
  Link as LinkIcon,
  Lock,
  MoreVertical,
  PencilLine,
  Settings,
  Star,
  Trash2,
  HeartMinusIcon,
} from "lucide-react";

type GalleryDetail = {
  id: string;
  name: string;
  slug?: string | null;
  createdAt?: string | null;
  photosCount?: number | null;
};

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

type ClientFavoritesSelection = {
  name: string;
  email: string;
  photoIds: string[];
};

type FavoriteFolderMeta = {
  name: string;
  description: string;
  createdAt: string;
};

const CLIENT_GALLERY_BASE_URL =
  process.env.NEXT_PUBLIC_CLIENT_GALLERY_BASE_URL?.trim() || "https://xyz.pixora.pro";
const FOLDER_STORAGE_PREFIX = "wf_gallery_folders:";
const FOLDER_PHOTOS_PREFIX = "wf_gallery_folder_photos:";
const FOLDER_ORDER_PREFIX = "wf_gallery_folder_order:";
const CLIENT_FAVORITES_PREFIX = "wf_client_favorites:";
const CLIENT_DOWNLOADS_PREFIX = "wf_client_downloads:";
const FAVORITE_FOLDER_STORAGE_PREFIX = "wf_gallery_favorite_folders:";
const ACTIVE_TAB_STORAGE_PREFIX = "wf_drive_active_tab:";
const MAX_UPLOAD_DATA_URL_LENGTH = 5_500_000;
const MAX_UPLOAD_DIMENSION = 2400;
const JPEG_QUALITY_STEPS = [0.9, 0.82, 0.74, 0.66, 0.58];

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image for upload"));
    image.src = dataUrl;
  });
}

async function preparePhotoUpload(file: File) {
  const originalDataUrl = await readFileAsDataUrl(file);
  if (originalDataUrl.length <= MAX_UPLOAD_DATA_URL_LENGTH) {
    return originalDataUrl;
  }

  const image = await loadImage(originalDataUrl);
  const longestSide = Math.max(image.width, image.height);
  const scale = longestSide > MAX_UPLOAD_DIMENSION ? MAX_UPLOAD_DIMENSION / longestSide : 1;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to prepare image for upload");
  }

  context.drawImage(image, 0, 0, width, height);

  const preferredMimeType = file.type === "image/png" || file.type === "image/webp" ? "image/webp" : "image/jpeg";
  for (const quality of JPEG_QUALITY_STEPS) {
    const compressedDataUrl = canvas.toDataURL(preferredMimeType, quality);
    if (compressedDataUrl.length <= MAX_UPLOAD_DATA_URL_LENGTH) {
      return compressedDataUrl;
    }
  }

  throw new Error(`${file.name} is too large to upload. Try a smaller image or compress it first.`);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TulipIcon() {
  return (
    <svg
      className="tulip-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21v-6" />
      <path d="M6 6c0 4 3 7 6 7s6-3 6-7" />
      <path d="M6 6c2.5 1.5 5 1.5 6 0" />
      <path d="M18 6c-2.5 1.5-5 1.5-6 0" />
      <path d="M7.5 14.5c1.5.5 2.5 1.5 4.5 1.5s3-1 4.5-1.5" />
    </svg>
  );
}

function readFolders(galleryId: string): Folder[] {
  try {
    const raw = window.localStorage.getItem(`${FOLDER_STORAGE_PREFIX}${galleryId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Folder[];
    return Array.isArray(parsed) ? parsed.filter((folder) => !folder.id.startsWith("favorite-")) : [];
  } catch {
    return [];
  }
}

function writeFolders(galleryId: string, folders: Folder[]) {
  window.localStorage.setItem(`${FOLDER_STORAGE_PREFIX}${galleryId}`, JSON.stringify(folders));
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

function writeFolderPhotos(galleryId: string, map: Record<string, string[]>) {
  window.localStorage.setItem(`${FOLDER_PHOTOS_PREFIX}${galleryId}`, JSON.stringify(map));
}

function readFolderOrder(galleryId: string) {
  try {
    const raw = window.localStorage.getItem(`${FOLDER_ORDER_PREFIX}${galleryId}`);
    if (!raw) return ["photos"];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : ["photos"];
  } catch {
    return ["photos"];
  }
}

function writeFolderOrder(galleryId: string, order: string[]) {
  window.localStorage.setItem(`${FOLDER_ORDER_PREFIX}${galleryId}`, JSON.stringify(order));
}

function normalizeFolderOrder(order: string[], folders: Folder[]) {
  const allIds = ["photos", ...folders.map((folder) => folder.id)];
  const seen = new Set<string>();
  const next: string[] = [];

  order.forEach((id) => {
    if (allIds.includes(id) && !seen.has(id)) {
      next.push(id);
      seen.add(id);
    }
  });

  allIds.forEach((id) => {
    if (!seen.has(id)) {
      next.push(id);
      seen.add(id);
    }
  });

  return next;
}

function readFavoriteIds(galleryId: string) {
  try {
    const raw = window.localStorage.getItem(`${CLIENT_FAVORITES_PREFIX}${galleryId}`);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as ClientFavoritesSelection[];
    if (!Array.isArray(parsed)) return new Set<string>();
    const ids = new Set<string>();
    parsed.forEach((entry) => {
      entry.photoIds?.forEach((id) => ids.add(id));
    });
    return ids;
  } catch {
    return new Set<string>();
  }
}

function readClientSelections(galleryId: string) {
  try {
    const raw = window.localStorage.getItem(`${CLIENT_FAVORITES_PREFIX}${galleryId}`);
    if (!raw) return [] as ClientFavoritesSelection[];
    const parsed = JSON.parse(raw) as ClientFavoritesSelection[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as ClientFavoritesSelection[];
  }
}

function writeClientSelections(galleryId: string, selections: ClientFavoritesSelection[]) {
  window.localStorage.setItem(`${CLIENT_FAVORITES_PREFIX}${galleryId}`, JSON.stringify(selections));
}

function readClientDownloads(galleryId: string) {
  try {
    const raw = window.localStorage.getItem(`${CLIENT_DOWNLOADS_PREFIX}${galleryId}`);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? new Set(parsed) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function readFavoriteFolderMeta(galleryId: string) {
  try {
    const raw = window.localStorage.getItem(`${FAVORITE_FOLDER_STORAGE_PREFIX}${galleryId}`);
    if (!raw) return {} as Record<string, FavoriteFolderMeta>;
    const parsed = JSON.parse(raw) as Record<string, FavoriteFolderMeta>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {} as Record<string, FavoriteFolderMeta>;
  }
}

function writeFavoriteFolderMeta(galleryId: string, next: Record<string, FavoriteFolderMeta>) {
  window.localStorage.setItem(`${FAVORITE_FOLDER_STORAGE_PREFIX}${galleryId}`, JSON.stringify(next));
}

export default function DriveDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const galleryId = params?.id;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);

  const [gallery, setGallery] = useState<GalleryDetail | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"gallery" | "favorites" | "settings" | "design">("gallery");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState("photos");
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [folderHidden, setFolderHidden] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [folderPhotos, setFolderPhotos] = useState<Record<string, string[]>>({});
  const [folderOrder, setFolderOrder] = useState<string[]>(["photos"]);

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [clientSelections, setClientSelections] = useState<ClientFavoritesSelection[]>([]);
  const [favoriteFolderMeta, setFavoriteFolderMeta] = useState<Record<string, FavoriteFolderMeta>>({});
  const [selectedFavoriteFolderKey, setSelectedFavoriteFolderKey] = useState<string | null>(null);
  const [showFavoriteFolderModal, setShowFavoriteFolderModal] = useState(false);
  const [pendingFavoriteFolderKey, setPendingFavoriteFolderKey] = useState<string | null>(null);
  const [favoriteFolderName, setFavoriteFolderName] = useState("");
  const [favoriteFolderDescription, setFavoriteFolderDescription] = useState("");
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [folderZipBusy, setFolderZipBusy] = useState<string | null>(null);
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);

  const publicLink = useMemo(() => {
    if (!gallery) return null;
    const base = CLIENT_GALLERY_BASE_URL.replace(/\/+$/, "");
    const slug = gallery.slug || gallery.id;
    return `${base}/${slug}`;
  }, [gallery]);

  const previewPath = useMemo(() => {
    if (!gallery) return null;
    const slug = gallery.slug || gallery.id;
    return `/disk/${slug}`;
  }, [gallery]);

  const initialGallery = useMemo(() => {
    if (!gallery) return null;
    const meta = getGalleryMeta(gallery.id);
    return {
      id: gallery.id,
      name: gallery.name,
      createdAt: gallery.createdAt ?? null,
      filesCount: gallery.photosCount ?? photos.length,
      favoritesEnabled: meta?.favoritesEnabled ?? true,
      favoritesLimitSelected: meta?.favoritesLimitSelected ?? false,
      favoritesName: meta?.favoritesName ?? undefined,
      favoritesListsCount: meta?.favoritesListsCount ?? 0,
      selectionCompletedCount: meta?.selectionCompletedCount ?? 0,
      favoritesMaxSelected: meta?.favoritesMaxSelected ?? null,
      storageTimeLabel: meta?.storageTimeLabel ?? undefined,
      expiresAt: meta?.expiresAt ?? undefined,
      slug: gallery.slug ?? undefined,
    } as MinimalGallery & { slug?: string };
  }, [gallery, photos.length]);

  useEffect(() => {
    if (!galleryId) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [galleryRes, photosRes] = await Promise.all([
          fetch(`/api/galleries/${galleryId}`),
          fetch(`/api/galleries/${galleryId}/photos?take=120`),
        ]);

        const galleryType = galleryRes.headers.get("content-type") ?? "";
        if (!galleryRes.ok || !galleryType.includes("application/json")) {
          throw new Error(galleryRes.status === 404 ? "Gallery not found" : "Unable to load gallery");
        }

        const galleryData = (await galleryRes.json()) as GalleryDetail;

        let photoItems: GalleryPhoto[] = [];
        const photoType = photosRes.headers.get("content-type") ?? "";
        if (photosRes.ok && photoType.includes("application/json")) {
          const payload = (await photosRes.json()) as { items?: GalleryPhoto[] };
          photoItems = Array.isArray(payload.items) ? payload.items : [];
        }

        if (active) {
          setGallery(galleryData);
          setPhotos(photoItems);
          setCoverPhotoId((galleryData as GalleryDetail & { coverPhotoId?: string | null }).coverPhotoId ?? null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load gallery");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [galleryId]);

  useEffect(() => {
    if (!galleryId) return;
    const nextFolders = readFolders(galleryId);
    setFolders(nextFolders);
    setFolderPhotos(readFolderPhotos(galleryId));
    setFolderOrder(normalizeFolderOrder(readFolderOrder(galleryId), nextFolders));
    setFavoriteIds(readFavoriteIds(galleryId));
    setDownloadedIds(readClientDownloads(galleryId));
    setClientSelections(readClientSelections(galleryId));
    setFavoriteFolderMeta(readFavoriteFolderMeta(galleryId));
    const savedTab = window.localStorage.getItem(`${ACTIVE_TAB_STORAGE_PREFIX}${galleryId}`);
    if (savedTab === "gallery" || savedTab === "favorites" || savedTab === "settings" || savedTab === "design") {
      setActiveTab(savedTab);
    }
  }, [galleryId]);

  useEffect(() => {
    if (!galleryId) return;

    const syncFavorites = () => {
      setFavoriteIds(readFavoriteIds(galleryId));
      setDownloadedIds(readClientDownloads(galleryId));
      setClientSelections(readClientSelections(galleryId));
      const nextFolders = readFolders(galleryId);
      setFolders(nextFolders);
      setFolderPhotos(readFolderPhotos(galleryId));
      setFolderOrder(normalizeFolderOrder(readFolderOrder(galleryId), nextFolders));
      setFavoriteFolderMeta(readFavoriteFolderMeta(galleryId));
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (
        event.key === `${CLIENT_FAVORITES_PREFIX}${galleryId}` ||
        event.key === `${CLIENT_DOWNLOADS_PREFIX}${galleryId}` ||
        event.key === `${FOLDER_STORAGE_PREFIX}${galleryId}` ||
        event.key === `${FOLDER_PHOTOS_PREFIX}${galleryId}` ||
        event.key === `${FOLDER_ORDER_PREFIX}${galleryId}` ||
        event.key === `${FAVORITE_FOLDER_STORAGE_PREFIX}${galleryId}`
      ) {
        syncFavorites();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [galleryId]);

  useEffect(() => {
    if (activeTab === "settings") {
      setSettingsOpen(true);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!galleryId) return;
    window.localStorage.setItem(`${ACTIVE_TAB_STORAGE_PREFIX}${galleryId}`, activeTab);
  }, [activeTab, galleryId]);

  useEffect(() => {
    if (!menuOpenFor) return;

    const handleClick = () => setMenuOpenFor(null);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpenFor(null);
      }
    };

    window.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [menuOpenFor]);

  useEffect(() => {
    if (!shareMenuOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!shareMenuRef.current?.contains(event.target as Node)) {
        setShareMenuOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShareMenuOpen(false);
      }
    };

    window.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [shareMenuOpen]);

  const favoritePhotos = useMemo(() => {
    if (favoriteIds.size === 0) return [];
    return photos.filter((photo) => favoriteIds.has(photo.id));
  }, [photos, favoriteIds]);

  const favoriteFolders = useMemo(() => {
    return clientSelections
      .map((selection) => {
        const ids = Array.from(new Set(selection.photoIds ?? []));
        const idSet = new Set(ids);
        const items = photos.filter((photo) => idSet.has(photo.id));
        const selectionKey = `${selection.name}::${selection.email}`;
        const meta = favoriteFolderMeta[selectionKey];
        return {
          ...selection,
          folderName: meta?.name ?? selection.name,
          folderDescription: meta?.description ?? selection.email,
          items,
        };
      })
      .filter((selection) => selection.items.length > 0);
  }, [clientSelections, favoriteFolderMeta, photos]);

  const getFavoriteSelectionKey = (selection: ClientFavoritesSelection) => `${selection.name}::${selection.email}`;

  const activeFavoriteFolder = useMemo(() => {
    if (favoriteFolders.length === 0) return null;
    return (
      favoriteFolders.find((selection) => getFavoriteSelectionKey(selection) === selectedFavoriteFolderKey) ??
      favoriteFolders[0]
    );
  }, [favoriteFolders, selectedFavoriteFolderKey]);

  const selectedFolderDescription = useMemo(() => {
    if (selectedFolderId === "photos") return "";
    return folders.find((folder) => folder.id === selectedFolderId)?.description?.trim() ?? "";
  }, [folders, selectedFolderId]);

  useEffect(() => {
    if (favoriteFolders.length === 0) {
      setSelectedFavoriteFolderKey(null);
      return;
    }

    const hasSelected = favoriteFolders.some(
      (selection) => getFavoriteSelectionKey(selection) === selectedFavoriteFolderKey
    );
    if (!hasSelected) {
      setSelectedFavoriteFolderKey(getFavoriteSelectionKey(favoriteFolders[0]));
    }
  }, [favoriteFolders, selectedFavoriteFolderKey]);

  useEffect(() => {
    if (activeTab !== "favorites" || showFavoriteFolderModal) return;
    const missing = favoriteFolders.find((selection) => !favoriteFolderMeta[getFavoriteSelectionKey(selection)]);
    if (!missing) return;

    setPendingFavoriteFolderKey(getFavoriteSelectionKey(missing));
    setFavoriteFolderName(missing.name);
    setFavoriteFolderDescription(missing.email);
    setShowFavoriteFolderModal(true);
  }, [activeTab, favoriteFolders, favoriteFolderMeta, showFavoriteFolderModal]);

  const orderedFolderIds = useMemo(() => normalizeFolderOrder(folderOrder, folders), [folderOrder, folders]);

  const activeFolderPhotos = useMemo(() => {

    if (selectedFolderId === "photos") {
      return photos;
    }

    const folder = folders.find(f => f.id === selectedFolderId);

    if (folder?.hidden) return [];

    const ids = folderPhotos[selectedFolderId] ?? [];
    const idSet = new Set(ids);

    return photos.filter((photo) => idSet.has(photo.id));

  }, [photos, selectedFolderId, folderPhotos, folders]);

  const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!galleryId || files.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        const dataUrl = await preparePhotoUpload(file);

        const res = await fetch(`/api/galleries/${galleryId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, url: dataUrl }),
        });

        if (!res.ok) {
          if (res.status === 413) {
            throw new Error(`${file.name} is too large to upload. Try a smaller image or compress it first.`);
          }
          throw new Error(`Unable to upload ${file.name}`);
        }

        const photo = (await res.json()) as GalleryPhoto;
        setPhotos((prev) => [photo, ...prev]);

        if (selectedFolderId !== "photos") {
          setFolderPhotos((prev) => {
            const next = { ...prev };
            const current = next[selectedFolderId] ?? [];
            next[selectedFolderId] = [photo.id, ...current];
            if (galleryId) {
              writeFolderPhotos(galleryId, next);
            }
            return next;
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload photos");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getFolderPhotoList = (folderId: string) => {
    if (folderId === "photos") return photos;
    const ids = folderPhotos[folderId] ?? [];
    const idSet = new Set(ids);
    return photos.filter((photo) => idSet.has(photo.id));
  };

  const buildFolderLink = (folderId: string) => {
    if (!publicLink) return null;
    const url = new URL(publicLink);
    if (folderId !== "photos") {
      url.searchParams.set("folder", folderId);
    }
    return url.toString();
  };

  const buildPhotoLink = (photoId: string) => {
    const folderLink = buildFolderLink(selectedFolderId);
    if (!folderLink) return null;
    const url = new URL(folderLink);
    url.searchParams.set("photo", photoId);
    return url.toString();
  };

  const openFolderPreview = (folderId: string) => {
    if (!previewPath) return;
    const url = new URL(previewPath, window.location.origin);
    if (folderId !== "photos") {
      url.searchParams.set("folder", folderId);
    }
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  const copyFolderLink = async (folderId: string) => {
    const link = buildFolderLink(folderId);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Ignore clipboard errors.
    }
  };

  const copyPhotoLink = async (photoId: string) => {
    const link = buildPhotoLink(photoId);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Ignore clipboard errors.
    }
  };

  const shareGalleryTo = (platform: "facebook" | "whatsapp" | "telegram" | "viber") => {
    if (!publicLink) return;
    const encodedLink = encodeURIComponent(publicLink);
    const encodedText = encodeURIComponent(`Take a look at this gallery: ${publicLink}`);

    const shareUrl =
      platform === "facebook"
        ? `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`
        : platform === "whatsapp"
          ? `https://wa.me/?text=${encodedText}`
          : platform === "telegram"
            ? `https://t.me/share/url?url=${encodedLink}&text=${encodeURIComponent("Take a look at this gallery")}`
            : `viber://forward?text=${encodedText}`;

    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  const downloadGalleryQr = () => {
    if (!publicLink) return;
    const link = document.createElement("a");
    link.href = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(publicLink)}`;
    link.download = `${sanitizeFileName(gallery?.name || "gallery")}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const previewPhoto = (photoId: string) => {
    if (!previewPath) return;
    const url = new URL(previewPath, window.location.origin);
    if (selectedFolderId !== "photos") {
      url.searchParams.set("folder", selectedFolderId);
    }
    url.searchParams.set("photo", photoId);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  const renamePhoto = async (photoId: string) => {
    const photo = photos.find((item) => item.id === photoId);
    if (!photo) return;
    const nextName = window.prompt("Rename photo", photo.name)?.trim();
    if (!nextName || nextName === photo.name) return;

    try {
      const res = await fetch(`/api/photos/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });
      if (!res.ok) return;
      setPhotos((prev) => prev.map((item) => (item.id === photoId ? { ...item, name: nextName } : item)));
    } catch {
      // Ignore rename failures.
    }
  };

  const downloadPhoto = async (photo: GalleryPhoto) => {
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = sanitizeFileName(photo.name || "photo");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Ignore download failures.
    }
  };

  const setPhotoAsCover = async (photoId: string) => {
    if (!galleryId) return;
    try {
      const res = await fetch(`/api/galleries/${galleryId}/cover`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });
      if (!res.ok) return;
      setCoverPhotoId(photoId);
      setActiveTab("design");
    } catch {
      // Ignore cover failures.
    }
  };

  const deletePhoto = async (photoId: string) => {
    const confirmed = window.confirm("Delete this photo?");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
      if (!res.ok) return;

      setPhotos((prev) => prev.filter((item) => item.id !== photoId));
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
      setFolderPhotos((prev) => {
        const next = Object.fromEntries(
          Object.entries(prev).map(([folderId, ids]) => [folderId, ids.filter((id) => id !== photoId)])
        );
        if (galleryId) {
          writeFolderPhotos(galleryId, next);
        }
        return next;
      });
      if (coverPhotoId === photoId) {
        setCoverPhotoId(null);
      }
    } catch {
      // Ignore delete failures.
    }
  };

  const startEditFolder = (folderId: string) => {
    const folder = folders.find((item) => item.id === folderId);
    if (!folder) return;
    setEditingFolderId(folderId);
    setFolderName(folder.name);
    setFolderDescription(folder.description);
    setFolderHidden(folder.hidden);
    setShowFolderModal(true);
  };

  const toggleFolderHidden = (folderId: string) => {
    if (!galleryId) return;
    const next = folders.map((folder) =>
      folder.id === folderId ? { ...folder, hidden: !folder.hidden } : folder
    );
    setFolders(next);
    writeFolders(galleryId, next);
  };

  const moveFolder = (folderId: string, direction: -1 | 1) => {
    if (!galleryId) return;
    const current = normalizeFolderOrder(folderOrder, folders);
    const index = current.indexOf(folderId);
    const nextIndex = index + direction;
    if (index === -1 || nextIndex < 0 || nextIndex >= current.length) return;

    const next = [...current];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setFolderOrder(next);
    writeFolderOrder(galleryId, next);
  };

  const deleteFolder = (folderId: string) => {
    if (!galleryId) return;
    const nextFolders = folders.filter((folder) => folder.id !== folderId);
    setFolders(nextFolders);
    writeFolders(galleryId, nextFolders);
    const nextOrder = normalizeFolderOrder(folderOrder.filter((id) => id !== folderId), nextFolders);
    setFolderOrder(nextOrder);
    writeFolderOrder(galleryId, nextOrder);

    setFolderPhotos((prev) => {
      const next = { ...prev };
      delete next[folderId];
      writeFolderPhotos(galleryId, next);
      return next;
    });

    if (selectedFolderId === folderId) {
      setSelectedFolderId("photos");
    }
  };

  const removeFavoriteSelection = (selection: ClientFavoritesSelection) => {
    if (!galleryId) return;

    const nextSelections = clientSelections.filter(
      (entry) => !(entry.name === selection.name && entry.email === selection.email)
    );
    setClientSelections(nextSelections);
    writeClientSelections(galleryId, nextSelections);
    setFavoriteIds(readFavoriteIds(galleryId));

    const nextMeta = { ...favoriteFolderMeta };
    delete nextMeta[getFavoriteSelectionKey(selection)];
    setFavoriteFolderMeta(nextMeta);
    writeFavoriteFolderMeta(galleryId, nextMeta);

    if (selectedFavoriteFolderKey === getFavoriteSelectionKey(selection)) {
      const nextActive = nextSelections[0];
      setSelectedFavoriteFolderKey(nextActive ? getFavoriteSelectionKey(nextActive) : null);
    }
  };

  const removeFavoritePhoto = (selection: ClientFavoritesSelection, photoId: string) => {
    if (!galleryId) return;

    const nextSelections = clientSelections
      .map((entry) =>
        entry.name === selection.name && entry.email === selection.email
          ? { ...entry, photoIds: entry.photoIds.filter((id) => id !== photoId) }
          : entry
      )
      .filter((entry) => entry.photoIds.length > 0);

    setClientSelections(nextSelections);
    writeClientSelections(galleryId, nextSelections);
    setFavoriteIds(readFavoriteIds(galleryId));

    const stillExists = nextSelections.some(
      (entry) => entry.name === selection.name && entry.email === selection.email
    );
    if (!stillExists) {
      const nextMeta = { ...favoriteFolderMeta };
      delete nextMeta[getFavoriteSelectionKey(selection)];
      setFavoriteFolderMeta(nextMeta);
      writeFavoriteFolderMeta(galleryId, nextMeta);
    }
  };

  const createFavoriteFolder = () => {
    if (!galleryId || !pendingFavoriteFolderKey) return;
    const name = favoriteFolderName.trim();
    if (!name) return;

    const nextMeta = {
      ...favoriteFolderMeta,
      [pendingFavoriteFolderKey]: {
        name,
        description: favoriteFolderDescription.trim(),
        createdAt: favoriteFolderMeta[pendingFavoriteFolderKey]?.createdAt ?? new Date().toISOString(),
      },
    };
    setFavoriteFolderMeta(nextMeta);
    writeFavoriteFolderMeta(galleryId, nextMeta);
    setSelectedFavoriteFolderKey(pendingFavoriteFolderKey);
    setPendingFavoriteFolderKey(null);
    setFavoriteFolderName("");
    setFavoriteFolderDescription("");
    setShowFavoriteFolderModal(false);
  };

  const sanitizeFileName = (value: string) =>
    value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();

  const downloadFolderZip = async (folderId: string) => {
    const items = getFolderPhotoList(folderId);
    if (items.length === 0) return;
    if (folderZipBusy) return;
    setFolderZipBusy(folderId);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const usedNames = new Set<string>();

      await Promise.all(
        items.map(async (photo, index) => {
          const response = await fetch(photo.url);
          const blob = await response.blob();
          const baseName = sanitizeFileName(photo.name || `photo-${index + 1}`);
          const extMatch = baseName.match(/\.[a-z0-9]+$/i);
          const ext = extMatch ? "" : blob.type === "image/png" ? ".png" : blob.type === "image/jpeg" ? ".jpg" : "";
          let fileName = `${baseName}${ext}`;
          let counter = 1;
          while (usedNames.has(fileName)) {
            counter += 1;
            fileName = `${baseName}-${counter}${ext}`;
          }
          usedNames.add(fileName);
          zip.file(fileName, blob);
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      const folder = folders.find(f => f.id === folderId);
      link.download = `${folder?.name || "photos"}.zip`; document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Ignore zip failures.
    } finally {
      setFolderZipBusy(null);
    }
  };

  const downloadFavoriteSelection = async (selection: ClientFavoritesSelection) => {
    const items =
      favoriteFolders.find((entry) => entry.name === selection.name && entry.email === selection.email)?.items ?? [];
    if (items.length === 0 || folderZipBusy) return;

    const busyKey = `favorite:${getFavoriteSelectionKey(selection)}`;
    setFolderZipBusy(busyKey);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const usedNames = new Set<string>();

      await Promise.all(
        items.map(async (photo, index) => {
          const response = await fetch(photo.url);
          const blob = await response.blob();
          const baseName = sanitizeFileName(photo.name || `photo-${index + 1}`);
          const extMatch = baseName.match(/\.[a-z0-9]+$/i);
          const ext = extMatch ? "" : blob.type === "image/png" ? ".png" : blob.type === "image/jpeg" ? ".jpg" : "";
          let fileName = `${baseName}${ext}`;
          let counter = 1;
          while (usedNames.has(fileName)) {
            counter += 1;
            fileName = `${baseName}-${counter}${ext}`;
          }
          usedNames.add(fileName);
          zip.file(fileName, blob);
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      const folderLabel = favoriteFolderMeta[getFavoriteSelectionKey(selection)]?.name || selection.name || "favorites";
      link.href = url;
      link.download = `${sanitizeFileName(folderLabel)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Ignore zip failures.
    } finally {
      setFolderZipBusy(null);
    }
  };

  const getFolderMenuItems = (folderId: string) => {
    const isPhotos = folderId === "photos";
    const folder = folders.find((f) => f.id === folderId);
    const currentOrder = normalizeFolderOrder(folderOrder, folders);
    const orderIndex = currentOrder.indexOf(folderId);

    const items = [
      {
        label: "Preview",
        icon: Eye,
        onClick: () => openFolderPreview(folderId),
      },
      {
        label: "Settings",
        icon: Settings,
        onClick: () => {
          if (isPhotos) {
            setActiveTab("settings");
            setSettingsOpen(true);
            return;
          }
          startEditFolder(folderId);
        },
      },
      {
        label: "Copy Link",
        icon: LinkIcon,
        onClick: () => copyFolderLink(folderId),
      },
      {
        label: folderZipBusy === folderId ? "Downloading..." : "Download Files",
        icon: ArrowDownToLine,
        onClick: () => downloadFolderZip(folderId),
        disabled: folderZipBusy === folderId,
      },
      {
        label: "Move to left",
        icon: ChevronLeft,
        onClick: () => moveFolder(folderId, -1),
        disabled: orderIndex <= 0,
      },
      {
        label: "Move to right",
        icon: ChevronRight,
        onClick: () => moveFolder(folderId, 1),
        disabled: orderIndex === -1 || orderIndex >= currentOrder.length - 1,
      },
      ...(isPhotos
        ? []
        : [
          {
            label: folder?.hidden ? "Show Folder" : "Hide Folder",
            icon: Lock,
            onClick: () => toggleFolderHidden(folderId),
          },
        ]),
    ];

    const destructive = isPhotos
      ? null
      : {
        label: "Delete Folder",
        icon: Trash2,
        onClick: () => deleteFolder(folderId),
      };

    return { items, destructive };
  };
  const onCreateFolder = () => {
    if (!galleryId) return;
    const name = folderName.trim();
    if (!name) return;
    const description = folderDescription.trim();

    if (editingFolderId) {
      const next = folders.map((folder) =>
        folder.id === editingFolderId
          ? { ...folder, name, description, hidden: folderHidden }
          : folder
      );
      setFolders(next);
      writeFolders(galleryId, next);
    } else {
      const folder: Folder = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name,
        description,
        hidden: folderHidden,
        createdAt: new Date().toISOString(),
      };
      const next = [folder, ...folders];
      setFolders(next);
      writeFolders(galleryId, next);
      const nextOrder = normalizeFolderOrder([...folderOrder, folder.id], next);
      setFolderOrder(nextOrder);
      writeFolderOrder(galleryId, nextOrder);
    }

    setFolderName("");
    setFolderDescription("");
    setFolderHidden(false);
    setEditingFolderId(null);
    setShowFolderModal(false);
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-16 text-center text-[#8a7f73]">
        Loading gallery...
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-16 text-center">
        <h1 className="font-display text-3xl font-semibold text-[#15161a]">Gallery unavailable</h1>
        <p className="mt-3 text-sm text-[#8a7f73]">{error ?? "This gallery could not be loaded."}</p>
        <button
          className="mt-6 rounded-full bg-[#101114] px-6 py-2.5 text-sm font-semibold text-white"
          onClick={() => router.push("/dashboard/drive")}
        >
          Back to Drive
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <button
            type="button"
            className="text-sm font-semibold text-[#8a7f73] hover:text-[#4a433d]"
            onClick={() => router.push("/dashboard/drive")}
          >
            ← All galleries
          </button>
          <h1 className="font-display mt-4 text-4xl font-semibold text-[#15161a]">{gallery.name}</h1>
          <p className="mt-2 text-sm text-[#8a7f73]">
            Saved until {formatDate(initialGallery?.expiresAt ?? null)} · {gallery.photosCount ?? photos.length} files
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative" ref={shareMenuRef}>
            <button
              className="rounded-full border border-[#d9cfc4] px-5 py-2.5 text-sm font-semibold text-[#4a433d]"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setShareMenuOpen((prev) => !prev);
              }}
            >
              Share gallery
            </button>
            {shareMenuOpen ? (
              <div
                className="absolute right-0 top-full z-50 mt-3 w-72 overflow-hidden rounded-2xl border border-[#e3d8cc] bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="py-2 text-sm text-[#3b3430]">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(publicLink ?? "");
                      setShareMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[#f7f3ee]"
                  >
                    <LinkIcon className="h-5 w-5 text-[#9a9187]" />
                    <span>Copy link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      downloadGalleryQr();
                      setShareMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[#f7f3ee]"
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-[#f1ece5] text-[10px] font-bold text-[#7f776e]">
                      QR
                    </div>
                    <span>Download QR code</span>
                  </button>
                </div>
                <div className="border-t border-[#efe6dc] py-2 text-sm text-[#3b3430]">
                  {[
                    { id: "facebook", label: "Facebook", bg: "bg-[#4267B2]", text: "f" },
                    { id: "whatsapp", label: "WhatsApp", bg: "bg-[#25D366]", text: "w" },
                    { id: "telegram", label: "Telegram", bg: "bg-[#229ED9]", text: "t" },
                    { id: "viber", label: "Viber", bg: "bg-[#7360F2]", text: "v" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        shareGalleryTo(item.id as "facebook" | "whatsapp" | "telegram" | "viber");
                        setShareMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[#f7f3ee]"
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold uppercase text-white ${item.bg}`}
                      >
                        {item.text}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          {previewPath ? (
            <button
              type="button"
              onClick={() => window.open(previewPath, "_blank", "noopener,noreferrer")}
              className="rounded-full bg-[#101114] px-6 py-2.5 text-sm font-semibold text-white"
            >
              Preview
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-6 border-b border-[#e3d8cc] text-sm font-semibold text-[#6b645c]">
        {[
          { id: "gallery", label: "Gallery" },
          { id: "favorites", label: `Favorites (${favoritePhotos.length})` },
          { id: "settings", label: "Settings" },
          { id: "design", label: "Design and cover" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`pb-3 ${activeTab === tab.id ? "border-b-2 border-[#d97757] text-[#15161a]" : "border-b-2 border-transparent"
              }`}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "gallery" && (
        <div className="mt-8 space-y-8">
          <div className="relative z-20 flex flex-wrap items-stretch gap-4">
            {orderedFolderIds.map((folderId) => {
              const isPhotos = folderId === "photos";
              const folder = isPhotos ? null : folders.find((item) => item.id === folderId);
              if (!isPhotos && !folder) return null;
              const menuId = `folder-${folderId}`;
              const menu = getFolderMenuItems(folderId);

              return (
                <div key={folderId} className="relative min-w-48 z-20">
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId(folderId)}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${selectedFolderId === folderId
                        ? "border-[#15161a] bg-white text-[#15161a]"
                        : "border-[#e3d8cc] bg-white/60 text-[#6b645c]"
                      }`}
                  >
                    <p className="flex items-center gap-2 font-semibold">
                      {!isPhotos && folder?.hidden ? <Lock className="h-4 w-4 text-[#8a7f73]" /> : null}
                      <span>{isPhotos ? "Photos" : folder?.name}</span>
                    </p>
                    <p className="mt-1 text-xs text-[#8a7f73]">
                      {isPhotos
                        ? `${photos.length} files ${photos.length ? "??" : ""} ${photos.length ? `${(photos.length * 1.2).toFixed(1)} MB` : ""}`
                        : `${getFolderPhotoList(folderId).length} files`}
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label="Open folder actions"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuOpenFor((prev) => (prev === menuId ? null : menuId));
                    }}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-[#e3d8cc] bg-white text-[#15161a] shadow-sm transition hover:bg-[#f7f3ee]"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {menuOpenFor === menuId ? (
                    <div
                      className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-[#e3d8cc] bg-white shadow-2xl"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="py-2 text-sm text-[#3b3430]">
                        {menu.items.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            disabled={item.disabled}
                            onClick={() => {
                              setMenuOpenFor(null);
                              item.onClick();
                            }}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${item.disabled ? "cursor-not-allowed opacity-60" : "hover:bg-[#f7f3ee]"
                              }`}
                          >
                            <item.icon className="h-4 w-4 text-[#9a9187]" />
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </div>
                      {menu.destructive ? (
                        <div className="border-t border-[#efe6dc]">
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenFor(null);
                              menu.destructive?.onClick();
                            }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[#e11d48] hover:bg-[#fde8ee]"
                          >
                            {(() => {
                              const destructive = menu.destructive;
                              if (!destructive) return null;
                              const Icon = destructive.icon;
                              return <Icon className="h-4 w-4" />;
                            })()}
                            <span>{menu.destructive?.label}</span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}

            <button
              type="button"
              className="min-w-48 rounded-xl border border-dashed border-[#d9cfc4] px-4 py-3 text-left text-sm text-[#6b645c]"
              onClick={() => {
                setEditingFolderId(null);
                setFolderName("");
                setFolderDescription("");
                setFolderHidden(false);
                setShowFolderModal(true);
              }}
            >
              + Add folder
            </button>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-[#8a7f73]">
                {selectedFolderId === "photos" ? "All photos" : "Folder"} ·{" "}
                {activeFolderPhotos.length} files
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-full bg-[#101114] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>

            {selectedFolderDescription ? (
              <p className="mt-6 text-center text-sm text-[#8a7f73]">{selectedFolderDescription}</p>
            ) : null}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onUpload}
              className="hidden"
            />

            {activeFolderPhotos.length === 0 ? (
              <div className="mt-10 rounded-[26px] border border-[#e3d8cc] bg-white p-10 text-center">
                <p className="text-lg font-semibold text-[#15161a]">There are no files in this folder yet</p>
                <p className="mt-2 text-sm text-[#8a7f73]">Drag files here or click Upload</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-6 rounded-full bg-[#101114] px-6 py-2.5 text-sm font-semibold text-white"
                >
                  Upload
                </button>
              </div>
            ) : (
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {activeFolderPhotos.map((photo) => {
                  const isDownloaded = downloadedIds.has(photo.id);
                  const isLiked = favoriteIds.has(photo.id);
                  return (
                  <div key={photo.id} className="group relative">
                    <div className="relative">
                      <div className="mb-2 flex items-center overflow-visible rounded-full border border-[#e3d8cc] bg-white/90 opacity-0 shadow transition group-hover:opacity-100">
                        {[
                          {
                            label: coverPhotoId === photo.id ? "Cover selected" : "cover",
                            icon: Star,
                            onClick: () => setPhotoAsCover(photo.id),
                            active: coverPhotoId === photo.id,
                            danger: false,
                          },
                          {
                            label: "Preview",
                            icon: ExternalLink,
                            onClick: () => previewPhoto(photo.id),
                            active: false,
                            danger: false,
                          },
                          {
                            label: "Rename",
                            icon: PencilLine,
                            onClick: () => renamePhoto(photo.id),
                            active: false,
                            danger: false,
                          },
                          {
                            label: "Download file",
                            icon: ArrowDownToLine,
                            onClick: () => downloadPhoto(photo),
                            active: false,
                            danger: false,
                          },
                          {
                            label: "Copy link",
                            icon: LinkIcon,
                            onClick: () => copyPhotoLink(photo.id),
                            active: false,
                            danger: false,
                          },
                          {
                            label: "Delete photo",
                            icon: Trash2,
                            onClick: () => deletePhoto(photo.id),
                            active: false,
                            danger: true,
                          },
                        ].map((action) => {
                          const Icon = action.icon;
                          return (
                            <div key={action.label} className="group/action relative">
                              <button
                                type="button"
                                onClick={action.onClick}
                                className={`flex h-8 w-8 items-center justify-center transition ${
                                  action.danger
                                    ? "text-[#e11d48] hover:bg-[#fde8ee]"
                                    : action.active
                                      ? "text-[#d97757] hover:bg-[#f2ece4]"
                                      : "text-[#4a433d] hover:bg-[#f2ece4]"
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                              </button>
                              <div className="pointer-events-none absolute -top-12 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-[#2a2928] px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover/action:opacity-100">
                                {action.label}
                                <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#2a2928]" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="h-56 w-full overflow-hidden rounded-[14px] shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt={photo.name} className="h-full w-full object-cover" />
                      </div>
                    </div>
                    <div className="pt-2">
                      <p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-[#6b645c]">
                        {photo.name}
                      </p>
                      {isDownloaded || isLiked ? (
                        <div className="mt-2 flex items-center justify-center gap-1">
                          {isDownloaded ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#f5f3ef] text-[#3b3430]">
                              <ArrowDownToLine className="h-2.5 w-2.5" />
                            </span>
                          ) : null}
                          {isLiked ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#fdf1f4] text-[#e11d48]">
                              <Heart className="h-2.5 w-2.5 fill-current" />
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "favorites" && (
        <div className="mt-8 space-y-8">
          {favoriteFolders.length === 0 ? (
            <div className="rounded-[26px] border border-[#e3d8cc] bg-white p-10 text-center text-[#8a7f73]">
              No favorites yet. Favorites will appear here when clients like photos in the gallery.
            </div>
          ) : (
            <>
              <div className="relative z-20 flex flex-wrap items-stretch gap-4">
                {favoriteFolders.map((selection) => {
                  const selectionKey = getFavoriteSelectionKey(selection);
                  return (
                    <button
                      key={selectionKey}
                      type="button"
                      onClick={() => setSelectedFavoriteFolderKey(selectionKey)}
                      className={`min-w-48 rounded-xl border px-4 py-3 text-left text-sm ${
                        activeFavoriteFolder && getFavoriteSelectionKey(activeFavoriteFolder) === selectionKey
                          ? "border-[#15161a] bg-white text-[#15161a]"
                          : "border-[#e3d8cc] bg-white/60 text-[#6b645c]"
                      }`}
                    >
                      <p className="font-semibold">{selection.folderName}</p>
                      <p className="mt-1 text-xs text-[#8a7f73]">{selection.folderDescription}</p>
                    </button>
                  );
                })}
              </div>

              {activeFavoriteFolder ? (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[#8a7f73]">
                      Favorites folder · {activeFavoriteFolder.items.length} files
                    </p>
                    <div className="flex flex-wrap gap-3">
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {activeFavoriteFolder.items.map((photo) => {
                      return (
                        <div key={photo.id} className="group relative">
                          <div className="relative">
                            <div className="mb-2 flex w-25 items-center overflow-visible rounded-full border border-[#e3d8cc] bg-white/90 opacity-0 shadow transition group-hover:opacity-100">
                              {[
                                {
                                  label: "Preview",
                                  icon: ExternalLink,
                                  onClick: () => {
                                    if (!previewPath) return;
                                    const url = new URL(previewPath, window.location.origin);
                                    url.searchParams.set("photo", photo.id);
                                    window.open(url.toString(), "_blank", "noopener,noreferrer");
                                  },
                                  active: false,
                                  danger: false,
                                },
                                {
                                  label: "Download photo",
                                  icon: ArrowDownToLine,
                                  onClick: () => downloadPhoto(photo),
                                  active: false,
                                  danger: false,
                                },
                                {
                                  label: "Remove from favorites",
                                  icon: HeartMinusIcon,
                                  onClick: () => removeFavoritePhoto(activeFavoriteFolder, photo.id),
                                  active: true,
                                  danger: true,
                                },
                              ].map((action) => {
                                const Icon = action.icon;
                                return (
                                  <div key={action.label} className="group/action relative">
                                    <button
                                      type="button"
                                      onClick={action.onClick}
                                      className={`flex h-8 w-8 items-center justify-center transition ${
                                        action.danger
                                          ? "text-[#e11d48] hover:bg-[#fde8ee]"
                                          : action.active
                                            ? "text-[#d97757] hover:bg-[#f2ece4]"
                                            : "text-[#4a433d] hover:bg-[#f2ece4]"
                                      }`}
                                    >
                                      <Icon className={`h-4 w-4 ${action.active ? "fill-current" : ""}`} />
                                    </button>
                                    <div className="pointer-events-none absolute -top-12 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-[#2a2928] px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover/action:opacity-100">
                                      {action.label}
                                      <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#2a2928]" />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="h-56 w-full overflow-hidden rounded-[14px] shadow-sm">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photo.url} alt={photo.name} className="h-full w-full object-cover" />
                            </div>
                          </div>
                          <div className="pt-2">
                            <p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-[#6b645c]">
                              {photo.name}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}

      {activeTab === "design" && (
        <div className="mt-10 rounded-[26px] border border-[#e3d8cc] bg-white p-8">
          <h2 className="font-display text-2xl font-semibold text-[#15161a]">Design and cover</h2>
          <p className="mt-2 text-sm text-[#8a7f73]">
            Customize the gallery cover and visual style. (Layout only, wire the actions you want.)
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="overflow-hidden rounded-[20px] border border-[#e3d8cc] bg-[#f7f3ee]">
              {photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={(photos.find((photo) => photo.id === coverPhotoId) ?? photos[0]).url}
                  alt="Cover preview"
                  className="h-52 w-full object-cover"
                />
              ) : (
                <div className="flex h-52 items-center justify-center text-sm text-[#8a7f73]">No cover yet</div>
              )}
            </div>
            <div className="space-y-4">
              <button className="w-full rounded-full border border-[#d9cfc4] px-6 py-2.5 text-sm font-semibold text-[#4a433d]">
                Choose cover
              </button>
              <button className="w-full rounded-full border border-[#d9cfc4] px-6 py-2.5 text-sm font-semibold text-[#4a433d]">
                Change theme
              </button>
              <button className="w-full rounded-full bg-[#101114] px-6 py-2.5 text-sm font-semibold text-white">
                Save design
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && initialGallery ? (
        <AddGalleryModal
          open={settingsOpen}
          initialGallery={initialGallery}
          onClose={() => {
            setSettingsOpen(false);
            setActiveTab("gallery");
          }}
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
            setGallery((prev) => (prev ? { ...prev, name: updated.name } : prev));
          }}
          onCreated={() => {
            // No-op: settings modal only.
          }}
        />
      ) : null}

      {showFavoriteFolderModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-[#15161a]">Create favorites folder</h3>
              <button
                type="button"
                className="h-9 w-9 rounded-full bg-[#f0e6db] text-[#6b645c]"
                onClick={() => {
                  setShowFavoriteFolderModal(false);
                  setPendingFavoriteFolderKey(null);
                  setFavoriteFolderName("");
                  setFavoriteFolderDescription("");
                }}
              >
                Ã—
              </button>
            </div>
            <div className="mt-6 space-y-4 rounded-xl bg-[#f8f4ee] p-6">
              <label className="block text-sm font-semibold text-[#15161a]">
                Folder name
                <input
                  value={favoriteFolderName}
                  onChange={(e) => setFavoriteFolderName(e.target.value)}
                  placeholder="For example: Bride selection"
                  className="mt-2 h-11 w-full rounded-md border border-[#e3d8cc] bg-white px-3"
                />
              </label>
              <label className="block text-sm font-semibold text-[#15161a]">
                Description
                <textarea
                  value={favoriteFolderDescription}
                  onChange={(e) => setFavoriteFolderDescription(e.target.value)}
                  placeholder="Add a short note for this favorites folder"
                  className="mt-2 h-28 w-full rounded-md border border-[#e3d8cc] bg-white px-3 py-2"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowFavoriteFolderModal(false);
                  setPendingFavoriteFolderKey(null);
                  setFavoriteFolderName("");
                  setFavoriteFolderDescription("");
                }}
                className="rounded-md border border-[#d9cfc4] px-6 py-2 text-sm font-semibold text-[#4a433d]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createFavoriteFolder}
                className="rounded-md bg-[#101114] px-6 py-2 text-sm font-semibold text-white"
              >
                Save folder
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showFolderModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-[#15161a]">
                {editingFolderId ? "Edit folder" : "Adding a new folder"}
              </h3>
              <button
                type="button"
                className="h-9 w-9 rounded-full bg-[#f0e6db] text-[#6b645c]"
                onClick={() => {
                  setShowFolderModal(false);
                  setEditingFolderId(null);
                  setFolderName("");
                  setFolderDescription("");
                  setFolderHidden(false);
                }}
              >
                ×
              </button>
            </div>
            <div className="mt-6 space-y-4 rounded-xl bg-[#f8f4ee] p-6">
              <label className="block text-sm font-semibold text-[#15161a]">
                Folder name
                <input
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="For example: wedding"
                  className="mt-2 h-11 w-full rounded-md border border-[#e3d8cc] bg-white px-3"
                />
              </label>
              <label className="block text-sm font-semibold text-[#15161a]">
                Description
                <textarea
                  value={folderDescription}
                  onChange={(e) => setFolderDescription(e.target.value)}
                  placeholder="For example: YO photos"
                  className="mt-2 h-28 w-full rounded-md border border-[#e3d8cc] bg-white px-3 py-2"
                />
              </label>
              <p className="text-xs text-[#8a7f73]">
                This text will appear in front of your photos and videos. You can add a description for each folder.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between rounded-xl border border-[#e3d8cc] bg-white px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[#15161a]">Hide folder</p>
                <p className="text-xs text-[#8a7f73]">
                  Hidden folders are only visible with a password or via a direct link.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFolderHidden((prev) => !prev)}
                className={`relative h-6 w-11 rounded-full transition ${folderHidden ? "bg-[#101114]" : "bg-[#e3d8cc]"
                  }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${folderHidden ? "left-6" : "left-1"
                    }`}
                />
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowFolderModal(false);
                  setEditingFolderId(null);
                  setFolderName("");
                  setFolderDescription("");
                  setFolderHidden(false);
                }}
                className="rounded-md border border-[#d9cfc4] px-6 py-2 text-sm font-semibold text-[#4a433d]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onCreateFolder}
                className="rounded-md bg-[#101114] px-6 py-2 text-sm font-semibold text-white"
              >
                {editingFolderId ? "Save" : "Add"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

