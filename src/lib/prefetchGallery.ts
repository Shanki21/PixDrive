// Lightweight in-memory prefetch cache for gallery edit data.
// This intentionally avoids any persistent storage (localStorage/sessionStorage)
// and only holds data in-memory for the lifetime of the client session.

const cache = new Map<string, unknown>();

export function setPrefetchedGallery<T>(id: string, data: T): void {
  try {
    cache.set(id, data);
  } catch {
    // noop - defensive
  }
}

export function getPrefetchedGallery<T>(id: string): T | undefined {
  try {
    const val = cache.get(id) as T | undefined;
    if (val !== undefined) {
      cache.delete(id);
      return val;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function clearPrefetchedGallery(id: string): void {
  try {
    cache.delete(id);
  } catch {
    // noop
  }
}

export function clearAllPrefetchedGalleries(): void {
  try {
    cache.clear();
  } catch {
    // noop
  }
}
