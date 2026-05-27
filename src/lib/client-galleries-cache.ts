import fetchWithRetry from "@/lib/fetchWithRetry";
import type { MinimalGallery } from "@/types/DriveTableTypes";

const GALLERIES_CACHE_KEY = "wf_drive_galleries_cache_v1";
const GALLERIES_FAST_CACHE_KEY = `${GALLERIES_CACHE_KEY}:fast`;
const GALLERIES_CACHE_TTL = 5 * 60 * 1000;

type CachedGalleries<T> = {
  ts: number;
  data: T[];
};

function getCacheKey(cacheKey = GALLERIES_CACHE_KEY) {
  return cacheKey;
}

export function readCachedGalleries<T extends MinimalGallery>(cacheKey = GALLERIES_FAST_CACHE_KEY) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(getCacheKey(cacheKey));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedGalleries<T>;
    if (!parsed?.ts || !Array.isArray(parsed.data)) return null;
    if (Date.now() - parsed.ts > GALLERIES_CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeCachedGalleries<T extends MinimalGallery>(data: T[], cacheKey = GALLERIES_FAST_CACHE_KEY) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      getCacheKey(cacheKey),
      JSON.stringify({ ts: Date.now(), data })
    );
  } catch {
    // Ignore browser storage failures.
  }
}

export function clearCachedGalleries(cacheKey = GALLERIES_FAST_CACHE_KEY) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(getCacheKey(cacheKey));
  } catch {
    // Ignore browser storage failures.
  }
}

export async function loadGalleriesList<T extends MinimalGallery>({
  dedupeKey,
  forceRefresh = false,
  includeMetrics = false,
}: {
  dedupeKey: string;
  forceRefresh?: boolean;
  includeMetrics?: boolean;
}) {
  const url = includeMetrics ? "/api/galleries?metrics=1" : "/api/galleries?metrics=0";
  const cacheKey = includeMetrics ? `${GALLERIES_CACHE_KEY}:metrics` : GALLERIES_FAST_CACHE_KEY;
  if (!forceRefresh) {
    const cached = readCachedGalleries<T>(cacheKey);
    if (cached) return cached;
  }

  const response = await fetchWithRetry(
    url,
    { cache: forceRefresh ? "no-store" : "default" },
    { dedupeKey }
  );
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.includes("application/json")) {
    return [];
  }

  const payload = (await response.json()) as T[] | { error?: string };
  const rows = Array.isArray(payload) ? payload : [];
  writeCachedGalleries(rows, cacheKey);
  return rows;
}
