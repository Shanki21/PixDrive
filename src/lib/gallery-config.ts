type JsonRecord = Record<string, unknown>;

export type GalleryEventSettings = {
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
  fullAccessPinHash?: string | null;
  guestPinHash?: string | null;
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

export type GalleryMetaConfig = {
  expiresAt?: string | null;
  storageTimeLabel?: string | null;
  favoritesEnabled?: boolean;
  favoritesLimitSelected?: boolean;
  favoritesName?: string | null;
  favoritesListsCount?: number;
  selectionCompletedCount?: number;
  favoritesMaxSelected?: number | null;
  folders?: GalleryFolderMeta[];
  folderPhotosMap?: Record<string, string[]>;
  folderOrder?: string[];
};

export type GalleryFolderMeta = {
  id: string;
  name: string;
  description: string;
  hidden: boolean;
  createdAt: string;
};

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

function asNullableString(value: unknown) {
  if (value == null) return null;
  const next = String(value).trim();
  return next || null;
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return value;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry ?? "").trim())
    .filter((entry) => entry.length > 0);
}

function asFolderMetaArray(value: unknown): GalleryFolderMeta[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const record = entry as JsonRecord;
      const id = asNullableString(record.id) ?? "";
      const name = asNullableString(record.name) ?? "";
      if (!id || !name) return null;
      return {
        id,
        name,
        description: asNullableString(record.description) ?? "",
        hidden: asBoolean(record.hidden, false),
        createdAt: asNullableString(record.createdAt) ?? new Date().toISOString(),
      };
    })
    .filter((entry): entry is GalleryFolderMeta => Boolean(entry));
}

function asFolderPhotosMap(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as JsonRecord;
  const normalized: Record<string, string[]> = {};
  for (const [key, raw] of Object.entries(record)) {
    const cleanKey = key.trim();
    if (!cleanKey) continue;
    normalized[cleanKey] = asStringArray(raw);
  }
  return normalized;
}

export function normalizeEventSettings(value: unknown): GalleryEventSettings | null {
  const record = asRecord(value);
  if (!record) return null;
  const access = record.oneQrAccessLevel;
  const oneQrAccessLevel = access === "full" || access === "guest" ? access : "guest";

  return {
    startDate: asNullableString(record.startDate),
    endDate: asNullableString(record.endDate),
    eventType: asNullableString(record.eventType),
    eventLocation: asNullableString(record.eventLocation),
    description: asNullableString(record.description),
    published: asBoolean(record.published, true),
    photoSellingEnabled: asBoolean(record.photoSellingEnabled, false),
    reelitAiEnabled: asBoolean(record.reelitAiEnabled, false),
    brandingEnabled: asBoolean(record.brandingEnabled, false),
    expiryDate: asNullableString(record.expiryDate),
    fullAccessPin: asNullableString(record.fullAccessPin),
    guestPin: asNullableString(record.guestPin),
    fullAccessPinHash: asNullableString(record.fullAccessPinHash),
    guestPinHash: asNullableString(record.guestPinHash),
    allowSingleDownload: asBoolean(record.allowSingleDownload, true),
    allowBulkDownload: asBoolean(record.allowBulkDownload, false),
    whatsappEnabled: asBoolean(record.whatsappEnabled, false),
    emailEnabled: asBoolean(record.emailEnabled, false),
    oneQrEnabled: asBoolean(record.oneQrEnabled, true),
    oneQrRequirePin: asBoolean(record.oneQrRequirePin, false),
    oneQrAccessLevel,
    galleryAppEnabled: asBoolean(record.galleryAppEnabled, true),
    livenessDetectionEnabled: asBoolean(record.livenessDetectionEnabled, false),
  };
}

export function normalizeGalleryMeta(value: unknown): GalleryMetaConfig | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    expiresAt: asNullableString(record.expiresAt),
    storageTimeLabel: asNullableString(record.storageTimeLabel),
    favoritesEnabled: asBoolean(record.favoritesEnabled, true),
    favoritesLimitSelected: asBoolean(record.favoritesLimitSelected, false),
    favoritesName: asNullableString(record.favoritesName),
    favoritesListsCount: Math.max(0, asNumber(record.favoritesListsCount, 0)),
    selectionCompletedCount: Math.max(0, asNumber(record.selectionCompletedCount, 0)),
    favoritesMaxSelected:
      record.favoritesMaxSelected == null
        ? null
        : Math.max(0, asNumber(record.favoritesMaxSelected, 0)),
    folders: asFolderMetaArray(record.folders),
    folderPhotosMap: asFolderPhotosMap(record.folderPhotosMap),
    folderOrder: asStringArray(record.folderOrder),
  };
}

export function mergeEventSettings(
  existing: unknown,
  incoming: unknown
): GalleryEventSettings | null {
  const base = normalizeEventSettings(existing) ?? {};
  const next = normalizeEventSettings(incoming);
  if (!next) return null;
  return { ...base, ...next };
}

export function maskEventSettingsPins(settings: GalleryEventSettings | null): GalleryEventSettings | null {
  if (!settings) return null;
  return {
    ...settings,
    fullAccessPin: null,
    guestPin: null,
    fullAccessPinHash: null,
    guestPinHash: null,
  };
}

export function mergeGalleryMeta(existing: unknown, incoming: unknown): GalleryMetaConfig | null {
  const base = normalizeGalleryMeta(existing) ?? {};
  const next = normalizeGalleryMeta(incoming);
  if (!next) return null;
  return { ...base, ...next };
}
