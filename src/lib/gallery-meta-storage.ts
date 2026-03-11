export type GalleryMeta = {
  expiresAt?: string | null;
  storageTimeLabel?: string | null;
  favoritesEnabled?: boolean;
  favoritesLimitSelected?: boolean;
  favoritesName?: string | null;
  favoritesListsCount?: number;
  selectionCompletedCount?: number;
  favoritesMaxSelected?: number | null;
};

const GALLERY_META_STORAGE_KEY = "wf_gallery_meta";

function readAllMeta(): Record<string, GalleryMeta> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(GALLERY_META_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, GalleryMeta>;
  } catch {
    return {};
  }
}

function writeAllMeta(next: Record<string, GalleryMeta>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GALLERY_META_STORAGE_KEY, JSON.stringify(next));
}

export function getGalleryMeta(galleryId: string): GalleryMeta | null {
  const all = readAllMeta();
  return all[galleryId] ?? null;
}

export function saveGalleryMeta(galleryId: string, meta: GalleryMeta) {
  const all = readAllMeta();
  const prev = all[galleryId] ?? {};
  all[galleryId] = {
    ...prev,
    expiresAt: meta.expiresAt ?? null,
    storageTimeLabel: meta.storageTimeLabel ?? null,
    favoritesEnabled: meta.favoritesEnabled ?? prev.favoritesEnabled ?? false,
    favoritesLimitSelected: meta.favoritesLimitSelected ?? prev.favoritesLimitSelected ?? false,
    favoritesName: meta.favoritesName ?? prev.favoritesName ?? null,
    favoritesListsCount: meta.favoritesListsCount ?? prev.favoritesListsCount ?? 0,
    selectionCompletedCount: meta.selectionCompletedCount ?? prev.selectionCompletedCount ?? 0,
    favoritesMaxSelected: meta.favoritesMaxSelected ?? prev.favoritesMaxSelected ?? null,
  };
  writeAllMeta(all);
}
