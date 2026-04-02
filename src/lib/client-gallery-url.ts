const DISK_ROUTE_PREFIX = "/disk";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizeOrigin(raw: string) {
  const trimmed = trimTrailingSlash(raw.trim());
  if (!trimmed) return "";

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    return parsed.origin;
  } catch {
    return trimTrailingSlash(withProtocol);
  }
}

function readConfiguredOrigin() {
  const raw = process.env.NEXT_PUBLIC_CLIENT_GALLERY_BASE_URL?.trim();
  if (!raw) return "";
  return normalizeOrigin(raw);
}

export function getClientGalleryOrigin(fallbackOrigin?: string) {
  const configured = readConfiguredOrigin();
  if (configured) return configured;
  if (!fallbackOrigin) return "";
  return normalizeOrigin(fallbackOrigin);
}

export function buildClientGalleryPath(slug: string) {
  return `${DISK_ROUTE_PREFIX}/${encodeURIComponent(slug)}`;
}

export function buildClientGalleryUrl(slug: string, fallbackOrigin?: string) {
  const path = buildClientGalleryPath(slug);
  const origin = getClientGalleryOrigin(fallbackOrigin);
  return origin ? `${origin}${path}` : path;
}

export function getClientGalleryHostLabel(fallbackOrigin?: string) {
  const origin = getClientGalleryOrigin(fallbackOrigin);
  if (!origin) return "pixora.pro";

  try {
    return new URL(origin).host;
  } catch {
    return origin.replace(/^https?:\/\//, "");
  }
}

export function getClientGalleryBasePathForDisplay(fallbackOrigin?: string) {
  const origin = getClientGalleryOrigin(fallbackOrigin);
  return origin ? `${origin}${DISK_ROUTE_PREFIX}/` : `${DISK_ROUTE_PREFIX}/`;
}
