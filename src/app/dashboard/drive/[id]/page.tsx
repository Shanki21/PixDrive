"use client";

import { ChangeEvent, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import fetchWithRetry from "@/lib/fetchWithRetry";
import AddGalleryModal from "@/components/drive/AddGalleryModal";
import { confirmPixoraAction, showPixoraAlert, showPixoraToast } from "@/lib/pixora-alerts";
import type { GalleryMetaConfig } from "@/lib/gallery-config";
import { MinimalGallery } from "@/types/DriveTableTypes";
import {
  ArrowDownToLine,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Heart,
  Link as LinkIcon,
  Lock,
  MoreVertical,
  PencilLine,
  Search,
  Settings,
  SlidersHorizontal,
  Square,
  Star,
  Trash2,
  X,
  UploadCloud,
  HeartMinusIcon,
} from "lucide-react";

type GalleryDetail = {
  id: string;
  name: string;
  slug?: string | null;
  createdAt?: string | null;
  photosCount?: number | null;
  expiresAt?: string | null;
  storageTimeLabel?: string | null;
  favoritesEnabled?: boolean;
  favoritesLimitSelected?: boolean;
  favoritesName?: string | null;
  favoritesListsCount?: number;
  selectionCompletedCount?: number;
  favoritesMaxSelected?: number | null;
  coverPositionX?: number;
  coverPositionY?: number;
  published?: boolean;
  oneQrEnabled?: boolean;
  folders?: Folder[];
  folderPhotosMap?: Record<string, string[]>;
  folderOrder?: string[];
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
  clientKey?: string;
  photoIds: string[];
};

type ClientFavoritesPayload = {
  selections?: ClientFavoritesSelection[];
  photos?: GalleryPhoto[];
};

type FavoriteFolderMeta = {
  name: string;
  description: string;
  createdAt: string;
};

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

type SignedUploadResponse = {
  ok?: boolean;
  upload?: {
    provider: "cloudinary" | "r2";
    method: "POST" | "PUT";
    uploadUrl: string;
    publicUrl?: string | null;
    fields?: Record<string, string | number>;
    headers?: Record<string, string>;
  };
};

type CloudinaryUploadResponse = {
  secure_url?: string;
  url?: string;
};

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

async function uploadFileDirectly(file: File) {
  const signedRes = await fetchWithRetry(
    "/api/storage/signed-upload",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, contentType: file.type || "image/jpeg" }),
    },
    { dedupeKey: `storage:signed-upload:${file.name}:${file.size}` }
  );
  if (!signedRes.ok) return null;

  const payload = (await signedRes.json().catch(() => null)) as SignedUploadResponse | null;
  const upload = payload?.upload;
  if (!payload?.ok || !upload) return null;

  if (upload.provider === "r2") {
    const uploadRes = await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: upload.headers ?? { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!uploadRes.ok) {
      throw new Error(`Unable to upload ${file.name}`);
    }
    return upload.publicUrl ?? null;
  }

  const formData = new FormData();
  Object.entries(upload.fields ?? {}).forEach(([key, value]) => {
    formData.append(key, String(value));
  });
  formData.append("file", file);

  const uploadRes = await fetch(upload.uploadUrl, {
    method: "POST",
    body: formData,
  });
  if (!uploadRes.ok) {
    throw new Error(`Unable to upload ${file.name}`);
  }

  const uploaded = (await uploadRes.json()) as CloudinaryUploadResponse;
  return uploaded.secure_url ?? uploaded.url ?? null;
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

function mergePhotosById(current: GalleryPhoto[], incoming: GalleryPhoto[]) {
  if (incoming.length === 0) return current;
  const existingIds = new Set(current.map((photo) => photo.id));
  const next = [...current];
  incoming.forEach((photo) => {
    if (!existingIds.has(photo.id)) {
      existingIds.add(photo.id);
      next.push(photo);
    }
  });
  return next;
}

