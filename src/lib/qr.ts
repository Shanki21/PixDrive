type ShareReadyGallery = {
  published?: boolean | null;
  oneQrEnabled?: boolean | null;
  expiresAt?: string | null;
};

const DEFAULT_QR_SIZE = 320;

export function normalizeQrSize(raw: number | string | null | undefined) {
  const value = typeof raw === "number" ? raw : Number(raw ?? DEFAULT_QR_SIZE);
  if (!Number.isFinite(value)) return DEFAULT_QR_SIZE;
  return Math.min(Math.max(Math.round(value), 128), 1024);
}

function parseExpiresAt(raw: string | null | undefined) {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function isGalleryShareReady(gallery: ShareReadyGallery) {
  const published = gallery.published ?? true;
  const qrEnabled = gallery.oneQrEnabled ?? true;
  const expiresAt = parseExpiresAt(gallery.expiresAt ?? null);
  const notExpired = expiresAt ? expiresAt.getTime() > Date.now() : true;
  return published && qrEnabled && notExpired;
}

export function filterShareReadyGalleries<T extends ShareReadyGallery>(galleries: T[]) {
  return galleries.filter((gallery) => isGalleryShareReady(gallery));
}

export function buildQrApiUrl(data: string, size?: number) {
  const normalizedSize = normalizeQrSize(size ?? DEFAULT_QR_SIZE);
  return `/api/qr?size=${normalizedSize}&data=${encodeURIComponent(data)}`;
}
