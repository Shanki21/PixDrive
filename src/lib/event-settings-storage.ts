export type EventSettings = {
  startDate?: string | null;
  endDate?: string | null;
  eventType?: string | null;
  eventLocation?: string | null;
  description?: string | null;
  published?: boolean;
  photoSellingEnabled?: boolean;
  reelitAiEnabled?: boolean;
  brandingEnabled?: boolean;
  expiryDate?: string | null;
  fullAccessPin?: string | null;
  guestPin?: string | null;
  allowSingleDownload?: boolean;
  allowBulkDownload?: boolean;
  whatsappEnabled?: boolean;
  emailEnabled?: boolean;
  oneQrEnabled?: boolean;
  oneQrRequirePin?: boolean;
  oneQrAccessLevel?: "full" | "guest";
  galleryAppEnabled?: boolean;
  livenessDetectionEnabled?: boolean;
};

const EVENT_SETTINGS_KEY = "wf_event_settings_v1";

function readAll(): Record<string, EventSettings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(EVENT_SETTINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, EventSettings>;
  } catch {
    return {};
  }
}

function writeAll(next: Record<string, EventSettings>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EVENT_SETTINGS_KEY, JSON.stringify(next));
}

export function getEventSettings(galleryId: string): EventSettings | null {
  const all = readAll();
  return all[galleryId] ?? null;
}

export function saveEventSettings(galleryId: string, settings: EventSettings) {
  const all = readAll();
  const prev = all[galleryId] ?? {};
  all[galleryId] = {
    ...prev,
    ...settings,
    startDate: settings.startDate ?? prev.startDate ?? null,
    endDate: settings.endDate ?? prev.endDate ?? null,
    eventType: settings.eventType ?? prev.eventType ?? null,
    eventLocation: settings.eventLocation ?? prev.eventLocation ?? null,
    description: settings.description ?? prev.description ?? null,
    published: settings.published ?? prev.published ?? true,
    photoSellingEnabled: settings.photoSellingEnabled ?? prev.photoSellingEnabled ?? false,
    reelitAiEnabled: settings.reelitAiEnabled ?? prev.reelitAiEnabled ?? false,
    brandingEnabled: settings.brandingEnabled ?? prev.brandingEnabled ?? false,
    expiryDate: settings.expiryDate ?? prev.expiryDate ?? null,
    fullAccessPin: settings.fullAccessPin ?? prev.fullAccessPin ?? null,
    guestPin: settings.guestPin ?? prev.guestPin ?? null,
    allowSingleDownload: settings.allowSingleDownload ?? prev.allowSingleDownload ?? true,
    allowBulkDownload: settings.allowBulkDownload ?? prev.allowBulkDownload ?? false,
    whatsappEnabled: settings.whatsappEnabled ?? prev.whatsappEnabled ?? false,
    emailEnabled: settings.emailEnabled ?? prev.emailEnabled ?? false,
    oneQrEnabled: settings.oneQrEnabled ?? prev.oneQrEnabled ?? true,
    oneQrRequirePin: settings.oneQrRequirePin ?? prev.oneQrRequirePin ?? false,
    oneQrAccessLevel: settings.oneQrAccessLevel ?? prev.oneQrAccessLevel ?? "guest",
    galleryAppEnabled: settings.galleryAppEnabled ?? prev.galleryAppEnabled ?? true,
    livenessDetectionEnabled: settings.livenessDetectionEnabled ?? prev.livenessDetectionEnabled ?? false,
  };
  writeAll(all);

  // Attempt to persist settings to server for authenticated users (non-blocking)
  (async () => {
    try {
      const { default: fetchWithRetry } = await import("@/lib/fetchWithRetry");
      await fetchWithRetry(`/api/galleries/${encodeURIComponent(galleryId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: all[galleryId] }),
      }, { dedupeKey: `client:saveSettings:${galleryId}` });
    } catch {
      // ignore failures; localStorage remains a fallback for offline or unauthenticated users
    }
  })();
}