export default function DriveDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const galleryId = params?.id;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [gallery, setGallery] = useState<GalleryDetail | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ total: 0, done: 0, current: "" });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"gallery" | "favorites">("gallery");
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
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [showFavoriteFolderModal, setShowFavoriteFolderModal] = useState(false);
  const [pendingFavoriteFolderKey, setPendingFavoriteFolderKey] = useState<string | null>(null);
  const [favoriteFolderName, setFavoriteFolderName] = useState("");
  const [favoriteFolderDescription, setFavoriteFolderDescription] = useState("");
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [folderZipBusy, setFolderZipBusy] = useState<string | null>(null);
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null);
  const [coverCropOpen, setCoverCropOpen] = useState(false);
  const [coverPosition, setCoverPosition] = useState({ x: 50, y: 50 });
  const [photoSearch, setPhotoSearch] = useState("");
  const deferredPhotoSearch = useDeferredValue(photoSearch);
  const [photoRenderLimit, setPhotoRenderLimit] = useState(80);
  const [favoriteRenderLimit, setFavoriteRenderLimit] = useState(80);
  const [sortMode, setSortMode] = useState<"latest" | "name">("latest");

  const openOneQrTab = () => {
    if (!galleryId) return;
    router.push(`/dashboard/qr-code?event=${encodeURIComponent(galleryId)}`);
  };

  const initialGallery = useMemo(() => {
    if (!gallery) return null;
    return {
      id: gallery.id,
      name: gallery.name,
      createdAt: gallery.createdAt ?? null,
      filesCount: gallery.photosCount ?? photos.length,
      favoritesEnabled: gallery.favoritesEnabled ?? true,
      favoritesLimitSelected: gallery.favoritesLimitSelected ?? false,
      favoritesName: gallery.favoritesName ?? undefined,
      favoritesListsCount: gallery.favoritesListsCount ?? 0,
      selectionCompletedCount: gallery.selectionCompletedCount ?? 0,
      favoritesMaxSelected: gallery.favoritesMaxSelected ?? null,
      storageTimeLabel: gallery.storageTimeLabel ?? undefined,
      coverPositionX: gallery.coverPositionX ?? 50,
      coverPositionY: gallery.coverPositionY ?? 50,
      expiresAt: gallery.expiresAt ?? undefined,
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
          fetchWithRetry(`/api/galleries/${galleryId}`, {}, { dedupeKey: `client:galleries:load:${galleryId}` }),
          fetchWithRetry(`/api/galleries/${galleryId}/photos?take=120`, {}, { dedupeKey: `client:galleries:photos:${galleryId}:take=120` }),
        ]);

        const galleryType = galleryRes.headers.get("content-type") ?? "";
        if (galleryRes.status === 401 || photosRes.status === 401) {
          router.push(`/login?next=${encodeURIComponent(`/dashboard/drive/${galleryId}`)}`);
          return;
        }

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
          setCoverPosition({ x: galleryData.coverPositionX ?? 50, y: galleryData.coverPositionY ?? 50 });
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
  }, [galleryId, router]);

  useEffect(() => {
    if (!galleryId) return;
    const serverFolders = gallery?.folders ?? [];
    const serverFolderMap = gallery?.folderPhotosMap ?? {};
    const serverFolderOrder = gallery?.folderOrder ?? [];
    const nextFolders = serverFolders.length > 0 ? serverFolders : readFolders(galleryId);
    const nextFolderMap = Object.keys(serverFolderMap).length > 0 ? serverFolderMap : readFolderPhotos(galleryId);
    const nextFolderOrder = serverFolderOrder.length > 0 ? serverFolderOrder : readFolderOrder(galleryId);
    setFolders(nextFolders);
    setFolderPhotos(nextFolderMap);
    setFolderOrder(normalizeFolderOrder(nextFolderOrder, nextFolders));
    const localSelections = readClientSelections(galleryId);
    setClientSelections(localSelections);
    const localFavoriteIds = new Set<string>();
    localSelections.forEach((entry) => entry.photoIds.forEach((photoId) => localFavoriteIds.add(photoId)));
    setFavoriteIds(localFavoriteIds);
    setDownloadedIds(readClientDownloads(galleryId));
    setFavoriteFolderMeta(readFavoriteFolderMeta(galleryId));
    const savedTab = window.localStorage.getItem(`${ACTIVE_TAB_STORAGE_PREFIX}${galleryId}`);
    if (savedTab === "gallery" || savedTab === "favorites") {
      setActiveTab(savedTab);
    }
  }, [gallery?.folderOrder, gallery?.folderPhotosMap, gallery?.folders, galleryId]);

  useEffect(() => {
    if (!galleryId) return;
    let active = true;

    const loadServerClientSignals = async () => {
      try {
        const [favoritesRes, downloadsRes] = await Promise.all([
          fetchWithRetry(`/api/galleries/${galleryId}/client-actions?action=favorite`, {}, { dedupeKey: `client:galleries:client-actions:${galleryId}:favorite` }),
          fetchWithRetry(`/api/galleries/${galleryId}/client-actions?action=download`, {}, { dedupeKey: `client:galleries:client-actions:${galleryId}:download` }),
        ]);

        if (favoritesRes.ok) {
          const favoritesPayload = (await favoritesRes.json()) as ClientFavoritesPayload;
          const selections = Array.isArray(favoritesPayload.selections) ? favoritesPayload.selections : [];
          const favoritePhotos = Array.isArray(favoritesPayload.photos) ? favoritesPayload.photos : [];
          if (active) {
            setClientSelections(selections);
            writeClientSelections(galleryId, selections);
            setPhotos((prev) => mergePhotosById(prev, favoritePhotos));
            const nextFavorites = new Set<string>();
            selections.forEach((entry) => entry.photoIds.forEach((photoId) => nextFavorites.add(photoId)));
            setFavoriteIds(nextFavorites);
          }
        }

        if (downloadsRes.ok) {
          const downloadsPayload = (await downloadsRes.json()) as { photoIds?: string[] };
          const ids = Array.isArray(downloadsPayload.photoIds) ? downloadsPayload.photoIds : [];
          if (active) {
            setDownloadedIds(new Set(ids));
            window.localStorage.setItem(`${CLIENT_DOWNLOADS_PREFIX}${galleryId}`, JSON.stringify(ids));
          }
        }
      } catch {
        // Keep dashboard usable even if server summary is temporarily unavailable.
      }
    };

    void loadServerClientSignals();
    return () => {
      active = false;
    };
  }, [galleryId]);

  useEffect(() => {
    if (!galleryId || activeTab !== "favorites") return;
    let active = true;

    const refreshFavorites = async () => {
      try {
        const favoritesRes = await fetchWithRetry(
          `/api/galleries/${galleryId}/client-actions?action=favorite`,
          { cache: "no-store" },
          { dedupeKey: `client:galleries:client-actions:${galleryId}:favorite:tab:${Date.now()}` }
        );
        if (!favoritesRes.ok) return;

        const favoritesPayload = (await favoritesRes.json()) as ClientFavoritesPayload;
        const selections = Array.isArray(favoritesPayload.selections) ? favoritesPayload.selections : [];
        const favoritePhotos = Array.isArray(favoritesPayload.photos) ? favoritesPayload.photos : [];
        if (!active) return;

        setClientSelections(selections);
        writeClientSelections(galleryId, selections);
        setPhotos((prev) => mergePhotosById(prev, favoritePhotos));
        const nextFavorites = new Set<string>();
        selections.forEach((entry) => entry.photoIds.forEach((photoId) => nextFavorites.add(photoId)));
        setFavoriteIds(nextFavorites);
      } catch {
        // Keep the tab usable if the live refresh fails.
      }
    };

    void refreshFavorites();
    const interval = window.setInterval(refreshFavorites, 8000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [activeTab, galleryId]);

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
    if (!galleryId) return;
    window.localStorage.setItem(`${ACTIVE_TAB_STORAGE_PREFIX}${galleryId}`, activeTab);
  }, [activeTab, galleryId]);

  useEffect(() => {
    if (!galleryId || !gallery) return;
    const timeout = window.setTimeout(() => {
      void fetchWithRetry(`/api/galleries/${encodeURIComponent(galleryId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta: {
            folders,
            folderPhotosMap: folderPhotos,
            folderOrder,
          },
        }),
      }, { dedupeKey: `client:galleries:meta:patch:${galleryId}`, idempotencyKey: `client:galleries:meta:patch:${galleryId}:${Date.now()}` });
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [folderOrder, folderPhotos, folders, gallery, galleryId]);

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
        return {
          ...selection,
          folderName: selection.name,
          folderDescription: selection.email,
          items,
        };
      })
      .filter((selection) => selection.items.length > 0);
  }, [clientSelections, photos]);

  const getFavoriteSelectionKey = (selection: ClientFavoritesSelection) => `${selection.name}::${selection.email}`;

  const activeFavoriteFolder = useMemo(() => {
    if (favoriteFolders.length === 0) return null;
    return (
      favoriteFolders.find((selection) => getFavoriteSelectionKey(selection) === selectedFavoriteFolderKey) ??
      favoriteFolders[0]
    );
  }, [favoriteFolders, selectedFavoriteFolderKey]);

  const activeFavoritePhotos = useMemo(() => {
    return activeFavoriteFolder ? activeFavoriteFolder.items : favoritePhotos;
  }, [activeFavoriteFolder, favoritePhotos]);

  const sortedFavoritePhotos = useMemo(() => {
    if (sortMode === "latest") return activeFavoritePhotos;
    return [...activeFavoritePhotos].sort((a, b) => a.name.localeCompare(b.name));
  }, [activeFavoritePhotos, sortMode]);

  const filteredFavoritePhotos = useMemo(() => {
    const query = deferredPhotoSearch.trim().toLowerCase();
    if (!query) return sortedFavoritePhotos;
    return sortedFavoritePhotos.filter((photo) => photo.name.toLowerCase().includes(query));
  }, [sortedFavoritePhotos, deferredPhotoSearch]);

  const visibleFavoritePhotos = useMemo(
    () => filteredFavoritePhotos.slice(0, favoriteRenderLimit),
    [filteredFavoritePhotos, favoriteRenderLimit]
  );

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

  const sortedFolderPhotos = useMemo(() => {
    if (sortMode === "latest") {
      return activeFolderPhotos;
    }
    return [...activeFolderPhotos].sort((a, b) => a.name.localeCompare(b.name));
  }, [activeFolderPhotos, sortMode]);

  const filteredFolderPhotos = useMemo(() => {
    const query = deferredPhotoSearch.trim().toLowerCase();
    if (!query) return sortedFolderPhotos;
    return sortedFolderPhotos.filter((photo) => photo.name.toLowerCase().includes(query));
  }, [sortedFolderPhotos, deferredPhotoSearch]);

  const visibleFolderPhotos = useMemo(
    () => filteredFolderPhotos.slice(0, photoRenderLimit),
    [filteredFolderPhotos, photoRenderLimit]
  );
  const selectedPhotos = useMemo(
    () => photos.filter((photo) => selectedPhotoIds.has(photo.id)),
    [photos, selectedPhotoIds]
  );
  const visibleFolderPhotoIds = useMemo(
    () => visibleFolderPhotos.map((photo) => photo.id),
    [visibleFolderPhotos]
  );
  const allVisibleFolderPhotosSelected = useMemo(
    () => visibleFolderPhotoIds.length > 0 && visibleFolderPhotoIds.every((id) => selectedPhotoIds.has(id)),
    [selectedPhotoIds, visibleFolderPhotoIds]
  );

  useEffect(() => {
    setPhotoRenderLimit(80);
    setFavoriteRenderLimit(80);
    setSelectedPhotoIds(new Set());
  }, [activeTab, deferredPhotoSearch, selectedFolderId, selectedFavoriteFolderKey, sortMode]);

  useEffect(() => {
    setSelectedPhotoIds((prev) => {
      const validIds = new Set(photos.map((photo) => photo.id));
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [photos]);

  const uploadFiles = async (files: File[]) => {
    if (!galleryId || files.length === 0) return;

    setUploading(true);
    setUploadError(null);
    setUploadProgress({ total: files.length, done: 0, current: files[0]?.name ?? "" });
    try {
      for (const [index, file] of files.entries()) {
        setUploadProgress({ total: files.length, done: index, current: file.name });
        let uploadedUrl: string | null = null;
        try {
          uploadedUrl = await uploadFileDirectly(file);
        } catch {
          uploadedUrl = null;
        }
        const finalUrl = uploadedUrl ?? (await preparePhotoUpload(file));

        const res = await fetchWithRetry(`/api/galleries/${galleryId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, url: finalUrl }),
        }, { dedupeKey: `drive:upload:${galleryId}:${file.name}`, idempotencyKey: `drive:upload:${galleryId}:${file.name}:${Date.now()}` });

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
        setUploadProgress({ total: files.length, done: index + 1, current: file.name });
      }
      void showPixoraToast({
        title: `${files.length} photo${files.length === 1 ? "" : "s"} uploaded`,
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Unable to upload photos");
    } finally {
      setUploading(false);
      setUploadProgress({ total: 0, done: 0, current: "" });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    await uploadFiles(files);
  };

  const getFolderPhotoList = (folderId: string) => {
    if (folderId === "photos") return photos;
    const ids = folderPhotos[folderId] ?? [];
    const idSet = new Set(ids);
    return photos.filter((photo) => idSet.has(photo.id));
  };

  const openFolderInOneQr = (folderId: string) => {
    void folderId;
    openOneQrTab();
  };

  const openPhotoInOneQr = (photoId: string) => {
    void photoId;
    openOneQrTab();
  };

  const renamePhoto = async (photoId: string) => {
    const photo = photos.find((item) => item.id === photoId);
    if (!photo) return;
    const nextName = window.prompt("Rename photo", photo.name)?.trim();
    if (!nextName || nextName === photo.name) return;

    try {
      const dedupe = `drive:photo:rename:${photoId}:${nextName}`;
      const res = await fetchWithRetry(`/api/photos/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      }, { dedupeKey: dedupe, idempotencyKey: dedupe });
      if (!res.ok) return;
      setPhotos((prev) => prev.map((item) => (item.id === photoId ? { ...item, name: nextName } : item)));
    } catch {
      // Ignore rename failures.
    }
  };

  const downloadPhoto = async (photo: GalleryPhoto) => {
    try {
      const response = await fetchWithRetry(photo.url, { method: "GET" }, { dedupeKey: `drive:photo:fetch:${photo.id}` });
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

  const downloadSelectedPhotos = async () => {
    if (selectedPhotos.length === 0) return;
    for (const photo of selectedPhotos) {
      await downloadPhoto(photo);
    }
    void showPixoraToast({ title: `${selectedPhotos.length} photo${selectedPhotos.length === 1 ? "" : "s"} downloaded` });
  };

  const setPhotoAsCover = async (photoId: string) => {
    if (!galleryId) return;
    try {
      const dedupe = `drive:photo:setcover:${galleryId}:${photoId}`;
      const res = await fetchWithRetry(`/api/galleries/${galleryId}/cover`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      }, { dedupeKey: dedupe, idempotencyKey: dedupe });
      if (!res.ok) return;
      setCoverPhotoId(photoId);
      setActiveTab("gallery");
    } catch {
      // Ignore cover failures.
    }
  };

  const coverPhoto = useMemo(
    () => photos.find((photo) => photo.id === coverPhotoId) ?? null,
    [coverPhotoId, photos]
  );

  const openCoverCrop = (photoId: string) => {
    setPhotoAsCover(photoId);
    setCoverCropOpen(true);
  };

  const updateCoverPositionFromClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((event.clientY - rect.top) / rect.height) * 100);
    setCoverPosition({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    });
  };

  const saveCoverPosition = async () => {
    if (!galleryId) return;
    const metaPayload: GalleryMetaConfig = {
      coverPositionX: coverPosition.x,
      coverPositionY: coverPosition.y,
    };
    const dedupe = `gallery:cover-position:${galleryId}:${coverPosition.x}:${coverPosition.y}`;
    const res = await fetchWithRetry(`/api/galleries/${encodeURIComponent(galleryId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meta: metaPayload }),
    }, { dedupeKey: dedupe, idempotencyKey: dedupe });
    if (!res.ok) return;
    setGallery((prev) => (prev ? { ...prev, ...metaPayload } : prev));
    setCoverCropOpen(false);
  };

  const deletePhotoById = async (photoId: string) => {
    const dedupe = `drive:photo:delete:${photoId}`;
    const res = await fetchWithRetry(`/api/photos/${photoId}`, { method: "DELETE" }, { dedupeKey: dedupe, idempotencyKey: dedupe });
    if (!res.ok) {
      throw new Error("delete-failed");
    }

    setPhotos((prev) => prev.filter((item) => item.id !== photoId));
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      next.delete(photoId);
      return next;
    });
    setSelectedPhotoIds((prev) => {
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
  };

  const deletePhoto = async (photoId: string) => {
    const confirmed = await confirmPixoraAction({
      title: "Delete this photo?",
      text: "This removes the photo from this gallery.",
      confirmText: "Delete photo",
      cancelText: "Keep photo",
      icon: "warning",
    });
    if (!confirmed) return;

    try {
      await deletePhotoById(photoId);
      void showPixoraToast({ title: "Photo deleted" });
    } catch {
      void showPixoraAlert({
        title: "Unable to delete photo",
        text: "Please check your connection and try again.",
        icon: "error",
      });
    }
  };

  const deleteSelectedPhotos = async () => {
    if (selectedPhotos.length === 0) return;
    const count = selectedPhotos.length;
    const confirmed = await confirmPixoraAction({
      title: `Delete ${count} selected photo${count === 1 ? "" : "s"}?`,
      text: "This removes the selected photos from this gallery.",
      confirmText: `Delete ${count}`,
      cancelText: "Keep photos",
      icon: "warning",
    });
    if (!confirmed) return;

    try {
      for (const photo of selectedPhotos) {
        await deletePhotoById(photo.id);
      }
      void showPixoraToast({ title: `${count} photo${count === 1 ? "" : "s"} deleted` });
    } catch {
      void showPixoraAlert({
        title: "Unable to delete selected photos",
        text: "Some photos may not have been removed. Please refresh and try again.",
        icon: "error",
      });
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const toggleVisiblePhotoSelection = () => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (allVisibleFolderPhotosSelected) {
        visibleFolderPhotoIds.forEach((id) => next.delete(id));
      } else {
        visibleFolderPhotoIds.forEach((id) => next.add(id));
      }
      return next;
    });
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

  const deleteFolder = async (folderId: string) => {
    if (!galleryId) return;
    const confirmed = await confirmPixoraAction({
      title: "Delete this folder?",
      text: "Photos will stay in the gallery, but this folder grouping will be removed.",
      confirmText: "Delete folder",
      cancelText: "Keep folder",
      icon: "warning",
    });
    if (!confirmed) return;

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
    void showPixoraToast({ title: "Folder deleted" });
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
    const nextFavoriteIds = new Set<string>();
    nextSelections.forEach((entry) => entry.photoIds.forEach((id) => nextFavoriteIds.add(id)));
    setFavoriteIds(nextFavoriteIds);

    if (selection.clientKey) {
      const dedupe = `client-actions:favorite:${galleryId}:${selection.clientKey}:${photoId}`;
      void fetchWithRetry(`/api/galleries/${galleryId}/client-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actions: [
            {
              photoId,
              action: "favorite",
              liked: false,
              clientKey: selection.clientKey,
              clientName: selection.name,
              clientEmail: selection.email,
            },
          ],
        }),
      }, { dedupeKey: dedupe, idempotencyKey: dedupe });
    }

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
          const response = await fetchWithRetry(photo.url, { method: "GET" }, { dedupeKey: `drive:photo:fetch:${photo.id}` });
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

  const getFolderMenuItems = (folderId: string) => {
    const isPhotos = folderId === "photos";
    const folder = folders.find((f) => f.id === folderId);
    const currentOrder = normalizeFolderOrder(folderOrder, folders);
    const orderIndex = currentOrder.indexOf(folderId);

    const items = [
      {
        label: "Open in One QR",
        icon: LinkIcon,
        onClick: () => openFolderInOneQr(folderId),
      },
      {
        label: "Settings",
        icon: Settings,
        onClick: () => {
          if (isPhotos) {
            setSettingsOpen(true);
            return;
          }
          startEditFolder(folderId);
        },
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
        onClick: () => void deleteFolder(folderId),
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
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center px-6 py-24 text-center text-[#8a7f73]">
        <div className="relative mb-5 h-14 w-14">
          <div className="absolute inset-0 rounded-full border-4 border-[#ead7c5]" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#7a3f13]" />
          <div className="absolute inset-3 animate-pulse rounded-full bg-[#f4e5d3]" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a3f13]">Opening gallery</p>
        <p className="mt-2 text-sm text-[#7a6a55]">Preparing photos, folders, and client selections...</p>
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-16 text-center">
        <h1 className="font-display text-3xl font-semibold text-[#2a170d]">Gallery unavailable</h1>
        <p className="mt-3 text-sm text-[#8a7f73]">{error ?? "This gallery could not be loaded."}</p>
        <button
          className="mt-6 rounded-full bg-[#2a170d] px-6 py-2.5 text-sm font-semibold text-white"
          onClick={() => router.push("/dashboard/drive")}
        >
          Back to Drive
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <section className="relative overflow-hidden rounded-[30px] border border-[#eadccf] bg-white shadow-[0_22px_44px_rgba(12,46,38,0.08)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#ead7c5]" />

        <div className="relative flex flex-col gap-6 px-5 pb-6 pt-7 md:px-8 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <button
              type="button"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#7a6a55] transition hover:text-[#2a170d]"
              onClick={() => router.push("/dashboard/drive")}
            >
              <span aria-hidden="true">&larr;</span>
              Back to My Events
            </button>

            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a3f13]">Pixora Upload Studio</p>
            <h1 className="font-display mt-2 text-3xl font-bold text-[#2a170d] md:text-4xl">{gallery.name}</h1>
            <p className="mt-2 text-sm text-[#58726a]">
              Saved until {formatDate(initialGallery?.expiresAt ?? null)}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#ead7c5] bg-[#fff7ee] px-3 py-1 text-xs font-semibold text-[#7a3f13]">
                {photos.length} photos
              </span>
              <span className="rounded-full border border-[#ead7c5] bg-[#fff4e8] px-3 py-1 text-xs font-semibold text-[#1f4f93]">
                {favoritePhotos.length} favorites
              </span>
              <span className="rounded-full border border-[#d7e7de] bg-[#fffaf4] px-3 py-1 text-xs font-semibold text-[#49685f]">
                {downloadedIds.size} downloads
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#7a3f13] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5b2b0c] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <UploadCloud className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload Photos"}
            </button>

            <button
              type="button"
              onClick={openOneQrTab}
              className="rounded-xl border border-[#ead7c5] bg-white px-4 py-2.5 text-sm font-semibold text-[#5b3a23] transition hover:border-[#7a3f13] hover:text-[#7a3f13]"
            >
              One QR
            </button>
          </div>
        </div>
      </section>

      {(uploading || uploadError) ? (
        <section className="mt-4 rounded-2xl border border-[#ead7c5] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(73,39,20,0.06)]">
          {uploading ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-[#2a170d]">
                  Uploading {uploadProgress.done + 1 > uploadProgress.total ? uploadProgress.total : uploadProgress.done + 1} of {uploadProgress.total}
                </span>
                <span className="max-w-[min(360px,80vw)] truncate text-xs font-medium text-[#7a6a55]">
                  {uploadProgress.current}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#f2e4d6]">
                <div
                  className="h-full rounded-full bg-linear-to-r from-[#7a3f13] to-[#b9783b] transition-all duration-300"
                  style={{
                    width: `${Math.max(
                      6,
                      Math.min(100, Math.round((uploadProgress.done / Math.max(uploadProgress.total, 1)) * 100))
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-[#8a735f]">Keep this tab open while Pixora adds your photos.</p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#b42343]">{uploadError}</p>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="text-xs font-semibold text-[#7a3f13] hover:text-[#5b2b0c]"
              >
                Dismiss
              </button>
            </div>
          )}
        </section>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-[#eadccf] bg-white p-2">
        {[
          { id: "gallery", label: "Gallery" },
          { id: "favorites", label: `Favorites (${favoritePhotos.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-[linear-gradient(140deg,#7a3f13_0%,#8b4a18_120%)] text-white shadow-[0_8px_20px_rgba(122,63,19,0.25)]"
                : "text-[#4e6b62] hover:bg-[#f2faf7] hover:text-[#2a170d]"
            }`}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onUpload}
        className="hidden"
      />

      {activeTab === "gallery" && (
        <div className="mt-6 space-y-6">
          <section className="rounded-3xl border border-[#eadccf] bg-white p-4 shadow-[0_12px_28px_rgba(13,46,39,0.06)] md:p-5">
            <div className="relative z-20 flex flex-wrap items-stretch gap-3">
              {orderedFolderIds.map((folderId) => {
                const isPhotos = folderId === "photos";
                const folder = isPhotos ? null : folders.find((item) => item.id === folderId);
                if (!isPhotos && !folder) return null;
                const menuId = `folder-${folderId}`;
                const menu = getFolderMenuItems(folderId);

                return (
                  <div key={folderId} className="relative min-w-52 max-w-[260px] flex-1">
                    <button
                      type="button"
                      onClick={() => setSelectedFolderId(folderId)}
                      className={`w-full rounded-2xl border px-4 py-3.5 pr-12 text-left text-sm transition ${
                        selectedFolderId === folderId
                          ? "border-[#7a3f13] bg-[linear-gradient(150deg,#ebf8f4_0%,#f2f9ff_100%)] text-[#2a170d]"
                          : "border-[#dcebe5] bg-[#fffdf8] text-[#4e6b62] hover:border-[#c4ddd3] hover:bg-white"
                      }`}
                    >
                      <p className="flex items-center gap-2 font-semibold">
                        {!isPhotos && folder?.hidden ? <Lock className="h-4 w-4 text-[#7a6a55]" /> : null}
                        <span>{isPhotos ? "Photos" : folder?.name}</span>
                      </p>
                      <p className="mt-1 text-xs text-[#628178]">
                        {isPhotos ? `${photos.length} files` : `${getFolderPhotoList(folderId).length} files`}
                      </p>
                    </button>

                    <button
                      type="button"
                      aria-label="Open folder actions"
                      onClick={(event) => {
                        event.stopPropagation();
                        setMenuOpenFor((prev) => (prev === menuId ? null : menuId));
                      }}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-[#eadccf] bg-white text-[#2a4d44] shadow-sm transition hover:bg-[#eff8f4]"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {menuOpenFor === menuId ? (
                      <div
                        className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-[#eadccf] bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="py-2 text-sm text-[#2a4a42]">
                          {menu.items.map((item) => (
                            <button
                              key={item.label}
                              type="button"
                              disabled={item.disabled}
                              onClick={() => {
                                setMenuOpenFor(null);
                                item.onClick();
                              }}
                              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${
                                item.disabled ? "cursor-not-allowed opacity-60" : "hover:bg-[#f2faf7]"
                              }`}
                            >
                              <item.icon className="h-4 w-4 text-[#638178]" />
                              <span>{item.label}</span>
                            </button>
                          ))}
                        </div>
                        {menu.destructive ? (
                          <div className="border-t border-[#e6f0ec]">
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenFor(null);
                                menu.destructive?.onClick();
                              }}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[#e11d48] hover:bg-[#fff1f4]"
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
                className="min-w-52 rounded-2xl border border-dashed border-[#d8b895] bg-[#f7fcfa] px-4 py-3.5 text-left text-sm font-semibold text-[#6d4426] transition hover:border-[#7a3f13] hover:bg-white"
                onClick={() => {
                  setEditingFolderId(null);
                  setFolderName("");
                  setFolderDescription("");
                  setFolderHidden(false);
                  setShowFolderModal(true);
                }}
              >
                + Add Folder
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-[#eadccf] bg-white p-5 shadow-[0_12px_28px_rgba(13,46,39,0.06)] md:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#2a170d]">
                  {selectedFolderId === "photos" ? "All Photos" : folders.find((folder) => folder.id === selectedFolderId)?.name ?? "Folder"}
                  <span className="ml-2 text-[#67857c]">{visibleFolderPhotos.length} shown / {filteredFolderPhotos.length} files</span>
                </p>
                {selectedFolderDescription ? (
                  <p className="mt-1 text-sm text-[#7a6a55]">{selectedFolderDescription}</p>
                ) : (
                  <p className="mt-1 text-sm text-[#7a6a55]">Upload, organize, and publish with a clean workflow.</p>
                )}
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
                <label className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f8b83]" />
                  <input
                    value={photoSearch}
                    onChange={(event) => setPhotoSearch(event.target.value)}
                    placeholder="Search by filename"
                    className="h-11 w-full rounded-xl border border-[#ead7c5] bg-white pl-9 pr-3 text-sm text-[#3a2112] placeholder:text-[#a0866e] focus:border-[#7a3f13] focus:outline-none"
                  />
                </label>

                <label className="relative w-full sm:w-44">
                  <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f8b83]" />
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as "latest" | "name")}
                    className="h-11 w-full appearance-none rounded-xl border border-[#ead7c5] bg-white pl-9 pr-3 text-sm font-medium text-[#3a2112] focus:border-[#7a3f13] focus:outline-none"
                  >
                    <option value="latest">Newest uploads</option>
                    <option value="name">Name A-Z</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#f0e4d7] pt-4">
              <button
                type="button"
                onClick={toggleVisiblePhotoSelection}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#ead7c5] bg-[#fffdf8] px-3 text-sm font-semibold text-[#5b3a23] transition hover:border-[#7a3f13] hover:text-[#7a3f13]"
              >
                {allVisibleFolderPhotosSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                {allVisibleFolderPhotosSelected ? "Unselect photos" : "Select photos"}
              </button>

              {selectedPhotoIds.size > 0 ? (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#ead7c5] bg-[#fffaf4] p-1.5">
                  <span className="px-2 text-sm font-semibold text-[#5b3a23]">
                    {selectedPhotoIds.size} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedPhotoIds(new Set())}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#7a6a55] hover:bg-white"
                    title="Clear selection"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={downloadSelectedPhotos}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-[#5b3a23] transition hover:text-[#7a3f13]"
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelectedPhotos}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#fff1f4] px-3 text-sm font-semibold text-[#cf224d] transition hover:bg-[#ffe6ec]"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          {visibleFolderPhotos.length === 0 ? (
            <div className="rounded-3xl border border-[#eadccf] bg-white px-6 py-14 text-center shadow-[0_12px_28px_rgba(13,46,39,0.06)]">
              <p className="text-lg font-semibold text-[#2a170d]">
                {activeFolderPhotos.length === 0 ? "No files in this folder yet" : "No files match this search"}
              </p>
              <p className="mt-2 text-sm text-[#65837a]">
                {activeFolderPhotos.length === 0
                  ? "Start by uploading photos to build this gallery."
                  : "Try another filename keyword or switch sort mode."}
              </p>
              {activeFolderPhotos.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#7a3f13] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5b2b0c]"
                >
                  <UploadCloud className="h-4 w-4" />
                  Upload Photos
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {visibleFolderPhotos.map((photo) => {
                const isDownloaded = downloadedIds.has(photo.id);
                const isLiked = favoriteIds.has(photo.id);
                const isCover = coverPhotoId === photo.id;
                const isSelected = selectedPhotoIds.has(photo.id);
                return (
                  <article
                    key={photo.id}
                    className={`group overflow-hidden   [contain-intrinsic-size:280px] [content-visibility:auto] ${
                      isSelected ? "border-[#7a3f13] ring-2 ring-[#ead4bd]" : "border-[#e2d8cf]"
                    }`}
                  >
                    <div className="relative aspect-square overflow-hidden border-b border-[#f0e4d7] ">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="h-full w-full object-contain p-1"
                        loading="lazy"
                        decoding="async"
                      />
                      <button
                        type="button"
                        onClick={() => togglePhotoSelection(photo.id)}
                        className={`absolute left-2.5 top-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition ${
                          isSelected
                            ? "border-[#7a3f13] bg-[#7a3f13] text-white opacity-100"
                            : "border-white/80 bg-white/85 text-[#6d5a47] opacity-0 hover:bg-white hover:text-[#7a3f13] group-hover:opacity-100"
                        }`}
                        title={isSelected ? "Unselect photo" : "Select photo"}
                      >
                        {isSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                      </button>

                      {isCover ? (
                        <span className="absolute bottom-2 left-2 rounded-full bg-[#7a3f13] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                          Cover
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-2 px-3.5 py-3">
                      <div>
                        <p className="truncate text-sm font-semibold text-center text-[#2a170d]">{photo.name}</p>
                      </div>
                      <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                        {isDownloaded ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#edf6f2] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#2b6659]">
                            <ArrowDownToLine className="h-3 w-3" />
                            Downloaded
                          </span>
                        ) : null}
                        {isLiked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#fff1f4] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d81b60]">
                            <Heart className="h-3 w-3 fill-current" />
                            Liked
                          </span>
                        ) : null}
                        </div>
                        <div className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                          {[
                            {
                              label: isCover ? "Cover selected" : "Set cover",
                              icon: Star,
                              onClick: () => setPhotoAsCover(photo.id),
                              active: isCover,
                              danger: false,
                            },
                            ...(isCover
                              ? [
                                  {
                                    label: "Adjust cover crop",
                                    icon: SlidersHorizontal,
                                    onClick: () => openCoverCrop(photo.id),
                                    active: false,
                                    danger: false,
                                  },
                                ]
                              : []),
                            {
                              label: "Open in One QR",
                              icon: LinkIcon,
                              onClick: () => openPhotoInOneQr(photo.id),
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
                              label: "Download",
                              icon: ArrowDownToLine,
                              onClick: () => downloadPhoto(photo),
                              active: false,
                              danger: false,
                            },
                            {
                              label: "Delete",
                              icon: Trash2,
                              onClick: () => deletePhoto(photo.id),
                              active: false,
                              danger: true,
                            },
                          ].map((action) => {
                            const Icon = action.icon;
                            return (
                              <button
                                key={action.label}
                                type="button"
                                title={action.label}
                                onClick={action.onClick}
                                className={`inline-flex h-6 w-6 items-center justify-center transition ${
                                  action.danger
                                    ? "text-[#d91545] hover:text-[#9f1239]"
                                    : action.active
                                      ? "text-[#7a3f13]"
                                      : "text-[#111827] hover:text-[#7a3f13]"
                                }`}
                              >
                                <Icon className={`h-3.5 w-3.5 ${action.active ? "fill-current" : ""}`} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {visibleFolderPhotos.length < filteredFolderPhotos.length ? (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setPhotoRenderLimit((value) => value + 80)}
                className="rounded-xl border border-[#ead7c5] bg-white px-4 py-2 text-sm font-semibold text-[#5b3a23] transition hover:border-[#7a3f13] hover:text-[#7a3f13]"
              >
                Show more photos
              </button>
            </div>
          ) : null}
        </div>
      )}
      {activeTab === "favorites" && (
        <div className="mt-6 space-y-6">
          <section className="rounded-3xl border border-[#eadccf] bg-white p-4 shadow-[0_12px_28px_rgba(13,46,39,0.06)] md:p-5">
            <div className="relative z-20 flex flex-wrap items-stretch gap-3">
              {favoriteFolders.map((selection) => {
                const selectionKey = getFavoriteSelectionKey(selection);
                const isActive = activeFavoriteFolder && getFavoriteSelectionKey(activeFavoriteFolder) === selectionKey;
                return (
                  <div key={selectionKey} className="relative min-w-52 max-w-65 flex-1">
                    <button
                      type="button"
                      onClick={() => setSelectedFavoriteFolderKey(selectionKey)}
                      className={`w-full rounded-2xl border px-4 py-3.5 pr-12 text-left text-sm transition ${
                        isActive
                          ? "border-[#7a3f13] bg-[linear-gradient(150deg,#ebf8f4_0%,#f2f9ff_100%)] text-[#2a170d]"
                          : "border-[#dcebe5] bg-[#fffdf8] text-[#4e6b62] hover:border-[#c4ddd3] hover:bg-white"
                      }`}
                    >
                      <p className="flex items-center gap-2 font-semibold">{selection.folderName}</p>
                      <p className="mt-1 text-xs text-[#628178]">{selection.items.length} files</p>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-[#eadccf] bg-white p-5 shadow-[0_12px_28px_rgba(13,46,39,0.06)] md:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#2a170d]">
                  {activeFavoriteFolder ? activeFavoriteFolder.folderName : "All Favorites"}
                  <span className="ml-2 text-[#67857c]">{visibleFavoritePhotos.length} shown / {filteredFavoritePhotos.length} files</span>
                </p>
                <p className="mt-1 text-sm text-[#7a6a55]">Favorites from client selections.</p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
                <label className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f8b83]" />
                  <input
                    value={photoSearch}
                    onChange={(event) => setPhotoSearch(event.target.value)}
                    placeholder="Search by filename"
                    className="h-11 w-full rounded-xl border border-[#ead7c5] bg-white pl-9 pr-3 text-sm text-[#3a2112] placeholder:text-[#a0866e] focus:border-[#7a3f13] focus:outline-none"
                  />
                </label>

                <label className="relative w-full sm:w-44">
                  <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f8b83]" />
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as "latest" | "name")}
                    className="h-11 w-full appearance-none rounded-xl border border-[#ead7c5] bg-white pl-9 pr-3 text-sm font-medium text-[#3a2112] focus:border-[#7a3f13] focus:outline-none"
                  >
                    <option value="latest">Newest uploads</option>
                    <option value="name">Name A-Z</option>
                  </select>
                </label>
              </div>
            </div>
          </section>

          {visibleFavoritePhotos.length === 0 ? (
            <div className="rounded-3xl border border-[#eadccf] bg-white px-6 py-14 text-center shadow-[0_12px_28px_rgba(13,46,39,0.06)]">
              <p className="text-lg font-semibold text-[#2a170d]">
                {activeFavoritePhotos.length === 0 ? "No favorite files yet" : "No files match this search"}
              </p>
              <p className="mt-2 text-sm text-[#65837a]">
                {activeFavoritePhotos.length === 0 ? "Favorites will appear here when clients like photos." : "Try another filename keyword or switch sort mode."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {visibleFavoritePhotos.map((photo) => {
                const isDownloaded = downloadedIds.has(photo.id);
                const isLiked = favoriteIds.has(photo.id);
                const isCover = coverPhotoId === photo.id;
                return (
                  <article
                    key={photo.id}
                    className="group overflow-hidden rounded-2xl border border-[#e2d8cf] bg-white shadow-[0_10px_22px_rgba(73,39,20,0.055)] transition hover:border-[#c9ad95] [contain-intrinsic-size:280px] [content-visibility:auto]"
                  >
                    <div className="relative aspect-square overflow-hidden border-b border-[#f0e4d7] bg-[#f7f1e9]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="h-full w-full object-contain p-1"
                        loading="lazy"
                        decoding="async"
                      />

                      {isCover ? (
                        <span className="absolute bottom-2 left-2 rounded-full bg-[#7a3f13] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                          Cover
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-2 px-3.5 py-3">
                      <div>
                        <p className="truncate text-sm font-semibold text-[#2a170d]">{photo.name}</p>
                        <p className="mt-1 truncate text-xs text-[#a2adba]">{photo.name}</p>
                      </div>
                      <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                        {isDownloaded ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#edf6f2] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#2b6659]">
                            <ArrowDownToLine className="h-3 w-3" />
                            Downloaded
                          </span>
                        ) : null}
                        {isLiked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#fff1f4] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d81b60]">
                            <Heart className="h-3 w-3 fill-current" />
                            Liked
                          </span>
                        ) : null}
                        </div>
                        <div className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                          {[
                            {
                              label: isCover ? "Cover selected" : "Set cover",
                              icon: Star,
                              onClick: () => setPhotoAsCover(photo.id),
                              active: isCover,
                              danger: false,
                            },
                            ...(isCover
                              ? [
                                  {
                                    label: "Adjust cover crop",
                                    icon: SlidersHorizontal,
                                    onClick: () => openCoverCrop(photo.id),
                                    active: false,
                                    danger: false,
                                  },
                                ]
                              : []),
                            {
                              label: "Open in One QR",
                              icon: LinkIcon,
                              onClick: () => openPhotoInOneQr(photo.id),
                              active: false,
                              danger: false,
                            },
                            {
                              label: "Download",
                              icon: ArrowDownToLine,
                              onClick: () => downloadPhoto(photo),
                              active: false,
                              danger: false,
                            },
                            {
                              label: "Remove from favorites",
                              icon: HeartMinusIcon,
                              onClick: () => activeFavoriteFolder && removeFavoritePhoto(activeFavoriteFolder, photo.id),
                              active: true,
                              danger: true,
                            },
                          ].map((action) => {
                            const Icon = action.icon;
                            return (
                              <button
                                key={action.label}
                                type="button"
                                title={action.label}
                                onClick={action.onClick}
                                className={`inline-flex h-6 w-6 items-center justify-center transition ${
                                  action.danger
                                    ? "text-[#d91545] hover:text-[#9f1239]"
                                    : action.active
                                      ? "text-[#7a3f13]"
                                      : "text-[#111827] hover:text-[#7a3f13]"
                                }`}
                              >
                                <Icon className={`h-3.5 w-3.5 ${action.active ? "fill-current" : ""}`} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {visibleFavoritePhotos.length < filteredFavoritePhotos.length ? (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setFavoriteRenderLimit((value) => value + 80)}
                className="rounded-xl border border-[#ead7c5] bg-white px-4 py-2 text-sm font-semibold text-[#5b3a23] transition hover:border-[#7a3f13] hover:text-[#7a3f13]"
              >
                Show more selected photos
              </button>
            </div>
          ) : null}
        </div>
      )}

      {coverCropOpen && coverPhoto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-4xl rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-semibold text-[#2a170d]">Adjust cover crop</h3>
                <p className="mt-1 text-sm text-[#6f5b48]">
                  Click the preview or use the sliders to choose the part clients should see.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCoverCropOpen(false)}
                className="h-9 w-9 rounded-full bg-[#f0e6db] text-[#6b645c]"
                aria-label="Close cover crop"
              >
                x
              </button>
            </div>

            <button
              type="button"
              onClick={updateCoverPositionFromClick}
              className="relative mt-5 block h-[min(48vh,430px)] w-full overflow-hidden rounded-2xl bg-slate-950 text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPhoto.url}
                alt={coverPhoto.name}
                className="h-full w-full object-cover"
                style={{ objectPosition: `${coverPosition.x}% ${coverPosition.y}%` }}
              />
              <span
                className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#7a3f13] shadow-[0_0_0_4px_rgba(0,0,0,0.28)]"
                style={{ left: `${coverPosition.x}%`, top: `${coverPosition.y}%` }}
              />
              <span className="pointer-events-none absolute inset-0 bg-black/10" />
            </button>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[#5b3a23]">
                Horizontal focus
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={coverPosition.x}
                  onChange={(event) =>
                    setCoverPosition((current) => ({ ...current, x: Number(event.target.value) }))
                  }
                  className="mt-2 w-full accent-[#7a3f13]"
                />
              </label>
              <label className="text-sm font-semibold text-[#5b3a23]">
                Vertical focus
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={coverPosition.y}
                  onChange={(event) =>
                    setCoverPosition((current) => ({ ...current, y: Number(event.target.value) }))
                  }
                  className="mt-2 w-full accent-[#7a3f13]"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setCoverPosition({ x: 50, y: 50 })}
                className="rounded-xl border border-[#ead7c5] bg-white px-4 py-2 text-sm font-semibold text-[#5b3a23]"
              >
                Reset center
              </button>
              <button
                type="button"
                onClick={saveCoverPosition}
                className="rounded-xl bg-[#7a3f13] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#5b2b0c]"
              >
                Save cover focus
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {settingsOpen && initialGallery ? (
        <AddGalleryModal
          open={settingsOpen}
          initialGallery={initialGallery}
          onClose={() => {
            setSettingsOpen(false);
            setActiveTab("gallery");
          }}
          onUpdated={(updated) => {
            const metaPayload: GalleryMetaConfig = {
              expiresAt: updated.expiresAt ?? null,
              storageTimeLabel: updated.storageTimeLabel ?? null,
              favoritesEnabled: updated.favoritesEnabled ?? true,
              favoritesLimitSelected: updated.favoritesLimitSelected ?? false,
              favoritesName: updated.favoritesName ?? null,
              favoritesListsCount: updated.favoritesListsCount ?? 0,
              selectionCompletedCount: updated.selectionCompletedCount ?? 0,
              favoritesMaxSelected: updated.favoritesMaxSelected ?? null,
              coverPositionX: updated.coverPositionX ?? gallery?.coverPositionX ?? 50,
              coverPositionY: updated.coverPositionY ?? gallery?.coverPositionY ?? 50,
            };
            void fetchWithRetry(`/api/galleries/${encodeURIComponent(updated.id)}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: updated.name, meta: metaPayload }),
            }, { dedupeKey: `client:galleries:meta:patch:${updated.id}`, idempotencyKey: `client:galleries:meta:patch:${updated.id}:${Date.now()}` });
            setGallery((prev) =>
              prev
                ? {
                    ...prev,
                    name: updated.name,
                    ...metaPayload,
                  }
                : prev
            );
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
              <h3 className="text-2xl font-semibold text-[#2a170d]">Create favorites folder</h3>
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
                x
              </button>
            </div>
            <div className="mt-6 space-y-4 rounded-xl bg-[#f8f4ee] p-6">
              <label className="block text-sm font-semibold text-[#2a170d]">
                Folder name
                <input
                  value={favoriteFolderName}
                  onChange={(e) => setFavoriteFolderName(e.target.value)}
                  placeholder="For example: Bride selection"
                  className="mt-2 h-11 w-full rounded-md border border-[#e3d8cc] bg-white px-3"
                />
              </label>
              <label className="block text-sm font-semibold text-[#2a170d]">
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
                className="rounded-md bg-[#2a170d] px-6 py-2 text-sm font-semibold text-white"
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
              <h3 className="text-2xl font-semibold text-[#2a170d]">
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
                x
              </button>
            </div>
            <div className="mt-6 space-y-4 rounded-xl bg-[#f8f4ee] p-6">
              <label className="block text-sm font-semibold text-[#2a170d]">
                Folder name
                <input
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="For example: wedding"
                  className="mt-2 h-11 w-full rounded-md border border-[#e3d8cc] bg-white px-3"
                />
              </label>
              <label className="block text-sm font-semibold text-[#2a170d]">
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
                <p className="text-sm font-semibold text-[#2a170d]">Hide folder</p>
                <p className="text-xs text-[#8a7f73]">
                  Hidden folders are only visible with a password or via a direct link.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFolderHidden((prev) => !prev)}
                className={`relative h-6 w-11 rounded-full transition ${folderHidden ? "bg-[#2a170d]" : "bg-[#e3d8cc]"
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
                className="rounded-md bg-[#2a170d] px-6 py-2 text-sm font-semibold text-white"
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
