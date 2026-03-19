"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AddGalleryModal from "@/components/drive/AddGalleryModal";
import { getGalleryMeta, saveGalleryMeta } from "@/lib/gallery-meta-storage";
import { MinimalGallery } from "@/types/DriveTableTypes";
import {
  ArrowDownToLine,
  Eye,
  ExternalLink,
  Link as LinkIcon,
  Lock,
  MoreVertical,
  PencilLine,
  Settings,
  Star,
  Trash2,
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

const CLIENT_GALLERY_BASE_URL =
  process.env.NEXT_PUBLIC_CLIENT_GALLERY_BASE_URL?.trim() || "https://vowgraphy.pixora.pro";
const FOLDER_STORAGE_PREFIX = "wf_gallery_folders:";
const FOLDER_PHOTOS_PREFIX = "wf_gallery_folder_photos:";
const CLIENT_FAVORITES_PREFIX = "wf_client_favorites:";

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
    return Array.isArray(parsed) ? parsed : [];
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

export default function DriveDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const galleryId = params?.id;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [folderZipBusy, setFolderZipBusy] = useState<string | null>(null);

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
      favoritesEnabled: meta?.favoritesEnabled ?? false,
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
    setFolders(readFolders(galleryId));
    setFolderPhotos(readFolderPhotos(galleryId));
    setFavoriteIds(readFavoriteIds(galleryId));
  }, [galleryId]);

  useEffect(() => {
    if (activeTab === "settings") {
      setSettingsOpen(true);
    }
  }, [activeTab]);

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
    try {
      for (const file of files) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result ?? ""));
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });

        const res = await fetch(`/api/galleries/${galleryId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, url: dataUrl }),
        });

        if (!res.ok) {
          throw new Error("Unable to upload photo");
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

  const deleteFolder = (folderId: string) => {
    if (!galleryId) return;
    const nextFolders = folders.filter((folder) => folder.id !== folderId);
    setFolders(nextFolders);
    writeFolders(galleryId, nextFolders);

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

  const getFolderMenuItems = (folderId: string) => {
    const isPhotos = folderId === "photos";
    const folder = folders.find((f) => f.id === folderId);

    const items = [
      {
        label: "Preview",
        icon: Eye,
        onClick: () => openFolderPreview(folderId),
      },
      ...(isPhotos
        ? []
        : [
          {
            label: "Settings",
            icon: Settings,
            onClick: () => startEditFolder(folderId),
          },
        ]),
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
          <button
            className="rounded-full border border-[#d9cfc4] px-5 py-2.5 text-sm font-semibold text-[#4a433d]"
            type="button"
            onClick={() => navigator.clipboard.writeText(publicLink ?? "")}
          >
            Share gallery
          </button>
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
            <div className="relative min-w-48 z-20">
              <button
                type="button"
                onClick={() => setSelectedFolderId("photos")}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${selectedFolderId === "photos"
                    ? "border-[#15161a] bg-white text-[#15161a]"
                    : "border-[#e3d8cc] bg-white/60 text-[#6b645c]"
                  }`}
              >
                <p className="font-semibold">Photos</p>
                <p className="mt-1 text-xs text-[#8a7f73]">
                  {photos.length} files {photos.length ? "??" : ""}{" "}
                  {photos.length ? `${(photos.length * 1.2).toFixed(1)} MB` : ""}
                </p>
              </button>
              <button
                type="button"
                aria-label="Open folder actions"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpenFor((prev) => (prev === "folder-photos" ? null : "folder-photos"));
                }}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-[#e3d8cc] bg-white text-[#15161a] shadow-sm transition hover:bg-[#f7f3ee]"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {menuOpenFor === "folder-photos" ? (
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-[#e3d8cc] bg-white shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="py-2 text-sm text-[#3b3430]">
                    {getFolderMenuItems("photos").items.map((item) => (
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
                </div>
              ) : null}
            </div>

            {folders.map((folder) => (
              <div key={folder.id} className="relative min-w-48 z-20">
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${selectedFolderId === folder.id
                      ? "border-[#15161a] bg-white text-[#15161a]"
                      : "border-[#e3d8cc] bg-white/60 text-[#6b645c]"
                    }`}
                >
                  <p className="flex items-center gap-2 font-semibold">
                    {folder.hidden ? <Lock className="h-4 w-4 text-[#8a7f73]" /> : null}
                    <span>{folder.name}</span>
                  </p>
                  <p className="mt-1 text-xs text-[#8a7f73]">{folder.description || "No description"}</p>
                </button>
                <button
                  type="button"
                  aria-label="Open folder actions"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpenFor((prev) => (prev === `folder-${folder.id}` ? null : `folder-${folder.id}`));
                  }}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-[#e3d8cc] bg-white text-[#15161a] shadow-sm transition hover:bg-[#f7f3ee]"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuOpenFor === `folder-${folder.id}` ? (
                  <div
                    className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-[#e3d8cc] bg-white shadow-2xl"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="py-2 text-sm text-[#3b3430]">
                      {getFolderMenuItems(folder.id).items.map((item) => (
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
                    {getFolderMenuItems(folder.id).destructive ? (
                      <div className="border-t border-[#efe6dc]">
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpenFor(null);
                            getFolderMenuItems(folder.id).destructive?.onClick();
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[#e11d48] hover:bg-[#fde8ee]"
                        >
                          {(() => {
                            const destructive = getFolderMenuItems(folder.id).destructive;
                            if (!destructive) return null;
                            const Icon = destructive.icon;
                            return <Icon className="h-4 w-4" />;
                          })()}
                          <span>{getFolderMenuItems(folder.id).destructive?.label}</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}

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
                  className="rounded-full border border-[#d9cfc4] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#4a433d]"
                  type="button"
                  onClick={() => {
                    setEditingFolderId(null);
                    setFolderName("");
                    setFolderDescription("");
                    setFolderHidden(false);
                    setShowFolderModal(true);
                  }}
                >
                  Add folder
                </button>
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
                {activeFolderPhotos.map((photo) => (
                  <div key={photo.id} className="group relative">
                    <div className="relative">

                      <div className="mb-2 flex items-center overflow-hidden rounded-full border border-[#e3d8cc] bg-white/90 opacity-0 shadow transition group-hover:opacity-100">
                        <button className="flex h-8 w-8 items-center justify-center text-[#4a433d] hover:bg-[#f2ece4]">
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button className="flex h-8 w-8 items-center justify-center text-[#4a433d] hover:bg-[#f2ece4]">
                          <Star className="h-4 w-4" />
                        </button>
                        <button className="flex h-8 w-8 items-center justify-center text-[#4a433d] hover:bg-[#f2ece4]">
                          <PencilLine className="h-4 w-4" />
                        </button>
                        <button className="flex h-8 w-8 items-center justify-center text-[#4a433d] hover:bg-[#f2ece4]">
                          <ArrowDownToLine className="h-4 w-4" />
                        </button>
                        <button className="flex h-8 w-8 items-center justify-center text-[#4a433d] hover:bg-[#f2ece4]">
                          <LinkIcon className="h-4 w-4" />
                        </button>
                        <button className="flex h-8 w-8 items-center justify-center text-[#e11d48] hover:bg-[#fde8ee]">
                          <Trash2 className="h-4 w-4" />
                        </button>
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
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "favorites" && (
        <div className="mt-10">
          {favoritePhotos.length === 0 ? (
            <div className="rounded-[26px] border border-[#e3d8cc] bg-white p-10 text-center text-[#8a7f73]">
              No favorites yet. Favorites will appear here when clients like photos in the gallery.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {favoritePhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative rounded-[20px] border border-[#e3d8cc] bg-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={photo.name} className="h-52 w-full rounded-t-[20px] object-cover" />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-52 rounded-t-[20px] bg-black/20 opacity-0 transition group-hover:opacity-100" />

                  <div className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#101114]">
                    <span className="tulip-bar">
                      <TulipIcon />
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold text-[#15161a]">{photo.name}</p>
                  </div>
                </div>
              ))}
            </div>
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
                <img src={photos[0].url} alt="Cover preview" className="h-52 w-full object-cover" />
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
