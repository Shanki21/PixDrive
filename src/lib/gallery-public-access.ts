import { normalizeEventSettings, normalizeGalleryMeta } from "./gallery-config";

type PublicAccessInput = {
  settings: unknown;
  meta: unknown;
};

export type GalleryPublicAccess = {
  published: boolean;
  expired: boolean;
  canAccess: boolean;
  allowSingleDownload: boolean;
  allowBulkDownload: boolean;
  favoritesEnabled: boolean;
  oneQrEnabled: boolean;
};

function parseExpiresAt(meta: unknown) {
  const normalized = normalizeGalleryMeta(meta);
  const raw = normalized?.expiresAt?.trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function getGalleryPublicAccess(input: PublicAccessInput): GalleryPublicAccess {
  const settings = normalizeEventSettings(input.settings);
  const meta = normalizeGalleryMeta(input.meta);
  const expiresAt = parseExpiresAt(input.meta);
  const now = Date.now();
  const published = settings?.published ?? true;
  const expired = expiresAt ? expiresAt.getTime() <= now : false;

  return {
    published,
    expired,
    canAccess: published && !expired,
    allowSingleDownload: settings?.allowSingleDownload ?? true,
    allowBulkDownload: settings?.allowBulkDownload ?? false,
    favoritesEnabled: meta?.favoritesEnabled ?? true,
    oneQrEnabled: settings?.oneQrEnabled ?? true,
  };
}
