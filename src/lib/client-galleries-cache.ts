import fetchWithRetry from "@/lib/fetchWithRetry";
import type { MinimalGallery } from "@/types/DriveTableTypes";

const GALLERIES_CACHE_KEY = "wf_drive_galleries_cache_v1";
const GALLERIES_CACHE_TTL = 60 * 1000;

type CachedGalleries<T> = {
  ts: number;
  data: T[];
};

export function readCachedGalleries<T extends MinimalGallery>() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(GALLERIES_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedGalleries<T>;
    if (!parsed?.ts || !Array.isArray(parsed.data)) return null;
    if (Date.now() - parsed.ts > GALLERIES_CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeCachedGalleries<T extends MinimalGallery>(data: T[]) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      GALLERIES_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data })
    );
  } catch {
    // Ignore browser storage failures.
  }
}

export function clearCachedGalleries() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(GALLERIES_CACHE_KEY);
  } catch {
    // Ignore browser storage failures.
  }
}

export async function loadGalleriesList<T extends MinimalGallery>({
  dedupeKey,
  forceRefresh = false,
}: {
  dedupeKey: string;
  forceRefresh?: boolean;
}) {
  if (!forceRefresh) {
    const cached = readCachedGalleries<T>();
    if (cached) return cached;
  }

  const response = await fetchWithRetry(
    "/api/galleries",
    { cache: forceRefresh ? "no-store" : "default" },
    { dedupeKey }
  );
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.includes("application/json")) {
    return [];
  }

  const payload = (await response.json()) as T[] | { error?: string };
  const rows = Array.isArray(payload) ? payload : [];
  writeCachedGalleries(rows);
  return rows;
}
